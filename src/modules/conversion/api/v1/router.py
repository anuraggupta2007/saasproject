import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.conversion.schemas.conversion import (
    ConversionStartRequest,
    ConversionJobResponse,
    ConversionBatchRequest,
    ConversionBatchResponse,
    ConversionJobListResponse,
    ConversionBatchListResponse,
    ConversionStatsResponse,
    SupportedFormatsResponse,
)
from src.modules.conversion.services.conversion_service import ConversionService
from src.modules.conversion.services.batch_service import BatchConversionService
from src.modules.conversion.services.compression_service import CompressionService
from src.modules.conversion.models.base import ConversionStatus, OutputFormat

router = APIRouter(prefix="/conversion", tags=["Conversion"])


@router.get(
    "/formats",
    response_model=SupportedFormatsResponse,
    summary="Get supported output formats",
)
async def get_supported_formats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ConversionService(db)
    formats = await service.get_supported_formats()
    return SupportedFormatsResponse(formats=formats)


@router.post(
    "/start",
    response_model=ConversionJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a single conversion",
)
async def start_conversion(
    request: ConversionStartRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ConversionService(db)

    try:
        job = await service.start_conversion(
            user_id=uuid.UUID(current_user["id"]),
            message_id=request.message_id,
            output_format=OutputFormat(request.output_format),
            compression_enabled=request.compression_enabled,
            compression_password=request.compression_password,
            options=request.options,
        )
        return ConversionJobResponse.model_validate(job)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/jobs",
    response_model=ConversionJobListResponse,
    summary="List user's conversion jobs",
)
async def list_jobs(
    status_filter: ConversionStatus | None = Query(None, alias="status"),
    format_filter: OutputFormat | None = Query(None, alias="format"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ConversionService(db)

    jobs, total = await service.list_user_jobs(
        user_id=uuid.UUID(current_user["id"]),
        status=status_filter,
        output_format=format_filter,
        page=page,
        page_size=page_size,
    )

    return ConversionJobListResponse(
        jobs=[ConversionJobResponse.model_validate(job) for job in jobs],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/jobs/{job_id}",
    response_model=ConversionJobResponse,
    summary="Get a conversion job",
)
async def get_job(
    job_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ConversionService(db)
    job = await service.get_job(job_id)

    if not job or job.user_id != uuid.UUID(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return ConversionJobResponse.model_validate(job)


@router.post(
    "/jobs/{job_id}/cancel",
    summary="Cancel a conversion job",
)
async def cancel_job(
    job_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ConversionService(db)

    success = await service.cancel_job(
        job_id,
        uuid.UUID(current_user["id"]),
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel job",
        )

    return {"message": "Job cancelled"}


@router.delete(
    "/jobs/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversion job",
)
async def delete_job(
    job_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ConversionService(db)

    success = await service.delete_job(
        job_id,
        uuid.UUID(current_user["id"]),
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete job",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/jobs/{job_id}/download",
    summary="Download converted file",
)
async def download_converted_file(
    job_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ConversionService(db)
    job = await service.get_job(job_id)

    if not job or job.user_id != uuid.UUID(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    if job.status != ConversionStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job not completed",
        )

    from src.core.config import settings

    file_path = f"{settings.STORAGE_LOCAL_PATH}/converted/{job.output_filename}"

    try:
        with open(file_path, "rb") as f:
            content = f.read()

        await service.record_download(
            job_id=job_id,
            user_id=uuid.UUID(current_user["id"]),
        )

        format_info = {
            "eml": "message/rfc822",
            "html": "text/html",
            "txt": "text/plain",
            "json": "application/json",
            "csv": "text/csv",
            "markdown": "text/markdown",
            "xml": "application/xml",
            "pdf": "application/pdf",
            "mhtml": "multipart/related",
        }

        content_type = format_info.get(job.output_format.value, "application/octet-stream")

        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{job.output_filename}"',
            },
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Converted file not found",
        )


@router.get(
    "/stats",
    response_model=ConversionStatsResponse,
    summary="Get user conversion statistics",
)
async def get_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ConversionService(db)
    stats = await service.get_user_stats(uuid.UUID(current_user["id"]))
    return ConversionStatsResponse(**stats)


@router.post(
    "/batch",
    response_model=ConversionBatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a batch conversion",
)
async def start_batch_conversion(
    request: ConversionBatchRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    batch_service = BatchConversionService(db)

    try:
        batch = await batch_service.create_batch(
            user_id=uuid.UUID(current_user["id"]),
            message_ids=request.message_ids,
            output_format=OutputFormat(request.output_format),
            name=request.name,
            compression_enabled=request.compression_enabled,
            options=request.options,
        )
        return ConversionBatchResponse.model_validate(batch)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/batch/{batch_id}/process",
    summary="Process batch conversion",
)
async def process_batch(
    batch_id: uuid.UUID,
    max_concurrent: int = Query(5, ge=1, le=10),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    batch_service = BatchConversionService(db)

    try:
        result = await batch_service.process_batch(batch_id, max_concurrent)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/batch",
    response_model=ConversionBatchListResponse,
    summary="List user's batch conversions",
)
async def list_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    batch_service = BatchConversionService(db)

    batches, total = await batch_service.list_user_batches(
        user_id=uuid.UUID(current_user["id"]),
        page=page,
        page_size=page_size,
    )

    return ConversionBatchListResponse(
        batches=[ConversionBatchResponse.model_validate(b) for b in batches],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/batch/{batch_id}",
    response_model=ConversionBatchResponse,
    summary="Get batch conversion details",
)
async def get_batch(
    batch_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    batch_service = BatchConversionService(db)
    batch = await batch_service.get_batch(batch_id)

    if not batch or batch.user_id != uuid.UUID(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found",
        )

    return ConversionBatchResponse.model_validate(batch)


@router.get(
    "/batch/{batch_id}/progress",
    summary="Get batch conversion progress",
)
async def get_batch_progress(
    batch_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    batch_service = BatchConversionService(db)

    try:
        progress = await batch_service.get_batch_progress(batch_id)
        return progress
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.post(
    "/batch/{batch_id}/cancel",
    summary="Cancel batch conversion",
)
async def cancel_batch(
    batch_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    batch_service = BatchConversionService(db)

    success = await batch_service.cancel_batch(
        batch_id,
        uuid.UUID(current_user["id"]),
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel batch",
        )

    return {"message": "Batch cancelled"}


@router.delete(
    "/batch/{batch_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete batch conversion",
)
async def delete_batch(
    batch_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    batch_service = BatchConversionService(db)

    success = await batch_service.delete_batch(
        batch_id,
        uuid.UUID(current_user["id"]),
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete batch",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
