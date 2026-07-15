import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.session import Base


class ConversionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class OutputFormat(str, enum.Enum):
    EML = "eml"
    HTML = "html"
    PDF = "pdf"
    TXT = "txt"
    JSON = "json"
    CSV = "csv"
    MARKDOWN = "markdown"
    XML = "xml"
    MHTML = "mhtml"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class ConversionJob(TimestampMixin, Base):
    __tablename__ = "conversion_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        index=True,
        nullable=False,
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversion_batches.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mime_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    output_format: Mapped[OutputFormat] = mapped_column(
        Enum(OutputFormat),
        nullable=False,
        index=True,
    )
    status: Mapped[ConversionStatus] = mapped_column(
        Enum(ConversionStatus),
        nullable=False,
        default=ConversionStatus.PENDING,
        index=True,
    )
    progress: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    output_filename: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    output_storage_path: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )
    output_size: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )
    output_hash: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    compression_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    compression_password: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    processing_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    processing_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    processing_duration_ms: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    error_details: Mapped[dict | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    max_retries: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False,
    )
    celery_task_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    options: Mapped[dict | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
        comment="Additional conversion options",
    )
    download_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    batch: Mapped["ConversionBatch | None"] = relationship(
        back_populates="jobs",
    )
    logs: Mapped[list["ConversionLog"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_conversion_job_user_status", "user_id", "status"),
        Index("idx_conversion_job_batch", "batch_id"),
        Index("idx_conversion_job_format", "output_format"),
        Index("idx_conversion_job_created", "created_at"),
    )


class ConversionBatch(TimestampMixin, Base):
    __tablename__ = "conversion_batches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        index=True,
        nullable=False,
    )
    name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    output_format: Mapped[OutputFormat] = mapped_column(
        Enum(OutputFormat),
        nullable=False,
    )
    status: Mapped[ConversionStatus] = mapped_column(
        Enum(ConversionStatus),
        nullable=False,
        default=ConversionStatus.PENDING,
        index=True,
    )
    total_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    completed_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    failed_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    progress: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    output_storage_path: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )
    output_size: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )
    compression_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    processing_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    processing_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    processing_duration_ms: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    options: Mapped[dict | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )

    jobs: Mapped[list[ConversionJob]] = relationship(
        back_populates="batch",
        lazy="dynamic",
    )

    __table_args__ = (
        Index("idx_conversion_batch_user", "user_id"),
        Index("idx_conversion_batch_status", "status"),
    )


class ConversionLog(TimestampMixin, Base):
    __tablename__ = "conversion_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversion_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="info",
    )
    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    details: Mapped[dict | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    duration_ms: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    job: Mapped[ConversionJob] = relationship(back_populates="logs")

    __table_args__ = (
        Index("idx_conversion_log_event", "event_type"),
        Index("idx_conversion_log_severity", "severity"),
    )


class DownloadHistory(TimestampMixin, Base):
    __tablename__ = "download_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversion_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        index=True,
        nullable=False,
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )
    user_agent: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    __table_args__ = (
        Index("idx_download_history_user", "user_id"),
        Index("idx_download_history_job", "job_id"),
    )
