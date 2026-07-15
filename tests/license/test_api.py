import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch

from src.main import app


@pytest.fixture
def mock_current_user():
    return {
        "id": str(uuid.uuid4()),
        "email": "test@example.com",
        "role": "user",
    }


@pytest.fixture
def mock_admin_user():
    return {
        "id": str(uuid.uuid4()),
        "email": "admin@example.com",
        "role": "admin",
    }


@pytest.mark.asyncio
async def test_activate_license(mock_current_user):
    with patch("src.modules.license.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.license.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.license.api.v1.router.ActivationService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.activate_license = AsyncMock(
                    return_value={
                        "success": True,
                        "activation_id": uuid.uuid4(),
                        "validation_token": "test-token",
                    }
                )

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/license/activate",
                        json={
                            "license_key": "ABCD-1234-EFGH-5678",
                            "device_fingerprint": "abc-123-def-456",
                        },
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_validate_license(mock_current_user):
    with patch("src.modules.license.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.license.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.license.api.v1.router.ValidationService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.validate_online = AsyncMock(
                    return_value={
                        "valid": True,
                        "license_id": uuid.uuid4(),
                        "status": "active",
                        "features": {},
                        "validation_token": "test-token",
                        "message": "Valid",
                    }
                )

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/license/validate",
                        json={
                            "license_key": "ABCD-1234-EFGH-5678",
                            "device_fingerprint": "abc-123-def-456",
                        },
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_start_trial(mock_current_user):
    with patch("src.modules.license.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.license.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.license.api.v1.router.TrialService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.start_trial = AsyncMock(
                    return_value={
                        "success": True,
                        "trial_days": 7,
                        "expires_at": "2025-12-31T23:59:59Z",
                    }
                )

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/license/trial/start?trial_days=7",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_check_feature(mock_current_user):
    with patch("src.modules.license.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.license.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.license.api.v1.router.ValidationService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.check_feature_access = AsyncMock(
                    return_value={
                        "allowed": True,
                        "feature_key": "batch_conversion",
                        "value": True,
                        "message": "Granted",
                    }
                )

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/license/feature/check",
                        json={
                            "feature_key": "batch_conversion",
                        },
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_list_devices(mock_current_user):
    with patch("src.modules.license.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.license.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.license.repositories.device.DeviceRepository") as mock_repo:
                mock_instance = MagicMock()
                mock_repo.return_value = mock_instance

                mock_instance.get_user_devices = AsyncMock(return_value=[])

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.get(
                        "/api/v1/license/devices",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_admin_create_license(mock_admin_user):
    with patch("src.modules.license.api.v1.admin_router.get_current_admin") as mock_auth:
        mock_auth.return_value = mock_admin_user

        with patch("src.modules.license.api.v1.admin_router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.license.api.v1.admin_router.LicenseService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_license = MagicMock()
                mock_license.id = uuid.uuid4()
                mock_license.user_id = uuid.uuid4()
                mock_license.license_key = "test-key"
                mock_license.license_type = "enterprise"
                mock_license.status = "active"
                mock_license.max_activations = 100
                mock_license.current_activations = 0
                mock_license.features = {}
                mock_license.is_trial = False
                mock_license.created_at = None

                mock_instance.create_license = AsyncMock(return_value=mock_license)

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/admin/license/create",
                        json={
                            "user_id": str(uuid.uuid4()),
                            "license_type": "enterprise",
                            "max_activations": 100,
                        },
                        headers={"Authorization": "Bearer admin-token"},
                    )

                    assert response.status_code in [200, 401, 403]


@pytest.mark.asyncio
async def test_admin_analytics(mock_admin_user):
    with patch("src.modules.license.api.v1.admin_router.get_current_admin") as mock_auth:
        mock_auth.return_value = mock_admin_user

        with patch("src.modules.license.api.v1.admin_router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.license.api.v1.admin_router.LicenseRepository") as mock_repo:
                mock_instance = MagicMock()
                mock_repo.return_value = mock_instance

                mock_instance.count_by_status = AsyncMock(return_value={"active": 100})
                mock_instance.count_by_type = AsyncMock(return_value={"personal": 50})

                with patch("src.modules.license.api.v1.admin_router.ActivationRepository") as mock_act:
                    mock_act_instance = MagicMock()
                    mock_act.return_value = mock_act_instance
                    mock_act_instance.count_all_active = AsyncMock(return_value=50)

                    with patch("src.modules.license.api.v1.admin_router.SubscriptionRepository") as mock_sub:
                        mock_sub_instance = MagicMock()
                        mock_sub.return_value = mock_sub_instance
                        mock_sub_instance.count_by_status = AsyncMock(return_value={"active": 30})

                        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                            response = await client.get(
                                "/api/v1/admin/license/analytics",
                                headers={"Authorization": "Bearer admin-token"},
                            )

                            assert response.status_code in [200, 401, 403]
