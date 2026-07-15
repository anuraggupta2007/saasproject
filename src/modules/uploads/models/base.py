import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    BigInteger,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.session import Base


class UploadStatus(str, enum.Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class StorageProviderType(str, enum.Enum):
    LOCAL = "local"
    S3 = "s3"
    MINIO = "minio"


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


class Upload(TimestampMixin, Base):
    __tablename__ = "uploads"

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
    original_filename: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    stored_filename: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        unique=True,
        index=True,
    )
    file_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    sha256_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    storage_provider: Mapped[StorageProviderType] = mapped_column(
        Enum(StorageProviderType),
        nullable=False,
        default=StorageProviderType.LOCAL,
    )
    storage_path: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    status: Mapped[UploadStatus] = mapped_column(
        Enum(UploadStatus),
        nullable=False,
        default=UploadStatus.PENDING,
        index=True,
    )
    upload_progress: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        comment="Progress percentage 0-100",
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    metadata_: Mapped[dict | None] = mapped_column(
        "metadata",
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    is_virus_scanned: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    virus_scan_result: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    ip_address: Mapped[str | None] = mapped_column(
        INET().with_variant(String(45), "sqlite"),
        nullable=True,
    )
    user_agent: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    chunks: Mapped[list["UploadChunk"]] = relationship(
        back_populates="upload",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    __table_args__ = (
        Index("idx_upload_user_status", "user_id", "status"),
        Index("idx_upload_hash_user", "sha256_hash", "user_id"),
        Index("idx_upload_created", "created_at"),
    )


class UploadChunk(TimestampMixin, Base):
    __tablename__ = "upload_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    upload_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("uploads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_number: Mapped[int] = mapped_column(
        nullable=False,
    )
    chunk_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    storage_path: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    sha256_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    etag: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    is_uploaded: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    upload_id_storage: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Storage provider multipart upload ID",
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    upload: Mapped[Upload] = relationship(back_populates="chunks")

    __table_args__ = (
        Index("idx_chunk_upload_number", "upload_id", "chunk_number", unique=True),
    )


class UserUploadQuota(TimestampMixin, Base):
    __tablename__ = "user_upload_quotas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        index=True,
        nullable=False,
    )
    max_storage_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=10 * 1024 * 1024 * 1024,  # 10GB default
    )
    used_storage_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0,
    )
    max_uploads: Mapped[int] = mapped_column(
        nullable=False,
        default=1000,
    )
    current_uploads: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
    )
    max_file_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=2 * 1024 * 1024 * 1024,  # 2GB default
    )

    @property
    def storage_remaining(self) -> int:
        return max(0, self.max_storage_bytes - self.used_storage_bytes)

    @property
    def uploads_remaining(self) -> int:
        return max(0, self.max_uploads - self.current_uploads)

    def can_upload(self, file_size: int) -> bool:
        return (
            self.used_storage_bytes + file_size <= self.max_storage_bytes
            and self.current_uploads < self.max_uploads
            and file_size <= self.max_file_size
        )
