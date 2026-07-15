from fastapi import APIRouter

from src.api.v1.endpoints.health import router as health_router
from src.api.v1.endpoints.auth import router as auth_router

router = APIRouter(prefix="/api/v1")

router.include_router(health_router)
router.include_router(auth_router)
