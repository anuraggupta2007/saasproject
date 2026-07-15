import hashlib
import hmac
import secrets
import time
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from passlib.context import CryptContext
import jwt

from src.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


class APIKeyManager:
    """Manages API key generation, validation, and rotation."""

    def __init__(self):
        self._prefix = "ec"
        self._separator = "_"

    def generate_key(self) -> tuple[str, str, str]:
        raw_key = secrets.token_urlsafe(32)
        full_key = f"{self._prefix}{self._separator}{raw_key}"
        key_hash = self._hash_key(full_key)
        key_prefix = full_key[:8]
        return full_key, key_hash, key_prefix

    def _hash_key(self, key: str) -> str:
        return hashlib.sha256(key.encode()).hexdigest()

    def validate_key_format(self, key: str) -> bool:
        return key.startswith(f"{self._prefix}{self._separator}") and len(key) > 10

    def extract_key_hash(self, key: str) -> Optional[str]:
        if not self.validate_key_format(key):
            return None
        return self._hash_key(key)

    def rotate_key(self) -> tuple[str, str, str]:
        return self.generate_key()


api_key_manager = APIKeyManager()


class JWTManager:
    """Manages JWT token creation and validation."""

    def __init__(self):
        self._secret = settings.SECRET_KEY
        self._algorithm = "HS256"
        self._access_ttl = 3600
        self._refresh_ttl = 86400 * 30

    def create_access_token(
        self,
        user_id: UUID,
        scopes: list[str] = None,
        api_key_id: UUID = None,
    ) -> str:
        payload = {
            "sub": str(user_id),
            "type": "access",
            "scopes": scopes or ["read"],
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(seconds=self._access_ttl),
        }
        if api_key_id:
            payload["api_key_id"] = str(api_key_id)
        return jwt.encode(payload, self._secret, algorithm=self._algorithm)

    def create_refresh_token(self, user_id: UUID) -> str:
        payload = {
            "sub": str(user_id),
            "type": "refresh",
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(seconds=self._refresh_ttl),
            "jti": secrets.token_urlsafe(16),
        }
        return jwt.encode(payload, self._secret, algorithm=self._algorithm)

    def decode_token(self, token: str) -> Optional[dict]:
        try:
            return jwt.decode(token, self._secret, algorithms=[self._algorithm])
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    def create_oauth2_token(
        self,
        client_id: str,
        user_id: UUID,
        scopes: list[str] = None,
    ) -> str:
        payload = {
            "sub": str(user_id),
            "client_id": client_id,
            "type": "access",
            "scopes": scopes or ["read"],
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(seconds=self._access_ttl),
        }
        return jwt.encode(payload, self._secret, algorithm=self._algorithm)


jwt_manager = JWTManager()


class RequestSigner:
    """Implements HMAC request signing for webhook verification."""

    def __init__(self):
        self._algo = "sha256"

    def sign(self, payload: str, secret: str) -> str:
        return hmac.new(
            secret.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()

    def verify(self, payload: str, signature: str, secret: str) -> bool:
        expected = self.sign(payload, secret)
        return hmac.compare_digest(expected, signature)

    def sign_webhook(self, payload: dict, secret: str, timestamp: int = None) -> dict:
        ts = timestamp or int(time.time())
        body = f"{ts}.{str(payload)}"
        signature = self.sign(body, secret)
        return {
            "X-Webhook-Signature": f"sha256={signature}",
            "X-Webhook-Timestamp": str(ts),
        }

    def verify_webhook(
        self,
        payload: str,
        signature: str,
        secret: str,
        timestamp: int,
        max_age: int = 300,
    ) -> bool:
        current_time = int(time.time())
        if abs(current_time - timestamp) > max_age:
            return False
        body = f"{timestamp}.{payload}"
        return self.verify(body, signature.replace("sha256=", ""), secret)


request_signer = RequestSigner()


class ScopesManager:
    """Manages API permission scopes."""

    VALID_SCOPES = {
        "read": "Read access to resources",
        "write": "Create and update resources",
        "delete": "Delete resources",
        "admin": "Full administrative access",
        "webhooks": "Manage webhooks",
        "conversions": "Manage conversion jobs",
        "uploads": "Manage file uploads",
        "search": "Perform searches",
        "analytics": "Access analytics data",
    }

    SCOPE_HIERARCHY = {
        "admin": list(VALID_SCOPES.keys()),
        "conversions": ["read", "write", "conversions"],
        "uploads": ["read", "write", "uploads"],
        "search": ["read", "search"],
        "analytics": ["read", "analytics"],
        "webhooks": ["read", "write", "webhooks"],
        "write": ["read", "write"],
        "read": ["read"],
        "delete": ["read", "delete"],
    }

    @classmethod
    def validate_scopes(cls, scopes: list[str]) -> bool:
        return all(s in cls.VALID_SCOPES for s in scopes)

    @classmethod
    def has_scope(cls, user_scopes: list[str], required_scope: str) -> bool:
        for scope in user_scopes:
            if required_scope in cls.SCOPE_HIERARCHY.get(scope, []):
                return True
        return False

    @classmethod
    def expand_scopes(cls, scopes: list[str]) -> set[str]:
        expanded = set()
        for scope in scopes:
            expanded.update(cls.SCOPE_HIERARCHY.get(scope, [scope]))
        return expanded


scopes_manager = ScopesManager()
