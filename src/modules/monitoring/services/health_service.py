import time
import psutil
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from src.core.config import settings
from src.core.logging import get_logger
from src.modules.monitoring.repositories.monitoring import HealthSnapshotRepository

logger = get_logger(__name__)

_start_time = time.time()


class HealthCheckService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.snapshot_repo = HealthSnapshotRepository(session)

    async def check_database(self) -> dict:
        start = time.time()
        try:
            await self.session.execute(text("SELECT 1"))
            latency = (time.time() - start) * 1000
            return {"status": "healthy", "latency_ms": round(latency, 2)}
        except Exception as e:
            latency = (time.time() - start) * 1000
            logger.error("database_health_check_failed", error=str(e))
            return {"status": "unhealthy", "latency_ms": round(latency, 2), "error": str(e)}

    async def check_redis(self) -> dict:
        start = time.time()
        try:
            from src.core.dependencies import get_redis
            redis = await get_redis()
            await redis.ping()
            latency = (time.time() - start) * 1000
            return {"status": "healthy", "latency_ms": round(latency, 2)}
        except Exception as e:
            latency = (time.time() - start) * 1000
            logger.error("redis_health_check_failed", error=str(e))
            return {"status": "unhealthy", "latency_ms": round(latency, 2), "error": str(e)}

    async def check_celery(self) -> dict:
        start = time.time()
        try:
            from src.core.celery_app import celery_app
            inspect = celery_app.control.inspect(timeout=5.0)
            active = inspect.active() or {}
            latency = (time.time() - start) * 1000
            worker_count = len(active)
            return {
                "status": "healthy" if worker_count > 0 else "degraded",
                "latency_ms": round(latency, 2),
                "workers": worker_count,
                "active_tasks": sum(len(tasks) for tasks in active.values()),
            }
        except Exception as e:
            latency = (time.time() - start) * 1000
            logger.error("celery_health_check_failed", error=str(e))
            return {"status": "unhealthy", "latency_ms": round(latency, 2), "error": str(e)}

    async def check_storage(self) -> dict:
        start = time.time()
        try:
            import os
            upload_dir = settings.UPLOAD_DIR if hasattr(settings, "UPLOAD_DIR") else "/tmp"
            os.makedirs(upload_dir, exist_ok=True)
            test_file = os.path.join(upload_dir, ".health_check")
            with open(test_file, "w") as f:
                f.write("health")
            os.remove(test_file)
            latency = (time.time() - start) * 1000
            return {"status": "healthy", "latency_ms": round(latency, 2)}
        except Exception as e:
            latency = (time.time() - start) * 1000
            logger.error("storage_health_check_failed", error=str(e))
            return {"status": "unhealthy", "latency_ms": round(latency, 2), "error": str(e)}

    def check_system_resources(self) -> dict:
        disk = psutil.disk_usage("/")
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=0.1)

        return {
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "usage_percent": round(disk.percent, 2),
            },
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "usage_percent": round(memory.percent, 2),
            },
            "cpu": {
                "usage_percent": round(cpu_percent, 2),
                "count": psutil.cpu_count(),
            },
        }

    async def check_api(self) -> dict:
        start = time.time()
        latency = (time.time() - start) * 1000
        return {"status": "healthy", "latency_ms": round(latency, 2)}

    async def full_health_check(self) -> dict:
        api = await self.check_api()
        database = await self.check_database()
        redis = await self.check_redis()
        celery = await self.check_celery()
        storage = await self.check_storage()
        system = self.check_system_resources()

        checks = {
            "api": api,
            "database": database,
            "redis": redis,
            "celery": celery,
            "storage": storage,
            "system": system,
        }

        healthy_count = sum(
            1 for k, v in checks.items()
            if k != "system" and v.get("status") == "healthy"
        )
        total_checks = sum(1 for k in checks if k != "system")

        if healthy_count == total_checks:
            overall = "healthy"
        elif healthy_count >= total_checks * 0.5:
            overall = "degraded"
        else:
            overall = "unhealthy"

        try:
            await self.snapshot_repo.save_snapshot(
                overall_status=overall,
                api_healthy=api["status"] == "healthy",
                database_healthy=database["status"] == "healthy",
                redis_healthy=redis["status"] == "healthy",
                celery_healthy=celery["status"] == "healthy",
                storage_healthy=storage["status"] == "healthy",
                disk_usage_percent=system["disk"]["usage_percent"],
                memory_usage_percent=system["memory"]["usage_percent"],
                cpu_usage_percent=system["cpu"]["usage_percent"],
            )
        except Exception as e:
            logger.error("failed_to_save_health_snapshot", error=str(e))

        return {
            "status": overall,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": settings.VERSION if hasattr(settings, "VERSION") else "1.0.0",
            "uptime_seconds": round(time.time() - _start_time, 2),
            "checks": checks,
        }

    async def readiness_check(self) -> dict:
        database = await self.check_database()
        redis = await self.check_redis()

        components = [
            {"name": "database", **database},
            {"name": "redis", **redis},
        ]

        all_healthy = all(c["status"] == "healthy" for c in components)

        return {
            "status": "ready" if all_healthy else "not_ready",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components": components,
        }

    def liveness_check(self) -> dict:
        return {
            "status": "alive",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "uptime_seconds": round(time.time() - _start_time, 2),
        }
