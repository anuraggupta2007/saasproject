import base64
from datetime import datetime

from src.modules.conversion.strategies.base import (
    ConversionStrategy,
    ConversionContext,
    ConversionResult,
)


class MhtmlConversionStrategy(ConversionStrategy):
    def get_format(self) -> str:
        return "mhtml"

    def get_content_type(self) -> str:
        return "multipart/related"

    def get_file_extension(self) -> str:
        return ".mhtml"

    def validate_context(self, context: ConversionContext) -> list[str]:
        return []

    async def convert(self, context: ConversionContext) -> ConversionResult:
        errors = self.validate_context(context)
        if errors:
            return ConversionResult(success=False, errors=errors)

        try:
            mhtml_content = self._generate_mhtml(context)
            filename = self.get_default_filename(context)

            return ConversionResult(
                success=True,
                content=mhtml_content,
                filename=filename,
                content_type=self.get_content_type(),
                file_size=len(mhtml_content.encode("utf-8")),
                metadata={
                    "format": "mhtml",
                    "self_contained": True,
                },
            )

        except Exception as e:
            return ConversionResult(
                success=False,
                errors=[f"MHTML conversion failed: {str(e)}"],
            )

    def _generate_mhtml(self, context: ConversionContext) -> str:
        boundary = f"----=_NextPart_{context.message_id[:8]}"

        lines = []

        lines.append("MIME-Version: 1.0")
        lines.append(f'Content-Type: multipart/related; boundary="{boundary}"')
        lines.append("")
        lines.append(f"--{boundary}")

        html_content = context.html_body or ""
        if not html_content and context.text_body:
            html_content = f"<pre>{context.text_body}</pre>"
        elif not html_content:
            html_content = "<p>No content</p>"

        lines.append("Content-Type: text/html; charset=utf-8")
        lines.append("Content-Transfer-Encoding: quoted-printable")
        lines.append("")
        lines.append(html_content)
        lines.append("")

        if context.attachments:
            for att in context.attachments:
                content = att.get("content", b"")
                if isinstance(content, str):
                    content = content.encode("utf-8")

                filename = att.get("filename", "attachment")
                content_type = att.get("content_type", "application/octet-stream")
                content_id = att.get("content_id")

                encoded = base64.b64encode(content).decode("ascii")

                lines.append(f"--{boundary}")

                if content_id:
                    lines.append(f"Content-Type: {content_type}")
                    lines.append(f"Content-ID: <{content_id}>")
                    lines.append("Content-Transfer-Encoding: base64")
                    lines.append(f'Content-Disposition: inline; filename="{filename}"')
                else:
                    lines.append(f"Content-Type: {content_type}")
                    lines.append("Content-Transfer-Encoding: base64")
                    lines.append(f'Content-Disposition: attachment; filename="{filename}"')

                lines.append("")
                for i in range(0, len(encoded), 76):
                    lines.append(encoded[i:i+76])
                lines.append("")

        lines.append(f"--{boundary}--")

        return "\r\n".join(lines)
