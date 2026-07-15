import pytest
from src.modules.analytics.models.analytics import EventType, ReportType, ReportStatus
from src.modules.analytics.services.analytics_service import AnalyticsService
from src.modules.analytics.services.report_service import ReportService
from src.modules.analytics.services.dashboard_service import DashboardService
from src.modules.analytics.repositories.analytics import (
    AnalyticsEventRepository,
    ReportRepository,
    AggregatedMetricRepository,
    DashboardWidgetRepository,
)
from src.modules.analytics.schemas.analytics import (
    AnalyticsEventCreateRequest,
    ReportCreateRequest,
    DashboardWidgetCreateRequest,
)


class TestAnalyticsEventRepository:
    @pytest.mark.asyncio
    async def test_record_event(self):
        from unittest.mock import AsyncMock, MagicMock

        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock()

        repo = AnalyticsEventRepository(mock_session)
        event = await repo.record_event(
            event_type=EventType.CONVERSION_COMPLETED,
            user_id="550e8400-e29b-41d4-a716-446655440000",
            properties={"source": "test"},
        )

        assert event is not None
        assert event.event_type == EventType.CONVERSION_COMPLETED


class TestAggregatedMetricRepository:
    @pytest.mark.asyncio
    async def test_record_metric(self):
        from unittest.mock import AsyncMock, MagicMock

        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock()

        repo = AggregatedMetricRepository(mock_session)
        metric = await repo.record_metric(
            metric_name="dau",
            metric_value=100,
        )

        assert metric is not None


class TestAnalyticsSchemas:
    def test_event_create_request(self):
        request = AnalyticsEventCreateRequest(
            event_type="conversion_completed",
            properties={"file_type": "pdf"},
            metrics={"duration": 5.2},
        )

        assert request.event_type == "conversion_completed"
        assert request.properties == {"file_type": "pdf"}

    def test_report_create_request(self):
        request = ReportCreateRequest(
            name="Daily Report",
            report_type="daily",
            format="json",
            parameters={"days": 7},
        )

        assert request.name == "Daily Report"
        assert request.format == "json"

    def test_widget_create_request(self):
        request = DashboardWidgetCreateRequest(
            name="DAU Widget",
            widget_type="metric",
            config={"color": "blue"},
            refresh_interval_seconds=300,
        )

        assert request.name == "DAU Widget"
        assert request.refresh_interval_seconds == 300
