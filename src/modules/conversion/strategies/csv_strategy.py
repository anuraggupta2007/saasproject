import csv
import io

from src.modules.conversion.strategies.base import (
    ConversionStrategy,
    ConversionContext,
    ConversionResult,
)


class CsvConversionStrategy(ConversionStrategy):
    def get_format(self) -> str:
        return "csv"

    def get_content_type(self) -> str:
        return "text/csv"

    def get_file_extension(self) -> str:
        return ".csv"

    def validate_context(self, context: ConversionContext) -> list[str]:
        return []

    async def convert(self, context: ConversionContext) -> ConversionResult:
        errors = self.validate_context(context)
        if errors:
            return ConversionResult(success=False, errors=errors)

        try:
            csv_content = self._generate_csv(context)
            filename = self.get_default_filename(context)

            return ConversionResult(
                success=True,
                content=csv_content,
                filename=filename,
                content_type=self.get_content_type(),
                file_size=len(csv_content.encode("utf-8")),
                metadata={
                    "format": "csv",
                    "rows": 1,
                },
            )

        except Exception as e:
            return ConversionResult(
                success=False,
                errors=[f"CSV conversion failed: {str(e)}"],
            )

    def _generate_csv(self, context: ConversionContext) -> str:
        output = io.StringIO()

        writer = csv.writer(output, quoting=csv.QUOTE_ALL)

        writer.writerow([
            "Subject",
            "From",
            "To",
            "Cc",
            "Date",
            "Has Attachments",
            "Attachment Count",
            "Attachment Names",
            "Content Type",
            "Size",
            "Message ID",
        ])

        to_str = "; ".join(context.to_addresses or [])
        cc_str = "; ".join(context.cc_addresses or [])
        attachment_count = len(context.attachments) if context.attachments else 0
        attachment_names = "; ".join(
            att.get("filename", "") for att in (context.attachments or [])
        )

        body = context.text_body or context.html_body or ""
        size = len(body.encode("utf-8"))

        content_type = "text/html" if context.html_body else "text/plain"

        writer.writerow([
            context.subject or "",
            context.from_address or "",
            to_str,
            cc_str,
            context.date or "",
            "Yes" if context.attachments else "No",
            attachment_count,
            attachment_names,
            content_type,
            size,
            context.message_id,
        ])

        return output.getvalue()
