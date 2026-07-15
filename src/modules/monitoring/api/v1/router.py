import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from src.core.database import get_db
from src.core.security import get_current_user
from src.core.logging import get_logger
from src.modules.monitoring.services.health_service import HealthCheckService
from src.modules.monitoring.services.metrics_service import MetricsService
from src.modules.monitoring.services.alerting_service import AlertingService
from src.modules.monitoring.repositories.monitoring import (
    SystemEventRepository,
    AlertHistoryRepository,
    HealthSnapshotRepository,
)
from src.modules.monitoring.models.monitoring import EventSeverity, EventType
from src.modules.monitoring.schemas.monitoring import (
    HealthCheckResponse,
    ReadinessResponse,
    LivenessResponse,
    SystemStatusResponse,
    SystemEventCreateRequest,
    SystemEventResponse,
    SystemEventListResponse,
    AlertRuleCreateRequest,
    AlertRuleResponse,
    AlertHistoryResponse,
    AlertHistoryListResponse,
    HealthSnapshotResponse,
    DashboardMetricsResponse,
)

logger = get_logger(__name__)

router = APIRouter(tags=["Monitoring"])

metrics_service = MetricsService()


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    summary="Full health check",
    operation_id="monitoring_health_check",
)
async def monitoring_health_check(db: AsyncSession = Depends(get_db)):
    service = HealthCheckService(db)
    result = await service.full_health_check()
    status_code = 200 if result["status"] == "healthy" else 503
    return Response(
        content=result,
        status_code=status_code,
        media_type="application/json",
    )


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    summary="Readiness probe",
)
async def readiness(db: AsyncSession = Depends(get_db)):
    service = HealthCheckService(db)
    result = await service.readiness_check()
    status_code = 200 if result["status"] == "ready" else 503
    return Response(
        content=result,
        status_code=status_code,
        media_type="application/json",
    )


@router.get(
    "/live",
    response_model=LivenessResponse,
    summary="Liveness probe",
)
async def liveness():
    service = HealthCheckService.__new__(HealthCheckService)
    result = service.liveness_check()
    return result


@router.get(
    "/metrics",
    response_class=PlainTextResponse,
    summary="Prometheus metrics",
)
async def metrics():
    content = metrics_service.get_metrics()
    return Response(
        content=content,
        media_type=metrics_service.get_metrics_content_type(),
    )


@router.get(
    "/system/status",
    response_model=SystemStatusResponse,
    summary="Detailed system status",
)
async def system_status(db: AsyncSession = Depends(get_db)):
    service = HealthCheckService(db)
    health = await service.full_health_check()

    return SystemStatusResponse(
        status=health["status"],
        timestamp=datetime.now(timezone.utc),
        api=health["checks"]["api"],
        database=health["checks"]["database"],
        redis=health["checks"]["redis"],
        celery=health["checks"]["celery"],
        storage=health["checks"]["storage"],
        system=health["checks"]["system"],
        queue={"depth": 0},
    )


@router.get(
    "/system/events",
    response_model=SystemEventListResponse,
    summary="List system events",
)
async def list_events(
    event_type: str = Query(None),
    severity: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SystemEventRepository(db)

    type_enum = EventType(event_type) if event_type else None
    sev_enum = EventSeverity(severity) if severity else None

    events, total = await repo.get_events(
        event_type=type_enum,
        severity=sev_enum,
        page=page,
        page_size=page_size,
    )

    return SystemEventListResponse(
        events=[SystemEventResponse.model_validate(e) for e in events],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/system/events",
    response_model=SystemEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create system event",
)
async def create_event(
    request: SystemEventCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SystemEventRepository(db)

    event = await repo.create_event(
        event_type=request.event_type,
        severity=request.severity,
        source=request.source,
        message=request.message,
        metadata_=request.metadata,
        correlation_id=request.correlation_id,
    )

    return SystemEventResponse.model_validate(event)


@router.post(
    "/system/events/{event_id}/resolve",
    summary="Resolve system event",
)
async def resolve_event(
    event_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SystemEventRepository(db)
    event = await repo.resolve_event(event_id, resolved_by=current_user["id"])
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"resolved": True}


@router.get(
    "/system/alerts/active",
    summary="Get active alerts",
)
async def get_active_alerts(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AlertingService(db)
    alerts = await service.get_active_alerts()
    return {"alerts": alerts, "count": len(alerts)}


@router.get(
    "/system/alerts/history",
    response_model=AlertHistoryListResponse,
    summary="Alert history",
)
async def alert_history(
    hours: int = Query(24, ge=1, le=720),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = AlertHistoryRepository(db)
    alerts, total = await repo.get_recent_alerts(hours, page, page_size)

    return AlertHistoryListResponse(
        alerts=[AlertHistoryResponse.model_validate(a) for a in alerts],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/system/alerts/stats",
    summary="Alert statistics",
)
async def alert_stats(
    hours: int = Query(24, ge=1, le=720),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AlertingService(db)
    stats = await service.get_alert_stats(hours)
    return {"stats": stats, "period_hours": hours}


@router.post(
    "/system/alerts/evaluate",
    summary="Evaluate alert rules",
)
async def evaluate_alerts(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AlertingService(db)
    from src.modules.monitoring.services.health_service import HealthCheckService

    health_service = HealthCheckService(db)
    system = health_service.check_system_resources()

    metrics = {
        "disk_usage_percent": system["disk"]["usage_percent"],
        "memory_usage_percent": system["memory"]["usage_percent"],
        "cpu_usage_percent": system["cpu"]["usage_percent"],
    }

    results = await service.evaluate_all_rules(metrics)
    return {"results": results}


@router.get(
    "/system/health/history",
    response_model=list[HealthSnapshotResponse],
    summary="Health check history",
)
async def health_history(
    hours: int = Query(24, ge=1, le=168),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = HealthSnapshotRepository(db)
    snapshots, total = await repo.get_history(hours, page, page_size)
    return [HealthSnapshotResponse.model_validate(s) for s in snapshots]


@router.get(
    "/system/logs",
    response_model=SystemEventListResponse,
    summary="System logs (admin only)",
)
async def system_logs(
    severity: str = Query(None),
    source: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.get("role") not in ("super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    repo = SystemEventRepository(db)
    sev_enum = EventSeverity(severity) if severity else None

    events, total = await repo.get_events(
        severity=sev_enum,
        page=page,
        page_size=page_size,
    )

    return SystemEventListResponse(
        events=[SystemEventResponse.model_validate(e) for e in events],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/system/dashboard",
    response_model=DashboardMetricsResponse,
    summary="Monitoring dashboard data",
)
async def monitoring_dashboard(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.monitoring.services.health_service import HealthCheckService

    health_service = HealthCheckService(db)
    system = health_service.check_system_resources()
    alert_repo = AlertHistoryRepository(db)
    alert_stats = await alert_repo.get_alert_stats(24)

    return DashboardMetricsResponse(
        api={"status": "healthy", "requests_per_minute": 0},
        conversions={"total": 0, "success_rate": 0},
        workers={"active": 0, "utilization": 0},
        infrastructure={
            "cpu": system["cpu"]["usage_percent"],
            "memory": system["memory"]["usage_percent"],
            "disk": system["disk"]["usage_percent"],
        },
        generated_at=datetime.now(timezone.utc),
    )
