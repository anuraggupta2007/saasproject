from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# --- Performance Metric Schemas ---

class PerformanceMetricCreate(BaseModel):
    metric_type: str = Field(..., max_length=50)
    metric_name: str = Field(..., max_length=100)
    value: float
    unit: str = Field(..., max_length=20)
    tags: dict = Field(default_factory=dict)
    host: Optional[str] = None
    service: Optional[str] = None


class PerformanceMetricResponse(BaseModel):
    id: UUID
    timestamp: datetime
    metric_type: str
    metric_name: str
    value: float
    unit: str
    tags: dict
    host: Optional[str]
    service: Optional[str]

    class Config:
        from_attributes = True


# --- Cache Statistics Schemas ---

class CacheStatisticsResponse(BaseModel):
    timestamp: datetime
    cache_type: str
    operation: str
    key_pattern: Optional[str]
    hit: Optional[bool]
    ttl_seconds: Optional[int]
    size_bytes: Optional[int]
    duration_ms: Optional[float]

    class Config:
        from_attributes = True


class CacheStatsSummary(BaseModel):
    cache_type: str
    total_operations: int
    hits: int
    misses: int
    hit_rate: float
    avg_ttl_seconds: float
    avg_duration_ms: float
    total_size_bytes: int


# --- Worker Performance Schemas ---

class WorkerPerformanceResponse(BaseModel):
    id: UUID
    timestamp: datetime
    worker_name: str
    task_name: str
    task_id: Optional[str]
    duration_ms: float
    status: str
    queue_name: Optional[str]
    priority: int
    memory_usage_mb: Optional[float]
    cpu_usage_percent: Optional[float]
    retry_count: int

    class Config:
        from_attributes = True


class WorkerStatsSummary(BaseModel):
    worker_name: str
    total_tasks: int
    successful_tasks: int
    failed_tasks: int
    avg_duration_ms: float
    p95_duration_ms: float
    tasks_per_minute: float
    avg_memory_mb: float
    avg_cpu_percent: float


# --- Query Performance Schemas ---

class QueryPerformanceResponse(BaseModel):
    id: UUID
    timestamp: datetime
    query_hash: str
    query_text: Optional[str]
    duration_ms: float
    rows_affected: int
    rows_returned: int
    table_name: Optional[str]
    operation: Optional[str]
    is_slow: bool
    execution_plan: Optional[str]

    class Config:
        from_attributes = True


class SlowQuerySummary(BaseModel):
    query_hash: str
    avg_duration_ms: float
    max_duration_ms: float
    call_count: int
    table_name: Optional[str]
    last_seen: datetime


# --- Load Test Schemas ---

class LoadTestConfig(BaseModel):
    test_name: str
    test_type: str = Field(..., pattern="^(load|stress|soak|spike)$")
    target_url: str
    concurrent_users: int = Field(..., ge=1, le=10000)
    duration_seconds: int = Field(..., ge=10, le=3600)
    ramp_up_seconds: int = Field(default=30, ge=0)
    requests_per_second: Optional[int] = None
    payload: Optional[dict] = None
    headers: dict = Field(default_factory=dict)
    method: str = Field(default="GET")


class LoadTestResultResponse(BaseModel):
    id: UUID
    timestamp: datetime
    test_name: str
    test_type: str
    duration_seconds: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time_ms: float
    p50_response_time_ms: Optional[float]
    p95_response_time_ms: Optional[float]
    p99_response_time_ms: Optional[float]
    max_response_time_ms: Optional[float]
    requests_per_second: float
    throughput_mbps: Optional[float]
    error_rate: float
    concurrent_users: Optional[int]
    config: dict

    class Config:
        from_attributes = True


# --- System Performance Schemas ---

class SystemPerformanceOverview(BaseModel):
    timestamp: datetime
    api: dict
    database: dict
    redis: dict
    celery: dict
    storage: dict
    search: dict
    system: dict


class APIPerformanceMetrics(BaseModel):
    requests_per_second: float
    avg_response_time_ms: float
    p50_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    error_rate: float
    active_connections: int
    total_requests_24h: int


class DatabasePerformanceMetrics(BaseModel):
    active_connections: int
    idle_connections: int
    waiting_connections: int
    avg_query_time_ms: float
    slow_queries_count: int
    cache_hit_ratio: float
    transactions_per_second: float
    deadlocks_count: int


class RedisPerformanceMetrics(BaseModel):
    connected_clients: int
    used_memory_mb: float
    hit_rate: float
    ops_per_second: float
    avg_latency_ms: float
    evicted_keys: int
    expired_keys: int
    keyspace_hits: int
    keyspace_misses: int


class CeleryPerformanceMetrics(BaseModel):
    active_workers: int
    active_tasks: int
    queue_depths: dict
    avg_task_duration_ms: float
    success_rate: float
    tasks_per_minute: float
    dead_letter_count: int
    retry_count: int


class StoragePerformanceMetrics(BaseModel):
    total_objects: int
    total_size_gb: float
    avg_upload_time_ms: float
    avg_download_time_ms: float
    multipart_uploads: int
    pending_uploads: int


class SearchPerformanceMetrics(BaseModel):
    avg_search_latency_ms: float
    index_size_docs: int
    index_size_bytes: int
    queries_per_second: float
    cache_hit_rate: float
    bulk_index_rate: float


class SystemResourceMetrics(BaseModel):
    cpu_percent: float
    memory_percent: float
    memory_used_gb: float
    memory_total_gb: float
    disk_io_read_mbps: float
    disk_io_write_mbps: float
    network_sent_mbps: float
    network_recv_mbps: float
    open_file_descriptors: int
    thread_count: int


# --- Health Check Schemas ---

class PerformanceHealthCheck(BaseModel):
    status: str
    timestamp: datetime
    checks: dict
    score: float
    recommendations: list[str]


# --- Benchmark Schemas ---

class BenchmarkResult(BaseModel):
    name: str
    duration_seconds: float
    iterations: int
    avg_time_ms: float
    min_time_ms: float
    max_time_ms: float
    p50_time_ms: float
    p95_time_ms: float
    p99_time_ms: float
    ops_per_second: float
    memory_peak_mb: float
    cpu_avg_percent: float
