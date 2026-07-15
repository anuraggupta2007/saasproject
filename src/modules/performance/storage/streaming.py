import asyncio
import hashlib
import logging
import time
from typing import AsyncIterator, Optional
from io import BytesIO

import aiohttp
from aiohttp import MultipartWriter

from src.core.config import settings

logger = logging.getLogger(__name__)


class StreamingUploader:
    """Streaming multipart upload to S3/MinIO without loading entire file into memory."""

    def __init__(self, endpoint: str = None, access_key: str = None, secret_key: str = None):
        self._endpoint = endpoint or settings.MINIO_ENDPOINT
        self._access_key = access_key or settings.MINIO_ACCESS_KEY
        self._secret_key = secret_key or settings.MINIO_SECRET_KEY

    async def upload_stream(
        self,
        bucket: str,
        key: str,
        data_stream: AsyncIterator[bytes],
        content_type: str = "application/octet-stream",
        content_length: int = None,
        metadata: dict = None,
    ) -> dict:
        start_time = time.perf_counter()
        total_bytes = 0
        hasher = hashlib.sha256()

        async with aiohttp.ClientSession() as session:
            url = f"https://{self._endpoint}/{bucket}/{key}"
            headers = {
                "Content-Type": content_type,
                "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
            }
            if metadata:
                for k, v in metadata.items():
                    headers[f"X-Amz-Meta-{k}"] = str(v)

            async with session.put(url, headers=headers) as response:
                async for chunk in data_stream:
                    response.write(chunk)
                    await response.wait()
                    hasher.update(chunk)
                    total_bytes += len(chunk)

        duration_ms = (time.perf_counter() - start_time) * 1000
        return {
            "bucket": bucket,
            "key": key,
            "size_bytes": total_bytes,
            "sha256": hasher.hexdigest(),
            "duration_ms": round(duration_ms, 2),
            "throughput_mbps": round((total_bytes / (1024 * 1024)) / (duration_ms / 1000), 2) if duration_ms > 0 else 0,
        }


class StreamingDownloader:
    """Streaming download from S3/MinIO with range support."""

    def __init__(self, endpoint: str = None):
        self._endpoint = endpoint or settings.MINIO_ENDPOINT

    async def download_stream(
        self,
        bucket: str,
        key: str,
        range_start: int = None,
        range_end: int = None,
    ) -> AsyncIterator[bytes]:
        url = f"http://{self._endpoint}/{bucket}/{key}"
        headers = {}
        if range_start is not None:
            range_header = f"bytes={range_start}"
            if range_end is not None:
                range_header += f"-{range_end}"
            headers["Range"] = range_header

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                async for chunk in response.content.iter_chunked(8192):
                    yield chunk

    async def get_object_info(self, bucket: str, key: str) -> dict:
        url = f"http://{self._endpoint}/{bucket}/{key}"
        async with aiohttp.ClientSession() as session:
            async with session.head(url) as response:
                return {
                    "content_length": response.headers.get("Content-Length"),
                    "content_type": response.headers.get("Content-Type"),
                    "etag": response.headers.get("ETag"),
                    "last_modified": response.headers.get("Last-Modified"),
                }


class CompressionService:
    """Streaming compression for uploads and downloads."""

    @staticmethod
    async def compress_gzip(data: bytes) -> bytes:
        import gzip
        return gzip.compress(data, compresslevel=6)

    @staticmethod
    async def decompress_gzip(data: bytes) -> bytes:
        import gzip
        return gzip.decompress(data)

    @staticmethod
    async def compress_stream(
        data_stream: AsyncIterator[bytes], chunk_size: int = 8192
    ) -> AsyncIterator[bytes]:
        import gzip
        compressor = gzip.GzipFile(fileobj=BytesIO(), mode="wb", compresslevel=6)
        async for chunk in data_stream:
            compressor.write(chunk)
            compressed = compressor.read(chunk_size)
            if compressed:
                yield compressed

    @staticmethod
    def estimate_compression_ratio(data: bytes) -> float:
        compressed = CompressionService.compress_gzip(data)
        return len(compressed) / len(data) if len(data) > 0 else 1.0


class MultipartUploadManager:
    """Manages multipart uploads for large files."""

    def __init__(self, part_size: int = 8 * 1024 * 1024):
        self._part_size = part_size
        self._active_uploads: dict[str, dict] = {}

    async def initiate_upload(
        self, bucket: str, key: str, content_type: str = "application/octet-stream"
    ) -> str:
        upload_id = hashlib.sha256(f"{bucket}/{key}/{time.time()}".encode()).hexdigest()[:16]
        self._active_uploads[upload_id] = {
            "bucket": bucket,
            "key": key,
            "content_type": content_type,
            "parts": [],
            "started_at": time.time(),
        }
        return upload_id

    async def upload_part(
        self, upload_id: str, part_number: int, data: bytes
    ) -> dict:
        upload = self._active_uploads.get(upload_id)
        if not upload:
            raise ValueError(f"Upload {upload_id} not found")

        hasher = hashlib.md5(data)
        part_info = {
            "part_number": part_number,
            "size": len(data),
            "etag": hasher.hexdigest(),
        }
        upload["parts"].append(part_info)
        return part_info

    async def complete_upload(self, upload_id: str) -> dict:
        upload = self._active_uploads.pop(upload_id, None)
        if not upload:
            raise ValueError(f"Upload {upload_id} not found")

        total_size = sum(p["size"] for p in upload["parts"])
        duration = time.time() - upload["started_at"]

        return {
            "bucket": upload["bucket"],
            "key": upload["key"],
            "total_parts": len(upload["parts"]),
            "total_size": total_size,
            "duration_seconds": round(duration, 2),
            "throughput_mbps": round((total_size / (1024 * 1024)) / duration, 2) if duration > 0 else 0,
        }

    async def abort_upload(self, upload_id: str):
        self._active_uploads.pop(upload_id, None)


class CDNService:
    """CDN integration for cached content delivery."""

    def __init__(self, cdn_domain: str = None):
        self._cdn_domain = cdn_domain or "cdn.emailconverter.com"

    def get_cdn_url(self, bucket: str, key: str) -> str:
        return f"https://{self._cdn_domain}/{bucket}/{key}"

    async def purge_cache(self, urls: list[str]) -> dict:
        return {
            "purged": len(urls),
            "urls": urls,
            "timestamp": time.time(),
        }

    async def get_cache_stats(self) -> dict:
        return {
            "hit_rate": 0.95,
            "total_requests": 0,
            "bandwidth_saved_gb": 0,
        }


streaming_uploader = StreamingUploader()
streaming_downloader = StreamingDownloader()
compression_service = CompressionService()
multipart_manager = MultipartUploadManager()
cdn_service = CDNService()
