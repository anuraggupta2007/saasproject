from unittest.mock import MagicMock, patch
from uuid import uuid4
from datetime import datetime
import pytest

from src.modules.public_api.schemas import (
    APIKeyCreate, APIKeyCreatedResponse,
    WebhookCreate, WebhookResponse,
    ConversionCreate, ConversionResponse,
    UploadCreate, UploadResponse,
    SearchRequest, SearchResponse,
    RateLimitStatus,
)
from src.modules.public_api.auth import api_key_manager, scopes_manager
from src.modules.public_api.rate_limiting import RateLimitService, TierConfig, quota_manager
from src.modules.public_api.webhooks import webhook_manager


class TestAPIKeyManager:
    def test_generate_key_returns_tuple(self):
        full_key, key_hash, key_prefix = api_key_manager.generate_key()
        assert full_key.startswith("ec_live_")
        assert len(key_hash) == 64
        assert len(key_prefix) == 16

    def test_validate_key_format_valid(self):
        full_key, _, _ = api_key_manager.generate_key()
        assert api_key_manager.validate_key_format(full_key) is True

    def test_validate_key_format_invalid(self):
        assert api_key_manager.validate_key_format("invalid") is False
        assert api_key_manager.validate_key_format("") is False
        assert api_key_manager.validate_key_format("sk_live_wrongprefix") is False

    def test_extract_key_hash(self):
        full_key, _, _ = api_key_manager.generate_key()
        key_hash = api_key_manager.extract_key_hash(full_key)
        assert len(key_hash) == 64

    def test_rotate_key_returns_new_key(self):
        full_key, _, _ = api_key_manager.rotate_key()
        assert full_key.startswith("ec_live_")


class TestScopesManager:
    def test_valid_scopes(self):
        assert scopes_manager.validate_scope("read") is True
        assert scopes_manager.validate_scope("write") is True
        assert scopes_manager.validate_scope("admin") is True
        assert scopes_manager.validate_scope("webhooks") is True

    def test_invalid_scope(self):
        assert scopes_manager.validate_scope("invalid_scope") is False

    def test_has_permission(self):
        assert scopes_manager.has_permission(["read", "write"], "read") is True
        assert scopes_manager.has_permission(["read"], "write") is False
        assert scopes_manager.has_permission(["admin"], "write") is True


class TestTierConfig:
    def test_free_tier(self):
        tier = TierConfig.get_tier("free")
        assert tier.requests_per_minute == 10
        assert tier.requests_per_hour == 200
        assert tier.requests_per_day == 1000

    def test_enterprise_tier(self):
        tier = TierConfig.get_tier("enterprise")
        assert tier.requests_per_minute == 1000
        assert tier.requests_per_hour == 50000
        assert tier.requests_per_day == 1000000

    def test_all_tiers(self):
        tiers = TierConfig.get_all_tiers()
        assert len(tiers) == 4

    def test_invalid_tier_defaults_to_free(self):
        tier = TierConfig.get_tier("invalid")
        assert tier.requests_per_minute == 10


class TestWebhookManager:
    def test_generate_signature(self):
        payload = b'{"event":"test"}'
        secret = "whsec_test123"
        signature = webhook_manager.generate_signature(payload, secret)
        assert len(signature) == 64

    def test_verify_signature_valid(self):
        payload = b'{"event":"test"}'
        secret = "whsec_test123"
        signature = webhook_manager.generate_signature(payload, secret)
        assert webhook_manager.verify_signature(payload, signature, secret) is True

    def test_verify_signature_invalid(self):
        payload = b'{"event":"test"}'
        secret = "whsec_test123"
        assert webhook_manager.verify_signature(payload, "invalid_sig", secret) is False

    def test_calculate_retry_delay(self):
        assert webhook_manager.calculate_retry_delay(1) == 30
        assert webhook_manager.calculate_retry_delay(2) == 120
        assert webhook_manager.calculate_retry_delay(3) == 600
        assert webhook_manager.calculate_retry_delay(4) == 3600
        assert webhook_manager.calculate_retry_delay(5) == 3600


class TestSchemas:
    def test_api_key_create(self):
        key = APIKeyCreate(name="test", scopes=["read", "write"])
        assert key.name == "test"
        assert key.scopes == ["read", "write"]

    def test_webhook_create(self):
        wh = WebhookCreate(url="https://example.com/hook", events=["conversion.completed"])
        assert wh.url == "https://example.com/hook"
        assert "conversion.completed" in wh.events

    def test_conversion_create(self):
        conv = ConversionCreate(upload_id=uuid4(), target_format="pdf")
        assert conv.target_format == "pdf"

    def test_search_request(self):
        req = SearchRequest(query="from:test@example.com", page=1, page_size=10)
        assert req.query == "from:test@example.com"

    def test_rate_limit_status(self):
        status = RateLimitStatus(
            tier="free", requests_per_minute=10, requests_per_hour=200,
            requests_per_day=1000, burst_limit=20,
            current_minute_usage=0, current_hour_usage=0,
            current_day_usage=0, reset_at=datetime.utcnow(),
        )
        assert status.tier == "free"
