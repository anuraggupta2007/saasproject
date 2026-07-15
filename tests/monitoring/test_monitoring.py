import pytest
import logging
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from src.modules.monitoring.models.monitoring import (
    EventSeverity,
    EventType,
    SystemEvent,
    AlertRule,
    AlertHistory,
    HealthSnapshot,
)
from src.modules.monitoring.schemas.monitoring import (
    HealthCheckResponse,
    ReadinessResponse,
    LivenessResponse,
    SystemStatusResponse,
    SystemEventCreateRequest,
    SystemEventResponse,
    AlertRuleCreateRequest,
    AlertHistoryResponse,
    DashboardMetricsResponse,
)
from src.modules.monitoring.services.metrics_service import MetricsService
from src.modules.monitoring.services.logging_service import (
    StructuredFormatter,
    SecurityLogger,
    AuditLogger,
    BackgroundJobLogger,
)


class TestModels:
    def test_event_severity_values(self):
        assert EventSeverity.DEBUG.value == "debug"
        assert EventSeverity.INFO.value == "info"
        assert EventSeverity.WARNING.value == "warning"
        assert EventSeverity.ERROR.value == "error"
        assert EventSeverity.CRITICAL.value == "critical"

    def test_event_type_values(self):
        assert EventType.SYSTEM_STARTUP.value == "system_startup"
        assert EventType.HEALTH_CHECK.value == "health_check"
        assert EventType.ALERT_TRIGGERED.value == "alert_triggered"

    def test_system_event_creation(self):
        event = SystemEvent(
            event_type=EventType.HEALTH_CHECK,
            severity=EventSeverity.INFO,
            source="test",
            message="Test message",
        )
        assert event.event_type == EventType.HEALTH_CHECK
        assert event.severity == EventSeverity.INFO
        assert event.source == "test"


class TestSchemas:
    def test_health_check_response(self):
        response = HealthCheckResponse(
            status="healthy",
            timestamp=datetime.now(timezone.utc),
            version="1.0.0",
            uptime_seconds=100.0,
            checks={"api": {"status": "healthy"}},
        )
        assert response.status == "healthy"
        assert response.version == "1.0.0"

    def test_readiness_response(self):
        response = ReadinessResponse(
            status="ready",
            timestamp=datetime.now(timezone.utc),
            components=[{"name": "database", "status": "healthy"}],
        )
        assert response.status == "ready"
        assert len(response.components) == 1

    def test_liveness_response(self):
        response = LivenessResponse(
            status="alive",
            timestamp=datetime.now(timezone.utc),
            uptime_seconds=100.0,
        )
        assert response.status == "alive"

    def test_system_event_create_request(self):
        request = SystemEventCreateRequest(
            event_type="health_check",
            severity="info",
            source="test",
            message="Test message",
        )
        assert request.event_type == "health_check"
        assert request.severity == "info"

    def test_alert_rule_create_request(self):
        request = AlertRuleCreateRequest(
            name="test_rule",
            metric_name="cpu_usage",
            condition="gt",
            threshold=90.0,
            severity="warning",
        )
        assert request.name == "test_rule"
        assert request.condition == "gt"
        assert request.threshold == 90.0

    def test_dashboard_metrics_response(self):
        response = DashboardMetricsResponse(
            api={"status": "healthy"},
            conversions={"total": 100},
            workers={"active": 5},
            infrastructure={"cpu": 50.0},
            generated_at=datetime.now(timezone.utc),
        )
        assert response.api["status"] == "healthy"


class TestMetricsService:
    def test_record_api_request(self):
        service = MetricsService()
        service.record_api_request("GET", "/health", 200, 0.05)
        metrics = service.get_metrics()
        assert b"email_converter_api_requests_total" in metrics

    def test_record_conversion(self):
        service = MetricsService()
        service.record_conversion("eml", "pdf", True, 1.5)
        metrics = service.get_metrics()
        assert b"email_converter_conversions_total" in metrics

    def test_record_upload(self):
        service = MetricsService()
        service.record_upload(1024, 512)
        metrics = service.get_metrics()
        assert b"email_converter_upload_size_bytes" in metrics

    def test_set_queue_length(self):
        service = MetricsService()
        service.set_queue_length("conversion", 10)
        metrics = service.get_metrics()
        assert b"email_converter_queue_length" in metrics

    def test_metrics_content_type(self):
        service = MetricsService()
        assert "text/plain" in service.get_metrics_content_type()


class TestLoggingService:
    def test_structured_formatter(self):
        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Test message",
            args=(),
            exc_info=None,
        )
        output = formatter.format(record)
        assert "Test message" in output
        assert "timestamp" in output
        assert "level" in output

    def test_security_logger(self):
        logger = SecurityLogger()
        with patch.object(logger.logger, "info") as mock_info:
            logger.log_login_attempt("user123", True, "127.0.0.1", "test-agent")
            mock_info.assert_called_once()

    def test_audit_logger(self):
        logger = AuditLogger()
        with patch.object(logger.logger, "info") as mock_info:
            logger.log_action("user123", "create", "conversion", "conv123")
            mock_info.assert_called_once()

    def test_background_job_logger(self):
        logger = BackgroundJobLogger()
        with patch.object(logger.logger, "info") as mock_info:
            logger.log_job_started("conversion", "job123")
            mock_info.assert_called_once()


class TestAlertConditions:
    def test_gt_condition(self):
        from src.modules.monitoring.services.alerting_service import CONDITION_MAP

        assert CONDITION_MAP["gt"](10, 5) is True
        assert CONDITION_MAP["gt"](5, 10) is False

    def test_lt_condition(self):
        from src.modules.monitoring.services.alerting_service import CONDITION_MAP

        assert CONDITION_MAP["lt"](5, 10) is True
        assert CONDITION_MAP["lt"](10, 5) is False

    def test_eq_condition(self):
        from src.modules.monitoring.services.alerting_service import CONDITION_MAP

        assert CONDITION_MAP["eq"](10, 10) is True
        assert CONDITION_MAP["eq"](10, 5) is False

    def test_ne_condition(self):
        from src.modules.monitoring.services.alerting_service import CONDITION_MAP

        assert CONDITION_MAP["ne"](10, 5) is True
        assert CONDITION_MAP["ne"](10, 10) is False

    def test_gte_condition(self):
        from src.modules.monitoring.services.alerting_service import CONDITION_MAP

        assert CONDITION_MAP["gte"](10, 10) is True
        assert CONDITION_MAP["gte"](5, 10) is False

    def test_lte_condition(self):
        from src.modules.monitoring.services.alerting_service import CONDITION_MAP

        assert CONDITION_MAP["lte"](10, 10) is True
        assert CONDITION_MAP["lte"](10, 5) is False
