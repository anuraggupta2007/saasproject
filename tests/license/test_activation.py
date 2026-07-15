import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.modules.license.models.activation import Activation, ActivationStatus
from src.modules.license.models.device import Device


@pytest.fixture
def mock_session():
    return AsyncMock()


class TestActivation:
    def test_activation_status_enum(self):
        assert ActivationStatus.ACTIVE == "active"
        assert ActivationStatus.INACTIVE == "inactive"
        assert ActivationStatus.EXPIRED == "expired"
        assert ActivationStatus.REVOKED == "revoked"

    def test_activation_creation(self):
        activation = Activation(
            license_id=uuid.uuid4(),
            device_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            status=ActivationStatus.ACTIVE,
        )

        assert activation.status == ActivationStatus.ACTIVE
        assert activation.license_id is not None
        assert activation.device_id is not None
        assert activation.user_id is not None

    def test_device_creation(self):
        device = Device(
            user_id=uuid.uuid4(),
            fingerprint="abc-123-def-456",
            device_name="Test Device",
            device_type="desktop",
            os_type="Windows",
            os_version="11",
        )

        assert device.fingerprint == "abc-123-def-456"
        assert device.is_active is True


class TestActivationWorkflow:
    @pytest.mark.asyncio
    async def test_activation_flow(self, mock_session):
        from src.modules.license.services.activation_service import ActivationService

        service = ActivationService(mock_session)

        mock_license = MagicMock()
        mock_license.id = uuid.uuid4()
        mock_license.status = "active"
        mock_license.expires_at = None
        mock_license.max_activations = 3
        mock_license.user_id = uuid.uuid4()

        mock_device = MagicMock()
        mock_device.id = uuid.uuid4()

        mock_activation = MagicMock()
        mock_activation.id = uuid.uuid4()
        mock_activation.status = ActivationStatus.ACTIVE

        service.license_repo.get_by_key = AsyncMock(return_value=mock_license)
        service.activation_repo.count_active_by_license = AsyncMock(return_value=1)
        service.device_repo.get_or_create_device = AsyncMock(return_value=mock_device)
        service.activation_repo.get_by_license_and_device = AsyncMock(return_value=None)
        service.session.add = MagicMock()
        service.session.commit = AsyncMock()
        service.session.refresh = AsyncMock()
        service.license_repo.increment_activations = AsyncMock()
        service.activation_repo.update_validation_token = AsyncMock()
        service.audit_repo.log = AsyncMock()

        with patch("src.modules.license.services.activation_service.license_crypto") as mock_crypto:
            mock_crypto.encrypt_license_key.return_value = "encrypted"
            mock_crypto.generate_validation_token.return_value = "token"

            result = await service.activate_license(
                license_key="test-key",
                device_fingerprint="test-fingerprint",
            )

            assert result["success"] is True

    @pytest.mark.asyncio
    async def test_deactivation_flow(self, mock_session):
        from src.modules.license.services.activation_service import ActivationService

        service = ActivationService(mock_session)

        mock_activation = MagicMock()
        mock_activation.id = uuid.uuid4()
        mock_activation.user_id = uuid.uuid4()
        mock_activation.license_id = uuid.uuid4()
        mock_activation.status = ActivationStatus.ACTIVE

        service.activation_repo.get_by_id = AsyncMock(return_value=mock_activation)
        service.activation_repo.deactivate_by_id = AsyncMock(return_value=mock_activation)
        service.license_repo.decrement_activations = AsyncMock()
        service.audit_repo.log = AsyncMock()

        result = await service.deactivate_license(
            activation_id=mock_activation.id,
            user_id=mock_activation.user_id,
        )

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_max_activations_enforced(self, mock_session):
        from src.modules.license.services.activation_service import ActivationService

        service = ActivationService(mock_session)

        mock_license = MagicMock()
        mock_license.id = uuid.uuid4()
        mock_license.status = "active"
        mock_license.expires_at = None
        mock_license.max_activations = 1
        mock_license.user_id = uuid.uuid4()

        service.license_repo.get_by_key = AsyncMock(return_value=mock_license)
        service.activation_repo.count_active_by_license = AsyncMock(return_value=1)

        with patch("src.modules.license.services.activation_service.license_crypto") as mock_crypto:
            mock_crypto.encrypt_license_key.return_value = "encrypted"

            result = await service.activate_license(
                license_key="test-key",
                device_fingerprint="test-fingerprint",
            )

            assert result["success"] is False
            assert "Maximum activations" in result["message"]
