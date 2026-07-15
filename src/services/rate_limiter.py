import uuid
from datetime import datetime, timedelta, timezone

import redis.asyncio as aioredis

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class RateLimiter:
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client
        self.max_attempts = settings.RATE_LIMIT_AUTH_ATTEMPTS
        self.window_seconds = settings.RATE_LIMIT_AUTH_WINDOW_SECONDS

    async def _get_key(self, identifier: str, action: str) -> str:
        return f"rate_limit:{action}:{identifier}"

    async def is_rate_limited(self, identifier: str, action: str = "login") -> bool:
        key = await self._get_key(identifier, action)
        current = await self.redis.get(key)

        if current is None:
            return False

        return int(current) >= self.max_attempts

    async def increment(self, identifier: str, action: str = "login") -> int:
        key = await self._get_key(identifier, action)
        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, self.window_seconds)
        results = await pipe.execute()
        return results[0]

    async def reset(self, identifier: str, action: str = "login") -> None:
        key = await self._get_key(identifier, action)
        await self.redis.delete(key)

    async def get_remaining_attempts(self, identifier: str, action: str = "login") -> int:
        key = await self._get_key(identifier, action)
        current = await self.redis.get(key)

        if current is None:
            return self.max_attempts

        remaining = self.max_attempts - int(current)
        return max(0, remaining)

    async def get_lockout_time(self, identifier: str, action: str = "login") -> int:
        key = await self._get_key(identifier, action)
        ttl = await self.redis.ttl(key)
        return max(0, ttl)


class OAuthStateStore:
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client
        self.state_ttl = 600  # 10 minutes

    async def store_state(self, state: str, provider: str) -> None:
        key = f"oauth_state:{state}"
        await self.redis.setex(key, self.state_ttl, provider)

    async def get_and_delete_state(self, state: str) -> str | None:
        key = f"oauth_state:{state}"
        provider = await self.redis.get(key)
        if provider:
            await self.redis.delete(key)
            return provider
        return None
