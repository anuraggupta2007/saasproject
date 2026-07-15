import io
from typing import BinaryIO, AsyncGenerator
from datetime import datetime

import minio
from minio import Minio
from minio.error import S3Error

from src.modules.uploads.storage.base import StorageProvider, StorageFile, StorageConfig


class MinIOStorage(StorageProvider):
    def __init__(self, config: StorageConfig):
        super().__init__(config)
        self.client = Minio(
            config.endpoint_url.replace("https://", "").replace("http://", ""),
            access_key=config.access_key,
            secret_key=config.secret_key,
            secure=config.endpoint_url.startswith("https") if config.endpoint_url else False,
        )
        self.bucket = config.bucket_name
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    async def upload_file(
        self,
        key: str,
        file_data: BinaryIO,
        content_type: str | None = None,
        metadata: dict[str, str] | None = None,
    ) -> StorageFile:
        data = file_data.read()
        data_length = len(data)

        self.client.put_object(
            self.bucket,
            key,
            io.BytesIO(data),
            data_length,
            content_type=content_type or "application/octet-stream",
            metadata=metadata or {},
        )

        return await self.get_file_info(key)

    async def download_file(self, key: str) -> AsyncGenerator[bytes, None]:
        try:
            response = self.client.get_object(self.bucket, key)

            while True:
                chunk = response.read(self.config.chunk_size)
                if not chunk:
                    break
                yield chunk

            response.close()
            response.release_conn()
        except S3Error as e:
            raise FileNotFoundError(f"File not found: {key}") from e

    async def delete_file(self, key: str) -> bool:
        try:
            self.client.remove_object(self.bucket, key)
            return True
        except S3Error:
            return False

    async def file_exists(self, key: str) -> bool:
        try:
            self.client.stat_object(self.bucket, key)
            return True
        except S3Error:
            return False

    async def get_file_info(self, key: str) -> StorageFile | None:
        try:
            stat = self.client.stat_object(self.bucket, key)

            return StorageFile(
                key=key,
                bucket=self.bucket,
                size=stat.size,
                content_type=stat.content_type,
                etag=stat.etag,
                last_modified=stat.last_modified,
                metadata=stat.metadata or {},
            )
        except S3Error:
            return None

    async def get_presigned_url(
        self,
        key: str,
        expires_in: int = 3600,
    ) -> str:
        try:
            return self.client.presigned_get_object(
                self.bucket,
                key,
                expires_in=expires_in,
            )
        except S3Error as e:
            raise FileNotFoundError(f"File not found: {key}") from e

    async def list_files(
        self,
        prefix: str = "",
        limit: int = 100,
    ) -> list[StorageFile]:
        files = []

        objects = self.client.list_objects(
            self.bucket,
            prefix=prefix,
            recursive=True,
        )

        for obj in objects:
            if len(files) >= limit:
                break

            files.append(StorageFile(
                key=obj.object_name,
                bucket=self.bucket,
                size=obj.size,
                etag=obj.etag,
                last_modified=obj.last_modified,
            ))

        return files

    async def copy_file(
        self,
        source_key: str,
        dest_key: str,
    ) -> StorageFile:
        self.client.copy_object(
            self.bucket,
            dest_key,
            f"{self.bucket}/{source_key}",
        )

        return await self.get_file_info(dest_key)

    async def init_multipart_upload(self, key: str) -> str:
        upload = self.client.initiate_multipart_upload(self.bucket, key)
        return upload

    async def upload_part(
        self,
        key: str,
        upload_id: str,
        part_number: int,
        data: BinaryIO,
    ) -> dict:
        data.seek(0, 2)
        data_length = data.tell()
        data.seek(0)

        etag = self.client.upload_part(
            self.bucket,
            key,
            upload_id,
            part_number,
            data,
            data_length,
        )

        return {
            "part_number": part_number,
            "etag": etag,
            "size": data_length,
        }

    async def complete_multipart_upload(
        self,
        key: str,
        upload_id: str,
        parts: list[dict],
    ) -> StorageFile:
        part_list = [
            (p["part_number"], p["etag"])
            for p in sorted(parts, key=lambda x: x["part_number"])
        ]

        self.client.complete_multipart_upload(
            self.bucket,
            key,
            upload_id,
            part_list,
        )

        return await self.get_file_info(key)

    async def abort_multipart_upload(
        self,
        key: str,
        upload_id: str,
    ) -> bool:
        try:
            self.client.abort_multipart_upload(
                self.bucket,
                key,
                upload_id,
            )
            return True
        except S3Error:
            return False
