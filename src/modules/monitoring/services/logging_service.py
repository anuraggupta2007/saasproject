import json
import logging
import logging.handlers
import uuid
from datetime import datetime, timezone
from contextvars import ContextVar
from typing import Any

_correlation_id: ContextVar[str] = ContextVar("correlation_id", default="")
_request_context: ContextVar[dict] = ContextVar("request_context", default={})


def set_correlation_id(correlation_id: str):
    _correlation_id.set(correlation_id)


def get_correlation_id() -> str:
    return _correlation_id.get()


def set_request_context(**kwargs):
    _request_context.set(kwargs)


def get_request_context() -> dict:
    return _request_context.get()


class StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "correlation_id": get_correlation_id(),
        }

        request_ctx = get_request_context()
        if request_ctx:
            log_entry["request"] = {
                "method": request_ctx.get("method"),
                "path": request_ctx.get("path"),
                "client_ip": request_ctx.get("client_ip"),
                "user_id": request_ctx.get("user_id"),
            }

        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info),
            }

        if hasattr(record, "extra_data"):
            log_entry["extra"] = record.extra_data

        return json.dumps(log_entry, default=str)


class RequestLoggingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        correlation_id = str(uuid.uuid4())
        set_correlation_id(correlation_id)

        method = scope.get("method", "")
        path = scope.get("path", "")
        client = scope.get("client")
        client_ip = client[0] if client else "unknown"

        set_request_context(
            method=method,
            path=path,
            client_ip=client_ip,
            correlation_id=correlation_id,
        )

        logger = get_logger("request")
        logger.info(
            "request_started",
            extra={"extra_data": {"method": method, "path": path, "client_ip": client_ip}},
        )

        start_time = datetime.now(timezone.utc)
        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.info(
                "request_completed",
                extra={
                    "extra_data": {
                        "method": method,
                        "path": path,
                        "status_code": status_code,
                        "duration_seconds": round(duration, 4),
                        "correlation_id": correlation_id,
                    }
                },
            )

            if status_code >= 500:
                logger.error(
                    "server_error",
                    extra={
                        "extra_data": {
                            "method": method,
                            "path": path,
                            "status_code": status_code,
                        }
                    },
                )


class SecurityLogger:
    def __init__(self):
        self.logger = get_logger("security")

    def log_login_attempt(self, user_id: str, success: bool, ip: str, user_agent: str):
        level = "info" if success else "warning"
        getattr(self.logger, level)(
            "login_attempt",
            extra={
                "extra_data": {
                    "user_id": user_id,
                    "success": success,
                    "ip": ip,
                    "user_agent": user_agent,
                }
            },
        )

    def log_permission_denied(self, user_id: str, resource: str, action: str):
        self.logger.warning(
            "permission_denied",
            extra={
                "extra_data": {
                    "user_id": user_id,
                    "resource": resource,
                    "action": action,
                }
            },
        )

    def log_rate_limit_hit(self, identifier: str, limit: int, window: str):
        self.logger.warning(
            "rate_limit_hit",
            extra={
                "extra_data": {
                    "identifier": identifier,
                    "limit": limit,
                    "window": window,
                }
            },
        )

    def log_suspicious_activity(self, activity_type: str, details: dict):
        self.logger.warning(
            "suspicious_activity",
            extra={"extra_data": {"activity_type": activity_type, **details}},
        )


class AuditLogger:
    def __init__(self):
        self.logger = get_logger("audit")

    def log_action(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        changes: dict | None = None,
    ):
        self.logger.info(
            "audit_action",
            extra={
                "extra_data": {
                    "user_id": user_id,
                    "action": action,
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "changes": changes,
                }
            },
        )


class BackgroundJobLogger:
    def __init__(self):
        self.logger = get_logger("background_job")

    def log_job_started(self, job_type: str, job_id: str, metadata: dict | None = None):
        self.logger.info(
            "job_started",
            extra={"extra_data": {"job_type": job_type, "job_id": job_id, **(metadata or {})}},
        )

    def log_job_completed(self, job_type: str, job_id: str, duration: float, success: bool):
        level = "info" if success else "error"
        getattr(self.logger, level)(
            "job_completed",
            extra={
                "extra_data": {
                    "job_type": job_type,
                    "job_id": job_id,
                    "duration_seconds": round(duration, 4),
                    "success": success,
                }
            },
        )

    def log_job_failed(self, job_type: str, job_id: str, error: str):
        self.logger.error(
            "job_failed",
            extra={"extra_data": {"job_type": job_type, "job_id": job_id, "error": error}},
        )


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False

    return logger


def setup_logging(log_level: str = "INFO", log_file: str | None = None):
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))

    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(console_handler)

    if log_file:
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setFormatter(StructuredFormatter())
        root_logger.addHandler(file_handler)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
