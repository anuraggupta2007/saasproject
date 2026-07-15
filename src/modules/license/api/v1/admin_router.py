import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_admin
from src.modules.license.schemas.admin import (
    AdminLicenseCreateRequest,
    AdminLicenseUpdateRequest,
    AdminSearchRequest,
    AdminUserResponse,
    AdminUserListResponse,
    AdminAnalyticsResponse,
    AdminActivationListResponse,
    AdminAuditLogResponse,
    AdminAuditLogListResponse,
)
from src.modules.license.schemas.license import LicenseResponse, LicenseListResponse
from src.modules.license.schemas.plan import PlanCreateRequest, PlanUpdateRequest, PlanResponse, PlanListResponse
from src.modules.license.services.license_service import LicenseService
from src.modules.license.services.activation_service import ActivationService
from src.modules.license.repositories.license import LicenseRepository
from src.modules.license.repositories.activation import ActivationRepository
from src.modules.license.repositories.plan import PlanRepository
from src.modules.license.repositories.subscription import SubscriptionRepository
from src.modules.license.repositories.audit import AuditLogRepository
from src.modules.license.models.license import LicenseType

router = APIRouter(prefix="/admin/license", tags=["Admin License"])


@router.post(
    "/create",
    response_model=LicenseResponse,
    summary="Create a license (admin)",
)
async def create_license(
    request: AdminLicenseCreateRequest,
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    req: Request = None,
):
    service = LicenseService(db)

    license = await service.create_license(
        user_id=request.user_id,
        license_type=LicenseType(request.license_type),
        max_activations=request.max_activations,
        features=request.features,
        trial_days=request.trial_days,
        expires_at=request.expires_at,
        metadata=request.metadata,
        ip_address=req.client.host if req else None,
    )

    return LicenseResponse.model_validate(license)


@router.put(
    "/suspend",
    summary="Suspend a license (admin)",
)
async def suspend_license(
    request: AdminLicenseUpdateRequest,
    license_id: uuid.UUID = Query(...),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    req: Request = None,
):
    service = LicenseService(db)

    license = await service.suspend_license(
        license_id=license_id,
        reason=request.notes,
        ip_address=req.client.host if req else None,
    )

    if not license:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found",
        )

    return {"message": "License suspended"}


@router.put(
    "/revoke",
    summary="Revoke a license (admin)",
)
async def revoke_license(
    license_id: uuid.UUID = Query(...),
    reason: str = Query(None),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    req: Request = None,
):
    service = LicenseService(db)

    license = await service.revoke_license(
        license_id=license_id,
        reason=reason,
        ip_address=req.client.host if req else None,
    )

    if not license:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found",
        )

    return {"message": "License revoked"}


@router.get(
    "/search/users",
    response_model=AdminUserListResponse,
    summary="Search users (admin)",
)
async def search_users(
    query: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.models.base import User
    from sqlalchemy import select, func

    q = select(User)
    if query:
        q = q.where(
            User.email.ilike(f"%{query}%") |
            User.full_name.ilike(f"%{query}%")
        )

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    users = list(result.scalars().all())

    return AdminUserListResponse(
        users=[
            AdminUserResponse(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                is_active=u.is_active,
                created_at=u.created_at,
            )
            for u in users
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/activations",
    response_model=AdminActivationListResponse,
    summary="View all activations (admin)",
)
async def list_all_activations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = ActivationRepository(db)

    from sqlalchemy import select, func
    from src.modules.license.models.activation import Activation

    count_q = select(func.count()).select_from(Activation)
    total = (await db.execute(count_q)).scalar() or 0

    q = select(Activation).order_by(Activation.created_at.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(q)
    activations = list(result.scalars().all())

    return AdminActivationListResponse(
        activations=[{"id": str(a.id), "status": a.status.value} for a in activations],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/analytics",
    response_model=AdminAnalyticsResponse,
    summary="View analytics (admin)",
)
async def get_analytics(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    license_repo = LicenseRepository(db)
    activation_repo = ActivationRepository(db)
    subscription_repo = SubscriptionRepository(db)

    license_counts = await license_repo.count_by_status()
    license_types = await license_repo.count_by_type()
    subscription_counts = await subscription_repo.count_by_status()
    active_activations = await activation_repo.count_all_active()

    return AdminAnalyticsResponse(
        total_licenses=sum(license_counts.values()),
        active_licenses=license_counts.get("active", 0),
        expired_licenses=license_counts.get("expired", 0),
        suspended_licenses=license_counts.get("suspended", 0),
        revoked_licenses=license_counts.get("revoked", 0),
        total_activations=active_activations,
        active_activations=active_activations,
        total_subscriptions=sum(subscription_counts.values()),
        active_subscriptions=subscription_counts.get("active", 0),
        licenses_by_type=license_types,
    )


@router.get(
    "/audit-logs",
    response_model=AdminAuditLogListResponse,
    summary="View audit logs (admin)",
)
async def list_audit_logs(
    user_id: uuid.UUID = Query(None),
    license_id: uuid.UUID = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, func
    from src.modules.license.models.audit import AuditLog

    q = select(AuditLog)
    if user_id:
        q = q.where(AuditLog.user_id == user_id)
    if license_id:
        q = q.where(AuditLog.license_id == license_id)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(AuditLog.created_at.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(q)
    logs = list(result.scalars().all())

    return AdminAuditLogListResponse(
        logs=[
            AdminAuditLogResponse(
                id=l.id,
                user_id=l.user_id,
                license_id=l.license_id,
                action=l.action.value,
                severity=l.severity.value,
                details=l.details,
                ip_address=l.ip_address,
                created_at=l.created_at,
            )
            for l in logs
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/plans",
    response_model=PlanResponse,
    summary="Create a plan (admin)",
)
async def create_plan(
    request: PlanCreateRequest,
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = PlanRepository(db)

    from src.modules.license.models.plan import Plan, BillingCycle

    plan = Plan(
        name=request.name,
        display_name=request.display_name,
        description=request.description,
        billing_cycle=BillingCycle(request.billing_cycle),
        price=request.price,
        currency=request.currency,
        trial_days=request.trial_days,
        max_activations=request.max_activations,
        features=request.features,
        is_popular=request.is_popular,
        sort_order=request.sort_order,
    )

    plan = await repo.create(plan)
    return PlanResponse.model_validate(plan)


@router.get(
    "/plans",
    response_model=PlanListResponse,
    summary="List all plans (admin)",
)
async def list_plans(
    include_inactive: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    repo = PlanRepository(db)

    plans, total = await repo.get_all_plans(include_inactive, page, page_size)

    return PlanListResponse(
        plans=[PlanResponse.model_validate(p) for p in plans],
        total=total,
    )
