from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.security.repositories.security import RateLimitRepository, SecurityEventRepository

logger = get_logger(__name__)


class RateLimitService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = RateLimitRepository(session)
        self.event_repo = SecurityEventRepository(session)

    def _get_window(self, window_type: str = "minute") -> str:
        now = datetime.now(timezone.utc)
        if window_type == "second":
            return now.strftime("%Y%m%d%H%M%S")
        elif window_type == "minute":
            return now.strftime("%Y%m%d%H%M")
        elif window_type == "hour":
            return now.strftime("%Y%m%d%H")
        elif window_type == "day":
            return now.strftime("%Y%m%d")
        return now.strftime("%Y%m%d%H%M")

    def _get_ttl(self, window_type: str = "minute") -> int:
        return {
            "second": 1,
            "minute": 60,
            "hour": 3600,
            "day": 86400,
        }.get(window_type, 60)

    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window: str = "minute",
        identifier: str = None,
    ) -> dict:
        window_key = self._get_window(window)
        ttl = self._get_ttl(window)

        current_count = await self.repo.increment(key, window_key, ttl)

        if current_count > limit:
            if identifier:
                await self.event_repo.record_event(
                    event_type="rate_limit_hit",
                    severity="warning",
                    details={"key": key, "count": current_count, "limit": limit},
                )

            logger.warning(
                "rate_limit_exceeded",
                extra={"key": key, "count": current_count, "limit": limit},
            )

            return {
                "allowed": False,
                "current": current_count,
                "limit": limit,
                "window": window,
                "retry_after_seconds": ttl,
            }

        return {
            "allowed": True,
            "current": current_count,
            "limit": limit,
            "window": window,
            "remaining": limit - current_count,
        }

    async def check_user_rate_limit(self, user_id: str, limit: int = 100) -> dict:
        return await self.check_rate_limit(
            key=f"user:{user_id}",
            limit=limit,
            window="minute",
            identifier=user_id,
        )

    async def check_ip_rate_limit(self, ip_address: str, limit: int = 60) -> dict:
        return await self.check_rate_limit(
            key=f"ip:{ip_address}",
            limit=limit,
            window="minute",
            identifier=ip_address,
        )

    async def check_endpoint_rate_limit(
        self, endpoint: str, user_id: str = None, ip_address: str = None, limit: int = 30
    ) -> dict:
        if user_id:
            key = f"endpoint:{endpoint}:user:{user_id}"
        elif ip_address:
            key = f"endpoint:{endpoint}:ip:{ip_address}"
        else:
            return {"allowed": True, "current": 0, "limit": limit}

        return await self.check_rate_limit(key=key, limit=limit, window="minute")

    async def check_daily_quota(self, user_id: str, quota: int = 10000) -> dict:
        return await self.check_rate_limit(
            key=f"daily:{user_id}",
            limit=quota,
            window="day",
            identifier=user_id,
        )

    async def check_burst_limit(self, key: str, limit: int = 10) -> dict:
        return await self.check_rate_limit(
            key=f"burst:{key}",
            limit=limit,
            window="second",
        )
