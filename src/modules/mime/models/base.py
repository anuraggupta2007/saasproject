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
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.session import Base


class ParseStatus(str, enum.Enum):
    PENDING = "pending"
    PARSING = "parsing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class SecurityFlag(str, enum.Enum):
    NONE = "none"
    SUSPICIOUS = "suspicious"
    DANGEROUS = "dangerous"
    BLOCKED = "blocked"


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


class MimeMessage(TimestampMixin, Base):
    __tablename__ = "mime_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    upload_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        index=True,
        nullable=False,
    )
    message_id: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        index=True,
    )
    subject: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    from_address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    to_addresses: Mapped[list | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    cc_addresses: Mapped[list | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    bcc_addresses: Mapped[list | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    content_type: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    content_language: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    total_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0,
    )
    parse_status: Mapped[ParseStatus] = mapped_column(
        Enum(ParseStatus),
        nullable=False,
        default=ParseStatus.PENDING,
        index=True,
    )
    parse_duration_ms: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    security_flag: Mapped[SecurityFlag] = mapped_column(
        Enum(SecurityFlag),
        nullable=False,
        default=SecurityFlag.NONE,
    )
    security_details: Mapped[dict | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    metadata_: Mapped[dict | None] = mapped_column(
        "metadata",
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )

    parts: Mapped[list["MimePart"]] = relationship(
        back_populates="message",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    attachments: Mapped[list["MimeAttachment"]] = relationship(
        back_populates="message",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    body: Mapped["MimeBody | None"] = relationship(
        back_populates="message",
        cascade="all, delete-orphan",
        uselist=False,
    )

    __table_args__ = (
        Index("idx_mime_message_user_upload", "user_id", "upload_id"),
        Index("idx_mime_message_status", "parse_status"),
        Index("idx_mime_message_date", "date"),
    )


class MimePart(TimestampMixin, Base):
    __tablename__ = "mime_parts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mime_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_part_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mime_parts.id", ondelete="CASCADE"),
        nullable=True,
    )
    part_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Position within parent",
    )
    content_type: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    content_subtype: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    charset: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    content_encoding: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="base64, quoted-printable, 7bit, 8bit, binary",
    )
    content_disposition: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    content_id: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    content_location: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )
    filename: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    content_length: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )
    raw_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0,
    )
    decoded_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0,
    )
    sha256_hash: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    is_attachment: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    is_inline: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    nesting_level: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    boundary: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )
    headers: Mapped[dict | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    parse_errors: Mapped[list | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    security_flag: Mapped[SecurityFlag] = mapped_column(
        Enum(SecurityFlag),
        nullable=False,
        default=SecurityFlag.NONE,
    )

    message: Mapped[MimeMessage] = relationship(back_populates="parts")
    parent_part: Mapped["MimePart | None"] = relationship(
        remote_side="MimePart.id",
        backref="child_parts",
    )

    __table_args__ = (
        Index("idx_mime_part_parent", "parent_part_id"),
        Index("idx_mime_part_content_type", "content_type"),
        Index("idx_mime_part_content_id", "content_id"),
    )


class MimeBody(TimestampMixin, Base):
    __tablename__ = "mime_bodies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mime_messages.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    html_body: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    html_size: Mapped[int] = mapped_column(
        BigInteger,
        default=0,
        nullable=False,
    )
    text_body: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    text_size: Mapped[int] = mapped_column(
        BigInteger,
        default=0,
        nullable=False,
    )
    preview_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    preview_length: Mapped[int] = mapped_column(
        Integer,
        default=500,
        nullable=False,
    )
    html_sanitized: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    cid_images: Mapped[list | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
        comment="Content-ID image mappings",
    )
    embedded_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    link_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    has_tracking_pixels: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    has_external_resources: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    message: Mapped[MimeMessage] = relationship(back_populates="body")

    __table_args__ = (
        Index("idx_mime_body_message", "message_id"),
    )


class MimeAttachment(TimestampMixin, Base):
    __tablename__ = "mime_attachments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mime_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    part_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mime_parts.id", ondelete="CASCADE"),
        nullable=False,
    )
    filename: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    safe_filename: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    content_type: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    content_id: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    content_disposition: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    file_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    sha256_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    storage_path: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )
    is_inline: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    content_location: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )
    extension: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    security_flag: Mapped[SecurityFlag] = mapped_column(
        Enum(SecurityFlag),
        nullable=False,
        default=SecurityFlag.NONE,
    )
    security_details: Mapped[dict | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    is_safe: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    scan_result: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    message: Mapped[MimeMessage] = relationship(back_populates="attachments")
    part: Mapped[MimePart] = relationship()

    __table_args__ = (
        Index("idx_mime_attachment_content_id", "content_id"),
        Index("idx_mime_attachment_content_type", "content_type"),
        Index("idx_mime_attachment_filename", "filename"),
    )


class MimeParseLog(TimestampMixin, Base):
    __tablename__ = "mime_parse_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mime_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
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

    __table_args__ = (
        Index("idx_mime_parse_log_event", "event_type"),
        Index("idx_mime_parse_log_severity", "severity"),
    )
