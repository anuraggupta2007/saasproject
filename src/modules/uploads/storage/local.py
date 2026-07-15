import os
import shutil
from pathlib import Path
from typing import BinaryIO, AsyncGenerator
from datetime import datetime

import aiofiles
import aiofiles.os

from src.modules.uploads.storage.base import StorageProvider, StorageFile, StorageConfig


class LocalStorage(StorageProvider):
    def __init__(self, config: StorageConfig):
        super().__init__(config)
        self.base_path = Path(config.local_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _get_full_path(self, key: str) -> Path:
        return self.base_path / key

    async def upload_file(
        self,
        key: str,
        file_data: BinaryIO,
        content_type: str | None = None,
        metadata: dict[str, str] | None = None,
    ) -> StorageFile:
        full_path = self._get_full_path(key)
        full_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(full_path, "wb") as f:
            while chunk := file_data.read(self.config.chunk_size):
                await f.write(chunk)

        stat = await aiofiles.os.stat(full_path)

        return StorageFile(
            key=key,
            bucket="local",
            size=stat.st_size,
            content_type=content_type,
            last_modified=datetime.fromtimestamp(stat.st_mtime),
            metadata=metadata or {},
        )

    async def download_file(self, key: str) -> AsyncGenerator[bytes, None]:
        full_path = self._get_full_path(key)

        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {key}")

        async with aiofiles.open(full_path, "rb") as f:
            while chunk := await f.read(self.config.chunk_size):
                yield chunk

    async def delete_file(self, key: str) -> bool:
        full_path = self._get_full_path(key)

        if full_path.exists():
            if full_path.is_dir():
                shutil.rmtree(full_path)
            else:
                await aiofiles.os.remove(full_path)
            return True
        return False

    async def file_exists(self, key: str) -> bool:
        full_path = self._get_full_path(key)
        return full_path.exists()

    async def get_file_info(self, key: str) -> StorageFile | None:
        full_path = self._get_full_path(key)

        if not full_path.exists():
            return None

        stat = await aiofiles.os.stat(full_path)

        return StorageFile(
            key=key,
            bucket="local",
            size=stat.st_size,
            last_modified=datetime.fromtimestamp(stat.st_mtime),
        )

    async def get_presigned_url(
        self,
        key: str,
        expires_in: int = 3600,
    ) -> str:
        full_path = self._get_full_path(key)

        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {key}")

        return f"file://{full_path.absolute()}"

    async def list_files(
        self,
        prefix: str = "",
        limit: int = 100,
    ) -> list[StorageFile]:
        files = []
        prefix_path = self._get_full_path(prefix)

        if not prefix_path.exists():
            return files

        count = 0
        for item in prefix_path.rglob("*"):
            if item.is_file() and count < limit:
                stat = await aiofiles.os.stat(item)
                relative_path = item.relative_to(self.base_path)

                files.append(StorageFile(
                    key=str(relative_path),
                    bucket="local",
                    size=stat.st_size,
                    last_modified=datetime.fromtimestamp(stat.st_mtime),
                ))
                count += 1

        return files

    async def copy_file(
        self,
        source_key: str,
        dest_key: str,
    ) -> StorageFile:
        source_path = self._get_full_path(source_key)
        dest_path = self._get_full_path(dest_key)

        if not source_path.exists():
            raise FileNotFoundError(f"Source file not found: {source_key}")

        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, dest_path)

        stat = await aiofiles.os.stat(dest_path)

        return StorageFile(
            key=dest_key,
            bucket="local",
            size=stat.st_size,
            last_modified=datetime.fromtimestamp(stat.st_mtime),
        )

    async def init_multipart_upload(self, key: str) -> str:
        upload_dir = self._get_full_path(f".tmp/{key}")
        upload_dir.mkdir(parents=True, exist_ok=True)
        return key

    async def upload_part(
        self,
        key: str,
        upload_id: str,
        part_number: int,
        data: BinaryIO,
    ) -> dict:
        part_path = self._get_full_path(f".tmp/{upload_id}/part_{part_number:06d}")
        part_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(part_path, "wb") as f:
            while chunk := data.read(self.config.chunk_size):
                await f.write(chunk)

        stat = await aiofiles.os.stat(part_path)

        return {
            "part_number": part_number,
            "size": stat.st_size,
            "etag": str(stat.st_mtime_ns),
        }

    async def complete_multipart_upload(
        self,
        key: str,
        upload_id: str,
        parts: list[dict],
    ) -> StorageFile:
        final_path = self._get_full_path(key)
        final_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(final_path, "wb") as dest:
            for part in sorted(parts, key=lambda x: x["part_number"]):
                part_path = self._get_full_path(
                    f".tmp/{upload_id}/part_{part['part_number']:06d}"
                )
                async with aiofiles.open(part_path, "rb") as src:
                    while chunk := await src.read(self.config.chunk_size):
                        await dest.write(chunk)

        tmp_dir = self._get_full_path(f".tmp/{upload_id}")
        if tmp_dir.exists():
            shutil.rmtree(tmp_dir)

        stat = await aiofiles.os.stat(final_path)

        return StorageFile(
            key=key,
            bucket="local",
            size=stat.st_size,
            last_modified=datetime.fromtimestamp(stat.st_mtime),
        )

    async def abort_multipart_upload(
        self,
        key: str,
        upload_id: str,
    ) -> bool:
        tmp_dir = self._get_full_path(f".tmp/{upload_id}")
        if tmp_dir.exists():
            shutil.rmtree(tmp_dir)
            return True
        return False
