import httpx
from typing import Optional

from src.core.config import settings
from src.core.logging import get_logger
from src.modules.notification.providers.base import SMSProviderBase, MessageResult

logger = get_logger(__name__)


class TwilioSMSProvider(SMSProviderBase):
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_PHONE_NUMBER
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}"

    async def send_sms(
        self,
        to: str,
        message: str,
        from_number: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> MessageResult:
        try:
            import base64

            auth = base64.b64encode(
                f"{self.account_sid}:{self.auth_token}".encode()
            ).decode()

            data = {
                "To": to,
                "From": from_number or self.from_number,
                "Body": message,
            }

            if metadata:
                data["StatusCallback"] = metadata.get("status_callback")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/Messages.json",
                    data=data,
                    headers={"Authorization": f"Basic {auth}"},
                )

                if response.status_code == 201:
                    result = response.json()
                    logger.info(
                        "twilio_sms_sent",
                        to=to,
                        message_sid=result.get("sid"),
                    )
                    return MessageResult(
                        success=True,
                        message_id=result.get("sid"),
                        status="sent",
                    )
                else:
                    error = response.json()
                    error_msg = error.get("message", "Unknown error")
                    logger.error(
                        "twilio_sms_failed",
                        to=to,
                        error=error_msg,
                    )
                    return MessageResult(
                        success=False,
                        error_message=error_msg,
                    )

        except Exception as e:
            logger.error("twilio_sms_error", to=to, error=str(e))
            return MessageResult(success=False, error_message=str(e))

    async def send_bulk(
        self,
        recipients: list[dict],
        message: str,
        from_number: Optional[str] = None,
    ) -> list[MessageResult]:
        results = []
        for recipient in recipients:
            result = await self.send_sms(
                to=recipient.get("phone"),
                message=message,
                from_number=from_number,
            )
            results.append(result)
        return results

    async def get_delivery_status(
        self,
        message_id: str,
    ) -> Optional[dict]:
        try:
            import base64

            auth = base64.b64encode(
                f"{self.account_sid}:{self.auth_token}".encode()
            ).decode()

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/Messages/{message_id}.json",
                    headers={"Authorization": f"Basic {auth}"},
                )

                if response.status_code == 200:
                    return response.json()
        except Exception:
            pass
        return None
