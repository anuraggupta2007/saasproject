import re
import html
from urllib.parse import urlparse, urljoin
from typing import Any

from src.core.logging import get_logger

logger = get_logger(__name__)

BLOCKED_SQL_PATTERNS = [
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|TRUNCATE)\b)",
    r"(--|;|/\*|\*/|@@)",
    r"(\b(OR|AND)\b\s+\d+\s*=\s*\d+)",
    r"('\s*(OR|AND)\s+')",
]

BLOCKED_XSS_PATTERNS = [
    r"<script\b[^>]*>.*?</script>",
    r"javascript:",
    r"on\w+\s*=",
    r"<iframe\b",
    r"<object\b",
    r"<embed\b",
    r"<form\b",
]

BLOCKED_PATH_TRAVERSAL = [
    r"\.\./",
    r"\.\.\\",
    r"%2e%2e",
    r"%252e%252e",
]

BLOCKED_SSRF_PATTERNS = [
    r"localhost",
    r"127\.0\.0\.1",
    r"0\.0\.0\.0",
    r"169\.254\.169\.254",
    r"metadata\.google",
    r"10\.\d+\.\d+\.\d+",
    r"172\.(1[6-9]|2\d|3[01])\.\d+\.\d+",
    r"192\.168\.\d+\.\d+",
]


class InputValidationService:
    def __init__(self):
        self.sql_patterns = [re.compile(p, re.IGNORECASE) for p in BLOCKED_SQL_PATTERNS]
        self.xss_patterns = [re.compile(p, re.IGNORECASE) for p in BLOCKED_XSS_PATTERNS]
        self.path_patterns = [re.compile(p, re.IGNORECASE) for p in BLOCKED_PATH_TRAVERSAL]
        self.ssrf_patterns = [re.compile(p, re.IGNORECASE) for p in BLOCKED_SSRF_PATTERNS]

    def sanitize_string(self, value: str) -> str:
        if not isinstance(value, str):
            return value
        value = html.escape(value)
        value = value.strip()
        return value

    def sanitize_dict(self, data: dict) -> dict:
        if not isinstance(data, dict):
            return data
        sanitized = {}
        for key, value in data.items():
            clean_key = self.sanitize_string(str(key))
            if isinstance(value, str):
                sanitized[clean_key] = self.sanitize_string(value)
            elif isinstance(value, dict):
                sanitized[clean_key] = self.sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[clean_key] = [
                    self.sanitize_string(v) if isinstance(v, str) else v
                    for v in value
                ]
            else:
                sanitized[clean_key] = value
        return sanitized

    def check_sql_injection(self, value: str) -> dict:
        for pattern in self.sql_patterns:
            if pattern.search(value):
                logger.warning("sql_injection_attempt", extra={"value": value[:100]})
                return {"safe": False, "reason": "Potential SQL injection detected"}
        return {"safe": True}

    def check_xss(self, value: str) -> dict:
        for pattern in self.xss_patterns:
            if pattern.search(value):
                logger.warning("xss_attempt", extra={"value": value[:100]})
                return {"safe": False, "reason": "Potential XSS detected"}
        return {"safe": True}

    def check_path_traversal(self, value: str) -> dict:
        for pattern in self.path_patterns:
            if pattern.search(value):
                logger.warning("path_traversal_attempt", extra={"value": value[:100]})
                return {"safe": False, "reason": "Potential path traversal detected"}
        return {"safe": True}

    def check_ssrf(self, url: str) -> dict:
        for pattern in self.ssrf_patterns:
            if pattern.search(url):
                logger.warning("ssrf_attempt", extra={"url": url[:100]})
                return {"safe": False, "reason": "Potential SSRF detected"}

        try:
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                return {"safe": False, "reason": "Invalid URL scheme"}
        except Exception:
            return {"safe": False, "reason": "Invalid URL format"}

        return {"safe": True}

    def check_header_injection(self, value: str) -> dict:
        if "\r" in value or "\n" in value:
            logger.warning("header_injection_attempt", extra={"value": value[:100]})
            return {"safe": False, "reason": "Potential header injection detected"}
        return {"safe": True}

    def check_command_injection(self, value: str) -> dict:
        dangerous_chars = ["|", ";", "&", "$", "`", "(", ")", "{", "}", "\n"]
        for char in dangerous_chars:
            if char in value:
                logger.warning("command_injection_attempt", extra={"value": value[:100]})
                return {"safe": False, "reason": "Potential command injection detected"}
        return {"safe": True}

    def validate_url(self, url: str, allowed_schemes: list[str] = None) -> dict:
        if not allowed_schemes:
            allowed_schemes = ["http", "https"]

        try:
            parsed = urlparse(url)
        except Exception:
            return {"valid": False, "reason": "Invalid URL format"}

        if parsed.scheme not in allowed_schemes:
            return {"valid": False, "reason": f"URL scheme not allowed: {parsed.scheme}"}

        ssrf_check = self.check_ssrf(url)
        if not ssrf_check["safe"]:
            return {"valid": False, "reason": ssrf_check["reason"]}

        return {"valid": True}

    def validate_redirect_url(self, url: str, allowed_hosts: list[str] = None) -> dict:
        try:
            parsed = urlparse(url)
        except Exception:
            return {"valid": False, "reason": "Invalid URL format"}

        if parsed.netloc and allowed_hosts and parsed.netloc not in allowed_hosts:
            return {"valid": False, "reason": "Redirect host not allowed"}

        if url.startswith("//"):
            return {"valid": False, "reason": "Protocol-relative URL not allowed"}

        return {"valid": True}

    def validate_input(self, value: Any, checks: list[str] = None) -> dict:
        if not isinstance(value, str):
            return {"safe": True}

        if not checks:
            checks = ["sql", "xss", "path_traversal", "header_injection"]

        for check in checks:
            if check == "sql":
                result = self.check_sql_injection(value)
                if not result["safe"]:
                    return result
            elif check == "xss":
                result = self.check_xss(value)
                if not result["safe"]:
                    return result
            elif check == "path_traversal":
                result = self.check_path_traversal(value)
                if not result["safe"]:
                    return result
            elif check == "header_injection":
                result = self.check_header_injection(value)
                if not result["safe"]:
                    return result
            elif check == "command":
                result = self.check_command_injection(value)
                if not result["safe"]:
                    return result

        return {"safe": True}
