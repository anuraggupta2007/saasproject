import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from src.core.logging import get_logger

logger = get_logger(__name__)


class TenantIsolationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        public_paths = ["/health", "/ready", "/live", "/metrics", "/docs", "/redoc", "/openapi.json"]
        if any(request.url.path.startswith(p) for p in public_paths):
            return await call_next(request)

        tenant_id = request.headers.get("X-Tenant-ID")
        organization_id = request.headers.get("X-Organization-ID")

        if not tenant_id and not organization_id:
            request.state.tenant_id = None
            request.state.organization_id = None
            return await call_next(request)

        user = getattr(request.state, "user", None)
        if not user:
            request.state.tenant_id = None
            request.state.organization_id = None
            return await call_next(request)

        user_id = user.get("id") if isinstance(user, dict) else getattr(user, "id", None)
        if not user_id:
            request.state.tenant_id = None
            request.state.organization_id = None
            return await call_next(request)

        request.state.tenant_id = tenant_id
        request.state.organization_id = organization_id

        response = await call_next(request)

        if tenant_id:
            response.headers["X-Tenant-ID"] = tenant_id
        if organization_id:
            response.headers["X-Organization-ID"] = organization_id

        return response


class APIGatewayMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start_time = time.time()

        request.state.request_id = request_id

        response = await call_next(request)

        duration = time.time() - start_time

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration:.4f}"

        logger.info(
            "gateway_request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration": round(duration, 4),
                "tenant_id": getattr(request.state, "tenant_id", None),
            },
        )

        return response


class TenantRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_client=None):
        super().__init__(app)
        self.redis = redis_client

    async def dispatch(self, request: Request, call_next):
        if not self.redis:
            return await call_next(request)

        tenant_id = getattr(request.state, "tenant_id", None)
        if not tenant_id:
            return await call_next(request)

        key = f"rate_limit:tenant:{tenant_id}:{int(time.time()) // 60}"

        try:
            current = await self.redis.incr(key)
            if current == 1:
                await self.redis.expire(key, 60)

            if current > 1000:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Tenant rate limit exceeded"},
                    headers={"Retry-After": "60", "X-RateLimit-Limit": "1000"},
                )

            response = await call_next(request)
            response.headers["X-RateLimit-Remaining"] = str(max(0, 1000 - current))
            return response

        except Exception:
            return await call_next(request)


class TenantAuditMiddleware(BaseHTTPMiddleware):
    AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    async def dispatch(self, request: Request, call_next):
        if request.method not in self.AUDIT_METHODS:
            return await call_next(request)

        tenant_id = getattr(request.state, "tenant_id", None)
        if not tenant_id:
            return await call_next(request)

        response = await call_next(request)

        if response.status_code < 400:
            try:
                from src.db.session import async_session_factory
                from src.modules.gateway.repositories.gateway import TenantAuditLogRepository

                async with async_session_factory() as session:
                    repo = TenantAuditLogRepository(session)
                    await repo.log_action(
                        tenant_id=tenant_id,
                        user_id=getattr(request.state, "user_id", "unknown"),
                        action=request.method.lower(),
                        resource_type=request.url.path.split("/")[2] if len(request.url.path.split("/")) > 2 else "unknown",
                        ip_address=request.client.host if request.client else None,
                        user_agent=request.headers.get("user-agent"),
                    )
            except Exception as e:
                logger.warning("audit_log_failed", extra={"error": str(e)})

        return response
