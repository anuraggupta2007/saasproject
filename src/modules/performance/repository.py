from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.base import BaseRepository
from src.modules.performance.models import (
    PerformanceMetric, QueryPerformanceLog, CacheStatistics,
    WorkerPerformanceLog, LoadTestResult
)


class PerformanceMetricRepository(BaseRepository[PerformanceMetric]):
    def __init__(self, session: AsyncSession):
        super().__init__(PerformanceMetric, session)

    async def record_metric(
        self,
        metric_type: str,
        metric_name: str,
        value: float,
        unit: str,
        tags: dict = None,
        host: str = None,
        service: str = None,
    ) -> PerformanceMetric:
        metric = PerformanceMetric(
            metric_type=metric_type,
            metric_name=metric_name,
            value=value,
            unit=unit,
            tags=tags or {},
            host=host,
            service=service,
        )
        self.session.add(metric)
        await self.session.commit()
        return metric

    async def get_metrics(
        self,
        metric_type: str = None,
        metric_name: str = None,
        service: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        limit: int = 1000,
    ) -> list[PerformanceMetric]:
        query = select(PerformanceMetric)
        if metric_type:
            query = query.where(PerformanceMetric.metric_type == metric_type)
        if metric_name:
            query = query.where(PerformanceMetric.metric_name == metric_name)
        if service:
            query = query.where(PerformanceMetric.service == service)
        if start_time:
            query = query.where(PerformanceMetric.timestamp >= start_time)
        if end_time:
            query = query.where(PerformanceMetric.timestamp <= end_time)
        query = query.order_by(desc(PerformanceMetric.timestamp)).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_metric_aggregation(
        self,
        metric_name: str,
        start_time: datetime,
        end_time: datetime,
        aggregation: str = "avg",
    ) -> Optional[float]:
        col = getattr(func, aggregation)(PerformanceMetric.value)
        query = select(col).where(
            and_(
                PerformanceMetric.metric_name == metric_name,
                PerformanceMetric.timestamp >= start_time,
                PerformanceMetric.timestamp <= end_time,
            )
        )
        result = await self.session.execute(query)
        return result.scalar()

    async def get_percentiles(
        self,
        metric_name: str,
        start_time: datetime,
        end_time: datetime,
    ) -> dict:
        from sqlalchemy import literal_column
        query = select(
            func.percentile_cont(0.50).within_group(PerformanceMetric.value).label("p50"),
            func.percentile_cont(0.95).within_group(PerformanceMetric.value).label("p95"),
            func.percentile_cont(0.99).within_group(PerformanceMetric.value).label("p99"),
            func.min(PerformanceMetric.value).label("min"),
            func.max(PerformanceMetric.value).label("max"),
            func.avg(PerformanceMetric.value).label("avg"),
        ).where(
            and_(
                PerformanceMetric.metric_name == metric_name,
                PerformanceMetric.timestamp >= start_time,
                PerformanceMetric.timestamp <= end_time,
            )
        )
        result = await self.session.execute(query)
        row = result.one_or_none()
        if not row or row.avg is None:
            return {"p50": 0, "p95": 0, "p99": 0, "min": 0, "max": 0, "avg": 0}
        return {
            "p50": round(float(row.p50), 2),
            "p95": round(float(row.p95), 2),
            "p99": round(float(row.p99), 2),
            "min": round(float(row.min), 2),
            "max": round(float(row.max), 2),
            "avg": round(float(row.avg), 2),
        }

    async def cleanup_old_metrics(self, retention_days: int = 30) -> int:
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        from sqlalchemy import delete
        stmt = delete(PerformanceMetric).where(PerformanceMetric.timestamp < cutoff)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount


