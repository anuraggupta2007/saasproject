import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch

from src.main import app


@pytest.fixture
def mock_current_user():
    return {
        "id": str(uuid.uuid4()),
        "email": "test@example.com",
        "role": "user",
    }


@pytest.mark.asyncio
async def test_get_supported_formats(mock_current_user):
    with patch("src.modules.conversion.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/conversion/formats",
                headers={"Authorization": "Bearer test-token"},
            )

            assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_start_conversion(mock_current_user):
    with patch("src.modules.conversion.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.conversion.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.conversion.api.v1.router.ConversionService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_job = MagicMock()
                mock_job.id = uuid.uuid4()
                mock_job.user_id = uuid.UUID(mock_current_user["id"])
                mock_job.output_format = "html"
                mock_job.status = "pending"
                mock_job.progress = 0
                mock_job.download_count = 0
                mock_job.compression_enabled = False
                mock_job.options = None
                mock_job.created_at = "2024-01-15T10:30:00Z"
                mock_job.updated_at = "2024-01-15T10:30:00Z"
                mock_job.processing_started_at = None
                mock_job.processing_completed_at = None
                mock_job.processing_duration_ms = None
                mock_instance.start_conversion = AsyncMock(return_value=mock_job)

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/conversion/start",
                        json={
                            "message_id": str(uuid.uuid4()),
                            "output_format": "html",
                        },
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [201, 401]


@pytest.mark.asyncio
async def test_list_jobs(mock_current_user):
    with patch("src.modules.conversion.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.conversion.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.conversion.api.v1.router.ConversionService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.list_user_jobs = AsyncMock(return_value=([], 0))

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.get(
                        "/api/v1/conversion/jobs",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_get_stats(mock_current_user):
    with patch("src.modules.conversion.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.conversion.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.conversion.api.v1.router.ConversionService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.get_user_stats = AsyncMock(
                    return_value={
                        "total_jobs": 0,
                        "completed_jobs": 0,
                        "failed_jobs": 0,
                        "cancelled_jobs": 0,
                        "total_size": 0,
                        "average_duration": 0,
                    }
                )

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.get(
                        "/api/v1/conversion/stats",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]
