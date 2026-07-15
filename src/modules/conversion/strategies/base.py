from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any
from pathlib import Path


@dataclass
class ConversionContext:
    message_id: str
    subject: str | None = None
    from_address: str | None = None
    to_addresses: list[str] | None = None
    cc_addresses: list[str] | None = None
    date: str | None = None
    headers: dict[str, Any] | None = None
    html_body: str | None = None
    text_body: str | None = None
    attachments: list[dict[str, Any]] | None = None
    mime_parts: list[dict[str, Any]] | None = None
    metadata: dict[str, Any] | None = None
    options: dict[str, Any] | None = None


@dataclass
class ConversionResult:
    success: bool
    content: str | bytes | None = None
    filename: str | None = None
    content_type: str | None = None
    file_size: int = 0
    output_hash: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class ConversionStrategy(ABC):
    @abstractmethod
    def get_format(self) -> str:
        pass

    @abstractmethod
    def get_content_type(self) -> str:
        pass

    @abstractmethod
    def get_file_extension(self) -> str:
        pass

    @abstractmethod
    async def convert(self, context: ConversionContext) -> ConversionResult:
        pass

    @abstractmethod
    def validate_context(self, context: ConversionContext) -> list[str]:
        pass

    def get_default_filename(self, context: ConversionContext) -> str:
        subject = context.subject or "email"
        safe_subject = "".join(
            c if c.isalnum() or c in "-_ " else "_"
            for c in subject
        ).strip()[:100]
        return f"{safe_subject}{self.get_file_extension()}"

    def _escape_html(self, text: str) -> str:
        import html
        return html.escape(text)

    def _format_date(self, date_str: str | None) -> str:
        if not date_str:
            return "Unknown"
        return date_str

    def _truncate_text(self, text: str, max_length: int = 500) -> str:
        if len(text) <= max_length:
            return text
        return text[:max_length] + "..."
