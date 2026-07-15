import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from src.modules.conversion.services.conversion_service import ConversionService
from src.modules.conversion.models.base import ConversionStatus, OutputFormat


@pytest.fixture
def mock_session():
    session = AsyncMock()
    return session


@pytest.fixture
def conversion_service(mock_session):
    return ConversionService(mock_session)


class TestConversionService:
    def test_init(self, conversion_service):
        assert conversion_service.session is not None
        assert conversion_service.job_repo is not None
        assert conversion_service.log_repo is not None
        assert conversion_service.download_repo is not None

    @pytest.mark.asyncio
    async def test_start_conversion(self, conversion_service):
        user_id = uuid.uuid4()
        message_id = uuid.uuid4()

        mock_job = MagicMock()
        mock_job.id = uuid.uuid4()
        mock_job.user_id = user_id
        mock_job.message_id = message_id
        mock_job.output_format = OutputFormat.HTML
        mock_job.status = ConversionStatus.PENDING

        conversion_service.job_repo.create = AsyncMock(return_value=mock_job)
        conversion_service.log_repo.create = AsyncMock(return_value=MagicMock())

        job = await conversion_service.start_conversion(
            user_id=user_id,
            message_id=message_id,
            output_format=OutputFormat.HTML,
        )

        assert job is not None
        assert job.user_id == user_id
        conversion_service.job_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_job(self, conversion_service):
        job_id = uuid.uuid4()

        mock_job = MagicMock()
        mock_job.id = job_id

        conversion_service.job_repo.get_by_id = AsyncMock(return_value=mock_job)

        job = await conversion_service.get_job(job_id)

        assert job is not None
        conversion_service.job_repo.get_by_id.assert_called_once_with(job_id)

    @pytest.mark.asyncio
    async def test_list_user_jobs(self, conversion_service):
        user_id = uuid.uuid4()

        mock_jobs = [MagicMock(), MagicMock()]
        conversion_service.job_repo.list_user_jobs = AsyncMock(
            return_value=(mock_jobs, 2)
        )

        jobs, total = await conversion_service.list_user_jobs(user_id)

        assert len(jobs) == 2
        assert total == 2

    @pytest.mark.asyncio
    async def test_cancel_job(self, conversion_service):
        job_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_job = MagicMock()
        mock_job.id = job_id
        mock_job.user_id = user_id
        mock_job.status = ConversionStatus.PROCESSING

        conversion_service.job_repo.get_by_id = AsyncMock(return_value=mock_job)
        conversion_service.job_repo.update = AsyncMock(return_value=mock_job)
        conversion_service.log_repo.create = AsyncMock(return_value=MagicMock())

        result = await conversion_service.cancel_job(job_id, user_id)

        assert result is True

    @pytest.mark.asyncio
    async def test_cancel_job_not_found(self, conversion_service):
        job_id = uuid.uuid4()
        user_id = uuid.uuid4()

        conversion_service.job_repo.get_by_id = AsyncMock(return_value=None)

        result = await conversion_service.cancel_job(job_id, user_id)

        assert result is False

    @pytest.mark.asyncio
    async def test_delete_job(self, conversion_service):
        job_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_job = MagicMock()
        mock_job.id = job_id
        mock_job.user_id = user_id
        mock_job.status = ConversionStatus.COMPLETED

        conversion_service.job_repo.get_by_id = AsyncMock(return_value=mock_job)
        conversion_service.job_repo.delete = AsyncMock(return_value=True)

        result = await conversion_service.delete_job(job_id, user_id)

        assert result is True

    @pytest.mark.asyncio
    async def test_delete_job_processing(self, conversion_service):
        job_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_job = MagicMock()
        mock_job.id = job_id
        mock_job.user_id = user_id
        mock_job.status = ConversionStatus.PROCESSING

        conversion_service.job_repo.get_by_id = AsyncMock(return_value=mock_job)

        result = await conversion_service.delete_job(job_id, user_id)

        assert result is False

    @pytest.mark.asyncio
    async def test_get_supported_formats(self, conversion_service):
        formats = await conversion_service.get_supported_formats()

        assert len(formats) == 9
        assert any(f["format"] == "html" for f in formats)
        assert any(f["format"] == "pdf" for f in formats)

    @pytest.mark.asyncio
    async def test_get_user_stats(self, conversion_service):
        user_id = uuid.uuid4()

        mock_stats = {
            "total_jobs": 100,
            "completed_jobs": 80,
            "failed_jobs": 10,
            "cancelled_jobs": 5,
            "total_size": 1024000,
            "average_duration": 500,
        }

        conversion_service.job_repo.get_user_stats = AsyncMock(return_value=mock_stats)

        stats = await conversion_service.get_user_stats(user_id)

        assert stats["total_jobs"] == 100
        assert stats["completed_jobs"] == 80
