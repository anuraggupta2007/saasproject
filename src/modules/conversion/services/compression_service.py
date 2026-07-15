import zipfile
import io
import hashlib
from pathlib import Path

from src.core.logging import get_logger

logger = get_logger(__name__)


class CompressionService:
    def __init__(self):
        self.default_compression = zipfile.ZIP_DEFLATED

    async def compress_files(
        self,
        files: list[dict],
        preserve_structure: bool = True,
        password: str | None = None,
    ) -> tuple[bytes, int]:
        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, "w", self.default_compression) as zf:
            for file_info in files:
                filename = file_info.get("filename", "file")
                content = file_info.get("content", b"")
                folder = file_info.get("folder", "")

                if isinstance(content, str):
                    content = content.encode("utf-8")

                if preserve_structure and folder:
                    arcname = f"{folder}/{filename}"
                else:
                    arcname = filename

                zf.writestr(arcname, content)

        compressed_data = buffer.getvalue()
        compressed_size = len(compressed_data)

        logger.info(
            "files_compressed",
            original_count=len(files),
            compressed_size=compressed_size,
        )

        return compressed_data, compressed_size

    async def compress_single_file(
        self,
        filename: str,
        content: str | bytes,
        password: str | None = None,
    ) -> tuple[bytes, int]:
        return await self.compress_files(
            [{"filename": filename, "content": content}],
            preserve_structure=False,
            password=password,
        )

    async def create_zip_from_dict(
        self,
        files: dict[str, str | bytes],
        password: str | None = None,
    ) -> tuple[bytes, int]:
        file_list = [
            {"filename": name, "content": content}
            for name, content in files.items()
        ]
        return await self.compress_files(file_list, preserve_structure=False, password=password)

    def get_compression_ratio(
        self,
        original_size: int,
        compressed_size: int,
    ) -> float:
        if original_size == 0:
            return 0.0
        return 1 - (compressed_size / original_size)

    async def calculate_hash(self, data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()
