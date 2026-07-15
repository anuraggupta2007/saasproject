from src.api.v1.endpoints.health import router as health_router
from src.api.v1.endpoints.auth import router as auth_router

__all__ = ["health_router", "auth_router"]
