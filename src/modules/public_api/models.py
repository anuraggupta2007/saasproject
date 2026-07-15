from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Column, String, DateTime, Boolean, Integer, JSON, Text, ForeignKey,
    Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from src.models.base import Base


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    key_prefix = Column(String(8), nullable=False, index=True)
    key_hash = Column(String(255), nullable=False, unique=True)
    scopes = Column(JSON, default=list)
    tier = Column(String(20), default="free", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    ip_restrictions = Column(JSON, default=list)
    rate_limit_override = Column(Integer, nullable=True)
    daily_quota_override = Column(Integer, nullable=True)
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_api_key_user_active", "user_id", "is_active"),
    )


class APIKeyUsageLog(Base):
    __tablename__ = "api_key_usage_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Integer, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    request_size_bytes = Column(Integer, nullable=True)
    response_size_bytes = Column(Integer, nullable=True)

    __table_args__ = (
        Index("idx_api_key_usage_timestamp", "api_key_id", "timestamp"),
    )


class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    url = Column(String(2048), nullable=False)
    events = Column(JSON, nullable=False)
    secret = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    description = Column(String(500), nullable=True)
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    webhook_id = Column(UUID(as_uuid=True), ForeignKey("webhooks.id"), nullable=False, index=True)
    event = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    status_code = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    attempts = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=5, nullable=False)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_webhook_delivery_status", "status", "next_retry_at"),
    )


class RateLimit(Base):
    __tablename__ = "rate_limits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=False, index=True)
    window_start = Column(DateTime(timezone=True), nullable=False)
    request_count = Column(Integer, default=0, nullable=False)
    burst_count = Column(Integer, default=0, nullable=False)
    window_type = Column(String(20), default="minute", nullable=False)

    __table_args__ = (
        UniqueConstraint("api_key_id", "window_start", "window_type"),
        Index("idx_rate_limit_window", "api_key_id", "window_type", "window_start"),
    )


class OAuth2Client(Base):
    __tablename__ = "oauth2_clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(String(255), nullable=False, unique=True)
    client_secret_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    redirect_uris = Column(JSON, default=list)
    grant_types = Column(JSON, default=list)
    scopes = Column(JSON, default=list)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class APIAuditLog(Base):
    __tablename__ = "api_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(255), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        Index("idx_audit_action_timestamp", "action", "timestamp"),
    )


class APIVersion(Base):
    __tablename__ = "api_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    version = Column(String(10), nullable=False, unique=True)
    status = Column(String(20), default="active", nullable=False)
    released_at = Column(DateTime(timezone=True), nullable=False)
    deprecated_at = Column(DateTime(timezone=True), nullable=True)
    sunset_at = Column(DateTime(timezone=True), nullable=True)
    changelog = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
