import uuid
from typing import Annotated, BinaryIO

from fastapi import APIRouter, Depends, File, UploadFile, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.dependencies import get_db
from src.core.rbac import get_current_active_verified_user
from src.models.base import User
from src.modules.uploads.schemas.upload import (
    UploadResponse,
    UploadListResponse,
    UploadDetailResponse,
    UploadDeleteResponse,
    UploadDownloadResponse,
    ChunkedUploadInitRequest,
    ChunkedUploadInitResponse,
    ChunkUploadRequest,
    ChunkUploadResponse,
    ChunkedUploadMergeRequest,
    ChunkedUploadMergeResponse,
    ChunkedUploadProgressResponse,
    UploadCancelResponse,
    UserQuotaResponse,
)
from src.modules.uploads.services.upload_service import UploadService
from src.modules.uploads.services.chunked_service import ChunkedUploadService
from src.modules.uploads.security.permissions import upload_rate_limiter
from src.modules.uploads.tasks.celery_tasks import (
    process_upload,
    merge_chunks_task,
    cancel_upload_task,
)
from src.services.redis import get_redis

router = APIRouter(prefix="/uploads", tags=["File Uploads"])


@router.post("/", response_model=UploadResponse, status_code=201)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    redis = await get_redis()
    await upload_rate_limiter.check_rate_limit(current_user.id, redis)

    file_data = await file.read()
    file_size = len(file_data)

    from io import BytesIO
    file_obj = BytesIO(file_data)

    service = UploadService(db)
    upload = await service.upload_file(
        user_id=current_user.id,
        file_data=file_obj,
        filename=file.filename or "upload.mbox",
        file_size=file_size,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()

    process_upload.delay(str(upload.id), str(current_user.id))

    return UploadResponse.model_validate(upload)


@router.post("/chunked/init", response_model=ChunkedUploadInitResponse)
async def init_chunked_upload(
    body: ChunkedUploadInitRequest,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> ChunkedUploadInitResponse:
    redis = await get_redis()
    await upload_rate_limiter.check_rate_limit(current_user.id, redis)

    service = ChunkedUploadService(db)
    upload = await service.init_chunked_upload(
        user_id=current_user.id,
        file_size=body.file_size,
        file_name=body.file_name,
        mime_type=body.mime_type,
        sha256_hash=body.sha256_hash,
        chunk_size=body.chunk_size,
    )
    await db.commit()

    import math
    total_chunks = math.ceil(body.file_size / body.chunk_size)

    return ChunkedUploadInitResponse(
        upload_id=upload.id,
        chunk_size=body.chunk_size,
        total_chunks=total_chunks,
    )


@router.post("/{upload_id}/chunks/{chunk_number}", response_model=ChunkUploadResponse)
async def upload_chunk(
    upload_id: uuid.UUID,
    chunk_number: int,
    file: UploadFile = File(...),
    sha256_hash: str = Query(...),
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> ChunkUploadResponse:
    service = ChunkedUploadService(db)

    from io import BytesIO
    chunk_data = BytesIO(await file.read())

    chunk = await service.upload_chunk(
        upload_id=upload_id,
        chunk_number=chunk_number,
        chunk_data=chunk_data,
        chunk_sha256=sha256_hash,
        user_id=current_user.id,
    )
    await db.commit()

    upload_progress = await service.get_upload_progress(
        upload_id, current_user.id
    )

    return ChunkUploadResponse(
        chunk_id=chunk.id,
        chunk_number=chunk.chunk_number,
        is_uploaded=chunk.is_uploaded,
        upload_progress=upload_progress["upload_progress"],
    )


@router.post("/{upload_id}/merge", response_model=ChunkedUploadMergeResponse)
async def merge_chunks(
    upload_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> ChunkedUploadMergeResponse:
    service = ChunkedUploadService(db)
    upload = await service.merge_chunks(upload_id, current_user.id)
    await db.commit()

    return ChunkedUploadMergeResponse(
        upload_id=upload.id,
        status=upload.status,
        message="Chunks merged successfully",
    )


@router.get("/{upload_id}/progress", response_model=ChunkedUploadProgressResponse)
async def get_upload_progress(
    upload_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> ChunkedUploadProgressResponse:
    service = ChunkedUploadService(db)
    progress = await service.get_upload_progress(upload_id, current_user.id)

    return ChunkedUploadProgressResponse(**progress)


@router.post("/{upload_id}/cancel", response_model=UploadCancelResponse)
async def cancel_upload(
    upload_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> UploadCancelResponse:
    service = ChunkedUploadService(db)
    success = await service.cancel_upload(upload_id, current_user.id)
    await db.commit()

    return UploadCancelResponse(
        message="Upload cancelled successfully",
        upload_id=upload_id,
    )


@router.get("/", response_model=UploadListResponse)
async def list_uploads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> UploadListResponse:
    service = UploadService(db)
    uploads, total = await service.list_uploads(
        current_user.id,
        page=page,
        page_size=page_size,
    )

    return UploadListResponse(
        uploads=[UploadResponse.model_validate(u) for u in uploads],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.get("/{upload_id}", response_model=UploadDetailResponse)
async def get_upload(
    upload_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> UploadDetailResponse:
    service = UploadService(db)
    upload = await service.get_upload(upload_id, current_user.id)

    return UploadDetailResponse.model_validate(upload)


@router.delete("/{upload_id}", response_model=UploadDeleteResponse)
async def delete_upload(
    upload_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> UploadDeleteResponse:
    service = UploadService(db)
    await service.delete_upload(upload_id, current_user.id)
    await db.commit()

    return UploadDeleteResponse(
        message="Upload deleted successfully",
        upload_id=upload_id,
    )


@router.get("/{upload_id}/download", response_model=UploadDownloadResponse)
async def download_upload(
    upload_id: uuid.UUID,
    expires_in: int = Query(3600, ge=60, le=86400),
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> UploadDownloadResponse:
    service = UploadService(db)
    download_url = await service.get_download_url(
        upload_id, current_user.id, expires_in
    )

    return UploadDownloadResponse(
        download_url=download_url,
        expires_in=expires_in,
    )


@router.get("/quota/me", response_model=UserQuotaResponse)
async def get_user_quota(
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> UserQuotaResponse:
    service = UploadService(db)
    quota = await service.get_user_quota(current_user.id)

    return UserQuotaResponse.model_validate(quota)
