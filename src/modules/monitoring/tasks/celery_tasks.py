import asyncio
from datetime import datetime, timezone

from src.core.celery_app import celery_app
from src.core.database import async_session_factory
from src.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="monitoring.periodic_health_check",
    max_retries=2,
)
def periodic_health_check(self):
    asyncio.run(_periodic_health_check_async())


async def _periodic_health_check_async():
    async with async_session_factory() as session:
        from src.modules.monitoring.services.health_service import HealthCheckService

        service = HealthCheckService(session)
        result = await service.full_health_check()

        logger.info(
            "periodic_health_check",
            extra={"status": result["status"]},
        )

        if result["status"] != "healthy":
            logger.warning(
                "health_check_degraded",
                extra={"checks": result["checks"]},
            )

        return result


@celery_app.task(
    bind=True,
    name="monitoring.evaluate_alerts",
    max_retries=2,
)
def evaluate_alerts_task(self):
    asyncio.run(_evaluate_alerts_async())


async def _evaluate_alerts_async():
    async with async_session_factory() as session:
        from src.modules.monitoring.services.alerting_service import AlertingService
        from src.modules.monitoring.services.health_service import HealthCheckService

        health_service = HealthCheckService(session)
        alert_service = AlertingService(session)

        system = health_service.check_system_resources()

        metrics = {
            "disk_usage_percent": system["disk"]["usage_percent"],
            "memory_usage_percent": system["memory"]["usage_percent"],
            "cpu_usage_percent": system["cpu"]["usage_percent"],
        }

        results = await alert_service.evaluate_all_rules(metrics)

        triggered = [r for r in results if r.get("triggered")]
        if triggered:
            logger.warning(
                "alerts_triggered",
                extra={"triggered_alerts": triggered},
            )

        return {"evaluated": len(results), "triggered": len(triggered)}


@celery_app.task(
    bind=True,
    name="monitoring.cleanup_old_events",
    max_retries=2,
)
def cleanup_old_events_task(self, days: int = 90):
    asyncio.run(_cleanup_old_events_async(days))


async def _cleanup_old_events_async(days: int):
    async with async_session_factory() as session:
        from src.modules.monitoring.repositories.monitoring import (
            SystemEventRepository,
            HealthSnapshotRepository,
        )

        event_repo = SystemEventRepository(session)
        snapshot_repo = HealthSnapshotRepository(session)

        events_deleted = await event_repo.cleanup_old_events(days)
        snapshots_deleted = await snapshot_repo.cleanup_old_snapshots(days // 3)

        logger.info(
            "monitoring_cleanup_completed",
            extra={"events_deleted": events_deleted, "snapshots_deleted": snapshots_deleted},
        )

        return {"events_deleted": events_deleted, "snapshots_deleted": snapshots_deleted}


@celery_app.task(
    bind=True,
    name="monitoring.collect_metrics",
    max_retries=2,
)
def collect_metrics_task(self):
    asyncio.run(_collect_metrics_async())


async def _collect_metrics_async():
    async with async_session_factory() as session:
        from src.modules.monitoring.services.health_service import HealthCheckService

        service = HealthCheckService(session)
        system = service.check_system_resources()

        from src.modules.monitoring.services.metrics_service import MetricsService

        metrics = MetricsService()
        metrics.set_storage_usage("local", system["disk"]["used_gb"] * 1024**3)
        metrics.set_db_connections(0)

        logger.info("metrics_collected", extra={"system": system})

        return system
