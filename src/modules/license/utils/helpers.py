import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from src.modules.license.models.license import LicenseType


def calculate_expiry(license_type: LicenseType, trial_days: Optional[int] = None) -> Optional[datetime]:
    now = datetime.now(timezone.utc)

    if license_type == LicenseType.TRIAL:
        days = trial_days or 7
        return now + timedelta(days=days)
    elif license_type == LicenseType.PERSONAL:
        return now + timedelta(days=365)
    elif license_type == LicenseType.PROFESSIONAL:
        return now + timedelta(days=365)
    elif license_type == LicenseType.ENTERPRISE:
        return now + timedelta(days=365)
    elif license_type == LicenseType.LIFETIME:
        return now + timedelta(days=36500)
    elif license_type == LicenseType.SUBSCRIPTION:
        return now + timedelta(days=30)
    else:
        return None


def get_max_activations(license_type: LicenseType) -> int:
    limits = {
        LicenseType.TRIAL: 1,
        LicenseType.PERSONAL: 1,
        LicenseType.PROFESSIONAL: 3,
        LicenseType.ENTERPRISE: 999,
        LicenseType.LIFETIME: 5,
        LicenseType.SUBSCRIPTION: 3,
        LicenseType.CUSTOM: 1,
    }
    return limits.get(license_type, 1)


def get_trial_features() -> dict:
    return {
        "max_upload_size_mb": 10,
        "max_conversions_per_day": 50,
        "batch_conversion": False,
        "background_jobs": True,
        "api_access": False,
        "cloud_storage": False,
        "priority_support": False,
    }


def get_personal_features() -> dict:
    return {
        "max_upload_size_mb": 100,
        "max_conversions_per_day": 500,
        "batch_conversion": True,
        "background_jobs": True,
        "api_access": False,
        "cloud_storage": False,
        "priority_support": False,
    }


def get_professional_features() -> dict:
    return {
        "max_upload_size_mb": 1024,
        "max_conversions_per_day": 5000,
        "batch_conversion": True,
        "background_jobs": True,
        "api_access": True,
        "cloud_storage": True,
        "priority_support": True,
    }


def get_enterprise_features() -> dict:
    return {
        "max_upload_size_mb": 10240,
        "max_conversions_per_day": -1,
        "batch_conversion": True,
        "background_jobs": True,
        "api_access": True,
        "cloud_storage": True,
        "priority_support": True,
    }


def get_features_for_type(license_type: LicenseType) -> dict:
    feature_map = {
        LicenseType.TRIAL: get_trial_features,
        LicenseType.PERSONAL: get_personal_features,
        LicenseType.PROFESSIONAL: get_professional_features,
        LicenseType.ENTERPRISE: get_enterprise_features,
        LicenseType.LIFETIME: get_enterprise_features,
        LicenseType.SUBSCRIPTION: get_personal_features,
        LicenseType.CUSTOM: get_personal_features,
    }

    func = feature_map.get(license_type, get_personal_features)
    return func()


def format_license_key(plain_key: str) -> str:
    parts = plain_key.split("-")
    return "-".join(parts)


def validate_license_key_format(license_key: str) -> bool:
    import re
    pattern = r"^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$"
    return bool(re.match(pattern, license_key.upper()))
