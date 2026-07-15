import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.analytics.models.analytics import AnalyticsEvent, EventType
from src.modules.analytics.repositories.analytics import AnalyticsEventRepository

logger = get_logger(__name__)


class AnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.event_repo = AnalyticsEventRepository(session)

    async def track_event(
        self,
        event_type: EventType,
        user_id: Optional[uuid.UUID] = None,
        properties: dict = None,
        metrics: dict = None,
        session_id: Optional[str] = None,
        source: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AnalyticsEvent:
        event = AnalyticsEvent(
            event_type=event_type,
            user_id=user_id,
            session_id=session_id,
            properties=properties or {},
            metrics=metrics or {},
            source=source,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        event = await self.event_repo.create(event)

        logger.debug(
            "analytics_event_tracked",
            event_type=event_type.value,
            user_id=str(user_id) if user_id else None,
        )

        return event

    async def get_events(
        self,
        event_type: Optional[EventType] = None,
        user_id: Optional[uuid.UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AnalyticsEvent], int]:
        return await self.event_repo.get_events(
            event_type, user_id, start_date, end_date, page, page_size
        )

    async def get_dau(self, days: int = 30) -> list[dict]:
        result = []
        today = datetime.now(timezone.utc).date()

        for i in range(days):
            date = today - timedelta(days=i)
            start = datetime.combine(date, datetime.min.time()).replace(tzinfo=timezone.utc)
            end = start + timedelta(days=1)

            count = await self.event_repo.get_unique_users(start, end)
            result.append({
                "date": date.isoformat(),
                "count": count,
            })

        return list(reversed(result))

    async def get_wau(self, weeks: int = 12) -> list[dict]:
        result = []
        today = datetime.now(timezone.utc).date()

        for i in range(weeks):
            week_start = today - timedelta(days=today.weekday() + (i * 7))
            week_end = week_start + timedelta(days=7)

            start = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc)
            end = datetime.combine(week_end, datetime.min.time()).replace(tzinfo=timezone.utc)

            count = await self.event_repo.get_unique_users(start, end)
            result.append({
                "week_start": week_start.isoformat(),
                "count": count,
            })

        return list(reversed(result))

    async def get_mau(self, months: int = 12) -> list[dict]:
        result = []
        today = datetime.now(timezone.utc).date()

        for i in range(months):
            if today.month - i <= 0:
                year = today.year - 1
                month = 12 + (today.month - i)
            else:
                year = today.year
                month = today.month - i

            start = datetime(year, month, 1, tzinfo=timezone.utc)
            if month == 12:
                end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

            count = await self.event_repo.get_unique_users(start, end)
            result.append({
                "month": f"{year}-{month:02d}",
                "count": count,
            })

        return list(reversed(result))

    async def get_event_type_counts(self, days: int = 30) -> dict:
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        return await self.event_repo.count_by_event_type(start_date=start_date)

    async def get_hourly_distribution(
        self,
        event_type: EventType,
        days: int = 7,
    ) -> list[dict]:
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        return await self.event_repo.get_hourly_distribution(event_type, start_date, end_date)
