import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.admin.schemas.admin import (
    DashboardOverviewResponse,
    DashboardMetricsResponse,
    SystemHealthResponse,
    WorkerStatusResponse,
    UserListResponse,
    UserManagementResponse,
    ConversionJobListResponse,
    ConversionJobAdminResponse,
    AuditLogListResponse,
    AuditLogAdminResponse,
    AnnouncementCreateRequest,
    AnnouncementResponse,
    AnnouncementListResponse,
    BroadcastRequest,
    SystemEventResponse,
    SystemEventListResponse,
    StorageAnalyticsResponse,
    AdminUserCreateRequest,
    AdminUserUpdateRequest,
    AdminUserResponse,
    AdminUserListResponse,
)
from src.modules.admin.services.dashboard_service import AdminDashboardService
from src.modules.admin.services.user_service import AdminUserService
from src.modules.admin.services.audit_service import AdminAuditService, AnnouncementService

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


@router.get(
    "/dashboard/overview",
    response_model=DashboardOverviewResponse,
    summary="Get dashboard overview",
)
async def get_dashboard_overview(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminDashboardService(db)
    overview = await service.get_overview()
    return DashboardOverviewResponse(**overview)


@router.get(
    "/dashboard/metrics",
    response_model=DashboardMetricsResponse,
    summary="Get dashboard metrics",
)
async def get_dashboard_metrics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminDashboardService(db)
    metrics = await service.get_metrics(days)
    return DashboardMetricsResponse(**metrics)


@router.get(
    "/system/health",
    response_model=SystemHealthResponse,
    summary="Get system health",
)
async def get_system_health(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminDashboardService(db)
    health = await service.get_system_health()
    return SystemHealthResponse(**health)


@router.get(
    "/system/workers",
    response_model=WorkerStatusResponse,
    summary="Get worker status",
)
async def get_worker_status(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminDashboardService(db)
    status_data = await service.get_worker_status()
    return WorkerStatusResponse(**status_data)


@router.get(
    "/users",
    response_model=UserListResponse,
    summary="Search users",
)
async def search_users(
    query: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminUserService(db)
    users, total = await service.search_users(query, page, page_size)

    return UserListResponse(
        users=[
            UserManagementResponse(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                is_active=u.is_active,
                role=getattr(u, "role", "user"),
                created_at=u.created_at,
            )
            for u in users
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/users/{user_id}",
    response_model=UserManagementResponse,
    summary="Get user details",
)
async def get_user(
    user_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminUserService(db)
    user = await service.get_user_details(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserManagementResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        role=getattr(user, "role", "user"),
        created_at=user.created_at,
    )


@router.post(
    "/users/{user_id}/suspend",
    summary="Suspend user",
)
async def suspend_user(
    user_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminUserService(db)
    audit_service = AdminAuditService(db)

    success = await service.suspend_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await audit_service.log_admin_action(
        admin_id=uuid.UUID(current_user["id"]),
        action="suspend_user",
        details={"target_user_id": str(user_id)},
    )

    return {"message": "User suspended"}


@router.post(
    "/users/{user_id}/reactivate",
    summary="Reactivate user",
)
async def reactivate_user(
    user_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminUserService(db)
    audit_service = AdminAuditService(db)

    success = await service.reactivate_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await audit_service.log_admin_action(
        admin_id=uuid.UUID(current_user["id"]),
        action="reactivate_user",
        details={"target_user_id": str(user_id)},
    )

    return {"message": "User reactivated"}


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
)
async def delete_user(
    user_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminUserService(db)
    audit_service = AdminAuditService(db)

    success = await service.delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await audit_service.log_admin_action(
        admin_id=uuid.UUID(current_user["id"]),
        action="delete_user",
        details={"target_user_id": str(user_id)},
    )


@router.get(
    "/conversions",
    response_model=ConversionJobListResponse,
    summary="List all conversion jobs",
)
async def list_conversions(
    status_filter: str = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.conversion.repositories.conversion import ConversionJobRepository

    repo = ConversionJobRepository(db)
    from src.modules.conversion.models.base import ConversionStatus

    status_enum = None
    if status_filter:
        try:
            status_enum = ConversionStatus(status_filter)
        except ValueError:
            pass

    jobs, total = await repo.list_user_jobs(
        user_id=None,
        status=status_enum,
        page=page,
        page_size=page_size,
    )

    return ConversionJobListResponse(
        jobs=[
            ConversionJobAdminResponse(
                id=j.id,
                user_id=j.user_id,
                output_format=j.output_format.value if hasattr(j.output_format, 'value') else j.output_format,
                status=j.status.value if hasattr(j.status, 'value') else j.status,
                progress=j.progress,
                output_filename=j.output_filename,
                output_size=j.output_size,
                error_message=j.error_message,
                created_at=j.created_at,
                processing_duration_ms=j.processing_duration_ms,
            )
            for j in jobs
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/conversions/{job_id}/retry",
    summary="Retry failed conversion",
)
async def retry_conversion(
    job_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.conversion.repositories.conversion import ConversionJobRepository
    from src.modules.conversion.models.base import ConversionStatus

    repo = ConversionJobRepository(db)
    job = await repo.get_by_id(job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    await repo.update(job_id, status=ConversionStatus.PENDING)

    return {"message": "Job queued for retry"}


@router.post(
    "/conversions/{job_id}/cancel",
    summary="Cancel conversion job",
)
async def cancel_conversion(
    job_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.conversion.repositories.conversion import ConversionJobRepository
    from src.modules.conversion.models.base import ConversionStatus

    repo = ConversionJobRepository(db)
    job = await repo.get_by_id(job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    await repo.update(job_id, status=ConversionStatus.CANCELLED)

    return {"message": "Job cancelled"}


@router.delete(
    "/conversions/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete conversion job",
)
async def delete_conversion(
    job_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.conversion.repositories.conversion import ConversionJobRepository

    repo = ConversionJobRepository(db)
    await repo.delete(job_id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    summary="Get audit logs",
)
async def get_audit_logs(
    event_type: str = Query(None),
    severity: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminAuditService(db)
    logs, total = await service.get_audit_logs(event_type, severity, page, page_size)

    return AuditLogListResponse(
        logs=[
            AuditLogAdminResponse(
                id=l.id,
                user_id=l.details.get("admin_id") if l.details else None,
                action=l.event_type,
                severity=l.severity,
                details=l.details,
                ip_address=None,
                created_at=l.created_at,
            )
            for l in logs
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/announcements",
    response_model=AnnouncementListResponse,
    summary="List announcements",
)
async def list_announcements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnnouncementService(db)
    announcements, total = await service.list_announcements(page, page_size)

    return AnnouncementListResponse(
        announcements=[AnnouncementResponse.model_validate(a) for a in announcements],
        total=total,
    )


@router.post(
    "/announcements",
    response_model=AnnouncementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create announcement",
)
async def create_announcement(
    request: AnnouncementCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnnouncementService(db)

    announcement = await service.create_announcement(
        title=request.title,
        message=request.message,
        announcement_type=request.announcement_type,
        start_date=request.start_date,
        end_date=request.end_date,
        target_roles=request.target_roles,
        created_by=uuid.UUID(current_user["id"]),
    )

    return AnnouncementResponse.model_validate(announcement)


@router.post(
    "/broadcast",
    summary="Broadcast notification",
)
async def broadcast_notification(
    request: BroadcastRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnnouncementService(db)

    result = await service.broadcast_notification(
        title=request.title,
        message=request.message,
        notification_type=request.notification_type,
        target_users=request.target_users,
        send_email=request.send_email,
    )

    return result


@router.get(
    "/storage",
    response_model=StorageAnalyticsResponse,
    summary="Get storage analytics",
)
async def get_storage_analytics(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return StorageAnalyticsResponse(
        total_files=0,
        total_size_mb=0.0,
        uploaded_files=0,
        converted_files=0,
        avg_file_size_mb=0.0,
        storage_by_type={},
    )


@router.get(
    "/events",
    response_model=SystemEventListResponse,
    summary="Get system events",
)
async def get_system_events(
    event_type: str = Query(None),
    severity: str = Query(None),
    resolved: bool = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminAuditService(db)
    events, total = await service.get_audit_logs(event_type, severity, page, page_size)

    return SystemEventListResponse(
        events=[SystemEventResponse.model_validate(e) for e in events],
        total=total,
    )


@router.post(
    "/events/{event_id}/resolve",
    summary="Resolve system event",
)
async def resolve_event(
    event_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AdminAuditService(db)

    event = await service.resolve_event(
        event_id,
        uuid.UUID(current_user["id"]),
    )

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    return {"message": "Event resolved"}


@router.get(
    "/admins",
    response_model=AdminUserListResponse,
    summary="List admin users",
)
async def list_admins(
    role: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.admin.models.admin import AdminRole

    service = AdminUserService(db)

    role_enum = None
    if role:
        try:
            role_enum = AdminRole(role)
        except ValueError:
            pass

    admins, total = await service.list_admins(role_enum, page, page_size)

    return AdminUserListResponse(
        admins=[AdminUserResponse.model_validate(a) for a in admins],
        total=total,
    )


@router.post(
    "/admins",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create admin user",
)
async def create_admin(
    request: AdminUserCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.admin.models.admin import AdminRole

    service = AdminUserService(db)
    audit_service = AdminAuditService(db)

    try:
        role = AdminRole(request.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role",
        )

    admin = await service.create_admin(
        user_id=request.user_id,
        role=role,
        permissions=request.permissions,
        ip_allowlist=request.ip_allowlist,
    )

    await audit_service.log_admin_action(
        admin_id=uuid.UUID(current_user["id"]),
        action="create_admin",
        details={"new_admin_id": str(admin.id), "role": role.value},
    )

    return AdminUserResponse.model_validate(admin)
