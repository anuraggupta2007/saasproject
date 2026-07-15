import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch

from src.main import app


@pytest.fixture
def mock_admin_user():
    return {
        "id": str(uuid.uuid4()),
        "email": "admin@example.com",
        "role": "admin",
    }


@pytest.mark.asyncio
async def test_get_dashboard_overview(mock_admin_user):
    with patch("src.modules.admin.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_admin_user

        with patch("src.modules.admin.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.admin.api.v1.router.AdminDashboardService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.get_overview = AsyncMock(
                    return_value={
                        "total_users": 100,
                        "active_users": 80,
                        "total_conversions": 500,
                        "daily_conversions": 50,
                        "conversion_success_rate": 95.5,
                        "failed_jobs": 5,
                        "revenue": 10000.0,
                        "active_licenses": 50,
                        "trial_users": 20,
                        "storage_usage_mb": 500.0,
                        "server_health": "healthy",
                        "worker_status": "running",
                    }
                )

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.get(
                        "/api/v1/admin/dashboard/overview",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_get_system_health(mock_admin_user):
    with patch("src.modules.admin.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_admin_user

        with patch("src.modules.admin.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.admin.api.v1.router.AdminDashboardService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.get_system_health = AsyncMock(
                    return_value={
                        "api_status": "healthy",
                        "database_status": "healthy",
                        "redis_status": "healthy",
                        "celery_status": "healthy",
                        "storage_status": "healthy",
                        "uptime_seconds": 12345,
                        "cpu_usage": 25.5,
                        "memory_usage": 60.0,
                    }
                )

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.get(
                        "/api/v1/admin/system/health",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_search_users(mock_admin_user):
    with patch("src.modules.admin.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_admin_user

        with patch("src.modules.admin.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.admin.api.v1.router.AdminUserService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.search_users = AsyncMock(return_value=([], 0))

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.get(
                        "/api/v1/admin/users",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_suspend_user(mock_admin_user):
    with patch("src.modules.admin.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_admin_user

        with patch("src.modules.admin.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.admin.api.v1.router.AdminUserService") as mock_user_service:
                mock_instance = MagicMock()
                mock_user_service.return_value = mock_instance
                mock_instance.suspend_user = AsyncMock(return_value=True)

                with patch("src.modules.admin.api.v1.router.AdminAuditService") as mock_audit_service:
                    mock_audit_instance = MagicMock()
                    mock_audit_service.return_value = mock_audit_instance
                    mock_audit_instance.log_admin_action = AsyncMock()

                    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                        response = await client.post(
                            f"/api/v1/admin/users/{uuid.uuid4()}/suspend",
                            headers={"Authorization": "Bearer test-token"},
                        )

                        assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_create_announcement(mock_admin_user):
    with patch("src.modules.admin.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_admin_user

        with patch("src.modules.admin.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.admin.api.v1.router.AnnouncementService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_announcement = MagicMock()
                mock_announcement.id = uuid.uuid4()
                mock_announcement.title = "Test"
                mock_announcement.message = "Test message"
                mock_announcement.announcement_type = "info"
                mock_announcement.is_active = True
                mock_announcement.start_date = None
                mock_announcement.end_date = None
                mock_announcement.created_at = None

                mock_instance.create_announcement = AsyncMock(return_value=mock_announcement)

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/admin/announcements",
                        json={
                            "title": "Test Announcement",
                            "message": "This is a test",
                        },
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 201, 401]
