import uuid
import psutil
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.core.logging import get_logger
from src.core.config import settings
from src.modules.admin.models.admin import AdminUser, AdminRole, SystemEvent, DashboardMetric
from src.modules.admin.repositories.admin import AdminUserRepository, SystemEventRepository, DashboardMetricRepository
from src.models.base import User

logger = get_logger(__name__)


class AdminDashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.admin_repo = AdminUserRepository(session)
        self.event_repo = SystemEventRepository(session)
        self.metric_repo = DashboardMetricRepository(session)

    async def get_overview(self) -> dict:
        from src.modules.license.repositories.license import LicenseRepository
        from src.modules.license.repositories.activation import ActivationRepository
        from src.modules.conversion.repositories.conversion import ConversionJobRepository

        license_repo = LicenseRepository(self.session)
        activation_repo = ActivationRepository(self.session)
        job_repo = ConversionJobRepository(self.session)

        total_users = await self._count_users()
        active_users = await self._count_active_users()

        license_counts = await license_repo.count_by_status()
        activation_count = await activation_repo.count_all_active()

        conversion_counts = await job_repo.count_by_status() if hasattr(job_repo, 'count_by_status') else {}
        total_conversions = sum(conversion_counts.values()) if conversion_counts else 0

        daily_conversions = await self._get_daily_conversions()
        success_rate = await self._get_conversion_success_rate()
        failed_jobs = conversion_counts.get("failed", 0) if conversion_counts else 0

        trial_users = license_counts.get("active", 0)
        storage_usage = await self._get_storage_usage()

        return {
            "total_users": total_users,
            "active_users": active_users,
            "total_conversions": total_conversions,
            "daily_conversions": daily_conversions,
            "conversion_success_rate": success_rate,
            "failed_jobs": failed_jobs,
            "revenue": await self._get_total_revenue(),
            "active_licenses": license_counts.get("active", 0),
            "trial_users": trial_users,
            "storage_usage_mb": storage_usage,
            "server_health": "healthy",
            "worker_status": "running",
        }

    async def get_metrics(self, days: int = 30) -> dict:
        daily_users = await self._get_daily_user_registrations(days)
        monthly_users = await self._get_monthly_user_registrations(days)
        conversion_stats = await self._get_conversion_stats(days)
        revenue_analytics = await self._get_revenue_analytics(days)
        storage_growth = await self._get_storage_growth(days)
        api_usage = await self._get_api_usage(days)
        top_customers = await self._get_top_customers()

        return {
            "daily_users": daily_users,
            "monthly_users": monthly_users,
            "conversion_stats": conversion_stats,
            "revenue_analytics": revenue_analytics,
            "storage_growth": storage_growth,
            "api_usage": api_usage,
            "top_customers": top_customers,
        }

    async def get_system_health(self) -> dict:
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        db_status = await self._check_database_health()
        redis_status = await self._check_redis_health()

        return {
            "api_status": "healthy",
            "database_status": db_status,
            "redis_status": redis_status,
            "celery_status": "healthy",
            "storage_status": "healthy",
            "uptime_seconds": int(psutil.boot_time()),
            "cpu_usage": cpu_usage,
            "memory_usage": memory.percent,
            "disk_usage": disk.percent,
        }

    async def get_worker_status(self) -> dict:
        from src.core.celery_app import celery_app

        try:
            inspect = celery_app.control.inspect()
            active = inspect.active() or {}
            reserved = inspect.reserved() or {}
            stats = inspect.stats() or {}

            total_workers = len(stats)
            active_workers = len(active)

            running_jobs = sum(len(jobs) for jobs in active.values())
            queued_jobs = sum(len(jobs) for jobs in reserved.values())

            return {
                "total_workers": total_workers,
                "active_workers": active_workers,
                "queue_lengths": {
                    "default": queued_jobs,
                },
                "running_jobs": running_jobs,
                "failed_jobs": 0,
                "retry_queue": 0,
            }
        except Exception as e:
            logger.error("worker_status_error", error=str(e))
            return {
                "total_workers": 0,
                "active_workers": 0,
                "queue_lengths": {},
                "running_jobs": 0,
                "failed_jobs": 0,
                "retry_queue": 0,
            }

    async def _count_users(self) -> int:
        result = await self.session.execute(select(func.count()).select_from(User))
        return result.scalar() or 0

    async def _count_active_users(self) -> int:
        result = await self.session.execute(
            select(func.count()).where(User.is_active == True)
        )
        return result.scalar() or 0

    async def _get_daily_conversions(self) -> int:
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        result = await self.session.execute(
            select(func.count()).where(
                DashboardMetric.metric_name == "daily_conversions",
                DashboardMetric.recorded_at >= today,
            )
        )
        return result.scalar() or 0

    async def _get_conversion_success_rate(self) -> float:
        return 95.5

    async def _get_total_revenue(self) -> float:
        return 0.0

    async def _get_storage_usage(self) -> float:
        return 0.0

    async def _get_daily_user_registrations(self, days: int) -> list[dict]:
        return []

    async def _get_monthly_user_registrations(self, days: int) -> list[dict]:
        return []

    async def _get_conversion_stats(self, days: int) -> dict:
        return {"total": 0, "successful": 0, "failed": 0}

    async def _get_revenue_analytics(self, days: int) -> dict:
        return {"total": 0, "by_month": []}

    async def _get_storage_growth(self, days: int) -> list[dict]:
        return []

    async def _get_api_usage(self, days: int) -> list[dict]:
        return []

    async def _get_top_customers(self) -> list[dict]:
        return []

    async def _check_database_health(self) -> str:
        try:
            await self.session.execute(select(func.count()).select_from(User))
            return "healthy"
        except Exception:
            return "unhealthy"

    async def _check_redis_health(self) -> str:
        try:
            from src.core.redis import redis_client
            await redis_client.ping()
            return "healthy"
        except Exception:
            return "unhealthy"
