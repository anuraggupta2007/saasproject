import time
import logging
from typing import Any, Optional
from dataclasses import dataclass, field
from datetime import datetime

from celery import Celery
from celery.app.control import Control

from src.core.celery_app import celery_app

logger = logging.getLogger(__name__)


@dataclass
class QueueConfig:
    name: str
    routing_key: str
    priority: int = 0
    rate_limit: Optional[str] = None
    max_retries: int = 3
    retry_delay: float = 60.0
    worker_concurrency: int = 4
    worker_prefetch: int = 1


class CeleryQueueManager:
    """Manages Celery queues with priority routing and autoscaling."""

    QUEUES = {
        "conversion": QueueConfig(
            name="conversion",
            routing_key="conversion",
            priority=0,
            rate_limit="100/m",
            max_retries=3,
            retry_delay=120.0,
            worker_concurrency=8,
            worker_prefetch=1,
        ),
        "upload": QueueConfig(
            name="upload",
            routing_key="upload",
            priority=1,
            rate_limit="50/m",
            max_retries=5,
            retry_delay=60.0,
            worker_concurrency=4,
            worker_prefetch=2,
        ),
        "notification": QueueConfig(
            name="notification",
            routing_key="notification",
            priority=2,
            rate_limit="200/m",
            max_retries=5,
            retry_delay=30.0,
            worker_concurrency=4,
            worker_prefetch=4,
        ),
        "analytics": QueueConfig(
            name="analytics",
            routing_key="analytics",
            priority=3,
            rate_limit="100/m",
            max_retries=3,
            retry_delay=60.0,
            worker_concurrency=2,
            worker_prefetch=4,
        ),
        "search": QueueConfig(
            name="search",
            routing_key="search",
            priority=2,
            rate_limit="150/m",
            max_retries=3,
            retry_delay=30.0,
            worker_concurrency=4,
            worker_prefetch=2,
        ),
        "payment": QueueConfig(
            name="payment",
            routing_key="payment",
            priority=0,
            rate_limit="30/m",
            max_retries=5,
            retry_delay=300.0,
            worker_concurrency=2,
            worker_prefetch=1,
        ),
        "security": QueueConfig(
            name="security",
            routing_key="security",
            priority=1,
            rate_limit="100/m",
            max_retries=3,
            retry_delay=60.0,
            worker_concurrency=2,
            worker_prefetch=2,
        ),
        "maintenance": QueueConfig(
            name="maintenance",
            routing_key="maintenance",
            priority=4,
            rate_limit="10/m",
            max_retries=2,
            retry_delay=600.0,
            worker_concurrency=1,
            worker_prefetch=8,
        ),
        "dead_letter": QueueConfig(
            name="dead_letter",
            routing_key="dead_letter",
            priority=5,
            worker_concurrency=1,
            worker_prefetch=10,
        ),
    }

    TASK_ROUTING = {
        "src.modules.conversion.tasks.*": "conversion",
        "src.modules.uploads.tasks.*": "upload",
        "src.modules.notification.tasks.*": "notification",
        "src.modules.analytics.tasks.*": "analytics",
        "src.modules.search.tasks.*": "search",
        "src.modules.payment.tasks.*": "payment",
        "src.modules.security.tasks.*": "security",
        "src.modules.monitoring.tasks.*": "maintenance",
        "src.modules.license.tasks.*": "maintenance",
        "src.modules.gateway.tasks.*": "maintenance",
    }

    def __init__(self):
        self._stats: dict[str, dict] = {}

    def configure_queues(self, app: Celery):
        from kombu import Queue, Exchange

        exchange = Exchange("default", type="direct")
        queue_configs = []
        for name, config in self.QUEUES.items():
            if name == "dead_letter":
                continue
            queue_configs.append(
                Queue(
                    config.name,
                    exchange,
                    routing_key=config.routing_key,
                    queue_arguments={"x-max-priority": 5},
                )
            )

        app.conf.task_queues = queue_configs
        app.conf.task_routes = self.TASK_ROUTING
        app.conf.task_default_queue = "default"
        app.conf.task_default_exchange = "default"
        app.conf.task_default_routing_key = "default"

        app.conf.worker_prefetch_multiplier = 1
        app.conf.task_acks_late = True
        app.conf.task_reject_on_worker_lost = True
        app.conf.task_track_started = True

        logger.info(f"Configured {len(queue_configs)} Celery queues")

    def get_queue_config(self, queue_name: str) -> Optional[QueueConfig]:
        return self.QUEUES.get(queue_name)

    def get_all_queues(self) -> dict[str, dict]:
        return {
            name: {
                "name": config.name,
                "routing_key": config.routing_key,
                "priority": config.priority,
                "rate_limit": config.rate_limit,
                "worker_concurrency": config.worker_concurrency,
            }
            for name, config in self.QUEUES.items()
        }

    def record_task(self, queue_name: str, duration_ms: float, success: bool):
        if queue_name not in self._stats:
            self._stats[queue_name] = {
                "total": 0, "success": 0, "failure": 0,
                "total_duration_ms": 0, "avg_duration_ms": 0,
            }
        stats = self._stats[queue_name]
        stats["total"] += 1
        if success:
            stats["success"] += 1
        else:
            stats["failure"] += 1
        stats["total_duration_ms"] += duration_ms
        stats["avg_duration_ms"] = stats["total_duration_ms"] / stats["total"]

    def get_stats(self) -> dict:
        result = {}
        for queue_name, stats in self._stats.items():
            total = stats["total"]
            result[queue_name] = {
                **stats,
                "success_rate": stats["success"] / total if total > 0 else 0,
            }
        return result


