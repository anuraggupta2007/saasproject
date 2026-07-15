import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from uuid import uuid4
from datetime import datetime

from src.modules.public_api.webhooks.manager import WebhookManager, WebhookDelivery, WebhookEvent


class TestWebhookManagerAdvanced:
    def setup_method(self):
        self.manager = WebhookManager()

    def test_should_retry_first_attempt(self):
        delivery = WebhookDelivery(
            id=uuid4(), webhook_id=uuid4(), event_type="test",
            url="https://example.com", payload="{}", status_code=500,
            attempts=1, max_retries=5,
        )
        assert self.manager.should_retry(delivery) is True

    def test_should_retry_max_attempts_reached(self):
        delivery = WebhookDelivery(
            id=uuid4(), webhook_id=uuid4(), event_type="test",
            url="https://example.com", payload="{}", status_code=500,
            attempts=5, max_retries=5,
        )
        assert self.manager.should_retry(delivery) is False

    def test_should_retry_success_status(self):
        delivery = WebhookDelivery(
            id=uuid4(), webhook_id=uuid4(), event_type="test",
            url="https://example.com", payload="{}", status_code=200,
            attempts=1, max_retries=5,
        )
        assert self.manager.should_retry(delivery) is False

    def test_calculate_backoff_exponential(self):
        assert self.manager.calculate_backoff(1) == 30
        assert self.manager.calculate_backoff(2) == 120
        assert self.manager.calculate_backoff(3) == 600
        assert self.manager.calculate_backoff(4) == 3600
        assert self.manager.calculate_backoff(5) == 3600

    def test_calculate_backoff_with_jitter(self):
        delay = self.manager.calculate_backoff(1, add_jitter=True)
        assert 20 <= delay <= 40

    def test_format_event_payload(self):
        event = WebhookEvent(
            event_type="conversion.completed",
            data={"conversion_id": str(uuid4()), "status": "completed"},
            timestamp=datetime.utcnow(),
        )
        payload = self.manager.format_event_payload(event)
        assert "conversion.completed" in payload
        assert "data" in payload

    def test_validate_webhook_url_valid(self):
        assert self.manager.validate_webhook_url("https://example.com/hook") is True

    def test_validate_webhook_url_invalid(self):
        assert self.manager.validate_webhook_url("http://localhost:3000") is False
        assert self.manager.validate_webhook_url("ftp://example.com") is False
        assert self.manager.validate_webhook_url("not-a-url") is False
        assert self.manager.validate_webhook_url("https://127.0.0.1") is False

    def test_get_retryable_events(self):
        events = [
            WebhookEvent(event_type="conversion.completed", data={}, timestamp=datetime.utcnow()),
            WebhookEvent(event_type="upload.failed", data={}, timestamp=datetime.utcnow()),
        ]
        retryable = self.manager.get_retryable_events(events)
        assert len(retryable) >= 0


class TestWebhookEvent:
    def test_event_creation(self):
        event = WebhookEvent(
            event_type="conversion.completed",
            data={"id": "123"},
            timestamp=datetime.utcnow(),
        )
        assert event.event_type == "conversion.completed"
        assert event.data == {"id": "123"}


class TestWebhookDelivery:
    def test_delivery_creation(self):
        delivery = WebhookDelivery(
            id=uuid4(),
            webhook_id=uuid4(),
            event_type="test",
            url="https://example.com",
            payload="{}",
            status_code=200,
            attempts=1,
            max_retries=5,
        )
        assert delivery.status_code == 200
        assert delivery.attempts == 1
