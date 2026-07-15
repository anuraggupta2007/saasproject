import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.analytics.schemas.analytics import (
    AnalyticsEventCreateRequest,
    AnalyticsEventResponse,
    AnalyticsEventListResponse,
    UserMetricsResponse,
    ConversionMetricsResponse,
    RevenueMetricsResponse,
    StorageMetricsResponse,
    APIMetricsResponse,
    ReportCreateRequest,
    ReportResponse,
    ReportListResponse,
    ReportDataResponse,
    DashboardDataResponse,
    DashboardWidgetCreateRequest,
    LeaderboardResponse,
    HeatmapResponse,
    BusinessMetricsResponse,
)
from src.modules.analytics.services.analytics_service import AnalyticsService
from src.modules.analytics.services.report_service import ReportService
from src.modules.analytics.services.dashboard_service import DashboardService
from src.modules.analytics.models.analytics import EventType, ReportType

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.post(
    "/events",
    response_model=AnalyticsEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Track an analytics event",
)
async def track_event(
    request: AnalyticsEventCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnalyticsService(db)

    event = await service.track_event(
        event_type=EventType(request.event_type),
        user_id=request.user_id or uuid.UUID(current_user["id"]),
        properties=request.properties,
        metrics=request.metrics,
        session_id=request.session_id,
        source=request.source,
    )

    return AnalyticsEventResponse.model_validate(event)


@router.get(
    "/events",
    response_model=AnalyticsEventListResponse,
    summary="List analytics events",
)
async def list_events(
    event_type: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnalyticsService(db)

    type_enum = EventType(event_type) if event_type else None

    events, total = await service.get_events(
        event_type=type_enum,
        page=page,
        page_size=page_size,
    )

    return AnalyticsEventListResponse(
        events=[AnalyticsEventResponse.model_validate(e) for e in events],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/users/metrics",
    response_model=UserMetricsResponse,
    summary="Get user metrics",
)
async def get_user_metrics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnalyticsService(db)

    dau = await service.get_dau(days=min(days, 30))
    wau = await service.get_wau(weeks=min(days // 7, 12))
    mau = await service.get_mau(months=min(days // 30, 12))

    return UserMetricsResponse(
        dau=[{"date": d["date"], "count": d["count"]} for d in dau],
        wau=[{"week_start": w["week_start"], "count": w["count"]} for w in wau],
        mau=[{"month": m["month"], "count": m["count"]} for m in mau],
    )


@router.get(
    "/conversions/metrics",
    response_model=ConversionMetricsResponse,
    summary="Get conversion metrics",
)
async def get_conversion_metrics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnalyticsService(db)

    event_counts = await service.get_event_type_counts(days=days)

    total = event_counts.get("conversion_completed", 0) + event_counts.get("conversion_failed", 0)
    successful = event_counts.get("conversion_completed", 0)
    failed = event_counts.get("conversion_failed", 0)
    success_rate = (successful / total * 100) if total > 0 else 0

    return ConversionMetricsResponse(
        total_conversions=total,
        successful_conversions=successful,
        failed_conversions=failed,
        success_rate=round(success_rate, 2),
    )


@router.get(
    "/revenue/metrics",
    response_model=RevenueMetricsResponse,
    summary="Get revenue metrics",
)
async def get_revenue_metrics(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return RevenueMetricsResponse()


@router.get(
    "/storage/metrics",
    response_model=StorageMetricsResponse,
    summary="Get storage metrics",
)
async def get_storage_metrics(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return StorageMetricsResponse()


@router.get(
    "/api/metrics",
    response_model=APIMetricsResponse,
    summary="Get API metrics",
)
async def get_api_metrics(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnalyticsService(db)

    event_counts = await service.get_event_type_counts(days=30)

    return APIMetricsResponse(
        total_requests=event_counts.get("api_request", 0),
        authentication_failures=event_counts.get("error_occurred", 0),
    )


@router.get(
    "/business/metrics",
    response_model=BusinessMetricsResponse,
    summary="Get all business metrics",
)
async def get_business_metrics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    analytics_service = AnalyticsService(db)

    dau = await analytics_service.get_dau(days=min(days, 30))
    event_counts = await analytics_service.get_event_type_counts(days=days)

    total = event_counts.get("conversion_completed", 0) + event_counts.get("conversion_failed", 0)
    successful = event_counts.get("conversion_completed", 0)
    success_rate = (successful / total * 100) if total > 0 else 0

    from datetime import datetime, timezone

    return BusinessMetricsResponse(
        user_metrics=UserMetricsResponse(
            dau=[{"date": d["date"], "count": d["count"]} for d in dau],
        ),
        conversion_metrics=ConversionMetricsResponse(
            total_conversions=total,
            successful_conversions=successful,
            failed_conversions=event_counts.get("conversion_failed", 0),
            success_rate=round(success_rate, 2),
        ),
        revenue_metrics=RevenueMetricsResponse(),
        storage_metrics=StorageMetricsResponse(),
        api_metrics=APIMetricsResponse(
            total_requests=event_counts.get("api_request", 0),
        ),
        generated_at=datetime.now(timezone.utc),
    )


@router.get(
    "/reports",
    response_model=ReportListResponse,
    summary="List reports",
)
async def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)

    reports, total = await service.list_user_reports(
        user_id=uuid.UUID(current_user["id"]),
        page=page,
        page_size=page_size,
    )

    return ReportListResponse(
        reports=[ReportResponse.model_validate(r) for r in reports],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/reports",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a report",
)
async def create_report(
    request: ReportCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)

    report = await service.create_report(
        name=request.name,
        report_type=ReportType(request.report_type),
        format=request.format,
        parameters=request.parameters,
        generated_by=uuid.UUID(current_user["id"]),
    )

    return ReportResponse.model_validate(report)


@router.post(
    "/reports/{report_id}/generate",
    summary="Generate a report",
)
async def generate_report(
    report_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)

    result = await service.generate_report(report_id)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return result


@router.get(
    "/reports/{report_id}",
    response_model=ReportDataResponse,
    summary="Get report data",
)
async def get_report(
    report_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)

    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )

    return ReportDataResponse(
        report_id=report.id,
        name=report.name,
        data=report.result_data,
        format=report.format,
        generated_at=report.completed_at,
    )


@router.get(
    "/reports/{report_id}/export",
    summary="Export report",
)
async def export_report(
    report_id: uuid.UUID,
    format: str = Query("json"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)

    content = await service.export_report(report_id, format)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or export failed",
        )

    from fastapi.responses import Response

    media_types = {
        "json": "application/json",
        "csv": "text/csv",
        "pdf": "application/pdf",
    }

    return Response(
        content=content,
        media_type=media_types.get(format, "text/plain"),
        headers={"Content-Disposition": f"attachment; filename=report.{format}"},
    )


@router.get(
    "/dashboard",
    response_model=DashboardDataResponse,
    summary="Get dashboard data",
)
async def get_dashboard(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    data = await service.get_dashboard_data()
    return DashboardDataResponse(**data)


@router.get(
    "/dashboard/widgets",
    summary="Get dashboard widgets",
)
async def get_widgets(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    widgets = await service.get_widgets()
    return {"widgets": widgets}


@router.post(
    "/dashboard/widgets",
    status_code=status.HTTP_201_CREATED,
    summary="Create a dashboard widget",
)
async def create_widget(
    request: DashboardWidgetCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)

    widget = await service.create_widget(
        name=request.name,
        widget_type=request.widget_type,
        config=request.config,
        data_query=request.data_query,
        refresh_interval_seconds=request.refresh_interval_seconds,
    )

    return widget


@router.get(
    "/leaderboard",
    response_model=LeaderboardResponse,
    summary="Get leaderboard",
)
async def get_leaderboard(
    metric: str = Query("conversions"),
    period: str = Query("daily"),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)

    leaderboard = await service.get_leaderboard(metric, period, limit)
    return LeaderboardResponse(**leaderboard)


@router.get(
    "/heatmap",
    response_model=HeatmapResponse,
    summary="Get heatmap data",
)
async def get_heatmap(
    metric: str = Query("api_requests"),
    days: int = Query(7, ge=1, le=30),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)

    heatmap = await service.get_heatmap(metric, days)
    return HeatmapResponse(**heatmap)
