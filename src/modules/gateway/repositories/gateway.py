from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.base import BaseRepository
from src.modules.gateway.models.gateway import (
    Organization,
    Tenant,
    Membership,
    Role,
    Invitation,
    GatewayAPIKey,
    TenantUsage,
    TenantAuditLog,
)


class OrganizationRepository(BaseRepository[Organization]):
    def __init__(self, session: AsyncSession):
        super().__init__(Organization, session)

    async def create_organization(
        self, name, slug, owner_id, description=None, website=None, settings=None
    ) -> Organization:
        org = Organization(
            name=name,
            slug=slug,
            owner_id=owner_id,
            description=description,
            website=website,
            settings=settings or {},
        )
        self.session.add(org)
        await self.session.commit()
        return org

    async def get_by_slug(self, slug: str) -> Organization | None:
        result = await self.session.execute(
            select(Organization).where(Organization.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_user_organizations(self, user_id: str) -> list[Organization]:
        result = await self.session.execute(
            select(Organization)
            .join(Membership, Membership.organization_id == Organization.id)
            .where(and_(Membership.user_id == user_id, Membership.is_active == True))
            .order_by(Organization.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_organization(self, org_id: UUID, **kwargs) -> Organization | None:
        org = await self.get_by_id(org_id)
        if org:
            for key, value in kwargs.items():
                if hasattr(org, key) and value is not None:
                    setattr(org, key, value)
            await self.session.commit()
        return org


class TenantRepository(BaseRepository[Tenant]):
    def __init__(self, session: AsyncSession):
        super().__init__(Tenant, session)

    async def create_tenant(
        self, organization_id, name, slug, plan="free", billing_email=None, settings=None
    ) -> Tenant:
        tenant = Tenant(
            organization_id=str(organization_id),
            name=name,
            slug=slug,
            plan=plan,
            billing_email=billing_email,
            settings=settings or {},
        )
        self.session.add(tenant)
        await self.session.commit()
        return tenant

    async def get_organization_tenants(self, org_id: str) -> list[Tenant]:
        result = await self.session.execute(
            select(Tenant)
            .where(Tenant.organization_id == org_id)
            .order_by(Tenant.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_user_tenants(self, user_id: str) -> list[Tenant]:
        result = await self.session.execute(
            select(Tenant)
            .join(Membership, Membership.tenant_id == Tenant.id)
            .where(and_(Membership.user_id == user_id, Membership.is_active == True))
            .order_by(Tenant.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_usage(self, tenant_id: UUID, api_calls: int = 0, conversions: int = 0, storage_bytes: int = 0):
        tenant = await self.get_by_id(tenant_id)
        if tenant:
            tenant.api_calls_used += api_calls
            tenant.conversions_used += conversions
            tenant.storage_used_bytes += storage_bytes
            await self.session.commit()

    async def check_limits(self, tenant_id: UUID) -> dict:
        tenant = await self.get_by_id(tenant_id)
        if not tenant:
            return {"allowed": False, "reason": "Tenant not found"}

        if tenant.api_calls_used >= tenant.max_api_calls:
            return {"allowed": False, "reason": "API limit exceeded"}
        if tenant.conversions_used >= tenant.max_conversions:
            return {"allowed": False, "reason": "Conversion limit exceeded"}
        if tenant.storage_used_bytes >= tenant.max_storage_gb * 1024**3:
            return {"allowed": False, "reason": "Storage limit exceeded"}

        return {"allowed": True}


class MembershipRepository(BaseRepository[Membership]):
    def __init__(self, session: AsyncSession):
        super().__init__(Membership, session)

    async def create_membership(
        self, user_id, organization_id, tenant_id, role="member", invited_by=None, permissions=None
    ) -> Membership:
        membership = Membership(
            user_id=user_id,
            organization_id=str(organization_id),
            tenant_id=str(tenant_id),
            role=role,
            invited_by=invited_by,
            permissions=permissions or [],
        )
        self.session.add(membership)
        await self.session.commit()
        return membership

    async def get_user_membership(self, user_id: str, org_id: str) -> Membership | None:
        result = await self.session.execute(
            select(Membership).where(
                and_(Membership.user_id == user_id, Membership.organization_id == org_id)
            )
        )
        return result.scalar_one_or_none()

    async def get_tenant_members(self, tenant_id: str) -> list[Membership]:
        result = await self.session.execute(
            select(Membership)
            .where(and_(Membership.tenant_id == tenant_id, Membership.is_active == True))
            .order_by(Membership.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_tenant_member_count(self, tenant_id: str) -> int:
        result = await self.session.execute(
            select(func.count()).where(
                and_(Membership.tenant_id == tenant_id, Membership.is_active == True)
            )
        )
        return result.scalar() or 0

    async def update_membership(self, membership_id: UUID, **kwargs) -> Membership | None:
        membership = await self.get_by_id(membership_id)
        if membership:
            for key, value in kwargs.items():
                if hasattr(membership, key) and value is not None:
                    setattr(membership, key, value)
            await self.session.commit()
        return membership

    async def remove_membership(self, membership_id: UUID) -> bool:
        membership = await self.get_by_id(membership_id)
        if membership:
            membership.is_active = False
            await self.session.commit()
            return True
        return False


class RoleRepository(BaseRepository[Role]):
    def __init__(self, session: AsyncSession):
        super().__init__(Role, session)

    async def create_role(self, organization_id, name, description=None, permissions=None) -> Role:
        role = Role(
            organization_id=str(organization_id),
            name=name,
            description=description,
            permissions=permissions or [],
        )
        self.session.add(role)
        await self.session.commit()
        return role

    async def get_organization_roles(self, org_id: str) -> list[Role]:
        result = await self.session.execute(
            select(Role).where(Role.organization_id == org_id).order_by(Role.name)
        )
        return list(result.scalars().all())

    async def get_by_name(self, org_id: str, name: str) -> Role | None:
        result = await self.session.execute(
            select(Role).where(and_(Role.organization_id == org_id, Role.name == name))
        )
        return result.scalar_one_or_none()


class InvitationRepository(BaseRepository[Invitation]):
    def __init__(self, session: AsyncSession):
        super().__init__(Invitation, session)

    async def create_invitation(
        self, email, organization_id, tenant_id, role, invited_by, token, expires_in_hours=48
    ) -> Invitation:
        invitation = Invitation(
            email=email,
            organization_id=str(organization_id),
            tenant_id=str(tenant_id),
            role=role,
            invited_by=invited_by,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=expires_in_hours),
        )
        self.session.add(invitation)
        await self.session.commit()
        return invitation

    async def get_by_token(self, token: str) -> Invitation | None:
        result = await self.session.execute(
            select(Invitation).where(
                and_(
                    Invitation.token == token,
                    Invitation.status == "pending",
                    Invitation.expires_at > datetime.now(timezone.utc),
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_pending_invitations(self, org_id: str) -> list[Invitation]:
        result = await self.session.execute(
            select(Invitation).where(
                and_(
                    Invitation.organization_id == org_id,
                    Invitation.status == "pending",
                )
            ).order_by(Invitation.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_status(self, invitation_id: UUID, status: str):
        invitation = await self.get_by_id(invitation_id)
        if invitation:
            invitation.status = status
            if status == "accepted":
                invitation.accepted_at = datetime.now(timezone.utc)
            await self.session.commit()


class GatewayAPIKeyRepository(BaseRepository[GatewayAPIKey]):
    def __init__(self, session: AsyncSession):
        super().__init__(GatewayAPIKey, session)

    async def create_api_key(
        self, organization_id, tenant_id, user_id, name, key_prefix, key_hash,
        scopes=None, rate_limit=1000, daily_quota=10000, expires_at=None
    ) -> GatewayAPIKey:
        api_key = GatewayAPIKey(
            organization_id=str(organization_id),
            tenant_id=str(tenant_id),
            user_id=user_id,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            scopes=scopes or [],
            rate_limit=rate_limit,
            daily_quota=daily_quota,
            expires_at=expires_at,
        )
        self.session.add(api_key)
        await self.session.commit()
        return api_key

    async def get_by_key_hash(self, key_hash: str) -> GatewayAPIKey | None:
        result = await self.session.execute(
            select(GatewayAPIKey).where(
                and_(GatewayAPIKey.key_hash == key_hash, GatewayAPIKey.is_active == True)
            )
        )
        return result.scalar_one_or_none()

    async def get_tenant_api_keys(self, tenant_id: str) -> list[GatewayAPIKey]:
        result = await self.session.execute(
            select(GatewayAPIKey)
            .where(and_(GatewayAPIKey.tenant_id == tenant_id, GatewayAPIKey.is_active == True))
            .order_by(GatewayAPIKey.created_at.desc())
        )
        return list(result.scalars().all())

    async def revoke_api_key(self, key_id: UUID) -> bool:
        key = await self.get_by_id(key_id)
        if key:
            key.is_active = False
            await self.session.commit()
            return True
        return False

    async def update_last_used(self, key_id: UUID):
        key = await self.get_by_id(key_id)
        if key:
            key.last_used_at = datetime.now(timezone.utc)
            await self.session.commit()


class TenantUsageRepository(BaseRepository[TenantUsage]):
    def __init__(self, session: AsyncSession):
        super().__init__(TenantUsage, session)

    async def record_usage(
        self, tenant_id, api_calls=0, conversions=0, storage_bytes=0, bandwidth_bytes=0, active_users=0
    ) -> TenantUsage:
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        existing = await self.session.execute(
            select(TenantUsage).where(
                and_(TenantUsage.tenant_id == tenant_id, TenantUsage.date == today)
            )
        )
        usage = existing.scalar_one_or_none()

        if usage:
            usage.api_calls += api_calls
            usage.conversions += conversions
            usage.storage_bytes = max(usage.storage_bytes, storage_bytes)
            usage.bandwidth_bytes += bandwidth_bytes
            usage.active_users = max(usage.active_users, active_users)
        else:
            usage = TenantUsage(
                tenant_id=str(tenant_id),
                date=today,
                api_calls=api_calls,
                conversions=conversions,
                storage_bytes=storage_bytes,
                bandwidth_bytes=bandwidth_bytes,
                active_users=active_users,
            )
            self.session.add(usage)

        await self.session.commit()
        return usage

    async def get_usage_summary(self, tenant_id: str, days: int = 30) -> dict:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self.session.execute(
            select(
                func.sum(TenantUsage.api_calls).label("total_api_calls"),
                func.sum(TenantUsage.conversions).label("total_conversions"),
                func.sum(TenantUsage.bandwidth_bytes).label("total_bandwidth"),
                func.max(TenantUsage.storage_bytes).label("max_storage"),
            ).where(
                and_(TenantUsage.tenant_id == tenant_id, TenantUsage.date >= cutoff)
            )
        )
        row = result.one()
        return {
            "total_api_calls": row.total_api_calls or 0,
            "total_conversions": row.total_conversions or 0,
            "total_storage_bytes": row.max_storage or 0,
            "total_bandwidth_bytes": row.total_bandwidth or 0,
        }


class TenantAuditLogRepository(BaseRepository[TenantAuditLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(TenantAuditLog, session)

    async def log_action(
        self, tenant_id, user_id, action, resource_type, resource_id=None,
        changes=None, ip_address=None, user_agent=None, status="success"
    ) -> TenantAuditLog:
        log = TenantAuditLog(
            tenant_id=str(tenant_id),
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            changes=changes or {},
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
        )
        self.session.add(log)
        await self.session.commit()
        return log

    async def get_tenant_logs(
        self, tenant_id: str, action: str = None, page: int = 1, page_size: int = 20
    ) -> tuple[list[TenantAuditLog], int]:
        query = select(TenantAuditLog).where(TenantAuditLog.tenant_id == tenant_id)
        if action:
            query = query.where(TenantAuditLog.action == action)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(TenantAuditLog.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        return list(result.scalars().all()), total
