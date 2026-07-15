import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from email.utils import formatdate, parseaddr
import time

from src.modules.conversion.strategies.base import (
    ConversionStrategy,
    ConversionContext,
    ConversionResult,
)


class EmlConversionStrategy(ConversionStrategy):
    def get_format(self) -> str:
        return "eml"

    def get_content_type(self) -> str:
        return "message/rfc822"

    def get_file_extension(self) -> str:
        return ".eml"

    def validate_context(self, context: ConversionContext) -> list[str]:
        errors = []
        if not context.subject and not context.from_address:
            errors.append("Email should have at least a subject or from address")
        return errors

    async def convert(self, context: ConversionContext) -> ConversionResult:
        errors = self.validate_context(context)
        if errors:
            return ConversionResult(success=False, errors=errors)

        try:
            msg = MIMEMultipart("mixed")

            if context.headers:
                for key, value in context.headers.items():
                    if key.lower() not in ("from", "to", "cc", "subject", "date"):
                        if isinstance(value, list):
                            for v in value:
                                msg[key] = v
                        else:
                            msg[key] = value

            msg["Subject"] = context.subject or ""
            msg["From"] = context.from_address or ""

            if context.to_addresses:
                msg["To"] = ", ".join(context.to_addresses)

            if context.cc_addresses:
                msg["Cc"] = ", ".join(context.cc_addresses)

            if context.date:
                msg["Date"] = context.date
            else:
                msg["Date"] = formatdate(timeval=time.time(), localtime=True)

            msg["Message-ID"] = f"<{context.message_id}@emailconverter.local>"

            if context.html_body and context.text_body:
                alternative = MIMEMultipart("alternative")
                alternative.attach(MIMEText(context.text_body, "plain", "utf-8"))
                alternative.attach(MIMEText(context.html_body, "html", "utf-8"))
                msg.attach(alternative)
            elif context.html_body:
                msg.attach(MIMEText(context.html_body, "html", "utf-8"))
            elif context.text_body:
                msg.attach(MIMEText(context.text_body, "plain", "utf-8"))

            if context.attachments:
                for att in context.attachments:
                    part = MIMEBase("application", "octet-stream")
                    content = att.get("content", b"")
                    if isinstance(content, str):
                        content = content.encode("utf-8")
                    part.set_payload(content)
                    encoders.encode_base64(part)

                    filename = att.get("filename", "attachment")
                    part.add_header(
                        "Content-Disposition",
                        f'attachment; filename="{filename}"',
                    )

                    if att.get("content_type"):
                        part.set_type(att["content_type"])

                    msg.attach(part)

            eml_content = msg.as_string()

            filename = self.get_default_filename(context)

            return ConversionResult(
                success=True,
                content=eml_content,
                filename=filename,
                content_type=self.get_content_type(),
                file_size=len(eml_content.encode("utf-8")),
                metadata={
                    "format": "eml",
                    "rfc_compliant": True,
                    "has_attachments": bool(context.attachments),
                    "has_html": bool(context.html_body),
                    "has_text": bool(context.text_body),
                },
            )

        except Exception as e:
            return ConversionResult(
                success=False,
                errors=[f"EML conversion failed: {str(e)}"],
            )
