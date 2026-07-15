import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from src.core.config import settings
from src.core.logging import get_logger
from src.modules.notification.providers.base import EmailProviderBase, MessageResult

logger = get_logger(__name__)


class SMTPEmailProvider(EmailProviderBase):
    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.use_tls = settings.SMTP_TLS
        self.from_email = settings.SMTP_FROM

    async def send_email(
        self,
        to: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
        attachments: Optional[list] = None,
        metadata: Optional[dict] = None,
    ) -> MessageResult:
        try:
            message = MIMEMultipart("alternative")
            message["From"] = f"{from_name or 'Email Converter'} <{from_email or self.from_email}>"
            message["To"] = to
            message["Subject"] = subject

            if reply_to:
                message["Reply-To"] = reply_to

            text_part = MIMEText(body_text, "plain")
            message.attach(text_part)

            if body_html:
                html_part = MIMEText(body_html, "html")
                message.attach(html_part)

            await aiosmtplib.send(
                message,
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                use_tls=self.use_tls,
            )

            logger.info(
                "email_sent",
                to=to,
                subject=subject,
            )

            return MessageResult(
                success=True,
                message_id=message["Message-ID"],
                status="sent",
            )

        except Exception as e:
            logger.error(
                "email_send_failed",
                to=to,
                error=str(e),
            )
            return MessageResult(
                success=False,
                error_message=str(e),
            )

    async def send_bulk(
        self,
        recipients: list[dict],
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        from_email: Optional[str] = None,
    ) -> list[MessageResult]:
        results = []
        for recipient in recipients:
            result = await self.send_email(
                to=recipient.get("email"),
                subject=subject,
                body_text=body_text,
                body_html=body_html,
                from_email=from_email,
            )
            results.append(result)
        return results

    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        secret: str,
    ) -> bool:
        return True

    async def get_delivery_status(
        self,
        message_id: str,
    ) -> Optional[dict]:
        return {"status": "unknown", "message_id": message_id}
