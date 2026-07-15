import asyncio
import uuid
import io
import hashlib
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from src.core.config import settings
from src.core.dependencies import get_db
from src.db.session import Base
from src.main import app
from src.models.base import User, Role
from src.modules.uploads.models.base import (
    Upload,
    UploadChunk,
    UserUploadQuota,
    UploadStatus,
)
from src.modules.uploads.storage.base import StorageConfig, StorageFile
from src.services.auth.password import hash_password


TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_uploads.db"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(db_engine):
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_role(db_session):
    role = Role(
        name="user",
        description="Default user role",
        is_default=True,
        is_system=True,
    )
    db_session.add(role)
    await db_session.commit()
    return role


@pytest_asyncio.fixture
async def test_user(db_session, test_role):
    user = User(
        email="test@example.com",
        hashed_password=hash_password("TestPassword123!"),
        full_name="Test User",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()

    from src.models.base import user_roles
    await db_session.execute(
        user_roles.insert().values(user_id=user.id, role_id=test_role.id)
    )
    await db_session.commit()

    return user


@pytest_asyncio.fixture
async def test_quota(db_session, test_user):
    quota = UserUploadQuota(
        user_id=test_user.id,
        max_storage_bytes=10 * 1024 * 1024 * 1024,
        used_storage_bytes=0,
        max_uploads=1000,
        current_uploads=0,
        max_file_size=2 * 1024 * 1024 * 1024,
    )
    db_session.add(quota)
    await db_session.commit()
    return quota


class TestFileValidator:
    def test_validate_extension_valid(self):
        from src.modules.uploads.validators.file_validator import FileValidator

        ext = FileValidator.validate_extension("test.mbox")
        assert ext == ".mbox"

    def test_validate_extension_invalid(self):
        from src.modules.uploads.validators.file_validator import FileValidator
        from src.core.exceptions import BadRequestException

        with pytest.raises(BadRequestException):
            FileValidator.validate_extension("test.txt")

    def test_sanitize_filename(self):
        from src.modules.uploads.validators.file_validator import FileValidator

        safe = FileValidator.sanitize_filename("../../../etc/passwd.mbox")
        assert ".." not in safe
        assert "/" not in safe

    def test_calculate_sha256(self):
        from src.modules.uploads.validators.file_validator import FileValidator

        data = b"test data"
        file_obj = io.BytesIO(data)

        hash_result = FileValidator.calculate_sha256(file_obj)

        expected = hashlib.sha256(data).hexdigest()
        assert hash_result == expected


class TestLocalStorage:
    @pytest.mark.asyncio
    async def test_upload_file(self):
        from src.modules.uploads.storage.local import LocalStorage

        config = StorageConfig(
            provider="local",
            local_path="./test_uploads",
        )
        storage = LocalStorage(config)

        file_data = io.BytesIO(b"test content")
        result = await storage.upload_file(
            key="test/file.mbox",
            file_data=file_data,
            content_type="application/mbox",
        )

        assert result.key == "test/file.mbox"
        assert result.size == 12

        await storage.delete_file("test/file.mbox")

    @pytest.mark.asyncio
    async def test_file_exists(self):
        from src.modules.uploads.storage.local import LocalStorage

        config = StorageConfig(
            provider="local",
            local_path="./test_uploads",
        )
        storage = LocalStorage(config)

        file_data = io.BytesIO(b"test content")
        await storage.upload_file(key="exists.mbox", file_data=file_data)

        assert await storage.file_exists("exists.mbox") is True
        assert await storage.file_exists("nonexistent.mbox") is False

        await storage.delete_file("exists.mbox")

    @pytest.mark.asyncio
    async def test_delete_file(self):
        from src.modules.uploads.storage.local import LocalStorage

        config = StorageConfig(
            provider="local",
            local_path="./test_uploads",
        )
        storage = LocalStorage(config)

        file_data = io.BytesIO(b"test content")
        await storage.upload_file(key="delete_me.mbox", file_data=file_data)

        result = await storage.delete_file("delete_me.mbox")
        assert result is True

        assert await storage.file_exists("delete_me.mbox") is False


class TestUploadAPI:
    @pytest.mark.asyncio
    async def test_upload_file_success(self, client, test_user, test_quota):
        class _FakeRedis:
            def __init__(self):
                self._counts = {}

            async def incr(self, key):
                self._counts[key] = self._counts.get(key, 0) + 1
                return self._counts[key]

            async def expire(self, key, seconds):
                return True

        with patch("src.modules.uploads.api.v1.router.get_redis", AsyncMock(return_value=_FakeRedis())), \
             patch("src.modules.uploads.api.v1.router.process_upload.delay", MagicMock()):
            login_response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": "test@example.com",
                    "password": "TestPassword123!",
                },
            )
            access_token = login_response.json()["access_token"]

            file_content = b"From: test@example.com\nTo: recipient@example.com\nSubject: Test\n\nTest body padded to meet the minimum upload size requirement for mbox files."
            response = await client.post(
                "/api/v1/uploads/",
                headers={"Authorization": f"Bearer {access_token}"},
                files={"file": ("test.mbox", io.BytesIO(file_content), "application/mbox")},
            )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["original_filename"] == "test.mbox"
        assert data["status"] == "completed"

    @pytest.mark.asyncio
    async def test_upload_file_unauthorized(self, client):
        response = await client.post(
            "/api/v1/uploads/",
            files={"file": ("test.mbox", io.BytesIO(b"content"), "application/mbox")},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_uploads(self, client, test_user, test_quota):
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        access_token = login_response.json()["access_token"]

        response = await client.get(
            "/api/v1/uploads/",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "uploads" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_get_upload_quota(self, client, test_user, test_quota):
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        access_token = login_response.json()["access_token"]

        response = await client.get(
            "/api/v1/uploads/quota/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "max_storage_bytes" in data
        assert "storage_remaining" in data


class TestUploadService:
    @pytest.mark.asyncio
    async def test_upload_service_create(self, db_session, test_user, test_quota):
        from src.modules.uploads.services.upload_service import UploadService

        service = UploadService(db_session)

        file_content = b"test content padded to meet the minimum upload size requirement of one hundred bytes exactly, plus a bit more!!"
        assert len(file_content) >= 100
        file_data = io.BytesIO(file_content)
        upload = await service.upload_file(
            user_id=test_user.id,
            file_data=file_data,
            filename="test.mbox",
            file_size=len(file_content),
        )

        assert upload is not None
        assert upload.original_filename == "test.mbox"
        assert upload.status == UploadStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_upload_service_get_quota(self, db_session, test_user, test_quota):
        from src.modules.uploads.services.upload_service import UploadService

        service = UploadService(db_session)
        quota = await service.get_user_quota(test_user.id)

        assert quota is not None
        assert quota.max_storage_bytes == 10 * 1024 * 1024 * 1024
