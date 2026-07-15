import uuid
import pytest
from datetime import datetime, timezone, timedelta

from src.modules.license.models.license import License, LicenseType, LicenseStatus
from src.modules.license.models.device import Device
from src.modules.license.models.activation import Activation, ActivationStatus
from src.modules.license.models.plan import Plan, BillingCycle, PlanStatus
from src.modules.license.models.subscription import Subscription, SubscriptionStatus
from src.modules.license.models.feature import Feature, PlanFeature
from src.modules.license.models.audit import AuditLog, AuditAction, AuditSeverity


def test_license_creation():
    license = License(
        user_id=uuid.uuid4(),
        license_key="test-key",
        license_type=LicenseType.PERSONAL,
        status=LicenseStatus.ACTIVE,
        max_activations=1,
        features={"feature1": True},
    )

    assert license.user_id is not None
    assert license.license_type == LicenseType.PERSONAL
    assert license.status == LicenseStatus.ACTIVE
    assert license.max_activations == 1
    assert license.current_activations == 0
    assert license.features == {"feature1": True}


def test_license_trial():
    license = License(
        user_id=uuid.uuid4(),
        license_key="trial-key",
        license_type=LicenseType.TRIAL,
        status=LicenseStatus.ACTIVE,
        is_trial=True,
        trial_days=7,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )

    assert license.is_trial is True
    assert license.trial_days == 7
    assert license.expires_at is not None


def test_device_creation():
    device = Device(
        user_id=uuid.uuid4(),
        fingerprint="abc-123-def-456",
        device_name="Test Device",
        device_type="desktop",
        os_type="Windows",
        os_version="11",
    )

    assert device.fingerprint == "abc-123-def-456"
    assert device.device_name == "Test Device"
    assert device.is_active is True


def test_activation_creation():
    activation = Activation(
        license_id=uuid.uuid4(),
        device_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        status=ActivationStatus.ACTIVE,
    )

    assert activation.status == ActivationStatus.ACTIVE
    assert activation.activated_at is not None


def test_plan_creation():
    plan = Plan(
        name="professional",
        display_name="Professional",
        billing_cycle=BillingCycle.YEARLY,
        price=99.99,
        max_activations=3,
        features={"feature1": True, "feature2": False},
    )

    assert plan.name == "professional"
    assert plan.billing_cycle == BillingCycle.YEARLY
    assert plan.price == 99.99
    assert plan.max_activations == 3


def test_subscription_creation():
    subscription = Subscription(
        user_id=uuid.uuid4(),
        license_id=uuid.uuid4(),
        plan_id=uuid.uuid4(),
        status=SubscriptionStatus.ACTIVE,
        current_period_start=datetime.now(timezone.utc),
        current_period_end=datetime.now(timezone.utc) + timedelta(days=30),
    )

    assert subscription.status == SubscriptionStatus.ACTIVE
    assert subscription.payment_status == "paid"


def test_feature_creation():
    feature = Feature(
        key="max_upload_size",
        name="Maximum Upload Size",
        feature_type="integer",
        default_value=10,
    )

    assert feature.key == "max_upload_size"
    assert feature.feature_type == "integer"
    assert feature.default_value == 10


def test_audit_log_creation():
    log = AuditLog(
        user_id=uuid.uuid4(),
        license_id=uuid.uuid4(),
        action=AuditAction.LICENSE_CREATED,
        severity=AuditSeverity.INFO,
        details={"license_type": "personal"},
    )

    assert log.action == AuditAction.LICENSE_CREATED
    assert log.severity == AuditSeverity.INFO
    assert log.details == {"license_type": "personal"}


def test_license_status_enum():
    assert LicenseStatus.ACTIVE == "active"
    assert LicenseStatus.EXPIRED == "expired"
    assert LicenseStatus.SUSPENDED == "suspended"
    assert LicenseStatus.REVOKED == "revoked"
    assert LicenseStatus.PENDING == "pending"


def test_license_type_enum():
    assert LicenseType.TRIAL == "trial"
    assert LicenseType.PERSONAL == "personal"
    assert LicenseType.PROFESSIONAL == "professional"
    assert LicenseType.ENTERPRISE == "enterprise"
    assert LicenseType.LIFETIME == "lifetime"
    assert LicenseType.SUBSCRIPTION == "subscription"
    assert LicenseType.CUSTOM == "custom"
