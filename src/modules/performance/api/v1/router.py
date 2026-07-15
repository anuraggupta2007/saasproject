from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_engine
from src.modules.performance.schemas import (
    APIPerformanceMetrics, DatabasePerformanceMetrics, RedisPerformanceMetrics,
    CeleryPerformanceMetrics, StoragePerformanceMetrics, SearchPerformanceMetrics,
    SystemResourceMetrics, PerformanceHealthCheck, LoadTestConfig,
    LoadTestResultResponse, CacheStatsSummary, WorkerStatsSummary,
    SlowQuerySummary, SystemPerformanceOverview, BenchmarkResult,
)
from src.modules.performance.cache import cache_manager, cache_layer, query_cache
from src.modules.performance.database import (
    pool_manager, QueryOptimizer, read_replica_router,
    MaterializedViewManager, DatabaseIndexManager,
)
from src.modules.performance.workers import queue_manager, autoscaler, dlq_manager
from src.modules.performance.storage import streaming_uploader, multipart_manager, cdn_service
from src.modules.performance.monitoring import metrics_collector, SystemProfiler, latency_tracker
from src.modules.performance.repository import (
    PerformanceMetricRepository, QueryPerformanceRepository,
    CacheStatisticsRepository, WorkerPerformanceRepository,
    LoadTestResultRepository,
)

router = APIRouter(prefix="/performance", tags=["Performance"])


async def get_db_session():
    engine = get_engine()
    async_session_factory = __import__("src.db.session", fromlist=["async_session_factory"]).async_session_factory
    async with async_session_factory() as session:
        yield session


@router.get("/overview", response_model=SystemPerformanceOverview)
async def get_performance_overview():
    system_metrics = await SystemProfiler.get_system_metrics()
    cache_stats = await cache_manager.get_stats()
    cache_memory = await cache_manager.get_memory_usage()
    worker_stats = queue_manager.get_stats()
    all_latencies = latency_tracker.get_all_endpoints()

    avg_latency = 0
    if all_latencies:
        all_p50 = [v["p50"] for v in all_latencies.values() if v["p50"] > 0]
        avg_latency = sum(all_p50) / len(all_p50) if all_p50 else 0

    return SystemPerformanceOverview(
        timestamp=datetime.utcnow(),
        api={
            "avg_response_time_ms": round(avg_latency, 2),
            "endpoints_tracked": len(all_latencies),
            "cache_hit_rate": cache_stats.get("hit_rate", 0),
        },
        database={
            "pool_size": 20,
            "active_connections": 0,
            "slow_queries": len(QueryOptimizer.get_slow_queries()),
        },
        redis={
            "used_memory_mb": cache_memory.get("used_memory_mb", 0),
            "hit_rate": cache_stats.get("hit_rate", 0),
            "ops_total": cache_stats.get("total", 0),
        },
        celery={
            "queues_active": len(worker_stats),
            "total_tasks": sum(s.get("total", 0) for s in worker_stats.values()),
        },
        storage={
            "multipart_uploads_active": len(multipart_manager._active_uploads),
        },
        search={},
        system=system_metrics,
    )


