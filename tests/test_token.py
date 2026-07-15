import uuid
from datetime import datetime, timedelta

import pytest

from src.services.auth.token import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_user_id_from_token,
    get_token_type,
    get_token_jti,
    is_token_expired,
)
from src.core.exceptions import UnauthorizedException


class TestAccessToken:
    def test_create_access_token(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        assert isinstance(token, str)
        assert len(token) > 0

    def test_decode_access_token(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "access"
        assert "exp" in payload
        assert "iat" in payload

    def test_access_token_with_custom_expiry(self):
        user_id = uuid.uuid4()
        expires_delta = timedelta(hours=1)
        token = create_access_token(user_id, expires_delta=expires_delta)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)

    def test_access_token_with_claims(self):
        user_id = uuid.uuid4()
        claims = {"role": "admin", "permissions": ["read", "write"]}
        token = create_access_token(user_id, claims=claims)
        payload = decode_token(token)
        assert payload["role"] == "admin"
        assert payload["permissions"] == ["read", "write"]


class TestRefreshToken:
    def test_create_refresh_token(self):
        user_id = uuid.uuid4()
        token, jti, expires_at = create_refresh_token(user_id)
        assert isinstance(token, str)
        assert isinstance(jti, str)
        assert isinstance(expires_at, datetime)

    def test_decode_refresh_token(self):
        user_id = uuid.uuid4()
        token, jti, expires_at = create_refresh_token(user_id)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "refresh"
        assert payload["jti"] == jti

    def test_refresh_token_with_custom_expiry(self):
        user_id = uuid.uuid4()
        expires_delta = timedelta(days=30)
        token, jti, expires_at = create_refresh_token(user_id, expires_delta)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)

    def test_unique_jti_per_token(self):
        user_id = uuid.uuid4()
        _, jti1, _ = create_refresh_token(user_id)
        _, jti2, _ = create_refresh_token(user_id)
        assert jti1 != jti2


class TestTokenUtilities:
    def test_get_user_id_from_token(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        result = get_user_id_from_token(token)
        assert result == user_id

    def test_get_token_type_access(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        assert get_token_type(token) == "access"

    def test_get_token_type_refresh(self):
        user_id = uuid.uuid4()
        token, _, _ = create_refresh_token(user_id)
        assert get_token_type(token) == "refresh"

    def test_get_token_jti(self):
        user_id = uuid.uuid4()
        token, jti, _ = create_refresh_token(user_id)
        result = get_token_jti(token)
        assert result == jti

    def test_decode_invalid_token(self):
        with pytest.raises(UnauthorizedException):
            decode_token("invalid_token")

    def test_get_user_id_invalid_token(self):
        with pytest.raises(UnauthorizedException):
            get_user_id_from_token("invalid_token")

    def test_get_token_type_invalid_token(self):
        with pytest.raises(UnauthorizedException):
            get_token_type("invalid_token")

    def test_is_token_expired_valid(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        assert is_token_expired(token) is False

    def test_is_token_expired_invalid(self):
        assert is_token_expired("invalid_token") is True
