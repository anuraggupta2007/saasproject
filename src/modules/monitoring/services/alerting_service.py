from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.monitoring.repositories.monitoring import (
    AlertRuleRepository,
    AlertHistoryRepository,
    SystemEventRepository,
)
from src.modules.monitoring.models.monitoring import EventSeverity, EventType

logger = get_logger(__name__)

CONDITION_MAP = {
    "gt": lambda value, threshold: value > threshold,
    "gte": lambda value, threshold: value >= threshold,
    "lt": lambda value, threshold: value < threshold,
    "lte": lambda value, threshold: value <= threshold,
    "eq": lambda value, threshold: value == threshold,
    "ne": lambda value, threshold: value != threshold,
}

DEFAULT_ALERT_RULES = [
    {
        "name": "high_error_rate",
        "description": "API error rate exceeds 5%",
        "metric_name": "api_error_rate",
        "condition": "gt",
        "threshold": 5.0,
        "severity": EventSeverity.WARNING,
        "cooldown_seconds": 300,
    },
    {
        "name": "high_response_time",
        "description": "P95 response time exceeds 2 seconds",
        "metric_name": "api_p95_response_time",
        "condition": "gt",
        "threshold": 2.0,
        "severity": EventSeverity.WARNING,
        "cooldown_seconds": 300,
    },
    {
        "name": "queue_backlog",
        "description": "Queue length exceeds 1000",
        "metric_name": "queue_length",
        "condition": "gt",
        "threshold": 1000,
        "severity": EventSeverity.WARNING,
        "cooldown_seconds": 180,
    },
    {
        "name": "worker_failure",
        "description": "Worker failure rate exceeds 10%",
        "metric_name": "worker_failure_rate",
        "condition": "gt",
        "threshold": 10.0,
        "severity": EventSeverity.ERROR,
        "cooldown_seconds": 120,
    },
    {
        "name": "database_connection_issues",
        "description": "Database connection failures exceed threshold",
        "metric_name": "db_connection_errors",
        "condition": "gt",
        "threshold": 5,
        "severity": EventSeverity.CRITICAL,
        "cooldown_seconds": 60,
    },
    {
        "name": "low_disk_space",
        "description": "Disk usage exceeds 85%",
        "metric_name": "disk_usage_percent",
        "condition": "gt",
        "threshold": 85.0,
        "severity": EventSeverity.WARNING,
        "cooldown_seconds": 600,
    },
    {
        "name": "high_cpu_usage",
        "description": "CPU usage exceeds 90%",
        "metric_name": "cpu_usage_percent",
        "condition": "gt",
        "threshold": 90.0,
        "severity": EventSeverity.WARNING,
        "cooldown_seconds": 300,
    },
    {
        "name": "high_memory_usage",
        "description": "Memory usage exceeds 90%",
        "metric_name": "memory_usage_percent",
        "condition": "gt",
        "threshold": 90.0,
        "severity": EventSeverity.WARNING,
        "cooldown_seconds": 300,
    },
    {
        "name": "failed_payments",
        "description": "Payment failure rate exceeds 5%",
        "metric_name": "payment_failure_rate",
        "condition": "gt",
        "threshold": 5.0,
        "severity": EventSeverity.ERROR,
        "cooldown_seconds": 300,
    },
    {
        "name": "failed_conversions",
        "description": "Conversion failure rate exceeds 15%",
        "metric_name": "conversion_failure_rate",
        "condition": "gt",
        "threshold": 15.0,
        "severity": EventSeverity.WARNING,
        "cooldown_seconds": 300,
    },
]


class AlertingService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.rule_repo = AlertRuleRepository(session)
        self.history_repo = AlertHistoryRepository(session)
        self.event_repo = SystemEventRepository(session)
        self._cooldown_cache: dict[str, datetime] = {}

    async def initialize_default_rules(self):
        for rule_data in DEFAULT_ALERT_RULES:
            existing = await self.rule_repo.get_by_name(rule_data["name"])
            if not existing:
                await self.rule_repo.create_rule(**rule_data)
                logger.info("alert_rule_created", extra={"rule_name": rule_data["name"]})

    async def evaluate_rule(self, rule_id: UUID, current_value: float) -> dict:
        rule = await self.rule_repo.get_by_id(rule_id)
        if not rule or not rule.enabled:
            return {"triggered": False, "reason": "rule_disabled_or_not_found"}

        cooldown_key = str(rule_id)
        if cooldown_key in self._cooldown_cache:
            if datetime.now(timezone.utc) < self._cooldown_cache[cooldown_key]:
                return {"triggered": False, "reason": "in_cooldown"}

        condition_fn = CONDITION_MAP.get(rule.condition)
        if not condition_fn:
            return {"triggered": False, "reason": "invalid_condition"}

        triggered = condition_fn(current_value, rule.threshold)

        if triggered:
            self._cooldown_cache[cooldown_key] = datetime.now(timezone.utc) + timedelta(
                seconds=rule.cooldown_seconds
            )

            alert = await self.history_repo.record_alert(
                alert_rule_id=rule.id,
                alert_rule_name=rule.name,
                severity=rule.severity,
                value=current_value,
                threshold=rule.threshold,
                message=f"{rule.description}: {current_value} {rule.condition} {rule.threshold}",
            )

            await self.event_repo.create_event(
                event_type=EventType.ALERT_TRIGGERED,
                severity=rule.severity,
                source="alerting_service",
                message=f"Alert triggered: {rule.name} - {current_value} {rule.condition} {rule.threshold}",
                metadata_={
                    "rule_id": str(rule.id),
                    "rule_name": rule.name,
                    "current_value": current_value,
                    "threshold": rule.threshold,
                },
            )

            logger.warning(
                "alert_triggered",
                extra={
                    "rule_name": rule.name,
                    "value": current_value,
                    "threshold": rule.threshold,
                },
            )

            return {"triggered": True, "alert_id": str(alert.id)}

        return {"triggered": False, "reason": "condition_not_met"}

    async def resolve_alert(self, alert_id: UUID) -> bool:
        alert = await self.history_repo.resolve_alert(alert_id)
        if alert:
            await self.event_repo.create_event(
                event_type=EventType.ALERT_RESOLVED,
                severity=EventSeverity.INFO,
                source="alerting_service",
                message=f"Alert resolved: {alert.alert_rule_name}",
                metadata_={"alert_id": str(alert.id), "rule_name": alert.alert_rule_name},
            )
            logger.info("alert_resolved", extra={"alert_id": str(alert.id)})
            return True
        return False

    async def evaluate_all_rules(self, metrics: dict[str, float]) -> list[dict]:
        rules = await self.rule_repo.get_enabled_rules()
        results = []

        for rule in rules:
            if rule.metric_name in metrics:
                result = await self.evaluate_rule(rule.id, metrics[rule.metric_name])
                results.append({"rule_name": rule.name, **result})

        return results

    async def get_active_alerts(self) -> list[dict]:
        alerts = await self.history_repo.get_active_alerts()
        return [
            {
                "id": str(a.id),
                "rule_name": a.alert_rule_name,
                "severity": a.severity.value,
                "value": a.value,
                "threshold": a.threshold,
                "triggered_at": a.triggered_at.isoformat(),
            }
            for a in alerts
        ]

    async def get_alert_stats(self, hours: int = 24) -> dict:
        return await self.history_repo.get_alert_stats(hours)
