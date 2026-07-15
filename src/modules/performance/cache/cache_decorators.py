import time
import hashlib
import json
import logging
from typing import Any, Optional, Callable
from functools import wraps

from src.modules.performance.cache.redis_cache import cache_manager

logger = logging.getLogger(__name__)


def cache_result(
    namespace: str,
    ttl: int = 300,
    key_builder: Optional[Callable] = None,
    skip_if: Optional[Callable] = None,
):
    """Advanced caching decorator with conditional skip and custom key building."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if skip_if and skip_if(*args, **kwargs):
                return await func(*args, **kwargs)

            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                sig_data = json.dumps(
                    {"args": str(args[1:]), "kwargs": str(kwargs)},
                    sort_keys=True,
                    default=str,
                )
                cache_key = hashlib.sha256(sig_data.encode()).hexdigest()[:16]

            cached_value = await cache_manager.get(namespace, cache_key)
            if cached_value is not None:
                return cached_value

            start = time.perf_counter()
            result = await func(*args, **kwargs)
            duration_ms = (time.perf_counter() - start) * 1000

            if result is not None:
                await cache_manager.set(namespace, cache_key, result, ttl)

            logger.debug(
                "cache_operation",
                extra={
                    "namespace": namespace,
                    "key": cache_key,
                    "hit": False,
                    "duration_ms": round(duration_ms, 2),
                },
            )
            return result
        return wrapper
    return decorator


def invalidate_on_change(namespace: str, patterns: list[str] = None):
    """Decorator that invalidates cache when a mutation occurs."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            try:
                if patterns:
                    for pattern in patterns:
                        await cache_manager.delete_pattern(f"{namespace}:{pattern}")
                else:
                    await cache_manager.delete_pattern(f"{namespace}:*")
                logger.debug(
                    "cache_invalidated",
                    extra={"namespace": namespace, "patterns": patterns},
                )
            except Exception as e:
                logger.warning("cache_invalidation_failed", extra={"error": str(e)})
            return result
        return wrapper
    return decorator


def cache_metric(namespace: str, ttl: int = 60):
    """Decorator for caching expensive metric calculations."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"metric:{func.__name__}:{hashlib.sha256(json.dumps(kwargs, sort_keys=True, default=str).encode()).hexdigest()[:12]}"
            cached = await cache_manager.get(namespace, cache_key)
            if cached is not None:
                return cached

            start = time.perf_counter()
            result = await func(*args, **kwargs)
            duration_ms = (time.perf_counter() - start) * 1000

            if result is not None:
                await cache_manager.set(namespace, cache_key, result, ttl)

            return result
        return wrapper
    return decorator


def batch_cache(namespace: str, ttl: int = 300, batch_size: int = 100):
    """Decorator for batch caching operations."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(items: list, *args, **kwargs):
            results = {}
            uncached_items = []

            for item in items:
                item_key = hashlib.sha256(
                    json.dumps(item, sort_keys=True, default=str).encode()
                ).hexdigest()[:16]
                cached = await cache_manager.get(namespace, item_key)
                if cached is not None:
                    results[item_key] = cached
                else:
                    uncached_items.append((item_key, item))

            if uncached_items:
                fresh_results = await func(
                    [item for _, item in uncached_items], *args, **kwargs
                )
                if isinstance(fresh_results, dict):
                    for item_key, value in fresh_results.items():
                        results[item_key] = value
                        await cache_manager.set(namespace, item_key, value, ttl)
                elif isinstance(fresh_results, list):
                    for (item_key, _), value in zip(uncached_items, fresh_results):
                        results[item_key] = value
                        await cache_manager.set(namespace, item_key, value, ttl)

            return results
        return wrapper
    return decorator
