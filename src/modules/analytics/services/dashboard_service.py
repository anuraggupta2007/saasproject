import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.analytics.services.analytics_service import AnalyticsService
from src.modules.analytics.repositories.analytics import AggregatedMetricRepository, DashboardWidgetRepository

logger = get_logger(__name__)


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.analytics_service = AnalyticsService(session)
        self.metric_repo = AggregatedMetricRepository(session)
        self.widget_repo = DashboardWidgetRepository(session)

    async def get_dashboard_data(self) -> dict:
        dau_data = await self.analytics_service.get_dau(days=7)
        mau_data = await self.analytics_service.get_mau(months=3)
        event_counts = await self.analytics_service.get_event_type_counts(days=7)

        kpis = await self._calculate_kpis()

        return {
            "kpis": kpis,
            "charts": {
                "dau": dau_data,
                "mau": mau_data,
                "events": event_counts,
            },
            "recent_activity": await self._get_recent_activity(),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    async def _calculate_kpis(self) -> dict:
        dau_data = await self.analytics_service.get_dau(days=1)
        mau_data = await self.analytics_service.get_mau(months=1)
        event_counts = await self.analytics_service.get_event_type_counts(days=30)

        total_conversions = event_counts.get("conversion_completed", 0)
        failed_conversions = event_counts.get("conversion_failed", 0)
        success_rate = (total_conversions / (total_conversions + failed_conversions) * 100) if (total_conversions + failed_conversions) > 0 else 0

        return {
            "dau": dau_data[0]["count"] if dau_data else 0,
            "mau": mau_data[0]["count"] if mau_data else 0,
            "total_conversions_30d": total_conversions,
            "conversion_success_rate": round(success_rate, 2),
            "failed_conversions_30d": failed_conversions,
            "total_events_30d": sum(event_counts.values()),
        }

    async def _get_recent_activity(self) -> list[dict]:
        from src.modules.analytics.models.analytics import EventType

        events, _ = await self.analytics_service.get_events(page=1, page_size=10)

        return [
            {
                "event_type": e.event_type.value,
                "user_id": str(e.user_id) if e.user_id else None,
                "timestamp": e.created_at.isoformat() if e.created_at else None,
                "properties": e.properties,
            }
            for e in events
        ]

    async def get_leaderboard(
        self,
        metric_name: str,
        period: str = "daily",
        limit: int = 10,
    ) -> dict:
        if period == "daily":
            days = 1
        elif period == "weekly":
            days = 7
        else:
            days = 30

        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)

        from src.modules.analytics.models.analytics import EventType

        events, _ = await self.analytics_service.get_events(
            start_date=start_date,
            end_date=end_date,
            page_size=1000,
        )

        user_metrics = {}
        for event in events:
            if event.user_id:
                user_id = str(event.user_id)
                if user_id not in user_metrics:
                    user_metrics[user_id] = 0
                user_metrics[user_id] += 1

        sorted_users = sorted(user_metrics.items(), key=lambda x: x[1], reverse=True)[:limit]

        return {
            "metric_name": metric_name,
            "period": period,
            "entries": [
                {"user_id": user_id, "value": value}
                for user_id, value in sorted_users
            ],
        }

    async def get_heatmap(
        self,
        metric_name: str,
        days: int = 7,
    ) -> dict:
        from src.modules.analytics.models.analytics import EventType

        hourly_data = await self.analytics_service.get_hourly_distribution(
            EventType.API_REQUEST,
            days=days,
        )

        return {
            "metric_name": metric_name,
            "data": hourly_data,
            "x_label": "Hour of Day",
            "y_label": "Request Count",
        }

    async def get_widgets(self) -> list[dict]:
        widgets = await self.widget_repo.get_active_widgets()

        return [
            {
                "id": str(w.id),
                "name": w.name,
                "type": w.widget_type,
                "config": w.config,
                "refresh_interval": w.refresh_interval_seconds,
            }
            for w in widgets
        ]

    async def create_widget(
        self,
        name: str,
        widget_type: str,
        config: dict = None,
        data_query: Optional[str] = None,
        refresh_interval_seconds: int = 300,
    ) -> dict:
        from src.modules.analytics.models.analytics import DashboardWidget

        widget = DashboardWidget(
            name=name,
            widget_type=widget_type,
            config=config or {},
            data_query=data_query,
            refresh_interval_seconds=refresh_interval_seconds,
        )

        widget = await self.widget_repo.create(widget)

        return {
            "id": str(widget.id),
            "name": widget.name,
            "type": widget.widget_type,
        }
