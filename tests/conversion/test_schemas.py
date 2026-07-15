import uuid
import pytest
from datetime import datetime, timezone

from src.modules.conversion.schemas.conversion import (
    ConversionStartRequest,
    ConversionJobResponse,
    ConversionBatchRequest,
    ConversionBatchResponse,
    ConversionJobListResponse,
    ConversionBatchListResponse,
    ConversionStatsResponse,
    SupportedFormatsResponse,
)


def test_conversion_start_request():
    request = ConversionStartRequest(
        message_id=uuid.uuid4(),
        output_format="html",
        compression_enabled=True,
        compression_password=None,
        options={"line_width": 80},
    )

    assert request.message_id is not None
    assert request.output_format == "html"
    assert request.compression_enabled is True
    assert request.options == {"line_width": 80}


def test_conversion_start_request_defaults():
    request = ConversionStartRequest(
        message_id=uuid.uuid4(),
        output_format="txt",
    )

    assert request.compression_enabled is False
    assert request.compression_password is None
    assert request.options is None


def test_conversion_batch_request():
    request = ConversionBatchRequest(
        message_ids=[uuid.uuid4(), uuid.uuid4()],
        output_format="pdf",
        name="My Batch",
        compression_enabled=True,
        options={"page_size": "A4"},
    )

    assert len(request.message_ids) == 2
    assert request.output_format == "pdf"
    assert request.name == "My Batch"
    assert request.compression_enabled is True


def test_conversion_batch_request_defaults():
    request = ConversionBatchRequest(
        message_ids=[uuid.uuid4()],
        output_format="html",
    )

    assert request.name is None
    assert request.compression_enabled is True
    assert request.options is None


def test_supported_formats_response():
    response = SupportedFormatsResponse(
        formats=[
            {"format": "html", "content_type": "text/html", "extension": ".html"},
            {"format": "pdf", "content_type": "application/pdf", "extension": ".pdf"},
        ]
    )

    assert len(response.formats) == 2
    assert response.formats[0]["format"] == "html"


def test_conversion_stats_response():
    stats = ConversionStatsResponse(
        total_conversions=100,
        completed_conversions=80,
        failed_conversions=10,
        total_size=1024000,
        format_distribution={"html": 60, "pdf": 20},
        average_processing_time_ms=500,
    )

    assert stats.total_conversions == 100
    assert stats.completed_conversions == 80
    assert stats.failed_conversions == 10
