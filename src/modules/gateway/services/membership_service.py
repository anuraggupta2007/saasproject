import secrets
import hashlib
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.datetime_utils import ensure_utc
from src.core.logging import get_logger
from src.modules.gateway.models.gateway import Role, Membership, Invitation, Organization
from src.modules.gateway.repositories.gateway import (
    MembershipRepository,
    InvitationRepository,
    RoleRepository,
    GatewayAPIKeyRepository,
)

logger = get_logger(__name__)


class MembershipService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.membership_repo = MembershipRepository(session)
        self.invitation_repo = InvitationRepository(session)
        self.role_repo = RoleRepository(session)
        self.api_key_repo = GatewayAPIKeyRepository(session)

    async def invite_user(
        self, org_id: UUID, tenant_id: UUID, email: str, role: str, invited_by: str
    ) -> dict:
        membership = await self.membership_repo.get_user_membership(invited_by, str(org_id))
        if not membership or membership.role not in ("owner", "admin", "manager"):
            return {"success": False, "message": "Insufficient permissions to invite"}

        existing_members = await self.membership_repo.get_tenant_members(str(tenant_id))
        for m in existing_members:
            if m.user_id == invited_by:
                continue

        token = secrets.token_urlsafe(32)

        invitation = await self.invitation_repo.create_invitation(
            email=email,
            organization_id=org_id,
            tenant_id=tenant_id,
            role=role,
            invited_by=invited_by,
            token=token,
        )

        logger.info(
            "user_invited",
            extra={"email": email, "org_id": str(org_id), "invited_by": invited_by},
        )

        return {
            "success": True,
            "invitation": invitation,
            "token": token,
        }

    async def accept_invitation(self, token: str, user_id: str) -> dict:
        invitation = await self.invitation_repo.get_by_token(token)
        if not invitation:
            return {"success": False, "message": "Invalid or expired invitation"}

        existing = await self.membership_repo.get_user_membership(user_id, invitation.organization_id)
        if existing:
            return {"success": False, "message": "Already a member of this organization"}

        membership = await self.membership_repo.create_membership(
            user_id=user_id,
            organization_id=invitation.organization_id,
            tenant_id=invitation.tenant_id,
            role=invitation.role,
            invited_by=invitation.invited_by,
        )

        await self.invitation_repo.update_status(invitation.id, "accepted")

        logger.info(
            "invitation_accepted",
            extra={"email": invitation.email, "org_id": invitation.organization_id},
        )

        return {"success": True, "membership": membership}

    async def get_tenant_members(self, tenant_id: UUID) -> list[dict]:
        members = await self.membership_repo.get_tenant_members(str(tenant_id))
        return [
            {
                "id": str(m.id),
                "user_id": m.user_id,
                "role": m.role,
                "is_active": m.is_active,
                "joined_at": m.joined_at.isoformat(),
                "permissions": m.permissions,
            }
            for m in members
        ]

    async def update_member_role(
        self, membership_id: UUID, user_id: str, new_role: str
    ) -> dict:
        membership = await self.membership_repo.get_by_id(membership_id)
        if not membership:
            return {"success": False, "message": "Membership not found"}

        admin_membership = await self.membership_repo.get_user_membership(
            user_id, membership.organization_id
        )
        if not admin_membership or admin_membership.role not in ("owner", "admin"):
            return {"success": False, "message": "Insufficient permissions"}

        old_role = membership.role
        updated = await self.membership_repo.update_membership(membership_id, role=new_role)

        logger.info(
            "member_role_changed",
            extra={
                "membership_id": str(membership_id),
                "old_role": old_role,
                "new_role": new_role,
                "changed_by": user_id,
            },
        )

        return {"success": True, "membership": updated}

    async def remove_member(self, membership_id: UUID, user_id: str) -> dict:
        membership = await self.membership_repo.get_by_id(membership_id)
        if not membership:
            return {"success": False, "message": "Membership not found"}

        if membership.role == "owner":
            return {"success": False, "message": "Cannot remove organization owner"}

        admin_membership = await self.membership_repo.get_user_membership(
            user_id, membership.organization_id
        )
        if not admin_membership or admin_membership.role not in ("owner", "admin"):
            return {"success": False, "message": "Insufficient permissions"}

        removed = await self.membership_repo.remove_membership(membership_id)

        logger.info(
            "member_removed",
            extra={"membership_id": str(membership_id), "removed_by": user_id},
        )

        return {"success": True, "removed": removed}

    async def get_pending_invitations(self, org_id: UUID) -> list[dict]:
        invitations = await self.invitation_repo.get_pending_invitations(str(org_id))
        return [
            {
                "id": str(i.id),
                "email": i.email,
                "role": i.role,
                "status": i.status,
                "expires_at": i.expires_at.isoformat(),
                "created_at": i.created_at.isoformat(),
            }
            for i in invitations
        ]

    async def revoke_invitation(self, invitation_id: UUID, user_id: str) -> dict:
        invitation = await self.invitation_repo.get_by_id(invitation_id)
        if not invitation:
            return {"success": False, "message": "Invitation not found"}

        membership = await self.membership_repo.get_user_membership(
            user_id, invitation.organization_id
        )
        if not membership or membership.role not in ("owner", "admin"):
            return {"success": False, "message": "Insufficient permissions"}

        await self.invitation_repo.update_status(invitation_id, "revoked")

        return {"success": True, "revoked": True}

    async def create_role(
        self, org_id: UUID, name: str, user_id: str, description: str = None, permissions: list = None
    ) -> dict:
        membership = await self.membership_repo.get_user_membership(user_id, str(org_id))
        if not membership or membership.role not in ("owner", "admin"):
            return {"success": False, "message": "Insufficient permissions"}

        existing = await self.role_repo.get_by_name(str(org_id), name)
        if existing:
            return {"success": False, "message": "Role name already exists"}

        role = await self.role_repo.create_role(org_id, name, description, permissions)

        return {"success": True, "role": role}

    async def get_organization_roles(self, org_id: UUID) -> list[Role]:
        return await self.role_repo.get_organization_roles(str(org_id))

    async def create_api_key(
        self, org_id: UUID, tenant_id: UUID, user_id: str, name: str,
        scopes: list = None, rate_limit: int = 1000, daily_quota: int = 10000,
        expires_in_days: int = None
    ) -> dict:
        raw_key = f"gk_{secrets.token_urlsafe(32)}"
        key_prefix = raw_key[:8]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        expires_at = None
        if expires_in_days:
            expires_at = datetime.now(timezone.utc) + __import__("datetime").timedelta(days=expires_in_days)

        api_key = await self.api_key_repo.create_api_key(
            organization_id=org_id,
            tenant_id=tenant_id,
            user_id=user_id,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            scopes=scopes,
            rate_limit=rate_limit,
            daily_quota=daily_quota,
            expires_at=expires_at,
        )

        return {
            "success": True,
            "api_key": raw_key,
            "key_id": str(api_key.id),
            "name": name,
        }

    async def validate_api_key(self, api_key: str) -> dict | None:
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        key = await self.api_key_repo.get_by_key_hash(key_hash)
        if not key:
            return None

        if key.expires_at and ensure_utc(key.expires_at) < datetime.now(timezone.utc):
            return None

        await self.api_key_repo.update_last_used(key.id)

        return {
            "user_id": key.user_id,
            "organization_id": key.organization_id,
            "tenant_id": key.tenant_id,
            "key_id": str(key.id),
            "scopes": key.scopes,
            "rate_limit": key.rate_limit,
            "daily_quota": key.daily_quota,
        }

    async def revoke_api_key(self, key_id: UUID, user_id: str) -> dict:
        key = await self.api_key_repo.get_by_id(key_id)
        if not key:
            return {"success": False, "message": "API key not found"}

        membership = await self.membership_repo.get_user_membership(
            user_id, key.organization_id
        )
        if not membership or membership.role not in ("owner", "admin"):
            return {"success": False, "message": "Insufficient permissions"}

        revoked = await self.api_key_repo.revoke_api_key(key_id)
        return {"success": True, "revoked": revoked}

    async def get_tenant_api_keys(self, tenant_id: UUID) -> list[dict]:
        keys = await self.api_key_repo.get_tenant_api_keys(str(tenant_id))
        return [
            {
                "id": str(k.id),
                "name": k.name,
                "key_prefix": k.key_prefix,
                "scopes": k.scopes,
                "rate_limit": k.rate_limit,
                "daily_quota": k.daily_quota,
                "is_active": k.is_active,
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
                "expires_at": k.expires_at.isoformat() if k.expires_at else None,
                "created_at": k.created_at.isoformat(),
            }
            for k in keys
        ]