class QueryPerformanceRepository(BaseRepository[QueryPerformanceLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(QueryPerformanceLog, session)

    async def log_query(
        self,
        query_hash: str,
        duration_ms: float,
        query_text: str = None,
        rows_affected: int = 0,
        rows_returned: int = 0,
        table_name: str = None,
        operation: str = None,
        execution_plan: str = None,
    ) -> QueryPerformanceLog:
        log = QueryPerformanceLog(
            query_hash=query_hash,
            query_text=query_text,
            duration_ms=duration_ms,
            rows_affected=rows_affected,
            rows_returned=rows_returned,
            table_name=table_name,
            operation=operation,
            is_slow=duration_ms > 1000,
            execution_plan=execution_plan,
        )
        self.session.add(log)
        await self.session.commit()
        return log

    async def get_slow_queries(
        self, limit: int = 50, start_time: datetime = None
    ) -> list[QueryPerformanceLog]:
        query = select(QueryPerformanceLog).where(
            QueryPerformanceLog.is_slow == True
        )
        if start_time:
            query = query.where(QueryPerformanceLog.timestamp >= start_time)
        query = query.order_by(desc(QueryPerformanceLog.duration_ms)).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_query_stats(self, hours: int = 24) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        query = (
            select(
                QueryPerformanceLog.query_hash,
                func.avg(QueryPerformanceLog.duration_ms).label("avg_duration"),
                func.max(QueryPerformanceLog.duration_ms).label("max_duration"),
                func.count().label("call_count"),
                QueryPerformanceLog.table_name,
                func.max(QueryPerformanceLog.timestamp).label("last_seen"),
            )
            .where(QueryPerformanceLog.timestamp >= cutoff)
            .group_by(QueryPerformanceLog.query_hash, QueryPerformanceLog.table_name)
            .order_by(desc("avg_duration"))
            .limit(50)
        )
        result = await self.session.execute(query)
        return [
            {
                "query_hash": row.query_hash,
                "avg_duration_ms": float(row.avg_duration),
                "max_duration_ms": float(row.max_duration),
                "call_count": row.call_count,
                "table_name": row.table_name,
                "last_seen": row.last_seen.isoformat() if row.last_seen else None,
            }
            for row in result.all()
        ]


class CacheStatisticsRepository(BaseRepository[CacheStatistics]):
    def __init__(self, session: AsyncSession):
        super().__init__(CacheStatistics, session)

    async def record_operation(
        self,
        cache_type: str,
        operation: str,
        key_pattern: str = None,
        hit: bool = None,
        ttl_seconds: int = None,
        size_bytes: int = None,
        duration_ms: float = None,
    ) -> CacheStatistics:
        stat = CacheStatistics(
            cache_type=cache_type,
            operation=operation,
            key_pattern=key_pattern,
            hit=hit,
            ttl_seconds=ttl_seconds,
            size_bytes=size_bytes,
            duration_ms=duration_ms,
        )
        self.session.add(stat)
        await self.session.commit()
        return stat

    async def get_stats_summary(self, cache_type: str, hours: int = 24) -> dict:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        query = (
            select(
                func.count().label("total"),
                func.sum(func.cast(CacheStatistics.hit, Integer)).label("hits"),
                func.avg(CacheStatistics.ttl_seconds).label("avg_ttl"),
                func.avg(CacheStatistics.duration_ms).label("avg_duration"),
                func.sum(CacheStatistics.size_bytes).label("total_size"),
            )
            .where(
                and_(
                    CacheStatistics.cache_type == cache_type,
                    CacheStatistics.timestamp >= cutoff,
                )
            )
        )
        result = await self.session.execute(query)
        row = result.one()
        total = row.total or 0
        hits = row.hits or 0
        return {
            "cache_type": cache_type,
            "total_operations": total,
            "hits": hits,
            "misses": total - hits,
            "hit_rate": hits / total if total > 0 else 0,
            "avg_ttl_seconds": float(row.avg_ttl or 0),
            "avg_duration_ms": float(row.avg_duration or 0),
            "total_size_bytes": int(row.total_size or 0),
        }

    async def cleanup_old_stats(self, retention_days: int = 7) -> int:
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        from sqlalchemy import delete
        stmt = delete(CacheStatistics).where(CacheStatistics.timestamp < cutoff)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount


class WorkerPerformanceRepository(BaseRepository[WorkerPerformanceLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(WorkerPerformanceLog, session)

    async def log_task(
        self,
        worker_name: str,
        task_name: str,
        duration_ms: float,
        status: str,
        task_id: str = None,
        queue_name: str = None,
        priority: int = 0,
        memory_usage_mb: float = None,
        cpu_usage_percent: float = None,
        retry_count: int = 0,
    ) -> WorkerPerformanceLog:
        log = WorkerPerformanceLog(
            worker_name=worker_name,
            task_name=task_name,
            task_id=task_id,
            duration_ms=duration_ms,
            status=status,
            queue_name=queue_name,
            priority=priority,
            memory_usage_mb=memory_usage_mb,
            cpu_usage_percent=cpu_usage_percent,
            retry_count=retry_count,
        )
        self.session.add(log)
        await self.session.commit()
        return log

    async def get_worker_stats(self, hours: int = 24) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        query = (
            select(
                WorkerPerformanceLog.worker_name,
                func.count().label("total_tasks"),
                func.sum(func.cast(WorkerPerformanceLog.status == "success", Integer)).label("successful"),
                func.sum(func.cast(WorkerPerformanceLog.status == "failure", Integer)).label("failed"),
                func.avg(WorkerPerformanceLog.duration_ms).label("avg_duration"),
                func.avg(WorkerPerformanceLog.memory_usage_mb).label("avg_memory"),
                func.avg(WorkerPerformanceLog.cpu_usage_percent).label("avg_cpu"),
            )
            .where(WorkerPerformanceLog.timestamp >= cutoff)
            .group_by(WorkerPerformanceLog.worker_name)
        )
        result = await self.session.execute(query)
        return [
            {
                "worker_name": row.worker_name,
                "total_tasks": row.total_tasks,
                "successful_tasks": row.successful or 0,
                "failed_tasks": row.failed or 0,
                "avg_duration_ms": float(row.avg_duration or 0),
                "avg_memory_mb": float(row.avg_memory or 0),
                "avg_cpu_percent": float(row.avg_cpu or 0),
            }
            for row in result.all()
        ]

    async def get_task_stats(self, hours: int = 24) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        query = (
            select(
                WorkerPerformanceLog.task_name,
                func.count().label("total"),
                func.avg(WorkerPerformanceLog.duration_ms).label("avg_duration"),
                func.max(WorkerPerformanceLog.duration_ms).label("max_duration"),
                func.sum(func.cast(WorkerPerformanceLog.status == "failure", Integer)).label("failures"),
            )
            .where(WorkerPerformanceLog.timestamp >= cutoff)
            .group_by(WorkerPerformanceLog.task_name)
            .order_by(desc("avg_duration"))
        )
        result = await self.session.execute(query)
        return [
            {
                "task_name": row.task_name,
                "total": row.total,
                "avg_duration_ms": float(row.avg_duration or 0),
                "max_duration_ms": float(row.max_duration or 0),
                "failures": row.failures or 0,
            }
            for row in result.all()
        ]

    async def cleanup_old_logs(self, retention_days: int = 30) -> int:
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        from sqlalchemy import delete
        stmt = delete(WorkerPerformanceLog).where(WorkerPerformanceLog.timestamp < cutoff)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount


class LoadTestResultRepository(BaseRepository[LoadTestResult]):
    def __init__(self, session: AsyncSession):
        super().__init__(LoadTestResult, session)

    async def save_result(
        self,
        test_name: str,
        test_type: str,
        duration_seconds: float,
        total_requests: int,
        successful_requests: int,
        failed_requests: int,
        avg_response_time_ms: float,
        p50_response_time_ms: float = None,
        p95_response_time_ms: float = None,
        p99_response_time_ms: float = None,
        max_response_time_ms: float = None,
        requests_per_second: float = 0,
        throughput_mbps: float = None,
        error_rate: float = 0,
        concurrent_users: int = None,
        config: dict = None,
    ) -> LoadTestResult:
        result = LoadTestResult(
            test_name=test_name,
            test_type=test_type,
            duration_seconds=duration_seconds,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time_ms=avg_response_time_ms,
            p50_response_time_ms=p50_response_time_ms,
            p95_response_time_ms=p95_response_time_ms,
            p99_response_time_ms=p99_response_time_ms,
            max_response_time_ms=max_response_time_ms,
            requests_per_second=requests_per_second,
            throughput_mbps=throughput_mbps,
            error_rate=error_rate,
            concurrent_users=concurrent_users,
            config=config or {},
        )
        self.session.add(result)
        await self.session.commit()
        return result

    async def get_recent_results(self, limit: int = 20) -> list[LoadTestResult]:
        query = (
            select(LoadTestResult)
            .order_by(desc(LoadTestResult.timestamp))
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())
