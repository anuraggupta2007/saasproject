from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.modules.public_api.api.v1.router import get_current_user
from src.modules.public_api.schemas import ConversionResponse, ConversionListResponse

router = APIRouter(prefix="/api/public/v2", tags=["Public API v2"])


@router.get("/conversions", response_model=ConversionListResponse)
async def list_conversions_v2(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|completed_at|file_size)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    format: Optional[str] = None,
    user=Depends(get_current_user),
):
    return ConversionListResponse(
        items=[],
        total=0,
        page=page,
        page_size=page_size,
        has_more=False,
    )


@router.post("/conversions", response_model=ConversionResponse, status_code=201)
async def create_conversion_v2(
    upload_id: UUID,
    target_format: str,
    options: dict = None,
    webhook_url: Optional[str] = None,
    priority: int = Query(0, ge=0, le=10),
    metadata: dict = None,
    user=Depends(get_current_user),
):
    from uuid import uuid4
    return ConversionResponse(
        id=uuid4(),
        upload_id=upload_id,
        status="queued",
        progress=0,
        source_format="mbox",
        target_format=target_format,
        input_size_bytes=0,
        output_size_bytes=None,
        started_at=None,
        completed_at=None,
        error_message=None,
        download_url=None,
        created_at=datetime.utcnow(),
    )


@router.get("/conversions/{conversion_id}", response_model=ConversionResponse)
async def get_conversion_v2(conversion_id: UUID, user=Depends(get_current_user)):
    from uuid import uuid4
    return ConversionResponse(
        id=conversion_id,
        upload_id=uuid4(),
        status="completed",
        progress=100,
        source_format="mbox",
        target_format="pdf",
        input_size_bytes=1024000,
        output_size_bytes=2048000,
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
        error_message=None,
        download_url=f"/api/public/v2/conversions/{conversion_id}/download",
        created_at=datetime.utcnow(),
    )


@router.get("/conversions/{conversion_id}/download")
async def download_conversion_v2(conversion_id: UUID, user=Depends(get_current_user)):
    return {"download_url": f"https://storage.example.com/converted/{conversion_id}.pdf"}


@router.post("/conversions/{conversion_id}/cancel")
async def cancel_conversion_v2(conversion_id: UUID, user=Depends(get_current_user)):
    return {"status": "cancelled", "conversion_id": str(conversion_id)}


@router.get("/conversions/{conversion_id}/events")
async def get_conversion_events(conversion_id: UUID, user=Depends(get_current_user)):
    return {
        "conversion_id": str(conversion_id),
        "events": [
            {"type": "queued", "timestamp": datetime.utcnow().isoformat()},
            {"type": "started", "timestamp": datetime.utcnow().isoformat()},
            {"type": "completed", "timestamp": datetime.utcnow().isoformat()},
        ],
    }
