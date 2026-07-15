from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.celery import CeleryInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.trace import StatusCode, Status
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)

_tracer_provider: TracerProvider | None = None


def init_tracing(service_name: str = "email-collector"):
    global _tracer_provider

    resource = Resource.create({SERVICE_NAME: service_name})

    _tracer_provider = TracerProvider(resource=resource)

    try:
        otlp_exporter = OTLPSpanExporter(
            endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT
            if hasattr(settings, "OTEL_EXPORTER_OTLP_ENDPOINT")
            else "localhost:4317",
            insecure=True,
        )
        _tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    except Exception as e:
        logger.warning("otlp_exporter_not_available", extra={"error": str(e)})

    console_exporter = ConsoleSpanExporter()
    _tracer_provider.add_span_processor(BatchSpanProcessor(console_exporter))

    trace.set_tracer_provider(_tracer_provider)

    logger.info("tracing_initialized", extra={"service_name": service_name})

    return _tracer_provider


def get_tracer(name: str = __name__):
    return trace.get_tracer(name)


def instrument_fastapi(app):
    FastAPIInstrumentor.instrument_app(app)
    logger.info("fastapi_instrumented")


def instrument_sqlalchemy(engine):
    SQLAlchemyInstrumentor().instrument(engine=engine)
    logger.info("sqlalchemy_instrumented")


def instrument_celery():
    CeleryInstrumentor().instrument()
    logger.info("celery_instrumented")


def instrument_httpx():
    HTTPXClientInstrumentor().instrument()
    logger.info("httpx_instrumented")


class TracingService:
    def __init__(self):
        self.tracer = get_tracer("monitoring.tracing")

    def trace_request(self, method: str, path: str):
        return self.tracer.start_as_current_span(
            f"{method} {path}",
            attributes={
                "http.method": method,
                "http.url": path,
            },
        )

    def trace_database_query(self, query: str, operation: str = "query"):
        return self.tracer.start_as_current_span(
            f"db.{operation}",
            attributes={
                "db.system": "postgresql",
                "db.statement": query[:500],
                "db.operation": operation,
            },
        )

    def trace_conversion(self, input_format: str, output_format: str):
        return self.tracer.start_as_current_span(
            "conversion.process",
            attributes={
                "conversion.input_format": input_format,
                "conversion.output_format": output_format,
            },
        )

    def trace_background_job(self, job_type: str, job_id: str):
        return self.tracer.start_as_current_span(
            f"job.{job_type}",
            attributes={
                "job.type": job_type,
                "job.id": job_id,
            },
        )

    def trace_external_api(self, url: str, method: str = "GET"):
        return self.tracer.start_as_current_span(
            f"external.{method}",
            attributes={
                "http.url": url,
                "http.method": method,
                "span.kind": "client",
            },
        )

    def trace_cache_operation(self, operation: str, key: str):
        return self.tracer.start_as_current_span(
            f"cache.{operation}",
            attributes={
                "cache.operation": operation,
                "cache.key": key,
            },
        )

    def record_error(self, span, error: Exception):
        span.set_status(Status(StatusCode.ERROR, str(error)))
        span.record_exception(error)

    def add_event(self, span, name: str, attributes: dict = None):
        span.add_event(name, attributes=attributes or {})
