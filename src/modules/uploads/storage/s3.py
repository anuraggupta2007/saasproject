import io
from typing import BinaryIO, AsyncGenerator
from datetime import datetime

import boto3
import botocore
from botocore.config import Config

from src.modules.uploads.storage.base import StorageProvider, StorageFile, StorageConfig


class S3Storage(StorageProvider):
    def __init__(self, config: StorageConfig):
        super().__init__(config)
        self.client = boto3.client(
            "s3",
            region_name=config.region,
            aws_access_key_id=config.access_key,
            aws_secret_access_key=config.secret_key,
            endpoint_url=config.endpoint_url,
            config=Config(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "adaptive"},
            ),
        )
        self.bucket = config.bucket_name

    async def upload_file(
        self,
        key: str,
        file_data: BinaryIO,
        content_type: str | None = None,
        metadata: dict[str, str] | None = None,
    ) -> StorageFile:
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type
        if metadata:
            extra_args["Metadata"] = metadata

        self.client.upload_fileobj(
            file_data,
            self.bucket,
            key,
            ExtraArgs=extra_args,
        )

        return await self.get_file_info(key)

    async def download_file(self, key: str) -> AsyncGenerator[bytes, None]:
        response = self.client.get_object(Bucket=self.bucket, Key=key)

        stream = response["Body"]
        while True:
            chunk = stream.read(self.config.chunk_size)
            if not chunk:
                break
            yield chunk

    async def delete_file(self, key: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False

    async def file_exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except botocore.exceptions.ClientError:
            return False

    async def get_file_info(self, key: str) -> StorageFile | None:
        try:
            response = self.client.head_object(Bucket=self.bucket, Key=key)

            return StorageFile(
                key=key,
                bucket=self.bucket,
                size=response["ContentLength"],
                content_type=response.get("ContentType"),
                etag=response.get("ETag", "").strip('"'),
                last_modified=response.get("LastModified"),
                metadata=response.get("Metadata", {}),
            )
        except botocore.exceptions.ClientError:
            return None

    async def get_presigned_url(
        self,
        key: str,
        expires_in: int = 3600,
    ) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    async def list_files(
        self,
        prefix: str = "",
        limit: int = 100,
    ) -> list[StorageFile]:
        files = []
        paginator = self.client.get_paginator("list_objects_v2")

        for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
            for obj in page.get("Contents", []):
                if len(files) >= limit:
                    break

                files.append(StorageFile(
                    key=obj["Key"],
                    bucket=self.bucket,
                    size=obj["Size"],
                    etag=obj.get("ETag", "").strip('"'),
                    last_modified=obj.get("LastModified"),
                ))

        return files[:limit]

    async def copy_file(
        self,
        source_key: str,
        dest_key: str,
    ) -> StorageFile:
        copy_source = {"Bucket": self.bucket, "Key": source_key}
        self.client.copy_object(
            CopySource=copy_source,
            Bucket=self.bucket,
            Key=dest_key,
        )

        return await self.get_file_info(dest_key)

    async def init_multipart_upload(self, key: str) -> str:
        response = self.client.create_multipart_upload(
            Bucket=self.bucket,
            Key=key,
        )
        return response["UploadId"]

    async def upload_part(
        self,
        key: str,
        upload_id: str,
        part_number: int,
        data: BinaryIO,
    ) -> dict:
        response = self.client.upload_part(
            Bucket=self.bucket,
            Key=key,
            UploadId=upload_id,
            PartNumber=part_number,
            Body=data,
        )

        return {
            "part_number": part_number,
            "etag": response["ETag"],
            "size": data.seek(0, 2),
        }

    async def complete_multipart_upload(
        self,
        key: str,
        upload_id: str,
        parts: list[dict],
    ) -> StorageFile:
        multipart_upload = {
            "Parts": [
                {"PartNumber": p["part_number"], "ETag": p["etag"]}
                for p in sorted(parts, key=lambda x: x["part_number"])
            ]
        }

        self.client.complete_multipart_upload(
            Bucket=self.bucket,
            Key=key,
            UploadId=upload_id,
            MultipartUpload=multipart_upload,
        )

        return await self.get_file_info(key)

    async def abort_multipart_upload(
        self,
        key: str,
        upload_id: str,
    ) -> bool:
        try:
            self.client.abort_multipart_upload(
                Bucket=self.bucket,
                Key=key,
                UploadId=upload_id,
            )
            return True
        except Exception:
            return False
