from celery import Celery
from kombu import Queue, Exchange

from src.core.config import settings

celery_app = Celery(
    "email_converter",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "src.modules.uploads.tasks.celery_tasks",
        "src.modules.mime.tasks.celery_tasks",
        "src.modules.conversion.tasks.celery_tasks",
        "src.modules.license.tasks.celery_tasks",
        "src.modules.payment.tasks.celery_tasks",
        "src.modules.notification.tasks.celery_tasks",
        "src.modules.analytics.tasks.celery_tasks",
        "src.modules.monitoring.tasks.celery_tasks",
        "src.modules.security.tasks.celery_tasks",
        "src.modules.search.tasks.celery_tasks",
        "src.modules.gateway.tasks.celery_tasks",
        "src.modules.performance.tasks.celery_tasks",
        "src.modules.public_api.tasks.celery_tasks",
    ],
)

exchange = Exchange("default", type="direct")

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_queues=[
        Queue("conversion", exchange, routing_key="conversion", queue_arguments={"x-max-priority": 5}),
        Queue("upload", exchange, routing_key="upload", queue_arguments={"x-max-priority": 5}),
        Queue("notification", exchange, routing_key="notification", queue_arguments={"x-max-priority": 5}),
        Queue("analytics", exchange, routing_key="analytics", queue_arguments={"x-max-priority": 5}),
        Queue("search", exchange, routing_key="search", queue_arguments={"x-max-priority": 5}),
        Queue("payment", exchange, routing_key="payment", queue_arguments={"x-max-priority": 5}),
        Queue("security", exchange, routing_key="security", queue_arguments={"x-max-priority": 5}),
        Queue("maintenance", exchange, routing_key="maintenance", queue_arguments={"x-max-priority": 5}),
        Queue("performance", exchange, routing_key="performance", queue_arguments={"x-max-priority": 5}),
        Queue("dead_letter", exchange, routing_key="dead_letter"),
    ],
    task_routes={
        "src.modules.conversion.tasks.*": {"queue": "conversion"},
        "src.modules.uploads.tasks.*": {"queue": "upload"},
        "src.modules.notification.tasks.*": {"queue": "notification"},
        "src.modules.analytics.tasks.*": {"queue": "analytics"},
        "src.modules.search.tasks.*": {"queue": "search"},
        "src.modules.payment.tasks.*": {"queue": "payment"},
        "src.modules.security.tasks.*": {"queue": "security"},
        "src.modules.monitoring.tasks.*": {"queue": "maintenance"},
        "src.modules.license.tasks.*": {"queue": "maintenance"},
        "src.modules.gateway.tasks.*": {"queue": "maintenance"},
        "src.modules.performance.tasks.*": {"queue": "performance"},
        "src.modules.public_api.tasks.*": {"queue": "maintenance"},
    },
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",
    beat_schedule={
        "check-license-expiry": {
            "task": "license.check_expiring_licenses",
            "schedule": 86400.0,
        },
        "generate-subscription-invoices": {
            "task": "payment.generate_subscription_invoices",
            "schedule": 86400.0,
        },
        "send-scheduled-notifications": {
            "task": "notification.send_scheduled_notifications",
            "schedule": 300.0,
        },
        "aggregate-daily-analytics": {
            "task": "analytics.aggregate_daily_metrics",
            "schedule": 86400.0,
        },
        "send-scheduled-reports": {
            "task": "analytics.send_scheduled_reports",
            "schedule": 3600.0,
        },
        "cleanup-old-analytics-events": {
            "task": "analytics.cleanup_old_events",
            "schedule": 604800.0,
            "args": (90,),
        },
        "periodic-health-check": {
            "task": "monitoring.periodic_health_check",
            "schedule": 60.0,
        },
        "evaluate-alerts": {
            "task": "monitoring.evaluate_alerts_task",
            "schedule": 300.0,
        },
        "collect-metrics": {
            "task": "monitoring.collect_metrics_task",
            "schedule": 60.0,
        },
        "cleanup-monitoring-events": {
            "task": "monitoring.cleanup_old_events_task",
            "schedule": 604800.0,
            "args": (90,),
        },
        "cleanup-expired-sessions": {
            "task": "security.cleanup_expired_sessions_task",
            "schedule": 3600.0,
        },
        "cleanup-rate-limits": {
            "task": "security.cleanup_rate_limits_task",
            "schedule": 3600.0,
        },
        "cleanup-security-events": {
            "task": "security.cleanup_old_events_task",
            "schedule": 604800.0,
            "args": (90,),
        },
        "collect-search-analytics": {
            "task": "search.collect_analytics_task",
            "schedule": 86400.0,
        },
        "cleanup-search-history": {
            "task": "search.cleanup_history_task",
            "schedule": 604800.0,
            "args": (90,),
        },
        "cleanup-expired-invitations": {
            "task": "gateway.cleanup_expired_invitations",
            "schedule": 3600.0,
        },
        "collect-tenant-usage": {
            "task": "gateway.collect_tenant_usage",
            "schedule": 86400.0,
        },
        "cleanup-old-audit-logs": {
            "task": "gateway.cleanup_old_audit_logs",
            "schedule": 604800.0,
            "args": (90,),
        },
        "rotate-api-keys": {
            "task": "public_api.rotate_keys",
            "schedule": 86400.0,
        },
        "cleanup-api-usage-logs": {
            "task": "public_api.cleanup_usage_logs",
            "schedule": 604800.0,
            "args": (90,),
        },
        "check-webhook-health": {
            "task": "public_api.check_webhook_health",
            "schedule": 3600.0,
        },
        "cleanup-revoked-keys": {
            "task": "public_api.cleanup_revoked_keys",
            "schedule": 604800.0,
            "args": (30,),
        },
    },
)
