from fastapi import APIRouter

from src.modules.license.api.v1.router import router as license_router
from src.modules.license.api.v1.admin_router import router as admin_router

router = APIRouter()
router.include_router(license_router)
router.include_router(admin_router)
