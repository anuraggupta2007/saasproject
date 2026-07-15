from fastapi import APIRouter

from src.modules.payment.api.v1.router import router as payment_router
from src.modules.payment.api.v1.webhooks import router as webhook_router

router = APIRouter()
router.include_router(payment_router)
router.include_router(webhook_router)