queue_manager = CeleryQueueManager()


class WorkerAutoscaler:
    """Monitors worker load and triggers scaling decisions."""

    def __init__(self):
        self._min_workers = 1
        self._max_workers = 10
        self._scale_up_threshold = 0.8
        self._scale_down_threshold = 0.3
        self._cooldown_seconds = 300
        self._last_scale_time: dict[str, float] = {}

    def configure(
        self,
        min_workers: int = 1,
        max_workers: int = 10,
        scale_up_threshold: float = 0.8,
        scale_down_threshold: float = 0.3,
        cooldown_seconds: int = 300,
    ):
        self._min_workers = min_workers
        self._max_workers = max_workers
        self._scale_up_threshold = scale_up_threshold
        self._scale_down_threshold = scale_down_threshold
        self._cooldown_seconds = cooldown_seconds

    def should_scale(self, queue_name: str, queue_depth: int, active_workers: int) -> Optional[str]:
        if active_workers == 0:
            return "up"

        now = time.time()
        last_scale = self._last_scale_time.get(queue_name, 0)
        if now - last_scale < self._cooldown_seconds:
            return None

        tasks_per_worker = queue_depth / active_workers if active_workers > 0 else 0

        if tasks_per_worker > self._scale_up_threshold * 10 and active_workers < self._max_workers:
            return "up"
        elif tasks_per_worker < self._scale_down_threshold * 10 and active_workers > self._min_workers:
            return "down"
        return None

    def record_scale(self, queue_name: str):
        self._last_scale_time[queue_name] = time.time()

    def get_status(self) -> dict:
        return {
            "min_workers": self._min_workers,
            "max_workers": self._max_workers,
            "scale_up_threshold": self._scale_up_threshold,
            "scale_down_threshold": self._scale_down_threshold,
            "cooldown_seconds": self._cooldown_seconds,
            "last_scale_times": self._last_scale_time.copy(),
        }


autoscaler = WorkerAutoscaler()


class DeadLetterQueueManager:
    """Manages dead letter queues for failed tasks."""

    def __init__(self):
        self._dlq_prefix = "dead_letter:"

    async def move_to_dlq(self, task_name: str, args: tuple, kwargs: dict, error: str):
        from src.modules.performance.cache.redis_cache import cache_manager
        import json

        dlq_key = f"{self._dlq_prefix}{task_name}"
        entry = {
            "task_name": task_name,
            "args": json.dumps(list(args), default=str),
            "kwargs": json.dumps(kwargs, default=str),
            "error": error,
            "timestamp": datetime.utcnow().isoformat(),
            "retry_count": 0,
        }
        await cache_manager.redis.lpush(dlq_key, json.dumps(entry, default=str))
        await cache_manager.redis.ltrim(dlq_key, 0, 999)
        logger.warning(f"Task moved to DLQ: {task_name}")

    async def get_dlq_entries(self, task_name: str = None, limit: int = 50) -> list[dict]:
        from src.modules.performance.cache.redis_cache import cache_manager
        import json

        if task_name:
            entries = await cache_manager.redis.lrange(f"{self._dlq_prefix}{task_name}", 0, limit - 1)
        else:
            entries = []
            async for key in cache_manager.redis.scan_iter(match=f"{self._dlq_prefix}*", count=100):
                batch = await cache_manager.redis.lrange(key, 0, limit - 1)
                entries.extend(batch)
        return [json.loads(e) for e in entries[:limit]]

    async def retry_entry(self, task_name: str, entry_index: int = 0):
        from src.modules.performance.cache.redis_cache import cache_manager
        import json

        dlq_key = f"{self._dlq_prefix}{task_name}"
        entry = await cache_manager.redis.lindex(dlq_key, entry_index)
        if entry:
            data = json.loads(entry)
            args = tuple(json.loads(data["args"])) if isinstance(data["args"], str) else data["args"]
            kwargs = json.loads(data["kwargs"]) if isinstance(data["kwargs"], str) else data["kwargs"]
            await celery_app.send_task(
                task_name,
                args=args,
                kwargs=kwargs,
            )
            await cache_manager.redis.lrem(dlq_key, 1, entry)
            logger.info(f"Retried task from DLQ: {task_name}")

    async def get_dlq_stats(self) -> dict:
        from src.modules.performance.cache.redis_cache import cache_manager

        stats = {}
        async for key in cache_manager.redis.scan_iter(match=f"{self._dlq_prefix}*", count=100):
            task_name = key.replace(self._dlq_prefix, "")
            count = await cache_manager.redis.llen(key)
            stats[task_name] = count
        return stats


dlq_manager = DeadLetterQueueManager()
