import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from src.modules.admin.services.dashboard_service import AdminDashboardService
from src.modules.admin.services.user_service import AdminUserService
from src.modules.admin.services.audit_service import AdminAuditService, AnnouncementService


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def dashboard_service(mock_session):
    return AdminDashboardService(mock_session)


@pytest.fixture
def user_service(mock_session):
    return AdminUserService(mock_session)


@pytest.fixture
def audit_service(mock_session):
    return AdminAuditService(mock_session)


@pytest.fixture
def announcement_service(mock_session):
    return AnnouncementService(mock_session)


class TestAdminDashboardService:
    @pytest.mark.asyncio
    async def test_get_overview(self, dashboard_service):
        dashboard_service._count_users = AsyncMock(return_value=100)
        dashboard_service._count_active_users = AsyncMock(return_value=80)
        dashboard_service._get_daily_conversions = AsyncMock(return_value=50)
        dashboard_service._get_conversion_success_rate = AsyncMock(return_value=95.5)
        dashboard_service._get_total_revenue = AsyncMock(return_value=10000.0)
        dashboard_service._get_storage_usage = AsyncMock(return_value=500.0)

        mock_license_repo = MagicMock()
        mock_license_repo.count_by_status = AsyncMock(return_value={"active": 50})
        mock_activation_repo = MagicMock()
        mock_activation_repo.count_all_active = AsyncMock(return_value=10)
        mock_job_repo = MagicMock()
        mock_job_repo.count_by_status = AsyncMock(return_value={"completed": 40, "failed": 5})

        with patch(
            "src.modules.license.repositories.license.LicenseRepository",
            return_value=mock_license_repo,
        ), patch(
            "src.modules.license.repositories.activation.ActivationRepository",
            return_value=mock_activation_repo,
        ), patch(
            "src.modules.conversion.repositories.conversion.ConversionJobRepository",
            return_value=mock_job_repo,
        ):
            overview = await dashboard_service.get_overview()

        assert "total_users" in overview
        assert "active_users" in overview
        assert "daily_conversions" in overview

    @pytest.mark.asyncio
    async def test_get_system_health(self, dashboard_service):
        health = await dashboard_service.get_system_health()

        assert "api_status" in health
        assert "database_status" in health
        assert "redis_status" in health
        assert "cpu_usage" in health
        assert "memory_usage" in health


class TestAdminUserService:
    @pytest.mark.asyncio
    async def test_create_admin(self, user_service):
        from src.modules.admin.models.admin import AdminRole

        mock_admin = MagicMock()
        mock_admin.id = uuid.uuid4()
        mock_admin.role = AdminRole.ADMIN

        user_service.admin_repo.create = AsyncMock(return_value=mock_admin)

        admin = await user_service.create_admin(
            user_id=uuid.uuid4(),
            role=AdminRole.ADMIN,
            permissions=["users.read"],
        )

        assert admin is not None
        user_service.admin_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_check_permission_super_admin(self, user_service):
        from src.modules.admin.models.admin import AdminRole

        mock_admin = MagicMock()
        mock_admin.role = AdminRole.SUPER_ADMIN
        mock_admin.is_active = True

        user_service.admin_repo.get_by_user_id = AsyncMock(return_value=mock_admin)

        has_permission = await user_service.check_permission(
            uuid.uuid4(),
            "any.permission",
        )

        assert has_permission is True

    @pytest.mark.asyncio
    async def test_check_permission_regular_admin(self, user_service):
        from src.modules.admin.models.admin import AdminRole

        mock_admin = MagicMock()
        mock_admin.role = AdminRole.ADMIN
        mock_admin.is_active = True
        mock_admin.permissions = ["users.read", "users.suspend"]

        user_service.admin_repo.get_by_user_id = AsyncMock(return_value=mock_admin)

        has_permission = await user_service.check_permission(
            uuid.uuid4(),
            "users.read",
        )

        assert has_permission is True

    @pytest.mark.asyncio
    async def test_suspend_user(self, user_service):
        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()
        mock_user.is_active = True

        user_service.get_user_details = AsyncMock(return_value=mock_user)
        user_service.session.commit = AsyncMock()

        success = await user_service.suspend_user(mock_user.id)

        assert success is True
        assert mock_user.is_active is False

    @pytest.mark.asyncio
    async def test_delete_user(self, user_service):
        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()

        user_service.get_user_details = AsyncMock(return_value=mock_user)
        user_service.session.delete = AsyncMock()
        user_service.session.commit = AsyncMock()

        success = await user_service.delete_user(mock_user.id)

        assert success is True


class TestAdminAuditService:
    @pytest.mark.asyncio
    async def test_log_admin_action(self, audit_service):
        mock_event = MagicMock()
        mock_event.id = uuid.uuid4()

        audit_service.event_repo.create = AsyncMock(return_value=mock_event)

        event = await audit_service.log_admin_action(
            admin_id=uuid.uuid4(),
            action="suspend_user",
            details={"user_id": "123"},
        )

        assert event is not None
        audit_service.event_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_log_security_event(self, audit_service):
        mock_event = MagicMock()
        mock_event.id = uuid.uuid4()

        audit_service.event_repo.create = AsyncMock(return_value=mock_event)

        event = await audit_service.log_security_event(
            event_type="login_failed",
            message="Failed login attempt",
            severity="warning",
        )

        assert event is not None


class TestAnnouncementService:
    @pytest.mark.asyncio
    async def test_create_announcement(self, announcement_service):
        mock_announcement = MagicMock()
        mock_announcement.id = uuid.uuid4()
        mock_announcement.title = "Test Announcement"

        announcement_service.announcement_repo.create = AsyncMock(return_value=mock_announcement)

        announcement = await announcement_service.create_announcement(
            title="Test Announcement",
            message="This is a test",
        )

        assert announcement is not None
        announcement_service.announcement_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_broadcast_notification(self, announcement_service):
        mock_announcement = MagicMock()
        mock_announcement.id = uuid.uuid4()

        announcement_service.announcement_repo.create = AsyncMock(return_value=mock_announcement)

        result = await announcement_service.broadcast_notification(
            title="System Alert",
            message="Important update",
        )

        assert result["success"] is True
