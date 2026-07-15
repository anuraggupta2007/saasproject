import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.analytics.models.analytics import Report, ReportType, ReportStatus
from src.modules.analytics.repositories.analytics import ReportRepository

logger = get_logger(__name__)


class ReportService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.report_repo = ReportRepository(session)

    async def create_report(
        self,
        name: str,
        report_type: ReportType,
        format: str = "json",
        parameters: dict = None,
        generated_by: Optional[uuid.UUID] = None,
    ) -> Report:
        report = Report(
            name=name,
            report_type=report_type,
            status=ReportStatus.PENDING,
            format=format,
            parameters=parameters or {},
            generated_by=generated_by,
        )

        report = await self.report_repo.create(report)

        logger.info(
            "report_created",
            report_id=str(report.id),
            name=name,
            type=report_type.value,
        )

        return report

    async def get_report(self, report_id: uuid.UUID) -> Optional[Report]:
        return await self.report_repo.get_by_id(report_id)

    async def list_user_reports(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Report], int]:
        return await self.report_repo.get_user_reports(user_id, page, page_size)

    async def generate_report(
        self,
        report_id: uuid.UUID,
    ) -> dict:
        report = await self.report_repo.get_by_id(report_id)
        if not report:
            return {"success": False, "message": "Report not found"}

        await self.report_repo.update_status(report_id, ReportStatus.GENERATING)

        try:
            data = await self._generate_report_data(report)

            await self.report_repo.update_status(
                report_id,
                ReportStatus.COMPLETED,
            )

            report.result_data = data
            await self.session.commit()

            logger.info(
                "report_generated",
                report_id=str(report_id),
                name=report.name,
            )

            return {"success": True, "data": data}

        except Exception as e:
            await self.report_repo.update_status(
                report_id,
                ReportStatus.FAILED,
                error_message=str(e),
            )

            logger.error(
                "report_generation_failed",
                report_id=str(report_id),
                error=str(e),
            )

            return {"success": False, "message": str(e)}

    async def _generate_report_data(self, report: Report) -> dict:
        from src.modules.analytics.services.analytics_service import AnalyticsService

        analytics_service = AnalyticsService(self.session)

        if report.report_type == ReportType.DAILY:
            return await self._generate_daily_report(analytics_service, report.parameters)
        elif report.report_type == ReportType.WEEKLY:
            return await self._generate_weekly_report(analytics_service, report.parameters)
        elif report.report_type == ReportType.MONTHLY:
            return await self._generate_monthly_report(analytics_service, report.parameters)
        else:
            return await self._generate_custom_report(analytics_service, report.parameters)

    async def _generate_daily_report(self, analytics_service, parameters: dict) -> dict:
        dau = await analytics_service.get_dau(days=1)
        event_counts = await analytics_service.get_event_type_counts(days=1)

        return {
            "report_type": "daily",
            "date": datetime.now(timezone.utc).date().isoformat(),
            "dau": dau[0]["count"] if dau else 0,
            "events": event_counts,
            "summary": {
                "total_events": sum(event_counts.values()),
            },
        }

    async def _generate_weekly_report(self, analytics_service, parameters: dict) -> dict:
        wau = await analytics_service.get_wau(weeks=1)
        dau_data = await analytics_service.get_dau(days=7)
        event_counts = await analytics_service.get_event_type_counts(days=7)

        return {
            "report_type": "weekly",
            "week_start": (datetime.now(timezone.utc).date() - timedelta(days=7)).isoformat(),
            "wau": wau[0]["count"] if wau else 0,
            "daily_active_users": dau_data,
            "events": event_counts,
            "summary": {
                "average_dau": sum(d["count"] for d in dau_data) / len(dau_data) if dau_data else 0,
                "total_events": sum(event_counts.values()),
            },
        }

    async def _generate_monthly_report(self, analytics_service, parameters: dict) -> dict:
        mau = await analytics_service.get_mau(months=1)
        wau_data = await analytics_service.get_wau(weeks=4)
        event_counts = await analytics_service.get_event_type_counts(days=30)

        return {
            "report_type": "monthly",
            "month": datetime.now(timezone.utc).strftime("%Y-%m"),
            "mau": mau[0]["count"] if mau else 0,
            "weekly_active_users": wau_data,
            "events": event_counts,
            "summary": {
                "average_wau": sum(w["count"] for w in wau_data) / len(wau_data) if wau_data else 0,
                "total_events": sum(event_counts.values()),
            },
        }

    async def _generate_custom_report(self, analytics_service, parameters: dict) -> dict:
        start_date = parameters.get("start_date")
        end_date = parameters.get("end_date")

        return {
            "report_type": "custom",
            "parameters": parameters,
            "message": "Custom report generated",
        }

    async def export_report(
        self,
        report_id: uuid.UUID,
        format: str,
    ) -> Optional[str]:
        report = await self.report_repo.get_by_id(report_id)
        if not report or not report.result_data:
            return None

        if format == "json":
            import json
            return json.dumps(report.result_data, indent=2)
        elif format == "csv":
            return self._convert_to_csv(report.result_data)
        elif format == "pdf":
            return await self._generate_pdf(report.result_data)
        else:
            return None

    def _convert_to_csv(self, data: dict) -> str:
        import csv
        import io

        output = io.StringIO()
        writer = csv.writer(output)

        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, (list, dict)):
                    writer.writerow([key, str(value)])
                else:
                    writer.writerow([key, value])

        return output.getvalue()

    async def _generate_pdf(self, data: dict) -> str:
        return f"/api/v1/analytics/reports/pdf/{data.get('report_id', 'unknown')}"

    async def cleanup_old_reports(self, days: int = 90) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        from sqlalchemy import select, and_
        from src.modules.analytics.models.analytics import Report

        result = await self.session.execute(
            select(Report).where(
                and_(
                    Report.created_at < cutoff,
                    Report.status.in_([ReportStatus.COMPLETED, ReportStatus.FAILED]),
                )
            )
        )
        reports = list(result.scalars().all())

        for report in reports:
            await self.session.delete(report)

        await self.session.commit()
        return len(reports)
