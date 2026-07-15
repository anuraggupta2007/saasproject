import uuid
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch

from src.modules.payment.services.webhook_service import WebhookService


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def webhook_service(mock_session):
    return WebhookService(mock_session)


class TestWebhookProcessing:
    @pytest.mark.asyncio
    async def test_process_stripe_payment_succeeded(self, webhook_service):
        mock_event = MagicMock()
        mock_event.id = uuid.uuid4()

        webhook_service.webhook_repo.is_duplicate = AsyncMock(return_value=False)
        webhook_service.webhook_repo.create = AsyncMock(return_value=mock_event)
        webhook_service.webhook_repo.update_status = AsyncMock()

        mock_payment = MagicMock()
        mock_payment.id = uuid.uuid4()
        webhook_service.payment_service.payment_repo.get_by_provider_payment_id = AsyncMock(
            return_value=mock_payment
        )
        webhook_service.payment_service.payment_repo.update_status = AsyncMock()

        payload = {
            "data": {
                "object": {
                    "id": "pi_123",
                }
            }
        }

        result = await webhook_service.process_webhook(
            provider="stripe",
            event_type="payment_intent.succeeded",
            provider_event_id="evt_123",
            payload=payload,
        )

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_process_stripe_payment_failed(self, webhook_service):
        mock_event = MagicMock()
        mock_event.id = uuid.uuid4()

        webhook_service.webhook_repo.is_duplicate = AsyncMock(return_value=False)
        webhook_service.webhook_repo.create = AsyncMock(return_value=mock_event)
        webhook_service.webhook_repo.update_status = AsyncMock()

        mock_payment = MagicMock()
        mock_payment.id = uuid.uuid4()
        webhook_service.payment_service.payment_repo.get_by_provider_payment_id = AsyncMock(
            return_value=mock_payment
        )
        webhook_service.payment_service.payment_repo.update_status = AsyncMock()

        payload = {
            "data": {
                "object": {
                    "id": "pi_123",
                }
            }
        }

        result = await webhook_service.process_webhook(
            provider="stripe",
            event_type="payment_intent.payment_failed",
            provider_event_id="evt_456",
            payload=payload,
        )

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_process_duplicate_event(self, webhook_service):
        webhook_service.webhook_repo.is_duplicate = AsyncMock(return_value=True)

        result = await webhook_service.process_webhook(
            provider="stripe",
            event_type="payment_intent.succeeded",
            provider_event_id="evt_123",
            payload={},
        )

        assert result["success"] is True
        assert result["message"] == "Duplicate event skipped"

    @pytest.mark.asyncio
    async def test_retry_webhook(self, webhook_service):
        mock_event = MagicMock()
        mock_event.id = uuid.uuid4()
        mock_event.retry_count = 1
        mock_event.max_retries = 3
        mock_event.provider = "stripe"
        mock_event.event_type = "payment_intent.succeeded"
        mock_event.provider_event_id = "evt_123"
        mock_event.payload = {}

        webhook_service.webhook_repo.get_by_id = AsyncMock(return_value=mock_event)
        webhook_service.webhook_repo.update_status = AsyncMock()
        webhook_service.webhook_repo.is_duplicate = AsyncMock(return_value=False)
        webhook_service.webhook_repo.create = AsyncMock(return_value=mock_event)

        mock_event2 = MagicMock()
        mock_event2.id = uuid.uuid4()
        webhook_service.webhook_repo.create = AsyncMock(return_value=mock_event2)

        result = await webhook_service.retry_webhook(mock_event.id)

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_retry_webhook_max_retries_exceeded(self, webhook_service):
        mock_event = MagicMock()
        mock_event.id = uuid.uuid4()
        mock_event.retry_count = 3
        mock_event.max_retries = 3

        webhook_service.webhook_repo.get_by_id = AsyncMock(return_value=mock_event)

        result = await webhook_service.retry_webhook(mock_event.id)

        assert result["success"] is False
        assert result["message"] == "Max retries exceeded"


class TestRazorpayWebhookProcessing:
    @pytest.mark.asyncio
    async def test_process_razorpay_payment_captured(self, webhook_service):
        mock_event = MagicMock()
        mock_event.id = uuid.uuid4()

        webhook_service.webhook_repo.is_duplicate = AsyncMock(return_value=False)
        webhook_service.webhook_repo.create = AsyncMock(return_value=mock_event)
        webhook_service.webhook_repo.update_status = AsyncMock()

        payload = {
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_123",
                    }
                }
            }
        }

        result = await webhook_service.process_webhook(
            provider="razorpay",
            event_type="payment.captured",
            provider_event_id="pay_123",
            payload=payload,
        )

        assert result["success"] is True
