import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.core.logging import get_logger
from src.modules.gateway.services.tenant_service import TenantService
from src.modules.gateway.services.membership_service import MembershipService
from src.modules.gateway.repositories.gateway import TenantAuditLogRepository
from src.modules.gateway.schemas.gateway import (
    OrganizationCreateRequest,
    OrganizationUpdateRequest,
    OrganizationResponse,
    OrganizationListResponse,
    TenantCreateRequest,
    TenantUpdateRequest,
    TenantResponse,
    TenantListResponse,
    MembershipCreateRequest,
    MembershipUpdateRequest,
    MembershipResponse,
    MembershipListResponse,
    InviteUserRequest,
    InvitationResponse,
    InvitationListResponse,
    InvitationAcceptRequest,
    RoleCreateRequest,
    RoleResponse,
    RoleListResponse,
    GatewayAPIKeyCreateRequest,
    GatewayAPIKeyResponse,
    GatewayAPIKeyCreateResponse,
    GatewayAPIKeyListResponse,
    TenantUsageSummaryResponse,
    TenantSettingsResponse,
    SwitchTenantRequest,
    SwitchTenantResponse,
    TenantAuditLogResponse,
    TenantAuditLogListResponse,
    TenantStatsResponse,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/gateway", tags=["API Gateway"])


@router.post(
    "/organizations",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create organization",
)
async def create_organization(
    request: OrganizationCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    result = await service.create_organization(
        name=request.name,
        slug=request.slug,
        owner_id=current_user["id"],
        description=request.description,
        website=request.website,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result["organization"]


@router.get(
    "/organizations",
    response_model=OrganizationListResponse,
    summary="List user organizations",
)
async def list_organizations(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.gateway.repositories.gateway import OrganizationRepository
    repo = OrganizationRepository(db)
    orgs = await repo.get_user_organizations(current_user["id"])
    return OrganizationListResponse(organizations=orgs, total=len(orgs))


@router.get(
    "/organizations/{org_id}",
    response_model=OrganizationResponse,
    summary="Get organization",
)
async def get_organization(
    org_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    result = await service.get_organization(org_id)
    if not result:
        raise HTTPException(status_code=404, detail="Organization not found")
    return result["organization"]


@router.put(
    "/organizations/{org_id}",
    response_model=OrganizationResponse,
    summary="Update organization",
)
async def update_organization(
    org_id: uuid.UUID,
    request: OrganizationUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    result = await service.update_organization(
        org_id, current_user["id"], **request.model_dump(exclude_unset=True)
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result["organization"]


@router.post(
    "/organizations/{org_id}/tenants",
    response_model=TenantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create tenant",
)
async def create_tenant(
    org_id: uuid.UUID,
    request: TenantCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    result = await service.create_tenant(
        org_id=org_id,
        name=request.name,
        slug=request.slug,
        user_id=current_user["id"],
        plan=request.plan,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result["tenant"]


@router.get(
    "/organizations/{org_id}/tenants",
    response_model=TenantListResponse,
    summary="List organization tenants",
)
async def list_tenants(
    org_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.gateway.repositories.gateway import TenantRepository
    repo = TenantRepository(db)
    tenants = await repo.get_organization_tenants(str(org_id))
    return TenantListResponse(tenants=tenants, total=len(tenants))


@router.get(
    "/tenants/{tenant_id}",
    response_model=TenantResponse,
    summary="Get tenant",
)
async def get_tenant(
    tenant_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    tenant = await service.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.put(
    "/tenants/{tenant_id}",
    response_model=TenantResponse,
    summary="Update tenant",
)
async def update_tenant(
    tenant_id: uuid.UUID,
    request: TenantUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    result = await service.update_tenant(
        tenant_id, current_user["id"], **request.model_dump(exclude_unset=True)
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result["tenant"]


@router.post(
    "/tenants/{tenant_id}/switch",
    response_model=SwitchTenantResponse,
    summary="Switch tenant context",
)
async def switch_tenant(
    tenant_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    tenant = await service.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    from src.modules.security.services.jwt_service import JWTService
    from src.core.dependencies import get_redis

    redis = await get_redis()
    jwt_service = JWTService(redis)

    token, jti = jwt_service.create_access_token(
        user_id=current_user["id"],
        email=current_user.get("email"),
        role=current_user.get("role"),
        permissions=current_user.get("permissions", []),
        additional_claims={
            "tenant_id": str(tenant_id),
            "organization_id": tenant.organization_id,
        },
    )

    return SwitchTenantResponse(
        access_token=token,
        tenant_id=str(tenant_id),
        organization_id=tenant.organization_id,
        role=current_user.get("role", "member"),
        message="Tenant context switched",
    )


@router.get(
    "/tenants/{tenant_id}/settings",
    response_model=TenantSettingsResponse,
    summary="Get tenant settings",
)
async def get_tenant_settings(
    tenant_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    settings = await service.get_tenant_settings(tenant_id)
    if not settings:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantSettingsResponse(**settings)


@router.get(
    "/tenants/{tenant_id}/stats",
    response_model=TenantStatsResponse,
    summary="Get tenant statistics",
)
async def get_tenant_stats(
    tenant_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    stats = await service.get_tenant_stats(tenant_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantStatsResponse(**stats)


@router.post(
    "/tenants/{tenant_id}/members",
    response_model=MembershipResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add member to tenant",
)
async def add_member(
    tenant_id: uuid.UUID,
    request: MembershipCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    tenant_service = TenantService(db)
    tenant = await tenant_service.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    from src.modules.gateway.repositories.gateway import MembershipRepository
    repo = MembershipRepository(db)
    membership = await repo.create_membership(
        user_id=request.user_id,
        organization_id=tenant.organization_id,
        tenant_id=tenant_id,
        role=request.role,
        invited_by=current_user["id"],
        permissions=request.permissions,
    )
    return membership


@router.get(
    "/tenants/{tenant_id}/members",
    response_model=MembershipListResponse,
    summary="List tenant members",
)
async def list_members(
    tenant_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    members = await service.get_tenant_members(tenant_id)
    return MembershipListResponse(members=members, total=len(members))


@router.put(
    "/members/{membership_id}/role",
    summary="Update member role",
)
async def update_member_role(
    membership_id: uuid.UUID,
    request: MembershipUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    result = await service.update_member_role(
        membership_id, current_user["id"], request.role
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.delete(
    "/members/{membership_id}",
    summary="Remove member",
)
async def remove_member(
    membership_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    result = await service.remove_member(membership_id, current_user["id"])
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post(
    "/organizations/{org_id}/invitations",
    response_model=InvitationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Invite user to organization",
)
async def invite_user(
    org_id: uuid.UUID,
    request: InviteUserRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    tenant_service = TenantService(db)

    tenant_id = uuid.UUID(request.tenant_id) if request.tenant_id else None
    if not tenant_id:
        from src.modules.gateway.repositories.gateway import TenantRepository
        tenant_repo = TenantRepository(db)
        tenants = await tenant_repo.get_organization_tenants(str(org_id))
        if tenants:
            tenant_id = tenants[0].id

    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant found for organization")

    result = await service.invite_user(
        org_id=org_id,
        tenant_id=tenant_id,
        email=request.email,
        role=request.role,
        invited_by=current_user["id"],
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result["invitation"]


@router.get(
    "/organizations/{org_id}/invitations",
    response_model=InvitationListResponse,
    summary="List pending invitations",
)
async def list_invitations(
    org_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    invitations = await service.get_pending_invitations(org_id)
    return InvitationListResponse(invitations=invitations, total=len(invitations))


@router.post(
    "/invitations/accept",
    summary="Accept invitation",
)
async def accept_invitation(
    request: InvitationAcceptRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    result = await service.accept_invitation(request.token, current_user["id"])
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.delete(
    "/invitations/{invitation_id}",
    summary="Revoke invitation",
)
async def revoke_invitation(
    invitation_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    result = await service.revoke_invitation(invitation_id, current_user["id"])
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post(
    "/organizations/{org_id}/roles",
    response_model=RoleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create custom role",
)
async def create_role(
    org_id: uuid.UUID,
    request: RoleCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    result = await service.create_role(
        org_id=org_id,
        name=request.name,
        user_id=current_user["id"],
        description=request.description,
        permissions=request.permissions,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result["role"]


@router.get(
    "/organizations/{org_id}/roles",
    response_model=RoleListResponse,
    summary="List organization roles",
)
async def list_roles(
    org_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    roles = await service.get_organization_roles(org_id)
    return RoleListResponse(roles=roles, total=len(roles))


@router.post(
    "/tenants/{tenant_id}/api-keys",
    response_model=GatewayAPIKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create API key",
)
async def create_api_key(
    tenant_id: uuid.UUID,
    request: GatewayAPIKeyCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    tenant_service = TenantService(db)
    tenant = await tenant_service.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    result = await service.create_api_key(
        org_id=uuid.UUID(tenant.organization_id),
        tenant_id=tenant_id,
        user_id=current_user["id"],
        name=request.name,
        scopes=request.scopes,
        rate_limit=request.rate_limit,
        daily_quota=request.daily_quota,
        expires_in_days=request.expires_in_days,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("message", "Failed"))
    return GatewayAPIKeyCreateResponse(**result)


@router.get(
    "/tenants/{tenant_id}/api-keys",
    response_model=GatewayAPIKeyListResponse,
    summary="List tenant API keys",
)
async def list_api_keys(
    tenant_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    keys = await service.get_tenant_api_keys(tenant_id)
    return GatewayAPIKeyListResponse(api_keys=keys, total=len(keys))


@router.delete(
    "/api-keys/{key_id}",
    summary="Revoke API key",
)
async def revoke_api_key(
    key_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MembershipService(db)
    result = await service.revoke_api_key(key_id, current_user["id"])
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.get(
    "/tenants/{tenant_id}/usage",
    response_model=TenantUsageSummaryResponse,
    summary="Get tenant usage",
)
async def get_tenant_usage(
    tenant_id: uuid.UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    usage = await service.get_tenant_usage(tenant_id, days)
    if not usage:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantUsageSummaryResponse(**usage)


@router.get(
    "/tenants/{tenant_id}/audit-logs",
    response_model=TenantAuditLogListResponse,
    summary="Get tenant audit logs",
)
async def get_tenant_audit_logs(
    tenant_id: uuid.UUID,
    action: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TenantAuditLogRepository(db)
    logs, total = await repo.get_tenant_logs(str(tenant_id), action, page, page_size)
    return TenantAuditLogListResponse(
        logs=[TenantAuditLogResponse.model_validate(l) for l in logs],
        total=total,
        page=page,
        page_size=page_size,
    )
