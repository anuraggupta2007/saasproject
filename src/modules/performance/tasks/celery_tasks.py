import time
import logging
from datetime import datetime

from src.core.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="performance.collect_metrics",
    queue="performance",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def collect_metrics(self):
    """Collect system and application performance metrics."""
    try:
        import psutil
        from src.modules.performance.monitoring.metrics import metrics_collector, SystemProfiler

        loop = __import__("asyncio").new_event_loop()

        system_metrics = loop.run_until_complete(SystemProfiler.get_system_metrics())

        for metric_name, value in system_metrics.items():
            if isinstance(value, (int, float)):
                loop.run_until_complete(
                    metrics_collector.record(f"system.{metric_name}", value)
                )

        process_metrics = loop.run_until_complete(SystemProfiler.get_process_metrics())
        for metric_name, value in process_metrics.items():
            if isinstance(value, (int, float)):
                loop.run_until_complete(
                    metrics_collector.record(f"process.{metric_name}", value)
                )

        loop.close()
        logger.info("Performance metrics collected successfully")
    except Exception as exc:
        logger.error(f"Failed to collect metrics: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="performance.cleanup_old_metrics",
    queue="maintenance",
    bind=True,
    max_retries=2,
    default_retry_delay=120,
)
def cleanup_old_metrics(self, retention_days: int = 30):
    """Clean up old performance metrics from database."""
    try:
        from src.db.session import async_session_factory
        from src.modules.performance.repository import (
            PerformanceMetricRepository,
            QueryPerformanceRepository,
            CacheStatisticsRepository,
            WorkerPerformanceRepository,
        )

        loop = __import__("asyncio").new_event_loop()

        async def cleanup():
            async with async_session_factory() as session:
                perf_repo = PerformanceMetricRepository(session)
                query_repo = QueryPerformanceRepository(session)
                cache_repo = CacheStatisticsRepository(session)
                worker_repo = WorkerPerformanceRepository(session)

                deleted = 0
                deleted += await perf_repo.cleanup_old_metrics(retention_days)
                deleted += await query_repo.cleanup_old_logs(retention_days)
                deleted += await cache_repo.cleanup_old_stats(min(retention_days, 7))
                deleted += await worker_repo.cleanup_old_logs(retention_days)
                return deleted

        total_deleted = loop.run_until_complete(cleanup())
        loop.close()
        logger.info(f"Cleaned up {total_deleted} old performance records")
    except Exception as exc:
        logger.error(f"Failed to cleanup metrics: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="performance.refresh_materialized_views",
    queue="maintenance",
    bind=True,
    max_retries=2,
    default_retry_delay=300,
)
def refresh_materialized_views(self):
    """Refresh all materialized views for performance."""
    try:
        from src.db.session import async_session_factory
        from src.modules.performance.database import MaterializedViewManager

        loop = __import__("asyncio").new_event_loop()

        async def refresh():
            async with async_session_factory() as session:
                await MaterializedViewManager.refresh_all(session)

        loop.run_until_complete(refresh())
        loop.close()
        logger.info("Materialized views refreshed successfully")
    except Exception as exc:
        logger.error(f"Failed to refresh materialized views: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="performance.warm_cache",
    queue="performance",
    bind=True,
    max_retries=2,
    default_retry_delay=120,
)
def warm_cache(self):
    """Warm up cache with frequently accessed data."""
    try:
        from src.modules.performance.cache.cache_warmup import cache_warmup

        loop = __import__("asyncio").new_event_loop()
        loop.run_until_complete(cache_warmup.warmup_all())
        loop.close()
        logger.info("Cache warmed up successfully")
    except Exception as exc:
        logger.error(f"Failed to warm cache: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="performance.analyze_slow_queries",
    queue="maintenance",
    bind=True,
    max_retries=2,
    default_retry_delay=300,
)
def analyze_slow_queries(self):
    """Analyze and log slow database queries."""
    try:
        from src.modules.performance.database import QueryOptimizer

        slow_queries = QueryOptimizer.get_slow_queries(threshold_ms=500)
        if slow_queries:
            logger.warning(f"Found {len(slow_queries)} slow queries")
            for q in slow_queries[:5]:
                logger.warning(
                    f"Slow query: hash={q['query_hash']}, "
                    f"avg={q['avg_duration_ms']}ms, "
                    f"calls={q['call_count']}"
                )
    except Exception as exc:
        logger.error(f"Failed to analyze slow queries: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="performance.check_autoscaling",
    queue="performance",
    bind=True,
    max_retries=1,
    default_retry_delay=60,
)
def check_autoscaling(self):
    """Check if workers need to be scaled up or down."""
    try:
        from src.modules.performance.workers import autoscaler, queue_manager

        stats = queue_manager.get_stats()
        for queue_name, queue_stats in stats.items():
            queue_depth = queue_stats.get("queue_depth", 0)
            active_workers = queue_stats.get("active_workers", 1)
            decision = autoscaler.should_scale(queue_name, queue_depth, active_workers)
            if decision:
                logger.info(
                    f"Autoscaling decision for {queue_name}: {decision} "
                    f"(depth={queue_depth}, workers={active_workers})"
                )
    except Exception as exc:
        logger.error(f"Failed to check autoscaling: {exc}")
