import asyncio
import io
import uuid

import pytest
import pytest_asyncio

from src.modules.uploads.storage.base import StorageConfig
from src.modules.uploads.storage.local import LocalStorage


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def storage():
    config = StorageConfig(
        provider="local",
        local_path="./test_storage",
    )
    storage = LocalStorage(config)
    yield storage

    import shutil
    from pathlib import Path
    test_path = Path("./test_storage")
    if test_path.exists():
        shutil.rmtree(test_path)


class TestLocalStorage:
    @pytest.mark.asyncio
    async def test_upload_and_download(self, storage):
        content = b"Hello, World!"
        file_data = io.BytesIO(content)

        result = await storage.upload_file(
            key="test/download.mbox",
            file_data=file_data,
            content_type="text/plain",
        )

        assert result.key == "test/download.mbox"
        assert result.size == len(content)

        downloaded = b""
        async for chunk in storage.download_file("test/download.mbox"):
            downloaded += chunk

        assert downloaded == content

        await storage.delete_file("test/download.mbox")

    @pytest.mark.asyncio
    async def test_file_exists(self, storage):
        file_data = io.BytesIO(b"exists")
        await storage.upload_file(key="exists.mbox", file_data=file_data)

        assert await storage.file_exists("exists.mbox") is True
        assert await storage.file_exists("nonexistent.mbox") is False

        await storage.delete_file("exists.mbox")

    @pytest.mark.asyncio
    async def test_get_file_info(self, storage):
        file_data = io.BytesIO(b"info test")
        await storage.upload_file(key="info.mbox", file_data=file_data)

        info = await storage.get_file_info("info.mbox")

        assert info is not None
        assert info.key == "info.mbox"
        assert info.size == 9

        await storage.delete_file("info.mbox")

    @pytest.mark.asyncio
    async def test_list_files(self, storage):
        for i in range(3):
            file_data = io.BytesIO(f"file {i}".encode())
            await storage.upload_file(key=f"list/file_{i}.mbox", file_data=file_data)

        files = await storage.list_files(prefix="list/")

        assert len(files) == 3

        for f in files:
            await storage.delete_file(f.key)

    @pytest.mark.asyncio
    async def test_copy_file(self, storage):
        file_data = io.BytesIO(b"copy me")
        await storage.upload_file(key="copy/source.mbox", file_data=file_data)

        result = await storage.copy_file("copy/source.mbox", "copy/dest.mbox")

        assert result.key == "copy/dest.mbox"
        assert await storage.file_exists("copy/dest.mbox") is True

        await storage.delete_file("copy/source.mbox")
        await storage.delete_file("copy/dest.mbox")

    @pytest.mark.asyncio
    async def test_get_presigned_url(self, storage):
        file_data = io.BytesIO(b"url test")
        await storage.upload_file(key="url.mbox", file_data=file_data)

        url = await storage.get_presigned_url("url.mbox")

        assert url.startswith("file://")

        await storage.delete_file("url.mbox")

    @pytest.mark.asyncio
    async def test_multipart_upload(self, storage):
        key = "multipart/test.mbox"
        upload_id = await storage.init_multipart_upload(key)

        assert upload_id is not None

        parts = []
        for i in range(1, 4):
            part_data = io.BytesIO(f"part {i}".encode())
            result = await storage.upload_part(
                key=key,
                upload_id=upload_id,
                part_number=i,
                data=part_data,
            )
            parts.append(result)

        assert len(parts) == 3

        final = await storage.complete_multipart_upload(key, upload_id, parts)

        assert final.key == key
        assert await storage.file_exists(key) is True

        await storage.delete_file(key)

    @pytest.mark.asyncio
    async def test_abort_multipart_upload(self, storage):
        key = "abort/test.mbox"
        upload_id = await storage.init_multipart_upload(key)

        part_data = io.BytesIO(b"partial data")
        await storage.upload_part(
            key=key,
            upload_id=upload_id,
            part_number=1,
            data=part_data,
        )

        result = await storage.abort_multipart_upload(key, upload_id)

        assert result is True

    @pytest.mark.asyncio
    async def test_delete_nonexistent_file(self, storage):
        result = await storage.delete_file("nonexistent.mbox")
        assert result is False

    @pytest.mark.asyncio
    async def test_get_info_nonexistent_file(self, storage):
        info = await storage.get_file_info("nonexistent.mbox")
        assert info is None
