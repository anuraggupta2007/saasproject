import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


def init_sentry(environment: str = "production", release: str = None):
    sentry_dsn = getattr(settings, "SENTRY_DSN", None)
    if not sentry_dsn:
        logger.warning("sentry_dsn_not_configured")
        return

    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=environment,
        release=release or getattr(settings, "VERSION", "1.0.0"),
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        integrations=[
            FastApiIntegration(
                transaction_style="endpoint",
                request_scrubber=sentry_sdk.scrubbing.DefaultScrubber(),
            ),
            SqlalchemyIntegration(),
            CeleryIntegration(),
            LoggingIntegration(
                level=None,
                event_level=None,
            ),
        ],
        before_send=_before_send,
        before_send_transaction=_before_send_transaction,
        send_default_pii=False,
        max_breadcrumbs=50,
        attach_stacktrace=True,
    )

    logger.info("sentry_initialized", extra={"environment": environment})


def _before_send(event, hint):
    if hint.get("exc_info"):
        exc_type = hint["exc_info"][0]
        if exc_type in (KeyboardInterrupt, SystemExit):
            return None

    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        for key in list(headers.keys()):
            if key.lower() in ("authorization", "cookie", "x-api-key"):
                headers[key] = "[Filtered]"

    return event


def _before_send_transaction(event, hint):
    return event


def capture_exception(error: Exception, context: dict = None):
    with sentry_sdk.configure_scope() as scope:
        if context:
            for key, value in context.items():
                scope.set_extra(key, value)
        sentry_sdk.capture_exception(error)


def capture_message(message: str, level: str = "info", context: dict = None):
    with sentry_sdk.configure_scope() as scope:
        if context:
            for key, value in context.items():
                scope.set_extra(key, value)
        sentry_sdk.capture_message(message, level=level)


def set_user_context(user_id: str, email: str = None, ip_address: str = None):
    sentry_sdk.set_user({
        "id": user_id,
        "email": email,
        "ip_address": ip_address,
    })


def set_tag(key: str, value: str):
    sentry_sdk.set_tag(key, value)


def add_breadcrumb(category: str, message: str, level: str = "info", data: dict = None):
    sentry_sdk.add_breadcrumb(
        category=category,
        message=message,
        level=level,
        data=data,
    )


class SentryMonitoring:
    def __init__(self):
        self.initialized = False

    def init(self, environment: str = "production", release: str = None):
        init_sentry(environment, release)
        self.initialized = True

    def track_conversion(self, input_format: str, output_format: str, success: bool, duration: float):
        set_tag("conversion.input_format", input_format)
        set_tag("conversion.output_format", output_format)
        set_tag("conversion.success", str(success))
        set_tag("conversion.duration", str(duration))

    def track_error(self, error: Exception, component: str, operation: str):
        with sentry_sdk.configure_scope() as scope:
            scope.set_extra("component", component)
            scope.set_extra("operation", operation)
            sentry_sdk.capture_exception(error)

    def track_performance(self, operation: str, duration: float, success: bool):
        with sentry_sdk.start_transaction(name=operation, op="task") as tx:
            tx.set_tag("operation", operation)
            tx.set_tag("duration", str(duration))
            tx.set_tag("success", str(success))
