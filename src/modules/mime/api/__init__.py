from fastapi import APIRouter

from src.modules.mime.api.v1.router import router as mime_v1_router

router = APIRouter(prefix="/api/v1")
router.include_router(mime_v1_router)
