import hashlib
import json
from typing import Any

from redis.asyncio import Redis

from src.core.logging import get_logger

logger = get_logger(__name__)

SEARCH_CACHE_PREFIX = "search:cache:"
SEARCH_CACHE_TTL = 300


class SearchCacheService:
    def __init__(self, redis: Redis):
        self.redis = redis

    def _make_key(self, query: str, user_id: str, filters: dict = None, page: int = 1) -> str:
        raw = f"{user_id}:{query}:{json.dumps(filters or {}, sort_keys=True)}:{page}"
        hash_val = hashlib.md5(raw.encode()).hexdigest()
        return f"{SEARCH_CACHE_PREFIX}{hash_val}"

    async def get_cached_search(self, query: str, user_id: str, filters: dict = None, page: int = 1) -> dict | None:
        key = self._make_key(query, user_id, filters, page)
        try:
            cached = await self.redis.get(key)
            if cached:
                result = json.loads(cached)
                result["cached"] = True
                logger.debug("search_cache_hit", extra={"key": key})
                return result
        except Exception as e:
            logger.warning("cache_get_error", extra={"error": str(e)})
        return None

    async def cache_search(
        self,
        query: str,
        user_id: str,
        result: dict,
        filters: dict = None,
        page: int = 1,
        ttl: int = SEARCH_CACHE_TTL,
    ):
        key = self._make_key(query, user_id, filters, page)
        try:
            cache_data = json.dumps(result, default=str)
            await self.redis.setex(key, ttl, cache_data)
            logger.debug("search_cached", extra={"key": key, "ttl": ttl})
        except Exception as e:
            logger.warning("cache_set_error", extra={"error": str(e)})

    async def invalidate_user_cache(self, user_id: str):
        try:
            cursor = 0
            while True:
                cursor, keys = await self.redis.scan(cursor, match=f"{SEARCH_CACHE_PREFIX}*", count=100)
                for key in keys:
                    await self.redis.delete(key)
                if cursor == 0:
                    break
            logger.info("user_cache_invalidated", extra={"user_id": user_id})
        except Exception as e:
            logger.warning("cache_invalidation_error", extra={"error": str(e)})

    async def get_cache_stats(self) -> dict:
        try:
            info = await self.redis.info("stats")
            hits = info.get("keyspace_hits", 0)
            misses = info.get("keyspace_misses", 0)
            total = hits + misses
            hit_ratio = (hits / total * 100) if total > 0 else 0

            return {
                "hits": hits,
                "misses": misses,
                "hit_ratio": round(hit_ratio, 2),
                "total": total,
            }
        except Exception:
            return {"hits": 0, "misses": 0, "hit_ratio": 0, "total": 0}
