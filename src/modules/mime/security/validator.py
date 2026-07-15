import re
from typing import Any

from src.core.logging import get_logger

logger = get_logger(__name__)


class SecurityValidator:
    def __init__(self):
        self.max_message_size = 100 * 1024 * 1024  # 100MB
        self.max_part_count = 1000
        self.max_nesting_depth = 50
        self.max_header_length = 10000

        self.dangerous_content_types = {
            "application/x-executable",
            "application/x-msdownload",
            "application/x-elf",
            "application/x-mach-binary",
            "application/x-sharedlib",
        }

        self.suspicious_patterns = [
            r"<script[^>]*>",
            r"javascript\s*:",
            r"vbscript\s*:",
            r"data\s*:application",
            r"onclick\s*=",
            r"onerror\s*=",
            r"<iframe[^>]*>",
            r"<object[^>]*>",
            r"<embed[^>]*>",
            r"<applet[^>]*>",
        ]

        self.phishing_patterns = [
            r"verify\s+your\s+account",
            r"confirm\s+your\s+password",
            r"update\s+your\s+account",
            r"security\s+alert",
            r"unusual\s+sign.?in",
            r"account\s+suspended",
            r"click\s+here\s+immediately",
            r"act\s+now",
            r"limited\s+time",
        ]

    def validate_message(
        self,
        message_size: int,
        part_count: int,
        nesting_depth: int,
        headers: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        flags = []
        details = []

        if message_size > self.max_message_size:
            flags.append("oversized")
            details.append(f"Message size {message_size} exceeds maximum {self.max_message_size}")

        if part_count > self.max_part_count:
            flags.append("too_many_parts")
            details.append(f"Part count {part_count} exceeds maximum {self.max_part_count}")

        if nesting_depth > self.max_nesting_depth:
            flags.append("deep_nesting")
            details.append(f"Nesting depth {nesting_depth} exceeds maximum {self.max_nesting_depth}")

        if headers:
            header_result = self._validate_headers(headers)
            flags.extend(header_result["flags"])
            details.extend(header_result["details"])

        security_flag = "none"
        if "dangerous" in flags:
            security_flag = "dangerous"
        elif flags:
            security_flag = "suspicious"

        return {
            "is_safe": len(flags) == 0,
            "flag": security_flag,
            "flags": flags,
            "details": details,
        }

    def validate_part(
        self,
        content_type: str,
        content_disposition: str | None,
        filename: str | None,
        content_id: str | None,
        payload: bytes | None = None,
    ) -> dict[str, Any]:
        flags = []
        details = []

        if content_type in self.dangerous_content_types:
            flags.append("dangerous_content_type")
            details.append(f"Dangerous content type: {content_type}")

        if filename:
            filename_result = self._validate_filename(filename)
            flags.extend(filename_result["flags"])
            details.extend(filename_result["details"])

        if payload:
            payload_result = self._validate_payload(payload, content_type)
            flags.extend(payload_result["flags"])
            details.extend(payload_result["details"])

        if content_id:
            cid_result = self._validate_content_id(content_id)
            flags.extend(cid_result["flags"])
            details.extend(cid_result["details"])

        security_flag = "none"
        if "dangerous" in flags:
            security_flag = "dangerous"
        elif flags:
            security_flag = "suspicious"

        return {
            "is_safe": len(flags) == 0,
            "flag": security_flag,
            "flags": flags,
            "details": details,
        }

    def _validate_headers(
        self,
        headers: dict[str, Any],
    ) -> dict[str, Any]:
        flags = []
        details = []

        for key, value in headers.items():
            if len(str(value)) > self.max_header_length:
                flags.append("long_header")
                details.append(f"Header {key} exceeds maximum length")

            if key.lower() == "x-mailer":
                suspicious_mailers = [
                    "phpmailer",
                    "swiftmailer",
                    "python",
                    "perl",
                    "ruby",
                ]
                value_lower = str(value).lower()
                for mailer in suspicious_mailers:
                    if mailer in value_lower:
                        flags.append("suspicious_mailer")
                        details.append(f"Suspicious X-Mailer: {value}")
                        break

        return {"flags": flags, "details": details}

    def _validate_filename(
        self,
        filename: str,
    ) -> dict[str, Any]:
        flags = []
        details = []

        if ".." in filename:
            flags.append("path_traversal")
            details.append(f"Path traversal in filename: {filename}")

        if "/" in filename or "\\" in filename:
            flags.append("path_separator")
            details.append(f"Path separator in filename: {filename}")

        dangerous_chars = set('<>:"|?*')
        if any(c in filename for c in dangerous_chars):
            flags.append("dangerous_chars")
            details.append(f"Dangerous characters in filename: {filename}")

        if len(filename) > 255:
            flags.append("long_filename")
            details.append(f"Filename exceeds maximum length: {len(filename)}")

        hidden_patterns = [r"^\.", r"\. exe", r"\.scr", r"\.bat"]
        for pattern in hidden_patterns:
            if re.search(pattern, filename, re.IGNORECASE):
                flags.append("hidden_file")
                details.append(f"Potentially hidden file: {filename}")
                break

        return {"flags": flags, "details": details}

    def _validate_payload(
        self,
        payload: bytes,
        content_type: str,
    ) -> dict[str, Any]:
        flags = []
        details = []

        if len(payload) > self.max_message_size:
            flags.append("oversized_payload")
            details.append(f"Payload size {len(payload)} exceeds maximum")

        if content_type.startswith("text/"):
            try:
                text = payload.decode("utf-8", errors="strict")
                for pattern in self.suspicious_patterns:
                    if re.search(pattern, text, re.IGNORECASE):
                        flags.append("suspicious_content")
                        details.append(f"Suspicious pattern found: {pattern}")
                        break
            except UnicodeDecodeError:
                pass

        if content_type.startswith("text/"):
            try:
                text = payload.decode("utf-8", errors="replace")
                for pattern in self.phishing_patterns:
                    if re.search(pattern, text, re.IGNORECASE):
                        flags.append("phishing_content")
                        details.append(f"Potential phishing: {pattern}")
                        break
            except Exception:
                pass

        if payload[:2] == b"MZ" and content_type not in self.dangerous_content_types:
            flags.append("executable_content")
            details.append("Executable content detected")

        return {"flags": flags, "details": details}

    def _validate_content_id(
        self,
        content_id: str,
    ) -> dict[str, Any]:
        flags = []
        details = []

        if len(content_id) > 500:
            flags.append("long_content_id")
            details.append(f"Content-ID exceeds maximum length: {len(content_id)}")

        if ".." in content_id or "/" in content_id:
            flags.append("suspicious_content_id")
            details.append(f"Suspicious Content-ID: {content_id}")

        return {"flags": flags, "details": details}

    def scan_html_content(self, html: str) -> dict[str, Any]:
        flags = []
        details = []

        for pattern in self.suspicious_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            if matches:
                flags.append("suspicious_html")
                details.append(f"Found {len(matches)} instances of {pattern}")

        xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript\s*:",
            r"on\w+\s*=",
            r"<img[^>]+onerror",
            r"<svg[^>]+onload",
        ]

        for pattern in xss_patterns:
            if re.search(pattern, html, re.IGNORECASE | re.DOTALL):
                flags.append("xss_attempt")
                details.append(f"Potential XSS: {pattern}")
                break

        return {
            "is_safe": "xss_attempt" not in flags,
            "flag": "dangerous" if "xss_attempt" in flags else ("suspicious" if flags else "none"),
            "flags": flags,
            "details": details,
        }

    def get_security_summary(
        self,
        message_flags: list[str],
        part_flags: list[list[str]],
    ) -> dict[str, Any]:
        all_flags = message_flags.copy()
        for flags in part_flags:
            all_flags.extend(flags)

        dangerous_count = sum(1 for f in all_flags if f.startswith("dangerous"))
        suspicious_count = sum(1 for f in all_flags if f.startswith("suspicious"))

        if dangerous_count > 0:
            overall = "dangerous"
        elif suspicious_count > 0:
            overall = "suspicious"
        else:
            overall = "safe"

        return {
            "overall_status": overall,
            "dangerous_count": dangerous_count,
            "suspicious_count": suspicious_count,
            "total_flags": len(all_flags),
            "unique_flags": list(set(all_flags)),
        }
