import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from src.modules.mime.models.base import ParseStatus, SecurityFlag


class MimeParseRequest(BaseModel):
    upload_id: uuid.UUID
    raw_content: str | None = Field(None, description="Raw MIME content as string")
    storage_path: str | None = Field(None, description="Storage path to load from")

    @field_validator("raw_content", "storage_path")
    @classmethod
    def validate_one_provided(cls, v, info):
        if info.data.get("raw_content") is None and v is None:
            raise ValueError("Either raw_content or storage_path must be provided")
        return v


class MimePartResponse(BaseModel):
    id: uuid.UUID
    content_type: str
    content_subtype: str | None = None
    charset: str | None = None
    content_encoding: str | None = None
    content_disposition: str | None = None
    content_id: str | None = None
    filename: str | None = None
    content_length: int | None = None
    raw_size: int
    decoded_size: int
    is_attachment: bool
    is_inline: bool
    nesting_level: int
    security_flag: SecurityFlag
    child_parts: list["MimePartResponse"] = []

    model_config = {"from_attributes": True}


class MimeAttachmentResponse(BaseModel):
    id: uuid.UUID
    filename: str
    safe_filename: str
    content_type: str
    content_id: str | None = None
    content_disposition: str
    file_size: int
    sha256_hash: str
    is_inline: bool
    extension: str | None = None
    security_flag: SecurityFlag
    is_safe: bool
    storage_path: str | None = None

    model_config = {"from_attributes": True}


class MimeBodyResponse(BaseModel):
    html_body: str | None = None
    html_size: int
    text_body: str | None = None
    text_size: int
    preview_text: str | None = None
    html_sanitized: bool
    cid_images: dict[str, str] | None = None
    embedded_count: int
    link_count: int
    has_tracking_pixels: bool
    has_external_resources: bool

    model_config = {"from_attributes": True}


class MimeMessageResponse(BaseModel):
    id: uuid.UUID
    upload_id: uuid.UUID
    message_id: str | None = None
    subject: str | None = None
    from_address: str | None = None
    to_addresses: list[str] | None = None
    cc_addresses: list[str] | None = None
    date: datetime | None = None
    content_type: str
    total_size: int
    parse_status: ParseStatus
    parse_duration_ms: int | None = None
    error_message: str | None = None
    security_flag: SecurityFlag
    security_details: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MimeMessageDetailResponse(MimeMessageResponse):
    parts: list[MimePartResponse] = []
    attachments: list[MimeAttachmentResponse] = []
    body: MimeBodyResponse | None = None


class MimePreviewResponse(BaseModel):
    message_id: uuid.UUID
    subject: str | None = None
    from_address: str | None = None
    date: datetime | None = None
    preview_text: str | None = None
    has_attachments: bool = False
    attachment_count: int = 0
    content_type: str


class MimeListPartsResponse(BaseModel):
    parts: list[MimePartResponse]
    total_count: int
    attachment_count: int
    nesting_depth: int


class MimeHtmlResponse(BaseModel):
    html: str
    size: int
    sanitized: bool
    cid_images: dict[str, str] | None = None
    has_external_resources: bool = False


class MimeTextResponse(BaseModel):
    text: str
    size: int
    preview: str | None = None


class MimeDownloadAttachmentResponse(BaseModel):
    download_url: str
    filename: str
    content_type: str
    file_size: int
    expires_in: int = 3600


class MimeParseResponse(BaseModel):
    message_id: uuid.UUID
    status: ParseStatus
    duration_ms: int
    parts_count: int
    attachments_count: int
    has_html: bool
    has_text: bool
    security_flag: SecurityFlag
    errors: list[str] = []


class MimeParseStatusResponse(BaseModel):
    message_id: uuid.UUID
    status: ParseStatus
    progress: int = 0
    error: str | None = None


class MimeBatchParseRequest(BaseModel):
    upload_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=100)


class MimeBatchParseResponse(BaseModel):
    task_ids: list[str]
    total: int
    message: str


class MimeStatsResponse(BaseModel):
    total_messages: int
    parsed_messages: int
    total_parts: int
    total_attachments: int
    total_size: int
    content_type_distribution: dict[str, int]
    security_flags_distribution: dict[str, int]
