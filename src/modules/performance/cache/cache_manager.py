import time
import hashlib
import json
from typing import Any, Optional, Callable
from functools import wraps
from datetime import datetime

from src.modules.performance.cache.redis_cache import cache_manager


class CacheLayer:
    """Multi-layer cache with L1 (in-memory) and L2 (Redis) support."""

    def __init__(self):
        self._l1_cache: dict[str, tuple[Any, float]] = {}
        self._l1_max_size = 1000
        self._l1_ttl = 60

    def _make_key(self, namespace: str, key: str) -> str:
        return f"{namespace}:{key}"

    def _l1_get(self, key: str) -> Optional[Any]:
        if key in self._l1_cache:
            value, expiry = self._l1_cache[key]
            if time.time() < expiry:
                return value
            del self._l1_cache[key]
        return None

    def _l1_set(self, key: str, value: Any, ttl: int = None):
        if len(self._l1_cache) >= self._l1_max_size:
            oldest_key = min(self._l1_cache, key=lambda k: self._l1_cache[k][1])
            del self._l1_cache[oldest_key]
        self._l1_cache[key] = (value, time.time() + (ttl or self._l1_ttl))

    async def get(self, namespace: str, key: str) -> Optional[Any]:
        full_key = self._make_key(namespace, key)
        l1_value = self._l1_get(full_key)
        if l1_value is not None:
            return l1_value
        l2_value = await cache_manager.get(namespace, key)
        if l2_value is not None:
            self._l1_set(full_key, l2_value)
        return l2_value

    async def set(
        self, namespace: str, key: str, value: Any, ttl: int = 300
    ) -> bool:
        full_key = self._make_key(namespace, key)
        self._l1_set(full_key, value, min(ttl, self._l1_ttl))
        return await cache_manager.set(namespace, key, value, ttl)

    async def delete(self, namespace: str, key: str) -> bool:
        full_key = self._make_key(namespace, key)
        self._l1_cache.pop(full_key, None)
        return await cache_manager.delete(namespace, key)

    async def invalidate_namespace(self, namespace: str) -> int:
        keys_to_delete = [
            k for k in self._l1_cache if k.startswith(f"{namespace}:")
        ]
        for key in keys_to_delete:
            del self._l1_cache[key]
        return await cache_manager.delete_pattern(f"{namespace}:*")

    def get_l1_stats(self) -> dict:
        return {
            "l1_size": len(self._l1_cache),
            "l1_max_size": self._l1_max_size,
        }


cache_layer = CacheLayer()


class QueryCache:
    """Database query result cache with automatic invalidation."""

    def __init__(self):
        self._namespace = "query"

    async def get(self, query_key: str) -> Optional[Any]:
        return await cache_layer.get(self._namespace, query_key)

    async def set(self, query_key: str, result: Any, ttl: int = 60) -> bool:
        return await cache_layer.set(self._namespace, query_key, result, ttl)

    async def invalidate_table(self, table_name: str) -> int:
        return await cache_layer.invalidate_namespace(f"{self._namespace}:{table_name}")

    def make_key(self, query: str, params: dict = None) -> str:
        data = {"query": query, "params": params or {}}
        return hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()[:16]


query_cache = QueryCache()


class SessionCache:
    """User session cache with sliding expiration."""

    def __init__(self):
        self._namespace = "session"

    async def get(self, session_id: str) -> Optional[dict]:
        return await cache_layer.get(self._namespace, session_id)

    async def set(self, session_id: str, data: dict, ttl: int = 3600) -> bool:
        data["last_access"] = datetime.utcnow().isoformat()
        return await cache_layer.set(self._namespace, session_id, data, ttl)

    async def delete(self, session_id: str) -> bool:
        return await cache_layer.delete(self._namespace, session_id)

    async def refresh(self, session_id: str, ttl: int = 3600) -> bool:
        data = await self.get(session_id)
        if data:
            return await self.set(session_id, data, ttl)
        return False


session_cache = SessionCache()


class SearchCache:
    """Search result cache with relevance-aware invalidation."""

    def __init__(self):
        self._namespace = "search"

    async def get(self, query_hash: str) -> Optional[dict]:
        return await cache_layer.get(self._namespace, query_hash)

    async def set(self, query_hash: str, results: dict, ttl: int = 300) -> bool:
        return await cache_layer.set(self._namespace, query_hash, results, ttl)

    async def invalidate(self, query_hash: str) -> bool:
        return await cache_layer.delete(self._namespace, query_hash)

    async def invalidate_all(self) -> int:
        return await cache_layer.invalidate_namespace(self._namespace)

    def make_hash(self, query: str, filters: dict = None) -> str:
        data = {"query": query, "filters": filters or {}}
        return hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()[:16]


search_cache = SearchCache()


class RateLimitCache:
    """Sliding window rate limiter using Redis sorted sets."""

    def __init__(self):
        self._namespace = "ratelimit"

    async def is_allowed(
        self, key: str, max_requests: int, window_seconds: int = 60
    ) -> tuple[bool, dict]:
        try:
            redis = cache_manager.redis
            full_key = f"{self._namespace}:{key}"
            now = time.time()
            window_start = now - window_seconds

            pipe = redis.pipeline()
            pipe.zremrangebyscore(full_key, 0, window_start)
            pipe.zadd(full_key, {f"{now}": now})
            pipe.zcard(full_key)
            pipe.expire(full_key, window_seconds)
            results = await pipe.execute()

            current_count = results[2]
            allowed = current_count <= max_requests

            return allowed, {
                "limit": max_requests,
                "remaining": max(0, max_requests - current_count),
                "window": window_seconds,
                "reset": int(now + window_seconds),
            }
        except Exception:
            return True, {"limit": max_requests, "remaining": max_requests}


rate_limit_cache = RateLimitCache()
