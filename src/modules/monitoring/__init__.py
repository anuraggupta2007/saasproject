from src.modules.monitoring.models.monitoring import (
    SystemEvent,
    AlertRule,
    AlertHistory,
    HealthSnapshot,
    EventSeverity,
    EventType,
)

__all__ = [
    "SystemEvent",
    "AlertRule",
    "AlertHistory",
    "HealthSnapshot",
    "EventSeverity",
    "EventType",
]

try:
    from src.modules.monitoring.services.health_service import HealthCheckService
    from src.modules.monitoring.services.metrics_service import MetricsService
    from src.modules.monitoring.services.logging_service import (
        StructuredFormatter,
        RequestLoggingMiddleware,
        SecurityLogger,
        AuditLogger,
        BackgroundJobLogger,
        get_logger,
        setup_logging,
    )
    from src.modules.monitoring.services.tracing_service import (
        init_tracing,
        get_tracer,
        TracingService,
        instrument_fastapi,
        instrument_sqlalchemy,
        instrument_celery,
        instrument_httpx,
    )
    from src.modules.monitoring.services.alerting_service import AlertingService
    from src.modules.monitoring.services.sentry_service import (
        init_sentry,
        SentryMonitoring,
        capture_exception,
        capture_message,
    )
    __all__ += [
        "HealthCheckService",
        "MetricsService",
        "StructuredFormatter",
        "RequestLoggingMiddleware",
        "SecurityLogger",
        "AuditLogger",
        "BackgroundJobLogger",
        "get_logger",
        "setup_logging",
        "init_tracing",
        "get_tracer",
        "TracingService",
        "instrument_fastapi",
        "instrument_sqlalchemy",
        "instrument_celery",
        "instrument_httpx",
        "AlertingService",
        "init_sentry",
        "SentryMonitoring",
        "capture_exception",
        "capture_message",
    ]
except ImportError:
    pass
