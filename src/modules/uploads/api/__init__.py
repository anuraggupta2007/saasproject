from fastapi import APIRouter

from src.modules.uploads.api.v1.router import router as uploads_v1_router

router = APIRouter(prefix="/api/v1")
router.include_router(uploads_v1_router)
