import json
import hashlib
import time
from typing import Any, Optional, Callable
from functools import wraps

import redis.asyncio as redis

from src.core.config import settings


class CacheManager:
    """Redis-backed distributed cache with TTL, invalidation, and statistics."""

    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._stats: dict = {"hits": 0, "misses": 0, "sets": 0, "deletes": 0}
        self._prefix = "perf:cache:"

    async def connect(self):
        self._redis = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
            retry_on_timeout=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )

    async def disconnect(self):
        if self._redis:
            await self._redis.close()

    @property
    def redis(self) -> redis.Redis:
        if not self._redis:
            raise RuntimeError("Cache not connected. Call connect() first.")
        return self._redis

    def _make_key(self, namespace: str, key: str) -> str:
        return f"{self._prefix}{namespace}:{key}"

    def _make_hash(self, data: Any) -> str:
        serialized = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode()).hexdigest()[:16]

    async def get(self, namespace: str, key: str) -> Optional[Any]:
        full_key = self._make_key(namespace, key)
        try:
            value = await self.redis.get(full_key)
            if value is not None:
                self._stats["hits"] += 1
                return json.loads(value)
            self._stats["misses"] += 1
            return None
        except Exception:
            self._stats["misses"] += 1
            return None

    async def set(
        self, namespace: str, key: str, value: Any, ttl: int = 300
    ) -> bool:
        full_key = self._make_key(namespace, key)
        try:
            serialized = json.dumps(value, default=str)
            await self.redis.setex(full_key, ttl, serialized)
            self._stats["sets"] += 1
            return True
        except Exception:
            return False

    async def delete(self, namespace: str, key: str) -> bool:
        full_key = self._make_key(namespace, key)
        try:
            await self.redis.delete(full_key)
            self._stats["deletes"] += 1
            return True
        except Exception:
            return False

    async def delete_pattern(self, pattern: str) -> int:
        full_pattern = f"{self._prefix}{pattern}"
        try:
            keys = []
            async for key in self.redis.scan_iter(match=full_pattern, count=100):
                keys.append(key)
            if keys:
                deleted = await self.redis.delete(*keys)
                self._stats["deletes"] += deleted
                return deleted
            return 0
        except Exception:
            return 0

    async def exists(self, namespace: str, key: str) -> bool:
        full_key = self._make_key(namespace, key)
        try:
            return bool(await self.redis.exists(full_key))
        except Exception:
            return False

    async def incr(self, namespace: str, key: str, amount: int = 1) -> int:
        full_key = self._make_key(namespace, key)
        try:
            return await self.redis.incrby(full_key, amount)
        except Exception:
            return 0

    async def get_multi(self, namespace: str, keys: list[str]) -> dict[str, Any]:
        full_keys = [self._make_key(namespace, k) for k in keys]
        try:
            values = await self.redis.mget(full_keys)
            result = {}
            for key, value in zip(keys, values):
                if value is not None:
                    result[key] = json.loads(value)
                    self._stats["hits"] += 1
                else:
                    self._stats["misses"] += 1
            return result
        except Exception:
            return {}

    async def set_multi(
        self, namespace: str, data: dict[str, Any], ttl: int = 300
    ) -> bool:
        try:
            pipe = self.redis.pipeline()
            for key, value in data.items():
                full_key = self._make_key(namespace, key)
                serialized = json.dumps(value, default=str)
                pipe.setex(full_key, ttl, serialized)
            await pipe.execute()
            self._stats["sets"] += len(data)
            return True
        except Exception:
            return False

    async def get_stats(self) -> dict:
        total = self._stats["hits"] + self._stats["misses"]
        return {
            **self._stats,
            "hit_rate": self._stats["hits"] / total if total > 0 else 0,
            "total": total,
        }

    async def flush_stats(self):
        self._stats = {"hits": 0, "misses": 0, "sets": 0, "deletes": 0}

    async def get_memory_usage(self) -> dict:
        try:
            info = await self.redis.info("memory")
            return {
                "used_memory_mb": info.get("used_memory", 0) / (1024 * 1024),
                "used_memory_peak_mb": info.get("used_memory_peak", 0) / (1024 * 1024),
                "max_memory_mb": info.get("maxmemory", 0) / (1024 * 1024),
                "mem_fragmentation_ratio": info.get("mem_fragmentation_ratio", 0),
            }
        except Exception:
            return {}

    async def get_key_count(self) -> int:
        try:
            return await self.redis.dbsize()
        except Exception:
            return 0


cache_manager = CacheManager()


def cached(namespace: str, ttl: int = 300, key_prefix: str = ""):
    """Decorator for caching async function results."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}{func.__name__}:{cache_manager._make_hash((args, kwargs))}"
            result = await cache_manager.get(namespace, cache_key)
            if result is not None:
                return result
            result = await func(*args, **kwargs)
            if result is not None:
                await cache_manager.set(namespace, cache_key, result, ttl)
            return result
        return wrapper
    return decorator


def invalidate_cache(namespace: str, key_pattern: str = "*"):
    """Decorator for invalidating cache entries after mutation."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            await cache_manager.delete_pattern(f"{namespace}:{key_pattern}")
            return result
        return wrapper
    return decorator
