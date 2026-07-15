import uuid
import pytest
from datetime import datetime, timezone

from src.modules.conversion.models.base import (
    ConversionJob,
    ConversionBatch,
    ConversionLog,
    DownloadHistory,
    ConversionStatus,
    OutputFormat,
)


def test_conversion_job_creation():
    job = ConversionJob(
        user_id=uuid.uuid4(),
        message_id=uuid.uuid4(),
        output_format=OutputFormat.HTML,
        status=ConversionStatus.PENDING,
        compression_enabled=False,
        options={"line_width": 80},
    )

    assert job.user_id is not None
    assert job.message_id is not None
    assert job.output_format == OutputFormat.HTML
    assert job.status == ConversionStatus.PENDING
    assert job.compression_enabled is False
    assert job.options == {"line_width": 80}
    assert job.progress == 0
    assert job.download_count == 0


def test_conversion_batch_creation():
    batch = ConversionBatch(
        user_id=uuid.uuid4(),
        name="Test Batch",
        output_format=OutputFormat.PDF,
        status=ConversionStatus.PENDING,
        total_count=10,
        completed_count=0,
        failed_count=0,
        compression_enabled=True,
        options={"page_size": "A4"},
    )

    assert batch.name == "Test Batch"
    assert batch.output_format == OutputFormat.PDF
    assert batch.status == ConversionStatus.PENDING
    assert batch.total_count == 10
    assert batch.compression_enabled is True


def test_conversion_log_creation():
    log = ConversionLog(
        job_id=uuid.uuid4(),
        event_type="conversion_started",
        severity="info",
        message="Conversion started",
        details={"format": "html"},
        duration_ms=None,
    )

    assert log.event_type == "conversion_started"
    assert log.severity == "info"
    assert log.message == "Conversion started"
    assert log.details == {"format": "html"}


def test_download_history_creation():
    history = DownloadHistory(
        job_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        ip_address="192.168.1.1",
        user_agent="Mozilla/5.0",
        download_count=1,
    )

    assert history.ip_address == "192.168.1.1"
    assert history.user_agent == "Mozilla/5.0"
    assert history.download_count == 1


def test_conversion_status_enum():
    assert ConversionStatus.PENDING == "pending"
    assert ConversionStatus.PROCESSING == "processing"
    assert ConversionStatus.COMPLETED == "completed"
    assert ConversionStatus.FAILED == "failed"
    assert ConversionStatus.CANCELLED == "cancelled"


def test_output_format_enum():
    assert OutputFormat.EML == "eml"
    assert OutputFormat.HTML == "html"
    assert OutputFormat.PDF == "pdf"
    assert OutputFormat.TXT == "txt"
    assert OutputFormat.JSON == "json"
    assert OutputFormat.CSV == "csv"
    assert OutputFormat.MARKDOWN == "markdown"
    assert OutputFormat.XML == "xml"
    assert OutputFormat.MHTML == "mhtml"
