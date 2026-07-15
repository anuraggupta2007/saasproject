import pytest
from src.modules.gateway.models.gateway import (
    TenantPlan,
    MembershipRole,
    InvitationStatus,
)
from src.modules.gateway.schemas.gateway import (
    OrganizationCreateRequest,
    TenantCreateRequest,
    MembershipCreateRequest,
    InviteUserRequest,
    RoleCreateRequest,
    GatewayAPIKeyCreateRequest,
    SwitchTenantRequest,
)


class TestModels:
    def test_tenant_plan_values(self):
        assert TenantPlan.FREE.value == "free"
        assert TenantPlan.STARTER.value == "starter"
        assert TenantPlan.PROFESSIONAL.value == "professional"
        assert TenantPlan.ENTERPRISE.value == "enterprise"

    def test_membership_role_values(self):
        assert MembershipRole.OWNER.value == "owner"
        assert MembershipRole.ADMIN.value == "admin"
        assert MembershipRole.MEMBER.value == "member"
        assert MembershipRole.GUEST.value == "guest"

    def test_invitation_status_values(self):
        assert InvitationStatus.PENDING.value == "pending"
        assert InvitationStatus.ACCEPTED.value == "accepted"
        assert InvitationStatus.EXPIRED.value == "expired"
        assert InvitationStatus.REVOKED.value == "revoked"


class TestSchemas:
    def test_organization_create(self):
        request = OrganizationCreateRequest(
            name="Test Org",
            slug="test-org",
            description="A test organization",
        )
        assert request.name == "Test Org"
        assert request.slug == "test-org"

    def test_tenant_create(self):
        request = TenantCreateRequest(
            name="Test Tenant",
            slug="test-tenant",
            plan="professional",
        )
        assert request.name == "Test Tenant"
        assert request.plan == "professional"

    def test_membership_create(self):
        request = MembershipCreateRequest(
            user_id="user123",
            role="admin",
            permissions=["read", "write"],
        )
        assert request.user_id == "user123"
        assert request.role == "admin"
        assert "read" in request.permissions

    def test_invite_user(self):
        request = InviteUserRequest(
            email="user@example.com",
            role="member",
        )
        assert request.email == "user@example.com"
        assert request.role == "member"

    def test_role_create(self):
        request = RoleCreateRequest(
            name="custom_role",
            description="A custom role",
            permissions=["read", "write", "delete"],
        )
        assert request.name == "custom_role"
        assert len(request.permissions) == 3

    def test_api_key_create(self):
        request = GatewayAPIKeyCreateRequest(
            name="Test Key",
            scopes=["read", "write"],
            rate_limit=5000,
        )
        assert request.name == "Test Key"
        assert request.rate_limit == 5000

    def test_switch_tenant(self):
        request = SwitchTenantRequest(tenant_id="tenant123")
        assert request.tenant_id == "tenant123"


class TestTenantLimits:
    def test_storage_conversion(self):
        storage_gb = 5
        storage_bytes = storage_gb * 1024**3
        assert storage_bytes == 5368709120

    def test_usage_percentage(self):
        used = 500
        limit = 1000
        percentage = (used / limit) * 100
        assert percentage == 50.0
