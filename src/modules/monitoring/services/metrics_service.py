import time
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Summary,
    Info,
    CollectorRegistry,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from src.core.logging import get_logger

logger = get_logger(__name__)

registry = CollectorRegistry()

APP_INFO = Info("email_converter", "Application information", registry=registry)
APP_INFO.info({
    "version": "1.0.0",
    "environment": "production",
})

api_requests_total = Counter(
    "email_converter_api_requests_total",
    "Total API requests",
    ["method", "endpoint", "status_code"],
    registry=registry,
)

api_request_duration_seconds = Histogram(
    "email_converter_api_request_duration_seconds",
    "API request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
    registry=registry,
)

api_errors_total = Counter(
    "email_converter_api_errors_total",
    "Total API errors",
    ["method", "endpoint", "status_code", "error_type"],
    registry=registry,
)

active_users = Gauge(
    "email_converter_active_users",
    "Number of active users",
    registry=registry,
)

conversions_total = Counter(
    "email_converter_conversions_total",
    "Total conversions",
    ["input_format", "output_format", "status"],
    registry=registry,
)

conversion_duration_seconds = Histogram(
    "email_converter_conversion_duration_seconds",
    "Conversion duration in seconds",
    ["input_format", "output_format"],
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0],
    registry=registry,
)

upload_size_bytes = Summary(
    "email_converter_upload_size_bytes",
    "Upload file size in bytes",
    registry=registry,
)

download_size_bytes = Summary(
    "email_converter_download_size_bytes",
    "Download file size in bytes",
    registry=registry,
)

upload_speed_bytes_second = Summary(
    "email_converter_upload_speed_bytes_second",
    "Upload speed in bytes/second",
    registry=registry,
)

download_speed_bytes_second = Summary(
    "email_converter_download_speed_bytes_second",
    "Download speed in bytes/second",
    registry=registry,
)

queue_length = Gauge(
    "email_converter_queue_length",
    "Current queue length",
    ["queue_name"],
    registry=registry,
)

worker_active_tasks = Gauge(
    "email_converter_worker_active_tasks",
    "Number of active worker tasks",
    ["worker_name"],
    registry=registry,
)

worker_utilization = Gauge(
    "email_converter_worker_utilization",
    "Worker utilization percentage",
    ["worker_name"],
    registry=registry,
)

storage_usage_bytes = Gauge(
    "email_converter_storage_usage_bytes",
    "Storage usage in bytes",
    ["storage_type"],
    registry=registry,
)

db_connections_active = Gauge(
    "email_converter_db_connections_active",
    "Active database connections",
    registry=registry,
)

db_query_duration_seconds = Histogram(
    "email_converter_db_query_duration_seconds",
    "Database query duration in seconds",
    ["operation"],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
    registry=registry,
)

redis_operations_total = Counter(
    "email_converter_redis_operations_total",
    "Total Redis operations",
    ["operation", "status"],
    registry=registry,
)

redis_operation_duration_seconds = Histogram(
    "email_converter_redis_operation_duration_seconds",
    "Redis operation duration",
    ["operation"],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
    registry=registry,
)

http_requests_in_progress = Gauge(
    "email_converter_http_requests_in_progress",
    "Number of HTTP requests in progress",
    ["method", "endpoint"],
    registry=registry,
)


class MetricsService:
    def record_api_request(self, method, endpoint, status_code, duration):
        api_requests_total.labels(
            method=method, endpoint=endpoint, status_code=str(status_code)
        ).inc()
        api_request_duration_seconds.labels(
            method=method, endpoint=endpoint
        ).observe(duration)

    def record_api_error(self, method, endpoint, status_code, error_type):
        api_errors_total.labels(
            method=method, endpoint=endpoint,
            status_code=str(status_code), error_type=error_type,
        ).inc()

    def record_conversion(self, input_format, output_format, success, duration):
        status = "success" if success else "failure"
        conversions_total.labels(
            input_format=input_format, output_format=output_format, status=status
        ).inc()
        conversion_duration_seconds.labels(
            input_format=input_format, output_format=output_format
        ).observe(duration)

    def record_upload(self, size_bytes, speed_bps):
        upload_size_bytes.observe(size_bytes)
        upload_speed_bytes_second.observe(speed_bps)

    def record_download(self, size_bytes, speed_bps):
        download_size_bytes.observe(size_bytes)
        download_speed_bytes_second.observe(speed_bps)

    def set_queue_length(self, queue_name, length):
        queue_length.labels(queue_name=queue_name).set(length)

    def set_worker_metrics(self, worker_name, active_tasks, utilization):
        worker_active_tasks.labels(worker_name=worker_name).set(active_tasks)
        worker_utilization.labels(worker_name=worker_name).set(utilization)

    def set_storage_usage(self, storage_type, bytes_used):
        storage_usage_bytes.labels(storage_type=storage_type).set(bytes_used)

    def set_db_connections(self, count):
        db_connections_active.set(count)

    def record_db_query(self, operation, duration):
        db_query_duration_seconds.labels(operation=operation).observe(duration)

    def record_redis_operation(self, operation, success, duration):
        status = "success" if success else "failure"
        redis_operations_total.labels(operation=operation, status=status).inc()
        redis_operation_duration_seconds.labels(operation=operation).observe(duration)

    def get_metrics(self) -> bytes:
        return generate_latest(registry)

    def get_metrics_content_type(self) -> str:
        return CONTENT_TYPE_LATEST
