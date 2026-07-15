import uuid
import pytest
from datetime import datetime, timezone, timedelta

from src.modules.license.schemas.license import (
    LicenseCreateRequest,
    LicenseResponse,
    LicenseValidateRequest,
    LicenseValidateResponse,
)
from src.modules.license.schemas.device import (
    DeviceRegisterRequest,
    DeviceResponse,
)
from src.modules.license.schemas.activation import (
    ActivationRequest,
    ActivationResponse,
    DeactivationRequest,
)
from src.modules.license.schemas.plan import (
    PlanCreateRequest,
    PlanResponse,
)
from src.modules.license.schemas.subscription import (
    SubscriptionCreateRequest,
    SubscriptionResponse,
)
from src.modules.license.schemas.feature import (
    FeatureCreateRequest,
    FeatureResponse,
    FeatureCheckRequest,
    FeatureCheckResponse,
)
from src.modules.license.schemas.admin import (
    AdminLicenseCreateRequest,
    AdminAnalyticsResponse,
)


def test_license_create_request():
    request = LicenseCreateRequest(
        user_id=uuid.uuid4(),
        license_type="personal",
        max_activations=1,
        features={"feature1": True},
    )

    assert request.license_type == "personal"
    assert request.max_activations == 1
    assert request.features == {"feature1": True}


def test_license_validate_request():
    request = LicenseValidateRequest(
        license_key="ABCD-1234-EFGH-5678",
        device_fingerprint="abc-123-def-456",
    )

    assert request.license_key == "ABCD-1234-EFGH-5678"
    assert request.device_fingerprint == "abc-123-def-456"


def test_license_validate_response():
    response = LicenseValidateResponse(
        valid=True,
        license_id=uuid.uuid4(),
        status="active",
        expires_at=datetime.now(timezone.utc),
        features={"feature1": True},
        validation_token="test-token",
        message="License is valid",
    )

    assert response.valid is True
    assert response.status == "active"
    assert response.message == "License is valid"


def test_device_register_request():
    request = DeviceRegisterRequest(
        fingerprint="abc-123-def-456",
        device_name="Test Device",
        device_type="desktop",
        os_type="Windows",
        os_version="11",
    )

    assert request.fingerprint == "abc-123-def-456"
    assert request.device_type == "desktop"


def test_activation_request():
    request = ActivationRequest(
        license_key="ABCD-1234-EFGH-5678",
        device_fingerprint="abc-123-def-456",
        device_name="Test Device",
    )

    assert request.license_key == "ABCD-1234-EFGH-5678"
    assert request.device_fingerprint == "abc-123-def-456"


def test_plan_create_request():
    request = PlanCreateRequest(
        name="professional",
        display_name="Professional",
        billing_cycle="yearly",
        price=99.99,
        max_activations=3,
    )

    assert request.name == "professional"
    assert request.billing_cycle == "yearly"
    assert request.price == 99.99


def test_feature_create_request():
    request = FeatureCreateRequest(
        key="max_upload_size",
        name="Maximum Upload Size",
        feature_type="integer",
        default_value=10,
    )

    assert request.key == "max_upload_size"
    assert request.feature_type == "integer"
    assert request.default_value == 10


def test_feature_check_request():
    request = FeatureCheckRequest(
        feature_key="batch_conversion",
        user_id=uuid.uuid4(),
    )

    assert request.feature_key == "batch_conversion"
    assert request.user_id is not None


def test_feature_check_response():
    response = FeatureCheckResponse(
        allowed=True,
        feature_key="batch_conversion",
        value=True,
        message="Feature access granted",
    )

    assert response.allowed is True
    assert response.feature_key == "batch_conversion"


def test_admin_license_create_request():
    request = AdminLicenseCreateRequest(
        user_id=uuid.uuid4(),
        license_type="enterprise",
        max_activations=100,
        features={"all_features": True},
    )

    assert request.license_type == "enterprise"
    assert request.max_activations == 100


def test_admin_analytics_response():
    response = AdminAnalyticsResponse(
        total_licenses=1000,
        active_licenses=800,
        expired_licenses=100,
        suspended_licenses=50,
        revoked_licenses=50,
        total_activations=500,
        active_activations=400,
        total_subscriptions=300,
        active_subscriptions=250,
    )

    assert response.total_licenses == 1000
    assert response.active_licenses == 800
