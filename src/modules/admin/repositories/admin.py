import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.admin.models.admin import AdminUser, AdminRole, SystemEvent, DashboardMetric, Announcement
from src.models.base import BaseRepository


class AdminUserRepository(BaseRepository[AdminUser]):
    def __init__(self, session: AsyncSession):
        super().__init__(AdminUser, session)

    async def get_by_user_id(self, user_id: uuid.UUID) -> Optional[AdminUser]:
        result = await self.session.execute(
            select(AdminUser).where(AdminUser.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_role(self, role: AdminRole) -> list[AdminUser]:
        result = await self.session.execute(
            select(AdminUser).where(AdminUser.role == role)
        )
        return list(result.scalars().all())

    async def list_admins(
        self,
        role: Optional[AdminRole] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AdminUser], int]:
        query = select(AdminUser)

        if role:
            query = query.where(AdminUser.role == role)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(AdminUser.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        admins = list(result.scalars().all())

        return admins, total

    async def count_by_role(self) -> dict:
        result = await self.session.execute(
            select(AdminUser.role, func.count()).group_by(AdminUser.role)
        )
        return {row[0].value: row[1] for row in result.all()}

    async def update_last_login(self, admin_id: uuid.UUID) -> Optional[AdminUser]:
        admin = await self.get_by_id(admin_id)
        if admin:
            admin.last_login_at = datetime.now(timezone.utc)
            await self.session.commit()
            await self.session.refresh(admin)
        return admin


class SystemEventRepository(BaseRepository[SystemEvent]):
    def __init__(self, session: AsyncSession):
        super().__init__(SystemEvent, session)

    async def get_events(
        self,
        event_type: Optional[str] = None,
        severity: Optional[str] = None,
        resolved: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[SystemEvent], int]:
        query = select(SystemEvent)

        if event_type:
            query = query.where(SystemEvent.event_type == event_type)
        if severity:
            query = query.where(SystemEvent.severity == severity)
        if resolved is not None:
            query = query.where(SystemEvent.resolved == resolved)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(SystemEvent.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        events = list(result.scalars().all())

        return events, total

    async def resolve_event(self, event_id: uuid.UUID, resolved_by: uuid.UUID) -> Optional[SystemEvent]:
        event = await self.get_by_id(event_id)
        if event:
            event.resolved = True
            event.resolved_at = datetime.now(timezone.utc)
            event.resolved_by = resolved_by
            await self.session.commit()
            await self.session.refresh(event)
        return event

    async def get_unresolved_count(self) -> int:
        result = await self.session.execute(
            select(func.count()).where(SystemEvent.resolved == False)
        )
        return result.scalar() or 0


class DashboardMetricRepository(BaseRepository[DashboardMetric]):
    def __init__(self, session: AsyncSession):
        super().__init__(DashboardMetric, session)

    async def record_metric(
        self,
        metric_name: str,
        metric_value: int,
        metric_data: dict = None,
    ) -> DashboardMetric:
        metric = DashboardMetric(
            metric_name=metric_name,
            metric_value=metric_value,
            metric_data=metric_data or {},
        )
        self.session.add(metric)
        await self.session.commit()
        await self.session.refresh(metric)
        return metric

    async def get_metric_history(
        self,
        metric_name: str,
        days: int = 30,
    ) -> list[DashboardMetric]:
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        result = await self.session.execute(
            select(DashboardMetric).where(
                and_(
                    DashboardMetric.metric_name == metric_name,
                    DashboardMetric.recorded_at >= cutoff,
                )
            ).order_by(DashboardMetric.recorded_at.asc())
        )
        return list(result.scalars().all())

    async def get_latest_metric(self, metric_name: str) -> Optional[DashboardMetric]:
        result = await self.session.execute(
            select(DashboardMetric).where(
                DashboardMetric.metric_name == metric_name
            ).order_by(DashboardMetric.recorded_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()


class AnnouncementRepository(BaseRepository[Announcement]):
    def __init__(self, session: AsyncSession):
        super().__init__(Announcement, session)

    async def get_active_announcements(self) -> list[Announcement]:
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            select(Announcement).where(
                and_(
                    Announcement.is_active == True,
                    (Announcement.start_date.is_(None) | (Announcement.start_date <= now)),
                    (Announcement.end_date.is_(None) | (Announcement.end_date >= now)),
                )
            ).order_by(Announcement.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_announcements(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Announcement], int]:
        query = select(Announcement)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(Announcement.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        announcements = list(result.scalars().all())

        return announcements, total

    async def deactivate_announcement(self, announcement_id: uuid.UUID) -> Optional[Announcement]:
        announcement = await self.get_by_id(announcement_id)
        if announcement:
            announcement.is_active = False
            await self.session.commit()
            await self.session.refresh(announcement)
        return announcement
