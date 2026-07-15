from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-Request-ID"] = request.headers.get("X-Request-ID", "")

        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["Content-Security-Policy"] = "default-src 'self'"

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self._client_requests: dict = {}

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = __import__("time").time()
        window = int(now // 60)

        key = f"{client_ip}:{window}"
        count = self._client_requests.get(key, 0)

        if count >= self.requests_per_minute:
            logger.warning("rate_limit_exceeded", extra={"ip": client_ip, "count": count})
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again later."},
                headers={"Retry-After": "60"},
            )

        self._client_requests[key] = count + 1

        cleanup_window = window - 2
        self._client_requests = {
            k: v for k, v in self._client_requests.items()
            if int(k.split(":")[-1]) > cleanup_window
        }

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(max(0, self.requests_per_minute - count - 1))

        return response


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        from src.modules.security.services.validation_service import InputValidationService

        validator = InputValidationService()

        if request.query_params:
            for key, value in request.query_params.items():
                check = validator.check_sql_injection(value)
                if not check["safe"]:
                    return JSONResponse(
                        status_code=400,
                        content={"detail": "Invalid input detected"},
                    )

                check = validator.check_xss(value)
                if not check["safe"]:
                    return JSONResponse(
                        status_code=400,
                        content={"detail": "Invalid input detected"},
                    )

        content_type = request.headers.get("content-type", "")
        if request.method in ("POST", "PUT", "PATCH") and "multipart/form-data" not in content_type:
            try:
                body = await request.body()
                if body:
                    body_str = body.decode("utf-8", errors="ignore")
                    check = validator.check_sql_injection(body_str)
                    if not check["safe"]:
                        return JSONResponse(
                            status_code=400,
                            content={"detail": "Invalid input detected in request body"},
                        )
                    check = validator.check_xss(body_str)
                    if not check["safe"]:
                        return JSONResponse(
                            status_code=400,
                            content={"detail": "Invalid input detected in request body"},
                        )
            except Exception:
                pass

        response = await call_next(request)
        return response


class CORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        origin = request.headers.get("origin", "")
        if origin in settings.CORS_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
