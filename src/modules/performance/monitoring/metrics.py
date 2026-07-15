import time
import asyncio
import logging
from typing import Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import deque

import psutil

from src.modules.performance.cache.redis_cache import cache_manager

logger = logging.getLogger(__name__)


@dataclass
class MetricPoint:
    timestamp: float
    value: float
    labels: dict = field(default_factory=dict)


class MetricsCollector:
    """Collects and stores performance metrics in Redis time series."""

    def __init__(self):
        self._buffers: dict[str, deque] = {}
        self._flush_interval = 10
        self._max_buffer_size = 100

    async def record(
        self,
        metric_name: str,
        value: float,
        labels: dict = None,
        aggregate: bool = True,
    ):
        point = MetricPoint(
            timestamp=time.time(),
            value=value,
            labels=labels or {},
        )
        if metric_name not in self._buffers:
            self._buffers[metric_name] = deque(maxlen=self._max_buffer_size)
        self._buffers[metric_name].append(point)

        if aggregate:
            await self._store_point(metric_name, point)

    async def _store_point(self, metric_name: str, point: MetricPoint):
        try:
            key = f"metrics:{metric_name}:{int(point.timestamp)}"
            data = {
                "value": point.value,
                "labels": point.labels,
                "timestamp": point.timestamp,
            }
            await cache_manager.set("metrics", key, data, ttl=86400)

            await cache_manager.redis.zadd(
                f"metrics:series:{metric_name}",
                {f"{point.timestamp}": point.timestamp},
            )
            await cache_manager.redis.zremrangebyscore(
                f"metrics:series:{metric_name}",
                0,
                time.time() - 86400,
            )
        except Exception as e:
            logger.warning(f"Failed to store metric {metric_name}: {e}")

    async def get_metric_series(
        self,
        metric_name: str,
        start_time: float = None,
        end_time: float = None,
        limit: int = 1000,
    ) -> list[dict]:
        try:
            start = start_time or (time.time() - 3600)
            end = end_time or time.time()
            timestamps = await cache_manager.redis.zrangebyscore(
                f"metrics:series:{metric_name}",
                start,
                end,
                start=0,
                num=limit,
            )
            points = []
            for ts in timestamps:
                key = f"metrics:{metric_name}:{ts}"
                data = await cache_manager.get("metrics", key)
                if data:
                    points.append(data)
            return points
        except Exception:
            return []

    async def get_metric_stats(self, metric_name: str, window_seconds: int = 3600) -> dict:
        points = await self.get_metric_series(
            metric_name,
            start_time=time.time() - window_seconds,
        )
        if not points:
            return {"count": 0, "avg": 0, "min": 0, "max": 0, "p50": 0, "p95": 0, "p99": 0}

        values = sorted([p["value"] for p in points])
        n = len(values)
        return {
            "count": n,
            "avg": sum(values) / n,
            "min": values[0],
            "max": values[-1],
            "p50": values[n // 2],
            "p95": values[int(n * 0.95)] if n > 1 else values[0],
            "p99": values[int(n * 0.99)] if n > 1 else values[0],
        }


metrics_collector = MetricsCollector()


class SystemProfiler:
    """Profiles system resource usage."""

    @staticmethod
    async def get_system_metrics() -> dict:
        cpu = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_io_counters()
        net = psutil.net_io_counters()
        return {
            "cpu_percent": cpu,
            "memory_percent": memory.percent,
            "memory_used_gb": round(memory.used / (1024**3), 2),
            "memory_total_gb": round(memory.total / (1024**3), 2),
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "disk_read_mbps": round(disk.read_bytes / (1024**2), 2) if disk else 0,
            "disk_write_mbps": round(disk.write_bytes / (1024**2), 2) if disk else 0,
            "network_sent_mbps": round(net.bytes_sent / (1024**2), 2),
            "network_recv_mbps": round(net.bytes_recv / (1024**2), 2),
            "open_file_descriptors": len(psutil.Process().open_files()),
            "thread_count": psutil.Process().num_threads(),
            "uptime_seconds": time.time() - psutil.Process().create_time(),
        }

    @staticmethod
    async def get_process_metrics() -> dict:
        process = psutil.Process()
        with process.oneshot():
            return {
                "pid": process.pid,
                "cpu_percent": process.cpu_percent(),
                "memory_mb": round(process.memory_info().rss / (1024**2), 2),
                "memory_percent": process.memory_percent(),
                "threads": process.num_threads(),
                "open_files": len(process.open_files()),
                "connections": len(process.connections()),
                "io_read_bytes": process.io_counters().read_bytes if hasattr(process, 'io_counters') else 0,
                "io_write_bytes": process.io_counters().write_bytes if hasattr(process, 'io_counters') else 0,
            }


class PerformanceProfiler:
    """Context manager for profiling code execution."""

    def __init__(self, name: str = "operation"):
        self.name = name
        self.start_time = 0
        self.duration_ms = 0
        self._metrics: dict = {}

    async def __aenter__(self):
        self.start_time = time.perf_counter()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.duration_ms = (time.perf_counter() - self.start_time) * 1000
        await metrics_collector.record(
            f"profile:{self.name}:duration_ms",
            self.duration_ms,
        )
        if exc_type:
            await metrics_collector.record(
                f"profile:{self.name}:errors",
                1,
            )
        return False

    def record(self, key: str, value: float):
        self._metrics[key] = value

    def get_results(self) -> dict:
        return {
            "name": self.name,
            "duration_ms": self.duration_ms,
            "metrics": self._metrics,
        }


class LatencyTracker:
    """Tracks request latency percentiles in real-time."""

    def __init__(self, window_size: int = 10000):
        self._windows: dict[str, deque] = {}
        self._window_size = window_size

    def record(self, endpoint: str, latency_ms: float):
        if endpoint not in self._windows:
            self._windows[endpoint] = deque(maxlen=self._window_size)
        self._windows[endpoint].append(latency_ms)

    def get_percentiles(self, endpoint: str) -> dict:
        if endpoint not in self._windows or not self._windows[endpoint]:
            return {"p50": 0, "p95": 0, "p99": 0, "min": 0, "max": 0, "count": 0}

        values = sorted(self._windows[endpoint])
        n = len(values)
        return {
            "p50": values[n // 2],
            "p95": values[int(n * 0.95)] if n > 1 else values[0],
            "p99": values[int(n * 0.99)] if n > 1 else values[0],
            "min": values[0],
            "max": values[-1],
            "count": n,
        }

    def get_all_endpoints(self) -> dict:
        return {
            endpoint: self.get_percentiles(endpoint)
            for endpoint in self._windows
        }

    def reset(self, endpoint: str = None):
        if endpoint:
            self._windows.pop(endpoint, None)
        else:
            self._windows.clear()


latency_tracker = LatencyTracker()
