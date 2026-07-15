import re
from typing import Any

from src.core.logging import get_logger

logger = get_logger(__name__)


class TextProcessor:
    def __init__(self):
        self.max_preview_length = 500
        self.max_line_length = 1000

        self.signature_patterns = [
            r"--\s*\n.*",
            r"________________________________.*",
            r"-----Original Message-----.*",
            r"On\s+\w{3},\s+\d{1,2}\s+\w+\s+\d{4}.*",
            r"From:\s+.*",
            r"Sent:\s+.*",
            r"Subject:\s+.*",
        ]

        self.quote_patterns = [
            r"^>.*$",
            r"^On\s+.*wrote:.*$",
            r"^_{5,}$",
            r"^-{5,}$",
            r"^={5,}$",
        ]

    def process(
        self,
        text: str,
        charset: str | None = None,
        generate_preview: bool = True,
        preview_length: int | None = None,
    ) -> dict[str, Any]:
        if not text:
            return {
                "text": "",
                "size": 0,
                "preview": None,
                "line_count": 0,
                "word_count": 0,
                "has_signature": False,
                "has_quoted_text": False,
            }

        text = self._normalize_line_endings(text)
        text = self._remove_invalid_characters(text)
        text = self._normalize_whitespace(text)

        has_signature = self._has_signature(text)
        has_quoted = self._has_quoted_text(text)

        preview = None
        if generate_preview:
            preview = self._generate_preview(
                text,
                preview_length or self.max_preview_length,
            )

        line_count = len(text.splitlines())
        word_count = len(text.split())

        return {
            "text": text,
            "size": len(text.encode("utf-8")),
            "preview": preview,
            "line_count": line_count,
            "word_count": word_count,
            "has_signature": has_signature,
            "has_quoted_text": has_quoted,
        }

    def _normalize_line_endings(self, text: str) -> str:
        text = text.replace("\r\n", "\n")
        text = text.replace("\r", "\n")
        return text

    def _remove_invalid_characters(self, text: str) -> str:
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

        text = re.sub(
            r"[\ud800-\udfff\udc00-\udfff]",
            "",
            text,
        )

        return text

    def _normalize_whitespace(self, text: str) -> str:
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r" *\n", "\n", text)
        return text.strip()

    def _has_signature(self, text: str) -> bool:
        lines = text.splitlines()

        if len(lines) < 3:
            return False

        last_lines = "\n".join(lines[-20:])

        for pattern in self.signature_patterns:
            if re.search(pattern, last_lines, re.MULTILINE | re.IGNORECASE):
                return True

        return False

    def _has_quoted_text(self, text: str) -> bool:
        lines = text.splitlines()

        quote_count = 0
        for line in lines:
            for pattern in self.quote_patterns:
                if re.match(pattern, line, re.MULTILINE):
                    quote_count += 1
                    break

        return quote_count > 3

    def _generate_preview(
        self,
        text: str,
        max_length: int,
    ) -> str:
        if len(text) <= max_length:
            return text

        truncated = text[:max_length]

        last_sentence = max(
            truncated.rfind("."),
            truncated.rfind("!"),
            truncated.rfind("?"),
            truncated.rfind("\n"),
        )

        if last_sentence > max_length * 0.5:
            return truncated[: last_sentence + 1].strip()

        last_space = truncated.rfind(" ")
        if last_space > max_length * 0.5:
            return truncated[:last_space].strip() + "..."

        return truncated.strip() + "..."

    def extract_quoted_text(self, text: str) -> str:
        lines = text.splitlines()
        quoted_lines = []
        in_quote = False

        for line in lines:
            if re.match(r"^>", line):
                in_quote = True
                quoted_lines.append(line.lstrip("> ").strip())
            elif in_quote and line.strip() == "":
                continue
            elif in_quote:
                in_quote = False

        return "\n".join(quoted_lines)

    def extract_signature(self, text: str) -> str | None:
        lines = text.splitlines()

        if len(lines) < 3:
            return None

        signature_start = -1

        for i, line in enumerate(lines):
            if line.strip() in ("--", "---", "-- ", "--- "):
                signature_start = i
                break

            for pattern in self.quote_patterns:
                if re.match(pattern, line):
                    signature_start = i
                    break

            if signature_start != -1:
                break

        if signature_start == -1:
            return None

        return "\n".join(lines[signature_start:])

    def count_words(self, text: str) -> int:
        return len(text.split())

    def count_sentences(self, text: str) -> int:
        sentences = re.split(r"[.!?]+", text)
        return len([s for s in sentences if s.strip()])

    def estimate_reading_time(
        self,
        text: str,
        words_per_minute: int = 200,
    ) -> float:
        word_count = self.count_words(text)
        return word_count / words_per_minute

    def extract_urls(self, text: str) -> list[str]:
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, text)
        return list(set(urls))

    def extract_email_addresses(self, text: str) -> list[str]:
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, text)
        return list(set(emails))

    def detect_language_hints(self, text: str) -> dict[str, Any]:
        hints = {
            "has_cjk": bool(re.search(r"[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]", text)),
            "has_cyrillic": bool(re.search(r"[\u0400-\u04ff]", text)),
            "has_arabic": bool(re.search(r"[\u0600-\u06ff]", text)),
            "has_hebrew": bool(re.search(r"[\u0590-\u05ff]", text)),
            "has_thai": bool(re.search(r"[\u0e00-\u0e7f]", text)),
            "has_devanagari": bool(re.search(r"[\u0900-\u097f]", text)),
        }

        hints["dominant_script"] = "latin"
        if hints["has_cjk"]:
            hints["dominant_script"] = "cjk"
        elif hints["has_cyrillic"]:
            hints["dominant_script"] = "cyrillic"
        elif hints["has_arabic"]:
            hints["dominant_script"] = "arabic"

        return hints
