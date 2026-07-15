import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.gateway.models.gateway import Tenant, TenantUsage, TenantAuditLog
from src.modules.gateway.repositories.gateway import (
    OrganizationRepository,
    TenantRepository,
    TenantUsageRepository,
    TenantAuditLogRepository,
)

logger = get_logger(__name__)


class TenantService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.org_repo = OrganizationRepository(session)
        self.tenant_repo = TenantRepository(session)
        self.usage_repo = TenantUsageRepository(session)
        self.audit_repo = TenantAuditLogRepository(session)

    async def create_organization(
        self, name: str, slug: str, owner_id: str, description: str = None, website: str = None
    ) -> dict:
        existing = await self.org_repo.get_by_slug(slug)
        if existing:
            return {"success": False, "message": "Organization slug already exists"}

        org = await self.org_repo.create_organization(
            name=name, slug=slug, owner_id=owner_id,
            description=description, website=website,
        )

        default_tenant = await self.tenant_repo.create_tenant(
            organization_id=org.id,
            name=f"{name} - Default",
            slug="default",
            plan="free",
        )

        from src.modules.gateway.repositories.gateway import MembershipRepository
        membership_repo = MembershipRepository(self.session)
        await membership_repo.create_membership(
            user_id=owner_id,
            organization_id=org.id,
            tenant_id=default_tenant.id,
            role="owner",
        )

        logger.info("organization_created", extra={"org_id": str(org.id), "owner_id": owner_id})

        return {
            "success": True,
            "organization": org,
            "tenant": default_tenant,
        }

    async def get_organization(self, org_id: UUID) -> dict | None:
        org = await self.org_repo.get_by_id(org_id)
        if not org:
            return None

        tenants = await self.tenant_repo.get_organization_tenants(str(org_id))

        from src.modules.gateway.repositories.gateway import MembershipRepository
        membership_repo = MembershipRepository(self.session)
        member_count = await membership_repo.get_tenant_member_count(str(tenants[0].id)) if tenants else 0

        return {
            "organization": org,
            "tenants": tenants,
            "member_count": member_count,
        }

    async def update_organization(self, org_id: UUID, user_id: str, **kwargs) -> dict:
        membership_repo = __import__("src.modules.gateway.repositories.gateway", fromlist=["MembershipRepository"]).MembershipRepository(self.session)
        membership = await membership_repo.get_user_membership(user_id, str(org_id))
        if not membership or membership.role not in ("owner", "admin"):
            return {"success": False, "message": "Insufficient permissions"}

        org = await self.org_repo.update_organization(org_id, **kwargs)
        if not org:
            return {"success": False, "message": "Organization not found"}

        return {"success": True, "organization": org}

    async def create_tenant(
        self, org_id: UUID, name: str, slug: str, user_id: str, plan: str = "free"
    ) -> dict:
        membership_repo = __import__("src.modules.gateway.repositories.gateway", fromlist=["MembershipRepository"]).MembershipRepository(self.session)
        membership = await membership_repo.get_user_membership(user_id, str(org_id))
        if not membership or membership.role not in ("owner", "admin"):
            return {"success": False, "message": "Insufficient permissions"}

        tenants = await self.tenant_repo.get_organization_tenants(str(org_id))
        for t in tenants:
            if t.slug == slug:
                return {"success": False, "message": "Tenant slug already exists"}

        tenant = await self.tenant_repo.create_tenant(
            organization_id=org_id, name=name, slug=slug, plan=plan,
        )

        logger.info("tenant_created", extra={"tenant_id": str(tenant.id), "org_id": str(org_id)})

        return {"success": True, "tenant": tenant}

    async def get_tenant(self, tenant_id: UUID) -> Tenant | None:
        return await self.tenant_repo.get_by_id(tenant_id)

    async def update_tenant(self, tenant_id: UUID, user_id: str, **kwargs) -> dict:
        tenant = await self.tenant_repo.get_by_id(tenant_id)
        if not tenant:
            return {"success": False, "message": "Tenant not found"}

        membership_repo = __import__("src.modules.gateway.repositories.gateway", fromlist=["MembershipRepository"]).MembershipRepository(self.session)
        membership = await membership_repo.get_user_membership(user_id, tenant.organization_id)
        if not membership or membership.role not in ("owner", "admin"):
            return {"success": False, "message": "Insufficient permissions"}

        for key, value in kwargs.items():
            if hasattr(tenant, key) and value is not None:
                setattr(tenant, key, value)
        await self.session.commit()

        return {"success": True, "tenant": tenant}

    async def check_tenant_limits(self, tenant_id: UUID) -> dict:
        return await self.tenant_repo.check_limits(tenant_id)

    async def record_tenant_usage(
        self, tenant_id: UUID, api_calls: int = 0, conversions: int = 0, storage_bytes: int = 0
    ):
        await self.usage_repo.record_usage(tenant_id, api_calls, conversions, storage_bytes)
        await self.tenant_repo.update_usage(tenant_id, api_calls, conversions, storage_bytes)

    async def get_tenant_usage(self, tenant_id: UUID, days: int = 30) -> dict:
        tenant = await self.tenant_repo.get_by_id(tenant_id)
        if not tenant:
            return {}

        usage = await self.usage_repo.get_usage_summary(str(tenant_id), days)

        return {
            "tenant_id": str(tenant_id),
            "period_days": days,
            "total_api_calls": usage.get("total_api_calls", 0),
            "total_conversions": usage.get("total_conversions", 0),
            "total_storage_bytes": usage.get("total_storage_bytes", 0),
            "total_bandwidth_bytes": usage.get("total_bandwidth_bytes", 0),
            "avg_daily_api_calls": usage.get("total_api_calls", 0) / days if days > 0 else 0,
            "avg_daily_conversions": usage.get("total_conversions", 0) / days if days > 0 else 0,
            "storage_limit_gb": tenant.max_storage_gb,
            "api_calls_limit": tenant.max_api_calls,
            "conversions_limit": tenant.max_conversions,
            "storage_usage_percent": round(usage.get("total_storage_bytes", 0) / (tenant.max_storage_gb * 1024**3) * 100, 2) if tenant.max_storage_gb > 0 else 0,
            "api_usage_percent": round(usage.get("total_api_calls", 0) / tenant.max_api_calls * 100, 2) if tenant.max_api_calls > 0 else 0,
            "conversion_usage_percent": round(usage.get("total_conversions", 0) / tenant.max_conversions * 100, 2) if tenant.max_conversions > 0 else 0,
        }

    async def get_tenant_settings(self, tenant_id: UUID) -> dict:
        tenant = await self.tenant_repo.get_by_id(tenant_id)
        if not tenant:
            return {}

        org = await self.org_repo.get_by_id(UUID(tenant.organization_id))

        return {
            "tenant_id": str(tenant_id),
            "plan": tenant.plan,
            "max_users": tenant.max_users,
            "max_storage_gb": tenant.max_storage_gb,
            "max_api_calls": tenant.max_api_calls,
            "max_conversions": tenant.max_conversions,
            "settings": tenant.settings,
            "branding": org.branding if org else {},
            "custom_domain": org.custom_domain if org else None,
        }

    async def get_tenant_stats(self, tenant_id: UUID) -> dict:
        tenant = await self.tenant_repo.get_by_id(tenant_id)
        if not tenant:
            return {}

        org = await self.org_repo.get_by_id(UUID(tenant.organization_id))

        from src.modules.gateway.repositories.gateway import MembershipRepository, InvitationRepository
        membership_repo = MembershipRepository(self.session)
        invitation_repo = InvitationRepository(self.session)

        member_count = await membership_repo.get_tenant_member_count(str(tenant_id))
        pending = await invitation_repo.get_pending_invitations(tenant.organization_id)
        usage = await self.usage_repo.get_usage_summary(str(tenant_id), 30)

        return {
            "tenant_id": str(tenant_id),
            "organization_name": org.name if org else "",
            "tenant_name": tenant.name,
            "plan": tenant.plan,
            "member_count": member_count,
            "total_api_calls": usage.get("total_api_calls", 0),
            "total_conversions": usage.get("total_conversions", 0),
            "storage_used_gb": round(tenant.storage_used_bytes / 1024**3, 2),
            "storage_limit_gb": tenant.max_storage_gb,
            "active_members": member_count,
            "pending_invitations": len(pending),
        }

    async def log_tenant_action(
        self, tenant_id: UUID, user_id: str, action: str, resource_type: str,
        resource_id: str = None, changes: dict = None, ip_address: str = None
    ):
        await self.audit_repo.log_action(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            changes=changes,
            ip_address=ip_address,
        )
