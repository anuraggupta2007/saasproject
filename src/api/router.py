from fastapi import APIRouter

from src.api.v1.router import router as api_v1_router
from src.modules.uploads.api import router as uploads_router
from src.modules.mime.api import router as mime_router
from src.modules.conversion.api.v1.router import router as conversion_router
from src.modules.license.api.v1 import router as license_router
from src.modules.payment.api.v1 import router as payment_router
from src.modules.admin.api.v1 import router as admin_router
from src.modules.notification.api.v1 import router as notification_router
from src.modules.analytics.api.v1 import router as analytics_router
from src.modules.monitoring.api.v1 import router as monitoring_router
from src.modules.security.api.v1 import router as security_router
from src.modules.search.api.v1 import router as search_router
from src.modules.gateway.api.v1 import router as gateway_router
from src.modules.performance.api.v1.router import router as performance_router
from src.modules.public_api.api.v1.router import router as public_v1_router
from src.modules.public_api.api.v2.router import router as public_v2_router

router = APIRouter()

# `api_v1_router` (health/auth), `uploads_router`, and `mime_router` already
# declare their own "/api/v1" prefix, so they're included as-is.
router.include_router(api_v1_router)
router.include_router(uploads_router)
router.include_router(mime_router)

# The routers below only declare their own bare module prefix (e.g.
# "/payment", "/license") with no version prefix, so they must be nested
# under "/api/v1" here -- otherwise they end up served at "/payment/..."
# instead of the "/api/v1/payment/..." that the frontend, docs, and tests
# all expect.
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(conversion_router)
v1_router.include_router(license_router)
v1_router.include_router(payment_router)
v1_router.include_router(admin_router)
v1_router.include_router(notification_router)
v1_router.include_router(analytics_router)
v1_router.include_router(monitoring_router)
v1_router.include_router(security_router)
v1_router.include_router(search_router)
v1_router.include_router(gateway_router)
v1_router.include_router(performance_router)
router.include_router(v1_router)

# The public API already declares its own fully-qualified, independently
# versioned prefix ("/api/public/v1", "/api/public/v2"), so it's included
# as-is rather than nested under "/api/v1".
router.include_router(public_v1_router)
router.include_router(public_v2_router)