@router.get("/api/metrics", response_model=APIPerformanceMetrics)
async def get_api_metrics():
    all_latencies = latency_tracker.get_all_endpoints()
    cache_stats = await cache_manager.get_stats()

    total_requests = sum(v["count"] for v in all_latencies.values())
    avg_latency = 0
    p50 = 0
    p95 = 0
    p99 = 0

    if all_latencies:
        all_latencies_flat = []
        for endpoint_latencies in all_latencies.values():
            all_latencies_flat.extend([endpoint_latencies["p50"]] * endpoint_latencies["count"])
        if all_latencies_flat:
            all_latencies_flat.sort()
            n = len(all_latencies_flat)
            avg_latency = sum(all_latencies_flat) / n
            p50 = all_latencies_flat[n // 2]
            p95 = all_latencies_flat[int(n * 0.95)] if n > 1 else all_latencies_flat[0]
            p99 = all_latencies_flat[int(n * 0.99)] if n > 1 else all_latencies_flat[0]

    return APIPerformanceMetrics(
        requests_per_second=0,
        avg_response_time_ms=round(avg_latency, 2),
        p50_response_time_ms=round(p50, 2),
        p95_response_time_ms=round(p95, 2),
        p99_response_time_ms=round(p99, 2),
        error_rate=0,
        active_connections=0,
        total_requests_24h=total_requests,
    )


@router.get("/api/latency/{endpoint:path}")
async def get_endpoint_latency(endpoint: str):
    return latency_tracker.get_percentiles(endpoint)


@router.get("/api/latency")
async def get_all_endpoint_latencies():
    return latency_tracker.get_all_endpoints()


@router.get("/cache/stats", response_model=dict)
async def get_cache_stats():
    stats = await cache_manager.get_stats()
    memory = await cache_manager.get_memory_usage()
    l1_stats = cache_layer.get_l1_stats()
    key_count = await cache_manager.get_key_count()
    return {
        "redis": stats,
        "memory": memory,
        "l1_cache": l1_stats,
        "total_keys": key_count,
    }


@router.get("/cache/memory")
async def get_cache_memory():
    return await cache_manager.get_memory_usage()


@router.post("/cache/flush")
async def flush_cache(namespace: str = None):
    if namespace:
        deleted = await cache_manager.delete_pattern(f"{namespace}:*")
    else:
        deleted = 0
    return {"deleted": deleted, "note": "Only namespace-specific flush is allowed. Use Redis CLI for full flush."}


@router.get("/database/pool")
async def get_database_pool_status():
    from src.db.session import get_engine
    engine = get_engine()
    return await pool_manager.get_pool_status(engine)


@router.get("/database/slow-queries")
async def get_slow_queries(threshold_ms: float = 1000):
    return QueryOptimizer.get_slow_queries(threshold_ms)


@router.get("/database/query-stats")
async def get_query_stats():
    return QueryOptimizer.get_query_stats()


@router.get("/database/indexes")
async def get_database_indexes(session: AsyncSession = Depends(get_db_session)):
    return await DatabaseIndexManager.get_index_usage(session)


@router.get("/database/indexes/unused")
async def get_unused_indexes(session: AsyncSession = Depends(get_db_session)):
    return await DatabaseIndexManager.get_unused_indexes(session)


@router.post("/database/refresh-views")
async def refresh_materialized_views(session: AsyncSession = Depends(get_db_session)):
    await MaterializedViewManager.refresh_all(session)
    return {"status": "refreshed"}


@router.get("/celery/queues")
async def get_celery_queues():
    return queue_manager.get_all_queues()


@router.get("/celery/stats")
async def get_celery_stats():
    return queue_manager.get_stats()


@router.get("/celery/autoscaler")
async def get_autoscaler_status():
    return autoscaler.get_status()


@router.get("/celery/dead-letter")
async def get_dead_letter_queue(task_name: str = None, limit: int = 50):
    return await dlq_manager.get_dlq_entries(task_name, limit)


@router.get("/celery/dead-letter/stats")
async def get_dead_letter_stats():
    return await dlq_manager.get_dlq_stats()


@router.get("/system/resources")
async def get_system_resources():
    return await SystemProfiler.get_system_metrics()


@router.get("/system/process")
async def get_process_metrics():
    return await SystemProfiler.get_process_metrics()


@router.get("/health", response_model=PerformanceHealthCheck)
async def performance_health_check():
    checks = {}
    score = 100.0
    recommendations = []

    cache_stats = await cache_manager.get_stats()
    cache_hit_rate = cache_stats.get("hit_rate", 0)
    checks["cache_hit_rate"] = {"value": cache_hit_rate, "status": "ok" if cache_hit_rate > 0.8 else "warning"}
    if cache_hit_rate < 0.8:
        score -= 10
        recommendations.append("Cache hit rate is below 80%. Consider warming up cache or increasing TTLs.")

    slow_queries = QueryOptimizer.get_slow_queries()
    checks["slow_queries"] = {"value": len(slow_queries), "status": "ok" if len(slow_queries) < 5 else "warning"}
    if len(slow_queries) > 5:
        score -= 15
        recommendations.append(f"{len(slow_queries)} slow queries detected. Add indexes or optimize queries.")

    system = await SystemProfiler.get_system_metrics()
    checks["cpu"] = {"value": system["cpu_percent"], "status": "ok" if system["cpu_percent"] < 80 else "critical"}
    if system["cpu_percent"] > 80:
        score -= 20
        recommendations.append("CPU usage is above 80%. Consider scaling horizontally.")

    checks["memory"] = {"value": system["memory_percent"], "status": "ok" if system["memory_percent"] < 85 else "critical"}
    if system["memory_percent"] > 85:
        score -= 20
        recommendations.append("Memory usage is above 85%. Consider increasing memory limits.")

    dlq_stats = await dlq_manager.get_dlq_stats()
    total_dlq = sum(dlq_stats.values())
    checks["dead_letter_queue"] = {"value": total_dlq, "status": "ok" if total_dlq < 10 else "warning"}
    if total_dlq > 10:
        score -= 10
        recommendations.append(f"{total_dlq} tasks in dead letter queue. Investigate failed tasks.")

    status = "healthy" if score >= 80 else "degraded" if score >= 60 else "unhealthy"
    return PerformanceHealthCheck(
        status=status,
        timestamp=datetime.utcnow(),
        checks=checks,
        score=max(0, score),
        recommendations=recommendations,
    )


@router.get("/benchmarks/results")
async def get_benchmark_results(limit: int = 20):
    engine = get_engine()
    async_session_factory = __import__("src.db.session", fromlist=["async_session_factory"]).async_session_factory
    async with async_session_factory() as session:
        repo = LoadTestResultRepository(session)
        results = await repo.get_recent_results(limit)
        return [
            {
                "id": str(r.id),
                "test_name": r.test_name,
                "test_type": r.test_type,
                "requests_per_second": r.requests_per_second,
                "avg_response_time_ms": r.avg_response_time_ms,
                "p95_response_time_ms": r.p95_response_time_ms,
                "error_rate": r.error_rate,
                "timestamp": r.timestamp.isoformat(),
            }
            for r in results
        ]
