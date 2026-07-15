import time
import hashlib
import logging
from typing import Any, Optional
from contextlib import asynccontextmanager
from datetime import datetime

from sqlalchemy import text, event, Engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import QueuePool

from src.core.config import settings

logger = logging.getLogger(__name__)


class ConnectionPoolManager:
    """Manages database connection pools with monitoring and optimization."""

    def __init__(self):
        self._engines: dict[str, Any] = {}
        self._stats = {
            "total_connections": 0,
            "active_connections": 0,
            "idle_connections": 0,
            "waiting_connections": 0,
            "connection_errors": 0,
        }

    def create_optimized_engine(
        self,
        url: str,
        pool_size: int = 20,
        max_overflow: int = 30,
        pool_timeout: int = 30,
        pool_recycle: int = 1800,
        pool_pre_ping: bool = True,
        echo: bool = False,
    ):
        engine = create_async_engine(
            url,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_timeout=pool_timeout,
            pool_recycle=pool_recycle,
            pool_pre_ping=pool_pre_ping,
            echo=echo,
            poolclass=QueuePool,
            connect_args={
                "server_settings": {
                    "application_name": "email_converter",
                    "statement_timeout": "30000",
                    "idle_in_transaction_session_timeout": "60000",
                }
            },
        )
        return engine

    def create_read_replica_engine(self, replica_url: str, **kwargs):
        return self.create_optimized_engine(
            replica_url,
            pool_size=kwargs.get("pool_size", 15),
            max_overflow=kwargs.get("max_overflow", 20),
            pool_timeout=kwargs.get("pool_timeout", 15),
            pool_recycle=kwargs.get("pool_recycle", 900),
        )

    async def get_pool_status(self, engine) -> dict:
        pool = engine.pool
        return {
            "pool_size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "total_connections": pool.checkedin() + pool.checkedout(),
        }

    async def warmup_pool(self, engine, sessions: int = 5):
        for _ in range(sessions):
            try:
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))
            except Exception as e:
                logger.warning(f"Pool warmup error: {e}")


pool_manager = ConnectionPoolManager()


