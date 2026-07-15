import enum
import secrets
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, DateTime, Boolean, Integer, Text, JSON, Index, ForeignKey, LargeBinary
)
from sqlalchemy.orm import relationship
from src.models.base import Base, BaseModelMixin


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


class MFAMethod(str, enum.Enum):
    TOTP = "totp"
    EMAIL = "email"
    SMS = "sms"


class SecurityEventType(str, enum.Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_RESET_REQUESTED = "password_reset_requested"
    PASSWORD_RESET_COMPLETED = "password_reset_completed"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    MFA_VERIFICATION_SUCCESS = "mfa_verification_success"
    MFA_VERIFICATION_FAILED = "mfa_verification_failed"
    SESSION_CREATED = "session_created"
    SESSION_REVOKED = "session_revoked"
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"
    TRUSTED_DEVICE_ADDED = "trusted_device_added"
    TRUSTED_DEVICE_REMOVED = "trusted_device_removed"
    PERMISSION_DENIED = "permission_denied"
    RATE_LIMIT_HIT = "rate_limit_hit"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    MAGIC_LINK_SENT = "magic_link_sent"
    MAGIC_LINK_USED = "magic_link_used"


class AuditAction(str, enum.Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    DOWNLOAD = "download"
    UPLOAD = "upload"
    CONVERT = "convert"
    ADMIN_ACTION = "admin_action"


class SecuritySession(Base, BaseModelMixin):
    __tablename__ = "security_sessions"

    user_id = Column(String(36), nullable=False, index=True)
    token_jti = Column(String(36), unique=True, nullable=False, index=True)
    refresh_token_jti = Column(String(36), unique=True, index=True)
    status = Column(String(20), default=SessionStatus.ACTIVE.value, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    device_fingerprint = Column(String(64))
    device_name = Column(String(255))
    location_country = Column(String(2))
    location_city = Column(String(255))
    last_activity_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True))
    revoke_reason = Column(String(255))
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("ix_security_sessions_user_status", "user_id", "status"),
    )


class APIKey(Base, BaseModelMixin):
    __tablename__ = "security_api_keys"

    user_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    key_prefix = Column(String(8), nullable=False)
    key_hash = Column(String(255), nullable=False)
    scopes = Column(JSON, default=list)
    rate_limit = Column(Integer, default=1000)
    daily_quota = Column(Integer, default=10000)
    expires_at = Column(DateTime(timezone=True))
    last_used_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("ix_security_api_keys_user_active", "user_id", "is_active"),
    )


class SecurityEvent(Base, BaseModelMixin):
    __tablename__ = "security_events"

    user_id = Column(String(36), index=True)
    event_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    resource = Column(String(255))
    details = Column(JSON, default=dict)
    blocked = Column(Boolean, default=False)
    correlation_id = Column(String(36), index=True)

    __table_args__ = (
        Index("ix_security_events_user_type", "user_id", "event_type"),
        Index("ix_security_events_created", "created_at"),
    )


class TrustedDevice(Base, BaseModelMixin):
    __tablename__ = "security_trusted_devices"

    user_id = Column(String(36), nullable=False, index=True)
    device_fingerprint = Column(String(64), nullable=False)
    device_name = Column(String(255))
    device_type = Column(String(50))
    browser = Column(String(100))
    os = Column(String(100))
    ip_address = Column(String(45))
    last_seen_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    trusted_until = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        Index("ix_trusted_devices_user_fingerprint", "user_id", "device_fingerprint", unique=True),
    )


class MFASecret(Base, BaseModelMixin):
    __tablename__ = "security_mfa_secrets"

    user_id = Column(String(36), unique=True, nullable=False, index=True)
    method = Column(String(20), nullable=False)
    secret_encrypted = Column(LargeBinary, nullable=False)
    backup_codes_encrypted = Column(LargeBinary)
    enabled = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True))
    last_used_at = Column(DateTime(timezone=True))
    failed_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True))


class AuditLog(Base, BaseModelMixin):
    __tablename__ = "security_audit_logs"

    user_id = Column(String(36), index=True)
    action = Column(String(50), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(36))
    changes = Column(JSON, default=dict)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    status = Column(String(20), default="success")
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("ix_audit_logs_user_action", "user_id", "action"),
        Index("ix_audit_logs_resource", "resource_type", "resource_id"),
        Index("ix_audit_logs_created", "created_at"),
    )


class PasswordHistory(Base, BaseModelMixin):
    __tablename__ = "security_password_history"

    user_id = Column(String(36), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    __table_args__ = (
        Index("ix_password_history_user", "user_id"),
    )


class RateLimitEntry(Base, BaseModelMixin):
    __tablename__ = "security_rate_limits"

    key = Column(String(255), nullable=False, index=True)
    window = Column(String(50), nullable=False)
    count = Column(Integer, default=1)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_rate_limits_key_window", "key", "window", unique=True),
    )


class MagicLink(Base, BaseModelMixin):
    __tablename__ = "security_magic_links"

    user_id = Column(String(36), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, unique=True)
    email = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    used_at = Column(DateTime(timezone=True))
    ip_address = Column(String(45))


class LoginAttempt(Base, BaseModelMixin):
    __tablename__ = "security_login_attempts"

    email = Column(String(255), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    success = Column(Boolean, default=False)
    failure_reason = Column(String(255))
    user_agent = Column(Text)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("ix_login_attempts_email_ip", "email", "ip_address"),
        Index("ix_login_attempts_created", "created_at"),
    )
