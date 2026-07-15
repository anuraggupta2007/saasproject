import httpx
from typing import Optional

from src.core.config import settings
from src.core.logging import get_logger
from src.modules.notification.providers.base import EmailProviderBase, MessageResult

logger = get_logger(__name__)


class SendGridEmailProvider(EmailProviderBase):
    def __init__(self):
        self.api_key = settings.SENDGRID_API_KEY
        self.from_email = settings.SMTP_FROM
        self.base_url = "https://api.sendgrid.com/v3"

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
            payload = {
                "personalizations": [
                    {
                        "to": [{"email": to}],
                        "subject": subject,
                    }
                ],
                "from": {
                    "email": from_email or self.from_email,
                    "name": from_name or "Email Converter",
                },
                "content": [
                    {"type": "text/plain", "value": body_text}
                ],
            }

            if body_html:
                payload["content"].append({"type": "text/html", "value": body_html})

            if reply_to:
                payload["reply_to"] = {"email": reply_to}

            if metadata:
                payload["custom_args"] = metadata

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/mail/send",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                )

                if response.status_code in [200, 202]:
                    message_id = response.headers.get("X-Message-Id", "")
                    logger.info(
                        "sendgrid_email_sent",
                        to=to,
                        subject=subject,
                        message_id=message_id,
                    )
                    return MessageResult(
                        success=True,
                        message_id=message_id,
                        status="sent",
                    )
                else:
                    error_data = response.json() if response.text else {}
                    error_msg = error_data.get("errors", [{}])[0].get("message", "Unknown error")
                    logger.error(
                        "sendgrid_email_failed",
                        to=to,
                        status_code=response.status_code,
                        error=error_msg,
                    )
                    return MessageResult(
                        success=False,
                        error_message=error_msg,
                    )

        except Exception as e:
            logger.error("sendgrid_email_error", to=to, error=str(e))
            return MessageResult(success=False, error_message=str(e))

    async def send_bulk(
        self,
        recipients: list[dict],
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        from_email: Optional[str] = None,
    ) -> list[MessageResult]:
        try:
            personalizations = [
                {"to": [{"email": r.get("email")}]} for r in recipients
            ]

            payload = {
                "personalizations": personalizations,
                "from": {"email": from_email or self.from_email},
                "subject": subject,
                "content": [
                    {"type": "text/plain", "value": body_text}
                ],
            }

            if body_html:
                payload["content"].append({"type": "text/html", "value": body_html})

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/mail/send",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                )

                success = response.status_code in [200, 202]
                return [
                    MessageResult(success=success, status="sent" if success else "failed")
                    for _ in recipients
                ]

        except Exception as e:
            logger.error("sendgrid_bulk_error", error=str(e))
            return [
                MessageResult(success=False, error_message=str(e))
                for _ in recipients
            ]

    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        secret: str,
    ) -> bool:
        import hmac
        import hashlib
        expected = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    async def get_delivery_status(
        self,
        message_id: str,
    ) -> Optional[dict]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/messages/{message_id}",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                if response.status_code == 200:
                    return response.json()
        except Exception:
            pass
        return None