class QueryOptimizer:
    """Query performance tracking and optimization."""

    _slow_query_threshold_ms = 1000
    _query_stats: dict[str, list[float]] = {}

    @classmethod
    def track_query(cls, query_text: str, duration_ms: float):
        query_hash = hashlib.sha256(query_text.encode()).hexdigest()[:16]
        if query_hash not in cls._query_stats:
            cls._query_stats[query_hash] = []
        cls._query_stats[query_hash].append(duration_ms)
        if len(cls._query_stats[query_hash]) > 1000:
            cls._query_stats[query_hash] = cls._query_stats[query_hash][-500:]

    @classmethod
    def get_slow_queries(cls, threshold_ms: float = None) -> list[dict]:
        threshold = threshold_ms or cls._slow_query_threshold_ms
        slow = []
        for query_hash, durations in cls._query_stats.items():
            avg_duration = sum(durations) / len(durations)
            if avg_duration > threshold:
                slow.append({
                    "query_hash": query_hash,
                    "avg_duration_ms": round(avg_duration, 2),
                    "max_duration_ms": round(max(durations), 2),
                    "call_count": len(durations),
                })
        return sorted(slow, key=lambda x: x["avg_duration_ms"], reverse=True)

    @classmethod
    def get_query_stats(cls) -> dict:
        stats = {}
        for query_hash, durations in cls._query_stats.items():
            sorted_durations = sorted(durations)
            n = len(sorted_durations)
            stats[query_hash] = {
                "call_count": n,
                "avg_ms": round(sum(durations) / n, 2),
                "p50_ms": round(sorted_durations[n // 2], 2),
                "p95_ms": round(sorted_durations[int(n * 0.95)], 2) if n > 1 else sorted_durations[0],
                "p99_ms": round(sorted_durations[int(n * 0.99)], 2) if n > 1 else sorted_durations[0],
                "min_ms": round(sorted_durations[0], 2),
                "max_ms": round(sorted_durations[-1], 2),
            }
        return stats

    @classmethod
    def reset_stats(cls):
        cls._query_stats.clear()


class ReadReplicaRouter:
    """Routes read queries to replicas, writes to primary."""

    def __init__(self):
        self._primary_engine = None
        self._replica_engines: list = []
        self._current_replica = 0

    def configure(self, primary_engine, replica_engines: list = None):
        self._primary_engine = primary_engine
        self._replica_engines = replica_engines or []

    @asynccontextmanager
    async def get_read_session(self):
        if self._replica_engines:
            engine = self._replica_engines[self._current_replica % len(self._replica_engines)]
            self._current_replica += 1
        else:
            engine = self._primary_engine

        session_factory = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        async with session_factory() as session:
            yield session

    @asynccontextmanager
    async def get_write_session(self):
        session_factory = async_sessionmaker(
            self._primary_engine, class_=AsyncSession, expire_on_commit=False
        )
        async with session_factory() as session:
            yield session


read_replica_router = ReadReplicaRouter()


class MaterializedViewManager:
    """Manages materialized views for frequently accessed aggregations."""

    VIEWS = {
        "mv_user_stats": """
            CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_stats AS
            SELECT
                u.id as user_id,
                u.email,
                COUNT(c.id) as total_conversions,
                COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as successful_conversions,
                MAX(c.created_at) as last_conversion_at
            FROM users u
            LEFT JOIN conversions c ON u.id = c.user_id
            GROUP BY u.id, u.email
        """,
        "mv_daily_metrics": """
            CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_metrics AS
            SELECT
                DATE(created_at) as date,
                COUNT(*) as total_events,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) as conversions
            FROM analytics_events
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
        """,
        "mv_conversion_stats": """
            CREATE MATERIALIZED VIEW IF NOT EXISTS mv_conversion_stats AS
            SELECT
                DATE_TRUNC('hour', created_at) as hour,
                source_format,
                target_format,
                COUNT(*) as conversion_count,
                AVG(duration_ms) as avg_duration_ms,
                SUM(file_size_bytes) as total_bytes
            FROM conversions
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE_TRUNC('hour', created_at), source_format, target_format
        """,
    }

    @classmethod
    async def refresh_all(cls, session: AsyncSession):
        for view_name in cls.VIEWS:
            try:
                await session.execute(
                    text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view_name}")
                )
                await session.commit()
                logger.info(f"Refreshed materialized view: {view_name}")
            except Exception as e:
                logger.warning(f"Failed to refresh {view_name}: {e}")
                await session.rollback()

    @classmethod
    async def create_all(cls, session: AsyncSession):
        for view_name, query in cls.VIEWS.items():
            try:
                await session.execute(text(query))
                await session.commit()
                logger.info(f"Created materialized view: {view_name}")
            except Exception as e:
                logger.warning(f"Failed to create {view_name}: {e}")
                await session.rollback()


class PartitionManager:
    """Manages table partitioning for large tables."""

    PARTITION_CONFIGS = {
        "conversions": {
            "column": "created_at",
            "type": "range",
            "interval": "1 month",
            "retention_months": 12,
        },
        "analytics_events": {
            "column": "created_at",
            "type": "range",
            "interval": "1 week",
            "retention_months": 6,
        },
        "performance_metrics": {
            "column": "timestamp",
            "type": "range",
            "interval": "1 week",
            "retention_months": 3,
        },
    }

    @classmethod
    async def create_partition(cls, session: AsyncSession, table_name: str, partition_name: str, start_date: str, end_date: str):
        config = cls.PARTITION_CONFIGS.get(table_name)
        if not config:
            return
        query = f"""
            CREATE TABLE IF NOT EXISTS {partition_name}
            PARTITION OF {table_name}
            FOR VALUES FROM ('{start_date}') TO ('{end_date}')
        """
        try:
            await session.execute(text(query))
            await session.commit()
        except Exception as e:
            logger.warning(f"Failed to create partition {partition_name}: {e}")
            await session.rollback()

    @classmethod
    async def drop_old_partitions(cls, session: AsyncSession, table_name: str):
        config = cls.PARTITION_CONFIGS.get(table_name)
        if not config:
            return
        query = f"""
            SELECT partitionname FROM pg_partitions
            WHERE tablename = '{table_name}'
            ORDER BY partitionname
        """
        result = await session.execute(text(query))
        partitions = result.fetchall()
        logger.info(f"Found {len(partitions)} partitions for {table_name}")


class DatabaseIndexManager:
    """Manages database indexes for optimal query performance."""

    RECOMMENDED_INDEXES = [
        ("conversions", ["user_id", "created_at"], "idx_conversions_user_created"),
        ("conversions", ["status"], "idx_conversions_status"),
        ("conversions", ["source_format", "target_format"], "idx_conversions_formats"),
        ("analytics_events", ["user_id", "created_at"], "idx_analytics_user_created"),
        ("analytics_events", ["event_type"], "idx_analytics_event_type"),
        ("users", ["email"], "idx_users_email_unique"),
        ("performance_metrics", ["metric_name", "timestamp"], "idx_perf_metric_name_ts"),
        ("performance_metrics", ["service", "timestamp"], "idx_perf_service_ts"),
    ]

    @classmethod
    async def create_indexes(cls, session: AsyncSession):
        for table, columns, index_name in cls.RECOMMENDED_INDEXES:
            cols = ", ".join(columns)
            query = f"""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name}
                ON {table} ({cols})
            """
            try:
                await session.execute(text(query))
                await session.commit()
            except Exception as e:
                logger.warning(f"Failed to create index {index_name}: {e}")
                await session.rollback()

    @classmethod
    async def analyze_table(cls, session: AsyncSession, table_name: str):
        try:
            await session.execute(text(f"ANALYZE {table_name}"))
            await session.commit()
        except Exception as e:
            logger.warning(f"Failed to analyze {table_name}: {e}")
            await session.rollback()

    @classmethod
    async def get_index_usage(cls, session: AsyncSession) -> list[dict]:
        query = """
            SELECT
                schemaname, tablename, indexname,
                idx_scan, idx_tup_read, idx_tup_fetch,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size
            FROM pg_stat_user_indexes
            ORDER BY idx_scan DESC
            LIMIT 50
        """
        result = await session.execute(text(query))
        return [
            {
                "schema": row[0],
                "table": row[1],
                "index": row[2],
                "scans": row[3],
                "tuples_read": row[4],
                "tuples_fetched": row[5],
                "size": row[6],
            }
            for row in result.fetchall()
        ]

    @classmethod
    async def get_unused_indexes(cls, session: AsyncSession) -> list[dict]:
        query = """
            SELECT
                schemaname, tablename, indexname,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size
            FROM pg_stat_user_indexes
            WHERE idx_scan = 0
            ORDER BY pg_relation_size(indexrelid) DESC
        """
        result = await session.execute(text(query))
        return [
            {
                "schema": row[0],
                "table": row[1],
                "index": row[2],
                "size": row[3],
            }
            for row in result.fetchall()
        ]
