import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta

from src.modules.license.services.license_service import LicenseService
from src.modules.license.services.activation_service import ActivationService
from src.modules.license.services.trial_service import TrialService
from src.modules.license.services.validation_service import ValidationService
from src.modules.license.models.license import License, LicenseType, LicenseStatus


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def license_service(mock_session):
    return LicenseService(mock_session)


@pytest.fixture
def activation_service(mock_session):
    return ActivationService(mock_session)


@pytest.fixture
def trial_service(mock_session):
    return TrialService(mock_session)


@pytest.fixture
def validation_service(mock_session):
    return ValidationService(mock_session)


class TestLicenseService:
    @pytest.mark.asyncio
    async def test_create_license(self, license_service):
        user_id = uuid.uuid4()

        mock_license = MagicMock()
        mock_license.id = uuid.uuid4()
        mock_license.user_id = user_id
        mock_license.license_type = LicenseType.PERSONAL
        mock_license.status = LicenseStatus.ACTIVE

        license_service.license_repo.create = AsyncMock(return_value=mock_license)
        license_service.audit_repo.log = AsyncMock(return_value=MagicMock())

        license = await license_service.create_license(
            user_id=user_id,
            license_type=LicenseType.PERSONAL,
            max_activations=1,
        )

        assert license is not None
        license_service.license_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_license(self, license_service):
        from src.modules.license.security.crypto import license_crypto

        license_key = license_crypto.generate_license_key()
        encrypted_key = license_crypto.encrypt_license_key(license_key)

        mock_license = MagicMock()
        mock_license.id = uuid.uuid4()
        mock_license.status = LicenseStatus.ACTIVE
        mock_license.expires_at = datetime.now(timezone.utc) + timedelta(days=365)
        mock_license.features = {"feature1": True}

        license_service.license_repo.get_by_key = AsyncMock(return_value=mock_license)

        result = await license_service.validate_license(
            license_key=license_key,
            device_fingerprint="test-fingerprint",
        )

        assert result["valid"] is True
        assert "validation_token" in result

    @pytest.mark.asyncio
    async def test_suspend_license(self, license_service):
        license_id = uuid.uuid4()

        mock_license = MagicMock()
        mock_license.id = license_id
        mock_license.status = LicenseStatus.SUSPENDED

        license_service.license_repo.update = AsyncMock(return_value=mock_license)
        license_service.audit_repo.log = AsyncMock(return_value=MagicMock())

        license = await license_service.suspend_license(license_id, "Test reason")

        assert license is not None
        assert license.status == LicenseStatus.SUSPENDED

    @pytest.mark.asyncio
    async def test_revoke_license(self, license_service):
        license_id = uuid.uuid4()

        mock_license = MagicMock()
        mock_license.id = license_id
        mock_license.status = LicenseStatus.REVOKED

        license_service.license_repo.update = AsyncMock(return_value=mock_license)
        license_service.audit_repo.log = AsyncMock(return_value=MagicMock())

        license = await license_service.revoke_license(license_id, "Test reason")

        assert license is not None
        assert license.status == LicenseStatus.REVOKED

    @pytest.mark.asyncio
    async def test_renew_license(self, license_service):
        license_id = uuid.uuid4()

        mock_license = MagicMock()
        mock_license.id = license_id
        mock_license.user_id = uuid.uuid4()
        mock_license.expires_at = datetime.now(timezone.utc) + timedelta(days=30)

        license_service.license_repo.get_by_id = AsyncMock(return_value=mock_license)
        license_service.license_repo.update = AsyncMock(return_value=mock_license)
        license_service.audit_repo.log = AsyncMock(return_value=MagicMock())

        license = await license_service.renew_license(license_id, extend_days=365)

        assert license is not None


class TestTrialService:
    @pytest.mark.asyncio
    async def test_start_trial(self, trial_service):
        user_id = uuid.uuid4()

        mock_license = MagicMock()
        mock_license.id = uuid.uuid4()
        mock_license.is_trial = True
        mock_license.trial_days = 7
        mock_license.expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        trial_service.license_repo.create = AsyncMock(return_value=mock_license)
        trial_service.audit_repo.log = AsyncMock(return_value=MagicMock())
        trial_service._get_user_trial = AsyncMock(return_value=None)

        with patch("src.modules.license.services.trial_service.license_crypto") as mock_crypto:
            mock_crypto.decrypt_license_key.return_value = "TEST-KEY-1234-5678"

            result = await trial_service.start_trial(
                user_id=user_id,
                trial_days=7,
                email_verified=True,
            )

            assert result["success"] is True
            assert result["trial_days"] == 7

    @pytest.mark.asyncio
    async def test_check_trial_status(self, trial_service):
        user_id = uuid.uuid4()

        mock_trial = MagicMock()
        mock_trial.is_trial = True
        mock_trial.expires_at = datetime.now(timezone.utc) + timedelta(days=5)
        mock_trial.features = {"feature1": True}

        trial_service._get_user_trial = AsyncMock(return_value=mock_trial)

        result = await trial_service.check_trial_status(user_id)

        assert result["has_trial"] is True
        assert result["expired"] is False
        assert result["remaining_days"] == 5


class TestValidationService:
    @pytest.mark.asyncio
    async def test_check_feature_access(self, validation_service):
        user_id = uuid.uuid4()
        feature_key = "batch_conversion"

        mock_feature = MagicMock()
        mock_feature.key = feature_key
        mock_feature.is_global = False
        mock_feature.default_value = False

        mock_license = MagicMock()
        mock_license.id = uuid.uuid4()
        mock_license.status = LicenseStatus.ACTIVE
        mock_license.expires_at = datetime.now(timezone.utc) + timedelta(days=365)
        mock_license.features = {"batch_conversion": True}
        mock_license.license_type.value = "professional"

        validation_service.feature_repo.get_by_key = AsyncMock(return_value=mock_feature)
        validation_service.license_repo.get_active_license = AsyncMock(return_value=mock_license)

        result = await validation_service.check_feature_access(
            feature_key=feature_key,
            user_id=user_id,
        )

        assert result["allowed"] is True
        assert result["value"] is True

    @pytest.mark.asyncio
    async def test_check_global_feature(self, validation_service):
        user_id = uuid.uuid4()
        feature_key = "global_feature"

        mock_feature = MagicMock()
        mock_feature.key = feature_key
        mock_feature.is_global = True
        mock_feature.default_value = True

        validation_service.feature_repo.get_by_key = AsyncMock(return_value=mock_feature)

        result = await validation_service.check_feature_access(
            feature_key=feature_key,
            user_id=user_id,
        )

        assert result["allowed"] is True
        assert result["message"] == "Global feature"
