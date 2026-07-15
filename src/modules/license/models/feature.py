import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Integer, JSON, Index
from sqlalchemy.dialects.postgresql import UUID

from src.models.base import Base


class Feature(Base):
    __tablename__ = "features"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    feature_type = Column(String(50), default="boolean")
    default_value = Column(JSON, default=False)
    is_global = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_feature_key", "key"),
    )


class PlanFeature(Base):
    __tablename__ = "plan_features"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    feature_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    value = Column(JSON, nullable=False)
    limit_value = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_plan_feature_plan_feature", "plan_id", "feature_id", unique=True),
    )
