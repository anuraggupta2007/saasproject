import uuid
from typing import Callable, Optional
from datetime import datetime, timezone

from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from src.core.security import decode_access_token
from src.core.logging import get_logger
from src.core.database import async_session_factory

logger = get_logger(__name__)


class AdminPermissionMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, required_permission: Optional[str] = None):
        super().__init__(app)
        self.required_permission = required_permission

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not request.url.path.startswith("/api/v1/admin"):
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return Response(
                content='{"detail":"Not authenticated"}',
                status_code=401,
                media_type="application/json",
            )

        token = auth_header.split(" ")[1]
        payload = decode_access_token(token)

        if not payload:
            return Response(
                content='{"detail":"Invalid token"}',
                status_code=401,
                media_type="application/json",
            )

        user_id = payload.get("sub")
        if not user_id:
            return Response(
                content='{"detail":"Invalid token payload"}',
                status_code=401,
                media_type="application/json",
            )

        request.state.user_id = user_id
        request.state.user_payload = payload

        if self.required_permission:
            async with async_session_factory() as session:
                from src.modules.admin.services.user_service import AdminUserService

                service = AdminUserService(session)
                has_permission = await service.check_permission(
                    uuid.UUID(user_id),
                    self.required_permission,
                )

                if not has_permission:
                    return Response(
                        content='{"detail":"Insufficient permissions"}',
                        status_code=403,
                        media_type="application/json",
                    )

        response = await call_next(request)

        logger.info(
            "admin_api_access",
            user_id=user_id,
            path=request.url.path,
            method=request.method,
            status_code=response.status_code,
        )

        return response


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = datetime.now(timezone.utc)

        response = await call_next(request)

        duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)

        if request.url.path.startswith("/api/v1/admin"):
            user_id = getattr(request.state, "user_id", None)

            logger.info(
                "admin_api_call",
                user_id=user_id,
                path=request.url.path,
                method=request.method,
                status_code=response.status_code,
                duration_ms=duration_ms,
                ip_address=request.client.host if request.client else None,
            )

        return response
