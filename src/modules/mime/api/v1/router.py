import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.dependencies import get_db
from src.core.rbac import get_current_active_verified_user
from src.models.base import User
from src.modules.mime.schemas.mime import (
    MimeParseRequest,
    MimeParseResponse,
    MimeMessageResponse,
    MimeMessageDetailResponse,
    MimePreviewResponse,
    MimeListPartsResponse,
    MimeHtmlResponse,
    MimeTextResponse,
    MimeAttachmentResponse,
    MimeDownloadAttachmentResponse,
    MimeParseStatusResponse,
    MimeBatchParseRequest,
    MimeBatchParseResponse,
    MimeStatsResponse,
)
from src.modules.mime.services.processing_service import MimeProcessingService
from src.modules.mime.models.base import ParseStatus

router = APIRouter(prefix="/mime", tags=["MIME Processing"])


@router.post("/parse", response_model=MimeParseResponse)
async def parse_mime_message(
    body: MimeParseRequest,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> MimeParseResponse:
    service = MimeProcessingService(db)

    if body.raw_content:
        raw_content = body.raw_content
    else:
        from src.modules.uploads.services.upload_service import UploadService
        upload_service = UploadService(db)
        download_url = await upload_service.get_download_url(
            body.upload_id, current_user.id
        )
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(download_url)
            raw_content = response.text

    result = await service.process_message(
        user_id=current_user.id,
        upload_id=body.upload_id,
        raw_content=raw_content,
    )
    await db.commit()

    return MimeParseResponse(
        message_id=result["message_id"],
        status=result["status"],
        duration_ms=result.get("duration_ms", 0),
        parts_count=result.get("parts_count", 0),
        attachments_count=result.get("attachments_count", 0),
        has_html=result.get("has_html", False),
        has_text=result.get("has_text", False),
        security_flag=result.get("security_flag", "none"),
    )


@router.post("/parse/file", response_model=MimeParseResponse)
async def parse_mime_file(
    upload_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> MimeParseResponse:
    service = MimeProcessingService(db)

    content = await file.read()
    raw_content = content.decode("utf-8", errors="replace")

    result = await service.process_message(
        user_id=current_user.id,
        upload_id=upload_id,
        raw_content=raw_content,
    )
    await db.commit()

    return MimeParseResponse(
        message_id=result["message_id"],
        status=result["status"],
        duration_ms=result.get("duration_ms", 0),
        parts_count=result.get("parts_count", 0),
        attachments_count=result.get("attachments_count", 0),
        has_html=result.get("has_html", False),
        has_text=result.get("has_text", False),
        security_flag=result.get("security_flag", "none"),
    )


@router.get("/messages", response_model=list[MimeMessageResponse])
async def list_mime_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: ParseStatus | None = None,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> list[MimeMessageResponse]:
    service = MimeProcessingService(db)
    messages, _ = await service.list_messages(
        current_user.id,
        status=status,
        page=page,
        page_size=page_size,
    )

    return [MimeMessageResponse.model_validate(m) for m in messages]


@router.get("/messages/{message_id}", response_model=MimeMessageDetailResponse)
async def get_mime_message(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> MimeMessageDetailResponse:
    service = MimeProcessingService(db)
    message = await service.get_message(message_id)

    if not message:
        from src.core.exceptions import NotFoundException
        raise NotFoundException(detail="Message not found")

    return MimeMessageDetailResponse.model_validate(message)


@router.get("/messages/{message_id}/preview", response_model=MimePreviewResponse)
async def get_mime_preview(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> MimePreviewResponse:
    service = MimeProcessingService(db)
    preview = await service.get_preview(message_id)

    if not preview:
        from src.core.exceptions import NotFoundException
        raise NotFoundException(detail="Message not found")

    return MimePreviewResponse(**preview)


@router.get("/messages/{message_id}/html", response_model=MimeHtmlResponse)
async def get_mime_html(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> MimeHtmlResponse:
    service = MimeProcessingService(db)
    html = await service.get_html_body(message_id)

    if not html:
        from src.core.exceptions import NotFoundException
        raise NotFoundException(detail="HTML body not found")

    return MimeHtmlResponse(**html)


@router.get("/messages/{message_id}/text", response_model=MimeTextResponse)
async def get_mime_text(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> MimeTextResponse:
    service = MimeProcessingService(db)
    text = await service.get_text_body(message_id)

    if not text:
        from src.core.exceptions import NotFoundException
        raise NotFoundException(detail="Text body not found")

    return MimeTextResponse(**text)


@router.get("/messages/{message_id}/parts", response_model=MimeListPartsResponse)
async def list_mime_parts(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> MimeListPartsResponse:
    service = MimeProcessingService(db)
    result = await service.list_parts(message_id)

    from src.modules.mime.schemas.mime import MimePartResponse
    parts = [MimePartResponse.model_validate(p) for p in result["parts"]]

    return MimeListPartsResponse(
        parts=parts,
        total_count=result["total_count"],
        attachment_count=result["attachment_count"],
        nesting_depth=result["nesting_depth"],
    )


@router.get(
    "/messages/{message_id}/attachments",
    response_model=list[MimeAttachmentResponse],
)
async def list_mime_attachments(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> list[MimeAttachmentResponse]:
    service = MimeProcessingService(db)
    attachments = await service.get_attachments(message_id)

    return [MimeAttachmentResponse.model_validate(a) for a in attachments]


@router.get(
    "/attachments/{attachment_id}",
    response_model=MimeAttachmentResponse,
)
async def get_mime_attachment(
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> MimeAttachmentResponse:
    service = MimeProcessingService(db)
    attachment = await service.get_attachment(attachment_id)

    if not attachment:
        from src.core.exceptions import NotFoundException
        raise NotFoundException(detail="Attachment not found")

    return MimeAttachmentResponse.model_validate(attachment)


@router.get(
    "/attachments/{attachment_id}/download",
    response_model=MimeDownloadAttachmentResponse,
)
async def download_mime_attachment(
    attachment_id: uuid.UUID,
    expires_in: int = Query(3600, ge=60, le=86400),
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> MimeDownloadAttachmentResponse:
    service = MimeProcessingService(db)
    attachment = await service.get_attachment(attachment_id)

    if not attachment:
        from src.core.exceptions import NotFoundException
        raise NotFoundException(detail="Attachment not found")

    if attachment.storage_path:
        from src.modules.uploads.services.upload_service import UploadService
        upload_service = UploadService(db)
        download_url = await upload_service.get_download_url(
            attachment.part_id, current_user.id, expires_in
        )
    else:
        download_url = ""

    return MimeDownloadAttachmentResponse(
        download_url=download_url,
        filename=attachment.filename,
        content_type=attachment.content_type,
        file_size=attachment.file_size,
        expires_in=expires_in,
    )


@router.get("/stats", response_model=MimeStatsResponse)
async def get_mime_stats(
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> MimeStatsResponse:
    service = MimeProcessingService(db)
    stats = await service.get_stats(current_user.id)

    return MimeStatsResponse(
        total_messages=stats["total_messages"],
        parsed_messages=stats["parsed_messages"],
        total_parts=0,
        total_attachments=0,
        total_size=stats["total_size"],
        content_type_distribution={},
        security_flags_distribution={},
    )
