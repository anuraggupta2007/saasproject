import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.analytics.models.analytics import (
    AnalyticsEvent,
    EventType,
    Report,
    ReportType,
    ReportStatus,
    AggregatedMetric,
    DashboardWidget,
)
from src.models.base import BaseRepository


class AnalyticsEventRepository(BaseRepository[AnalyticsEvent]):
    def __init__(self, session: AsyncSession):
        super().__init__(AnalyticsEvent, session)

    async def record_event(
        self,
        event_type: EventType,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        properties: Optional[dict] = None,
        metrics: Optional[dict] = None,
        source: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AnalyticsEvent:
        event = AnalyticsEvent(
            event_type=event_type,
            user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
            session_id=session_id,
            properties=properties or {},
            metrics=metrics or {},
            source=source,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.session.add(event)
        await self.session.flush()
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
        query = select(AnalyticsEvent)

        if event_type:
            query = query.where(AnalyticsEvent.event_type == event_type)
        if user_id:
            query = query.where(AnalyticsEvent.user_id == user_id)
        if start_date:
            query = query.where(AnalyticsEvent.created_at >= start_date)
        if end_date:
            query = query.where(AnalyticsEvent.created_at <= end_date)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(AnalyticsEvent.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        events = list(result.scalars().all())

        return events, total

    async def count_by_event_type(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> dict:
        query = select(AnalyticsEvent.event_type, func.count()).group_by(AnalyticsEvent.event_type)

        if start_date:
            query = query.where(AnalyticsEvent.created_at >= start_date)
        if end_date:
            query = query.where(AnalyticsEvent.created_at <= end_date)

        result = await self.session.execute(query)
        return {row[0].value: row[1] for row in result.all()}

    async def get_unique_users(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> int:
        result = await self.session.execute(
            select(func.count(func.distinct(AnalyticsEvent.user_id))).where(
                and_(
                    AnalyticsEvent.created_at >= start_date,
                    AnalyticsEvent.created_at <= end_date,
                    AnalyticsEvent.user_id.isnot(None),
                )
            )
        )
        return result.scalar() or 0

    async def get_event_count(
        self,
        event_type: EventType,
        start_date: datetime,
        end_date: datetime,
    ) -> int:
        result = await self.session.execute(
            select(func.count()).where(
                and_(
                    AnalyticsEvent.event_type == event_type,
                    AnalyticsEvent.created_at >= start_date,
                    AnalyticsEvent.created_at <= end_date,
                )
            )
        )
        return result.scalar() or 0

    async def get_hourly_distribution(
        self,
        event_type: EventType,
        start_date: datetime,
        end_date: datetime,
    ) -> list[dict]:
        from sqlalchemy import extract

        result = await self.session.execute(
            select(
                extract("hour", AnalyticsEvent.created_at).label("hour"),
                func.count(),
            ).where(
                and_(
                    AnalyticsEvent.event_type == event_type,
                    AnalyticsEvent.created_at >= start_date,
                    AnalyticsEvent.created_at <= end_date,
                )
            ).group_by("hour").order_by("hour")
        )

        return [{"hour": row[0], "count": row[1]} for row in result.all()]


class ReportRepository(BaseRepository[Report]):
    def __init__(self, session: AsyncSession):
        super().__init__(Report, session)

    async def get_user_reports(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Report], int]:
        query = select(Report).where(Report.generated_by == user_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(Report.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        reports = list(result.scalars().all())

        return reports, total

    async def get_pending_reports(self) -> list[Report]:
        result = await self.session.execute(
            select(Report).where(
                Report.status.in_([ReportStatus.PENDING, ReportStatus.GENERATING])
            ).order_by(Report.created_at.asc())
        )
        return list(result.scalars().all())

    async def update_status(
        self,
        report_id: uuid.UUID,
        status: ReportStatus,
        file_path: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Optional[Report]:
        report = await self.get_by_id(report_id)
        if report:
            report.status = status
            if status == ReportStatus.GENERATING:
                report.started_at = datetime.now(timezone.utc)
            elif status == ReportStatus.COMPLETED:
                report.completed_at = datetime.now(timezone.utc)
                report.file_path = file_path
            elif status == ReportStatus.FAILED:
                report.error_message = error_message
            await self.session.commit()
            await self.session.refresh(report)
        return report


class AggregatedMetricRepository(BaseRepository[AggregatedMetric]):
    def __init__(self, session: AsyncSession):
        super().__init__(AggregatedMetric, session)

    async def record_metric(
        self,
        metric_name: str,
        metric_value: float,
        period_start: datetime | None = None,
        period_end: datetime | None = None,
        dimensions: dict = None,
    ) -> AggregatedMetric:
        now = datetime.now(timezone.utc)
        metric = AggregatedMetric(
            metric_name=metric_name,
            metric_value=metric_value,
            period_start=period_start or now,
            period_end=period_end or now,
            dimensions=dimensions or {},
        )
        self.session.add(metric)
        await self.session.commit()
        await self.session.refresh(metric)
        return metric

    async def get_metric_history(
        self,
        metric_name: str,
        days: int = 30,
    ) -> list[AggregatedMetric]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        result = await self.session.execute(
            select(AggregatedMetric).where(
                and_(
                    AggregatedMetric.metric_name == metric_name,
                    AggregatedMetric.period_start >= cutoff,
                )
            ).order_by(AggregatedMetric.period_start.asc())
        )
        return list(result.scalars().all())

    async def get_latest_metric(self, metric_name: str) -> Optional[AggregatedMetric]:
        result = await self.session.execute(
            select(AggregatedMetric).where(
                AggregatedMetric.metric_name == metric_name
            ).order_by(AggregatedMetric.period_start.desc()).limit(1)
        )
        return result.scalar_one_or_none()


class DashboardWidgetRepository(BaseRepository[DashboardWidget]):
    def __init__(self, session: AsyncSession):
        super().__init__(DashboardWidget, session)

    async def get_active_widgets(self) -> list[DashboardWidget]:
        result = await self.session.execute(
            select(DashboardWidget).where(
                DashboardWidget.is_active == True
            ).order_by(DashboardWidget.name)
        )
        return list(result.scalars().all())

    async def get_widgets_by_type(self, widget_type: str) -> list[DashboardWidget]:
        result = await self.session.execute(
            select(DashboardWidget).where(
                DashboardWidget.widget_type == widget_type
            )
        )
        return list(result.scalars().all())
