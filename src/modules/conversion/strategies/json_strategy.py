import json
from datetime import datetime, timezone

from src.modules.conversion.strategies.base import (
    ConversionStrategy,
    ConversionContext,
    ConversionResult,
)


class JsonConversionStrategy(ConversionStrategy):
    def get_format(self) -> str:
        return "json"

    def get_content_type(self) -> str:
        return "application/json"

    def get_file_extension(self) -> str:
        return ".json"

    def validate_context(self, context: ConversionContext) -> list[str]:
        return []

    async def convert(self, context: ConversionContext) -> ConversionResult:
        errors = self.validate_context(context)
        if errors:
            return ConversionResult(success=False, errors=errors)

        try:
            data = self._generate_json(context)
            json_content = json.dumps(data, indent=2, ensure_ascii=False, default=str)
            filename = self.get_default_filename(context)

            return ConversionResult(
                success=True,
                content=json_content,
                filename=filename,
                content_type=self.get_content_type(),
                file_size=len(json_content.encode("utf-8")),
                metadata={
                    "format": "json",
                    "structured_data": True,
                },
            )

        except Exception as e:
            return ConversionResult(
                success=False,
                errors=[f"JSON conversion failed: {str(e)}"],
            )

    def _generate_json(self, context: ConversionContext) -> dict:
        data = {
            "metadata": {
                "format": "json",
                "version": "1.0",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "generator": "Email Converter SaaS",
            },
            "headers": {
                "subject": context.subject,
                "from": context.from_address,
                "to": context.to_addresses or [],
                "cc": context.cc_addresses or [],
                "date": context.date,
                "message_id": context.message_id,
                "custom_headers": {
                    k: v for k, v in (context.headers or {}).items()
                    if k.lower() not in ("from", "to", "cc", "subject", "date", "message-id")
                },
            },
            "body": {
                "text": context.text_body,
                "html": context.html_body,
            },
            "attachments": [],
            "mime_tree": context.mime_parts or [],
        }

        if context.attachments:
            for att in context.attachments:
                data["attachments"].append({
                    "filename": att.get("filename"),
                    "content_type": att.get("content_type"),
                    "content_id": att.get("content_id"),
                    "size": att.get("file_size"),
                    "sha256": att.get("sha256_hash"),
                    "is_inline": att.get("is_inline", False),
                    "disposition": att.get("content_disposition", "attachment"),
                })

        if context.metadata:
            data["metadata"].update(context.metadata)

        return data
