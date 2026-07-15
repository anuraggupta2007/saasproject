from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Column, String, DateTime, Float, Integer, JSON, Boolean,
    Index, Text
)
from sqlalchemy.dialects.postgresql import UUID

from src.models.base import Base


class PerformanceMetric(Base):
    __tablename__ = "performance_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    metric_type = Column(String(50), nullable=False, index=True)
    metric_name = Column(String(100), nullable=False, index=True)
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    tags = Column(JSON, default=dict)
    host = Column(String(255), nullable=True)
    service = Column(String(100), nullable=True)

    __table_args__ = (
        Index("idx_perf_metric_type_timestamp", "metric_type", "timestamp"),
        Index("idx_perf_metric_name_timestamp", "metric_name", "timestamp"),
        Index("idx_perf_metric_service_timestamp", "service", "timestamp"),
    )


class QueryPerformanceLog(Base):
    __tablename__ = "query_performance_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    query_hash = Column(String(64), nullable=False, index=True)
    query_text = Column(Text, nullable=True)
    duration_ms = Column(Float, nullable=False)
    rows_affected = Column(Integer, default=0)
    rows_returned = Column(Integer, default=0)
    table_name = Column(String(100), nullable=True)
    operation = Column(String(20), nullable=True)
    is_slow = Column(Boolean, default=False, index=True)
    execution_plan = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_query_perf_slow_timestamp", "is_slow", "timestamp"),
        Index("idx_query_perf_hash_duration", "query_hash", "duration_ms"),
    )


class CacheStatistics(Base):
    __tablename__ = "cache_statistics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    cache_type = Column(String(50), nullable=False, index=True)
    operation = Column(String(20), nullable=False)
    key_pattern = Column(String(255), nullable=True)
    hit = Column(Boolean, nullable=True)
    ttl_seconds = Column(Integer, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    duration_ms = Column(Float, nullable=True)

    __table_args__ = (
        Index("idx_cache_stats_type_operation", "cache_type", "operation"),
        Index("idx_cache_stats_hit_timestamp", "hit", "timestamp"),
    )


class WorkerPerformanceLog(Base):
    __tablename__ = "worker_performance_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    worker_name = Column(String(100), nullable=False, index=True)
    task_name = Column(String(200), nullable=False, index=True)
    task_id = Column(String(255), nullable=True)
    duration_ms = Column(Float, nullable=False)
    status = Column(String(20), nullable=False)
    queue_name = Column(String(100), nullable=True)
    priority = Column(Integer, default=0)
    memory_usage_mb = Column(Float, nullable=True)
    cpu_usage_percent = Column(Float, nullable=True)
    retry_count = Column(Integer, default=0)

    __table_args__ = (
        Index("idx_worker_perf_name_timestamp", "worker_name", "timestamp"),
        Index("idx_worker_perf_task_timestamp", "task_name", "timestamp"),
        Index("idx_worker_perf_status_timestamp", "status", "timestamp"),
    )


class LoadTestResult(Base):
    __tablename__ = "load_test_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    test_name = Column(String(200), nullable=False)
    test_type = Column(String(50), nullable=False, index=True)
    duration_seconds = Column(Float, nullable=False)
    total_requests = Column(Integer, nullable=False)
    successful_requests = Column(Integer, nullable=False)
    failed_requests = Column(Integer, nullable=False)
    avg_response_time_ms = Column(Float, nullable=False)
    p50_response_time_ms = Column(Float, nullable=True)
    p95_response_time_ms = Column(Float, nullable=True)
    p99_response_time_ms = Column(Float, nullable=True)
    max_response_time_ms = Column(Float, nullable=True)
    requests_per_second = Column(Float, nullable=False)
    throughput_mbps = Column(Float, nullable=True)
    error_rate = Column(Float, nullable=False)
    concurrent_users = Column(Integer, nullable=True)
    config = Column(JSON, default=dict)

    __table_args__ = (
        Index("idx_load_test_name_type", "test_name", "test_type"),
        Index("idx_load_test_timestamp_type", "timestamp", "test_type"),
    )
