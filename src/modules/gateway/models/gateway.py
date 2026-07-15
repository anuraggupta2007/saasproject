import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, DateTime, Boolean, Integer, Float, Text, JSON, Index, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from src.models.base import Base, BaseModelMixin


class TenantPlan(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"


class MembershipRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"
    GUEST = "guest"
    CUSTOM = "custom"


class InvitationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    REVOKED = "revoked"


class Organization(Base, BaseModelMixin):
    __tablename__ = "gateway_organizations"

    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text)
    logo_url = Column(String(500))
    website = Column(String(500))
    owner_id = Column(String(36), nullable=False, index=True)
    plan = Column(String(20), default=TenantPlan.FREE.value)
    settings = Column(JSON, default=dict)
    branding = Column(JSON, default=dict)
    custom_domain = Column(String(255), unique=True)
    is_active = Column(Boolean, default=True)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("ix_gateway_orgs_owner", "owner_id"),
    )


class Tenant(Base, BaseModelMixin):
    __tablename__ = "gateway_tenants"

    organization_id = Column(String(36), ForeignKey("gateway_organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    plan = Column(String(20), default=TenantPlan.FREE.value)
    max_users = Column(Integer, default=5)
    max_storage_gb = Column(Integer, default=5)
    max_api_calls = Column(Integer, default=10000)
    max_conversions = Column(Integer, default=100)
    storage_used_bytes = Column(Integer, default=0)
    api_calls_used = Column(Integer, default=0)
    conversions_used = Column(Integer, default=0)
    billing_email = Column(String(255))
    stripe_customer_id = Column(String(255))
    stripe_subscription_id = Column(String(255))
    is_active = Column(Boolean, default=True)
    settings = Column(JSON, default=dict)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        UniqueConstraint("organization_id", "slug", name="uq_tenant_org_slug"),
    )


class Membership(Base, BaseModelMixin):
    __tablename__ = "gateway_memberships"

    user_id = Column(String(36), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("gateway_organizations.id"), nullable=False, index=True)
    tenant_id = Column(String(36), ForeignKey("gateway_tenants.id"), nullable=False, index=True)
    role = Column(String(20), default=MembershipRole.MEMBER.value, nullable=False)
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    invited_by = Column(String(36))
    permissions = Column(JSON, default=list)
    settings = Column(JSON, default=dict)

    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="uq_membership_user_org"),
        UniqueConstraint("user_id", "tenant_id", name="uq_membership_user_tenant"),
    )


class Role(Base, BaseModelMixin):
    __tablename__ = "gateway_roles"

    organization_id = Column(String(36), ForeignKey("gateway_organizations.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    permissions = Column(JSON, default=list)
    is_system = Column(Boolean, default=False)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_role_org_name"),
    )


class Invitation(Base, BaseModelMixin):
    __tablename__ = "gateway_invitations"

    email = Column(String(255), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("gateway_organizations.id"), nullable=False, index=True)
    tenant_id = Column(String(36), ForeignKey("gateway_tenants.id"), nullable=False)
    role = Column(String(20), default=MembershipRole.MEMBER.value)
    invited_by = Column(String(36), nullable=False)
    status = Column(String(20), default=InvitationStatus.PENDING.value)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True))
    metadata_ = Column("metadata", JSON, default=dict)


class GatewayAPIKey(Base, BaseModelMixin):
    __tablename__ = "gateway_api_keys"

    organization_id = Column(String(36), ForeignKey("gateway_organizations.id"), nullable=False, index=True)
    tenant_id = Column(String(36), ForeignKey("gateway_tenants.id"), nullable=False)
    user_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    key_prefix = Column(String(8), nullable=False)
    key_hash = Column(String(255), nullable=False)
    scopes = Column(JSON, default=list)
    rate_limit = Column(Integer, default=1000)
    daily_quota = Column(Integer, default=10000)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True))
    last_used_at = Column(DateTime(timezone=True))
    metadata_ = Column("metadata", JSON, default=dict)


class TenantUsage(Base, BaseModelMixin):
    __tablename__ = "gateway_tenant_usage"

    tenant_id = Column(String(36), ForeignKey("gateway_tenants.id"), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False)
    api_calls = Column(Integer, default=0)
    storage_bytes = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    bandwidth_bytes = Column(Integer, default=0)
    active_users = Column(Integer, default=0)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        UniqueConstraint("tenant_id", "date", name="uq_tenant_usage_date"),
    )


class TenantAuditLog(Base, BaseModelMixin):
    __tablename__ = "gateway_tenant_audit_logs"

    tenant_id = Column(String(36), ForeignKey("gateway_tenants.id"), nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    action = Column(String(50), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(36))
    changes = Column(JSON, default=dict)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    status = Column(String(20), default="success")
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("ix_tenant_audit_tenant_action", "tenant_id", "action"),
        Index("ix_tenant_audit_created", "created_at"),
    )
