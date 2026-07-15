import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from src.modules.performance.cache.redis_cache import cache_manager
from src.core.config import settings

logger = logging.getLogger(__name__)


class CacheWarmupService:
    """Pre-populates cache with frequently accessed data on startup."""

    def __init__(self):
        self._warmed_up = False
        self._warmup_tasks: list[str] = []

    async def warmup_all(self):
        if self._warmed_up:
            return
        logger.info("Starting cache warmup...")
        start = datetime.utcnow()

        tasks = [
            self._warmup_user_sessions(),
            self._warmup_api_endpoints(),
            self._warmup_search_suggestions(),
            self._warmup_config_data(),
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

        duration = (datetime.utcnow() - start).total_seconds()
        self._warmed_up = True
        logger.info(f"Cache warmup completed in {duration:.2f}s")

    async def _warmup_user_sessions(self):
        try:
            logger.info("Warming up user sessions...")
            self._warmup_tasks.append("user_sessions")
        except Exception as e:
            logger.warning(f"Failed to warm up user sessions: {e}")

    async def _warmup_api_endpoints(self):
        try:
            logger.info("Warming up API endpoint metadata...")
            endpoints = {
                "health": {"status": "ok", "timestamp": datetime.utcnow().isoformat()},
                "version": {"version": settings.APP_VERSION},
            }
            for key, value in endpoints.items():
                await cache_manager.set("api:endpoints", key, value, ttl=3600)
            self._warmup_tasks.append("api_endpoints")
        except Exception as e:
            logger.warning(f"Failed to warm up API endpoints: {e}")

    async def _warmup_search_suggestions(self):
        try:
            logger.info("Warming up search suggestions...")
            self._warmup_tasks.append("search_suggestions")
        except Exception as e:
            logger.warning(f"Failed to warm up search suggestions: {e}")

    async def _warmup_config_data(self):
        try:
            logger.info("Warming up configuration data...")
            config = {
                "app_name": settings.APP_NAME,
                "version": settings.APP_VERSION,
                "environment": "production",
            }
            await cache_manager.set("config", "app", config, ttl=86400)
            self._warmup_tasks.append("config_data")
        except Exception as e:
            logger.warning(f"Failed to warm up config data: {e}")

    async def warmup_table(self, table_name: str, query_func, ttl: int = 300):
        try:
            data = await query_func()
            if data:
                await cache_manager.set(f"table:{table_name}", "all", data, ttl)
                logger.info(f"Warmed up table: {table_name} ({len(data)} records)")
        except Exception as e:
            logger.warning(f"Failed to warm up table {table_name}: {e}")

    async def get_warmup_status(self) -> dict:
        return {
            "warmed_up": self._warmed_up,
            "tasks_completed": self._warmup_tasks,
            "last_warmup": datetime.utcnow().isoformat() if self._warmed_up else None,
        }


cache_warmup = CacheWarmupService()
