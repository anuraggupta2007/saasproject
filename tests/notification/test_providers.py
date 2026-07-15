import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.modules.notification.providers.smtp_provider import SMTPEmailProvider
from src.modules.notification.providers.sendgrid_provider import SendGridEmailProvider
from src.modules.notification.providers.twilio_provider import TwilioSMSProvider


class TestSMTPEmailProvider:
    def setup_method(self):
        self.provider = SMTPEmailProvider()

    @pytest.mark.asyncio
    async def test_send_email(self):
        with patch("aiosmtplib.send") as mock_send:
            mock_send.return_value = None

            result = await self.provider.send_email(
                to="test@example.com",
                subject="Test",
                body_text="Hello World",
            )

            assert result.success is True

    @pytest.mark.asyncio
    async def test_send_email_failure(self):
        with patch("aiosmtplib.send") as mock_send:
            mock_send.side_effect = Exception("SMTP Error")

            result = await self.provider.send_email(
                to="test@example.com",
                subject="Test",
                body_text="Hello World",
            )

            assert result.success is False
            assert "SMTP Error" in result.error_message


class TestSendGridEmailProvider:
    def setup_method(self):
        self.provider = SendGridEmailProvider()

    @pytest.mark.asyncio
    async def test_send_email(self):
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 202
            mock_response.headers = {"X-Message-Id": "msg_123"}
            mock_response.text = ""

            mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.return_value.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_response)

            result = await self.provider.send_email(
                to="test@example.com",
                subject="Test",
                body_text="Hello World",
            )

            assert result.success is True

    @pytest.mark.asyncio
    async def test_send_email_failure(self):
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 400
            mock_response.json.return_value = {
                "errors": [{"message": "Invalid email"}]
            }

            mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.return_value.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_response)

            result = await self.provider.send_email(
                to="invalid-email",
                subject="Test",
                body_text="Hello World",
            )

            assert result.success is False


class TestTwilioSMSProvider:
    def setup_method(self):
        self.provider = TwilioSMSProvider()

    @pytest.mark.asyncio
    async def test_send_sms(self):
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 201
            mock_response.json.return_value = {"sid": "SM_123"}

            mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.return_value.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_response)

            result = await self.provider.send_sms(
                to="+1234567890",
                message="Test SMS",
            )

            assert result.success is True
            assert result.message_id == "SM_123"

    @pytest.mark.asyncio
    async def test_send_sms_failure(self):
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 400
            mock_response.json.return_value = {"message": "Invalid number"}

            mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.return_value.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_response)

            result = await self.provider.send_sms(
                to="invalid",
                message="Test SMS",
            )

            assert result.success is False
