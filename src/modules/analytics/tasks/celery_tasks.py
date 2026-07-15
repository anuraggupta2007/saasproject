import asyncio
from datetime import datetime, timezone

from src.core.celery_app import celery_app
from src.core.database import async_session_factory
from src.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="analytics.generate_report",
    max_retries=2,
)
def generate_report_task(self, report_id: str):
    asyncio.run(_generate_report_async(report_id))


async def _generate_report_async(report_id: str):
    import uuid
    async with async_session_factory() as session:
        from src.modules.analytics.services.report_service import ReportService

        service = ReportService(session)
        result = await service.generate_report(uuid.UUID(report_id))

        logger.info(
            "report_task_completed",
            report_id=report_id,
            success=result.get("success"),
        )

        return result


@celery_app.task(
    bind=True,
    name="analytics.aggregate_daily_metrics",
)
def aggregate_daily_metrics(self):
    asyncio.run(_aggregate_daily_metrics_async())


async def _aggregate_daily_metrics_async():
    async with async_session_factory() as session:
        from src.modules.analytics.services.analytics_service import AnalyticsService
        from src.modules.analytics.repositories.analytics import AggregatedMetricRepository

        analytics_service = AnalyticsService(session)
        metric_repo = AggregatedMetricRepository(session)

        now = datetime.now(timezone.utc)
        yesterday = now.replace(hour=0, minute=0, second=0, microsecond=0) - __import__('datetime').timedelta(days=1)

        dau_data = await analytics_service.get_dau(days=1)
        event_counts = await analytics_service.get_event_type_counts(days=1)

        await metric_repo.record_metric(
            metric_name="dau",
            metric_value=dau_data[0]["count"] if dau_data else 0,
            period_start=yesterday,
            period_end=now,
        )

        await metric_repo.record_metric(
            metric_name="total_events",
            metric_value=sum(event_counts.values()),
            period_start=yesterday,
            period_end=now,
        )

        logger.info("daily_metrics_aggregated")
        return {"success": True}


@celery_app.task(
    bind=True,
    name="analytics.cleanup_old_events",
)
def cleanup_old_events(self, days: int = 90):
    asyncio.run(_cleanup_old_events_async(days))


async def _cleanup_old_events_async(days: int):
    async with async_session_factory() as session:
        from datetime import timedelta
        from sqlalchemy import delete
        from src.modules.analytics.models.analytics import AnalyticsEvent

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        await session.execute(
            delete(AnalyticsEvent).where(AnalyticsEvent.created_at < cutoff)
        )
        await session.commit()

        logger.info("old_events_cleaned", days=days)
        return {"cleaned": True}


@celery_app.task(
    bind=True,
    name="analytics.send_scheduled_reports",
)
def send_scheduled_reports(self):
    asyncio.run(_send_scheduled_reports_async())


async def _send_scheduled_reports_async():
    async with async_session_factory() as session:
        from src.modules.analytics.services.report_service import ReportService

        service = ReportService(session)
        from src.modules.analytics.repositories.analytics import ReportRepository

        repo = ReportRepository(session)
        pending = await repo.get_pending_reports()

        for report in pending:
            await service.generate_report(report.id)

        logger.info("scheduled_reports_sent", count=len(pending))
        return {"sent": len(pending)}
