import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4
from datetime import datetime, timedelta

from src.modules.public_api.auth import api_key_manager, jwt_manager
from src.modules.public_api.rate_limiting import RateLimitService, TierConfig, quota_manager


class TestJWTManager:
    def test_create_access_token(self):
        token = jwt_manager.create_access_token(
            user_id=uuid4(),
            email="test@example.com",
            scopes=["read", "write"],
        )
        assert isinstance(token, str)
        assert len(token) > 50

    def test_create_refresh_token(self):
        token = jwt_manager.create_refresh_token(user_id=uuid4())
        assert isinstance(token, str)
        assert len(token) > 50

    def test_decode_valid_token(self):
        user_id = uuid4()
        token = jwt_manager.create_access_token(
            user_id=user_id, email="test@example.com", scopes=["read"]
        )
        payload = jwt_manager.decode_token(token)
        assert payload is not None
        assert payload["sub"] == str(user_id)
        assert payload["email"] == "test@example.com"

    def test_decode_invalid_token(self):
        payload = jwt_manager.decode_token("invalid.token.here")
        assert payload is None

    def test_create_oauth2_token(self):
        token = jwt_manager.create_oauth2_token(
            client_id="client_123",
            user_id=uuid4(),
            scopes=["read"],
        )
        assert isinstance(token, str)
        payload = jwt_manager.decode_token(token)
        assert payload["client_id"] == "client_123"


class TestRateLimitService:
    def setup_method(self):
        self.service = RateLimitService()

    @patch("src.modules.public_api.rate_limiting.limiter.redis_client")
    def test_check_rate_limit_under_limit(self, mock_redis):
        mock_redis.get.return_value = b"5"
        allowed, remaining = self.service.check_rate_limit(
            key="test_key", tier="free", window="minute"
        )
        assert allowed is True

    @patch("src.modules.public_api.rate_limiting.limiter.redis_client")
    def test_check_rate_limit_over_limit(self, mock_redis):
        mock_redis.get.return_value = b"15"
        allowed, remaining = self.service.check_rate_limit(
            key="test_key", tier="free", window="minute"
        )
        assert allowed is False

    @patch("src.modules.public_api.rate_limiting.limiter.redis_client")
    def test_increment_counter(self, mock_redis):
        mock_redis.incr.return_value = 1
        mock_redis.expire.return_value = True
        count = self.service.increment_counter("test_key", 60)
        assert count == 1

    @patch("src.modules.public_api.rate_limiting.limiter.redis_client")
    def test_get_remaining_quota(self, mock_redis):
        mock_redis.get.return_value = b"5"
        remaining = self.service.get_remaining_quota("test_key", 100)
        assert remaining == 95


class TestQuotaManager:
    def setup_method(self):
        self.manager = quota_manager

    @patch("src.modules.public_api.rate_limiting.quota.redis_client")
    def test_get_daily_usage(self, mock_redis):
        mock_redis.get.return_value = b"42"
        usage = self.manager.get_daily_usage(uuid4())
        assert usage == 42

    @patch("src.modules.public_api.rate_limiting.quota.redis_client")
    def test_check_quota_under_limit(self, mock_redis):
        mock_redis.get.return_value = b"50"
        allowed = self.manager.check_quota(uuid4(), "free", 100)
        assert allowed is True

    @patch("src.modules.public_api.rate_limiting.quota.redis_client")
    def test_check_quota_over_limit(self, mock_redis):
        mock_redis.get.return_value = b"150"
        allowed = self.manager.check_quota(uuid4(), "free", 100)
        assert allowed is False


class TestAPIKeyManagerAdvanced:
    def test_key_uniqueness(self):
        keys = set()
        for _ in range(100):
            full_key, _, _ = api_key_manager.generate_key()
            keys.add(full_key)
        assert len(keys) == 100

    def test_hash_deterministic(self):
        full_key, key_hash, _ = api_key_manager.generate_key()
        extracted_hash = api_key_manager.extract_key_hash(full_key)
        assert extracted_hash == key_hash
