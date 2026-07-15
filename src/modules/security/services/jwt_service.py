import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

import jwt
from redis.asyncio import Redis

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)

ACCESS_TOKEN_EXPIRE = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
REFRESH_TOKEN_EXPIRE = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
REFRESH_TOKEN_REMEMBER_ME_EXPIRE = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_REMEMBER_ME_DAYS)

BLACKLIST_PREFIX = "jwt:blacklist:"
REFRESH_PREFIX = "jwt:refresh:"


class JWTService:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM

    def create_access_token(
        self,
        user_id: str,
        email: str,
        role: str,
        permissions: list[str] = None,
        additional_claims: dict = None,
    ) -> tuple[str, str]:
        jti = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        payload = {
            "sub": user_id,
            "email": email,
            "role": role,
            "permissions": permissions or [],
            "jti": jti,
            "type": "access",
            "iat": now,
            "exp": now + ACCESS_TOKEN_EXPIRE,
        }

        if additional_claims:
            payload.update(additional_claims)

        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token, jti

    def create_refresh_token(
        self,
        user_id: str,
        remember_me: bool = False,
    ) -> tuple[str, str]:
        jti = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        expire = REFRESH_TOKEN_REMEMBER_ME_EXPIRE if remember_me else REFRESH_TOKEN_EXPIRE

        payload = {
            "sub": user_id,
            "jti": jti,
            "type": "refresh",
            "iat": now,
            "exp": now + expire,
            "remember_me": remember_me,
        }

        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token, jti

    async def decode_token(self, token: str) -> dict | None:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            if payload.get("type") == "access":
                jti = payload.get("jti")
                if jti and await self.is_token_blacklisted(jti):
                    return None
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    async def blacklist_token(self, jti: str, expires_at: datetime):
        ttl = max(int((expires_at - datetime.now(timezone.utc)).total_seconds()), 1)
        await self.redis.set(f"{BLACKLIST_PREFIX}{jti}", "1", ex=ttl)

    async def is_token_blacklisted(self, jti: str) -> bool:
        return await self.redis.exists(f"{BLACKLIST_PREFIX}{jti}")

    async def store_refresh_token(self, jti: str, user_id: str, expires_at: datetime):
        ttl = max(int((expires_at - datetime.now(timezone.utc)).total_seconds()), 1)
        await self.redis.set(f"{REFRESH_PREFIX}{jti}", user_id, ex=ttl)

    async def revoke_refresh_token(self, jti: str):
        await self.redis.delete(f"{REFRESH_PREFIX}{jti}")

    async def revoke_all_user_refresh_tokens(self, user_id: str):
        cursor = 0
        while True:
            cursor, keys = await self.redis.scan(cursor, match=f"{REFRESH_PREFIX}*", count=100)
            for key in keys:
                if await self.redis.get(key) == user_id:
                    await self.redis.delete(key)
            if cursor == 0:
                break

    def rotate_tokens(
        self,
        access_token: str,
        refresh_token: str,
        user_id: str,
        email: str,
        role: str,
        permissions: list[str] = None,
    ) -> dict | None:
        refresh_payload = self.decode_token(refresh_token)
        if not refresh_payload or refresh_payload.get("type") != "refresh":
            return None

        new_access, access_jti = self.create_access_token(user_id, email, role, permissions)
        new_refresh, refresh_jti = self.create_refresh_token(
            user_id, refresh_payload.get("remember_me", False)
        )

        return {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "old_refresh_jti": refresh_payload["jti"],
            "new_access_jti": access_jti,
            "new_refresh_jti": refresh_jti,
        }

    def extract_user_from_token(self, token: str) -> dict | None:
        payload = self.decode_token(token)
        if not payload or payload.get("type") != "access":
            return None

        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "permissions": payload.get("permissions", []),
        }
