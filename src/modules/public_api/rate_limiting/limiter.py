import time
from datetime import datetime, timedelta
from typing import Optional

from src.modules.performance.cache.redis_cache import cache_manager


class TierConfig:
    """Rate limit configuration per tier."""

    TIERS = {
        "free": {
            "requests_per_minute": 10,
            "requests_per_hour": 200,
            "requests_per_day": 1000,
            "burst_limit": 20,
            "concurrent_uploads": 2,
            "max_file_size_mb": 50,
            "storage_gb": 1,
        },
        "starter": {
            "requests_per_minute": 30,
            "requests_per_hour": 1000,
            "requests_per_day": 10000,
            "burst_limit": 50,
            "concurrent_uploads": 5,
            "max_file_size_mb": 200,
            "storage_gb": 10,
        },
        "pro": {
            "requests_per_minute": 100,
            "requests_per_hour": 5000,
            "requests_per_day": 50000,
            "burst_limit": 200,
            "concurrent_uploads": 10,
            "max_file_size_mb": 1024,
            "storage_gb": 100,
        },
        "enterprise": {
            "requests_per_minute": 1000,
            "requests_per_hour": 50000,
            "requests_per_day": 500000,
            "burst_limit": 2000,
            "concurrent_uploads": 50,
            "max_file_size_mb": 10240,
            "storage_gb": 1024,
        },
    }

    @classmethod
    def get_limits(cls, tier: str) -> dict:
        return cls.TIERS.get(tier, cls.TIERS["free"])

    @classmethod
    def get_all_tiers(cls) -> dict:
        return cls.TIERS


class RateLimitService:
    """Sliding window rate limiter with burst support."""

    def __init__(self):
        self._prefix = "ratelimit"

    async def check_rate_limit(
        self,
        api_key_id: str,
        tier: str,
        custom_limit: int = None,
    ) -> dict:
        limits = TierConfig.get_limits(tier)
        rpm_limit = custom_limit or limits["requests_per_minute"]
        rph_limit = limits["requests_per_hour"]
        rpd_limit = limits["requests_per_day"]
        burst_limit = limits["burst_limit"]

        now = time.time()
        minute_key = f"{self._prefix}:{api_key_id}:minute:{int(now // 60)}"
        hour_key = f"{self._prefix}:{api_key_id}:hour:{int(now // 3600)}"
        day_key = f"{self._prefix}:{api_key_id}:day:{int(now // 86400)}"
        burst_key = f"{self._prefix}:{api_key_id}:burst:{int(now)}"

        pipe = cache_manager.redis.pipeline()
        pipe.incr(minute_key)
        pipe.expire(minute_key, 120)
        pipe.incr(hour_key)
        pipe.expire(hour_key, 7200)
        pipe.incr(day_key)
        pipe.expire(day_key, 172800)
        results = await pipe.execute()

        minute_count = results[0]
        hour_count = results[2]
        day_count = results[4]

        await cache_manager.redis.incr(burst_key)
        await cache_manager.redis.expire(burst_key, 10)
        burst_count = await cache_manager.redis.get(burst_key)
        burst_count = int(burst_count or 0)

        allowed = True
        remaining = rpm_limit - minute_count
        reset_at = (int(now // 60) + 1) * 60

        if minute_count > rpm_limit:
            allowed = False
            remaining = 0
        elif hour_count > rph_limit:
            allowed = False
            remaining = 0
        elif day_count > rpd_limit:
            allowed = False
            remaining = 0
        elif burst_count > burst_limit:
            allowed = False
            remaining = 0

        return {
            "allowed": allowed,
            "limit": rpm_limit,
            "remaining": max(0, remaining),
            "hourly_limit": rph_limit,
            "hourly_remaining": max(0, rph_limit - hour_count),
            "daily_limit": rpd_limit,
            "daily_remaining": max(0, rpd_limit - day_count),
            "burst_limit": burst_limit,
            "burst_remaining": max(0, burst_limit - burst_count),
            "reset_at": reset_at,
            "tier": tier,
        }

    async def get_usage(self, api_key_id: str) -> dict:
        now = time.time()
        minute_key = f"{self._prefix}:{api_key_id}:minute:{int(now // 60)}"
        hour_key = f"{self._prefix}:{api_key_id}:hour:{int(now // 3600)}"
        day_key = f"{self._prefix}:{api_key_id}:day:{int(now // 86400)}"

        minute_count = await cache_manager.redis.get(minute_key)
        hour_count = await cache_manager.redis.get(hour_key)
        day_count = await cache_manager.redis.get(day_key)

        return {
            "minute_requests": int(minute_count or 0),
            "hour_requests": int(hour_count or 0),
            "day_requests": int(day_count or 0),
        }


rate_limit_service = RateLimitService()


class QuotaManager:
    """Manages daily and monthly usage quotas."""

    def __init__(self):
        self._prefix = "quota"

    async def check_conversion_quota(self, user_id: str, tier: str) -> dict:
        limits = TierConfig.get_limits(tier)
        daily_limit = limits["requests_per_day"]

        key = f"{self._prefix}:conversions:{user_id}:{datetime.utcnow().strftime('%Y%m%d')}"
        current = await cache_manager.redis.get(key)
        current = int(current or 0)

        return {
            "allowed": current < daily_limit,
            "used": current,
            "limit": daily_limit,
            "remaining": max(0, daily_limit - current),
        }

    async def increment_conversion(self, user_id: str) -> int:
        key = f"{self._prefix}:conversions:{user_id}:{datetime.utcnow().strftime('%Y%m%d')}"
        count = await cache_manager.redis.incr(key)
        await cache_manager.redis.expire(key, 172800)
        return count

    async def check_storage_quota(self, user_id: str, tier: str) -> dict:
        limits = TierConfig.get_limits(tier)
        storage_limit_bytes = limits["storage_gb"] * 1024 * 1024 * 1024

        key = f"{self._prefix}:storage:{user_id}"
        used = await cache_manager.redis.get(key)
        used_bytes = int(used or 0)

        return {
            "allowed": used_bytes < storage_limit_bytes,
            "used_bytes": used_bytes,
            "limit_bytes": storage_limit_bytes,
            "limit_gb": limits["storage_gb"],
            "used_gb": round(used_bytes / (1024**3), 2),
        }

    async def increment_storage(self, user_id: str, bytes_count: int) -> int:
        key = f"{self._quota}:storage:{user_id}"
        return await cache_manager.redis.incrby(key, bytes_count)


quota_manager = QuotaManager()
