import hashlib
import magic
from pathlib import Path
from typing import BinaryIO

from src.core.exceptions import BadRequestException
from src.core.logging import get_logger

logger = get_logger(__name__)

ALLOWED_EXTENSIONS = {".mbox", ".mbx", ".pst", ".eml"}
ALLOWED_MIME_TYPES = {
    "application/mbox",
    "application/octet-stream",
    "message/rfc822",
    "application/vnd.ms-outlook",
}

MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024  # 10GB
MIN_FILE_SIZE = 100  # 100 bytes minimum


class FileValidator:
    @staticmethod
    def validate_extension(filename: str) -> str:
        ext = Path(filename).suffix.lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise BadRequestException(
                detail=f"File type '{ext}' is not supported. "
                f"Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        return ext

    @staticmethod
    def validate_mime_type(file_data: BinaryIO, expected_filename: str) -> str:
        current_pos = file_data.tell()
        header = file_data.read(8192)
        file_data.seek(current_pos)

        mime = magic.Magic(mime=True)
        detected_mime = mime.from_buffer(header)

        ext = Path(expected_filename).suffix.lower()

        mime_map = {
            ".mbox": ["application/mbox", "application/octet-stream"],
            ".mbx": ["application/mbox", "application/octet-stream"],
            ".eml": ["message/rfc822", "text/plain", "application/octet-stream"],
            ".pst": ["application/vnd.ms-outlook", "application/octet-stream"],
        }

        allowed_mimes = mime_map.get(ext, ALLOWED_MIME_TYPES)

        if detected_mime not in allowed_mimes:
            if ext == ".mbox" and detected_mime == "application/octet-stream":
                pass
            else:
                logger.warning(
                    "mime_type_mismatch",
                    filename=expected_filename,
                    detected=detected_mime,
                    expected=allowed_mimes,
                )

        return detected_mime

    @staticmethod
    def validate_file_size(file_size: int) -> None:
        if file_size < MIN_FILE_SIZE:
            raise BadRequestException(
                detail=f"File is too small. Minimum size: {MIN_FILE_SIZE} bytes"
            )

        if file_size > MAX_FILE_SIZE:
            raise BadRequestException(
                detail=f"File is too large. Maximum size: {MAX_FILE_SIZE / (1024*1024*1024):.1f}GB"
            )

    @staticmethod
    def calculate_sha256(file_data: BinaryIO) -> str:
        sha256_hash = hashlib.sha256()

        current_pos = file_data.tell()
        file_data.seek(0)

        while chunk := file_data.read(8192):
            sha256_hash.update(chunk)

        file_data.seek(current_pos)

        return sha256_hash.hexdigest()

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        path = Path(filename)
        name = path.stem

        safe_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-")
        sanitized = "".join(c if c in safe_chars else "_" for c in name)

        sanitized = sanitized.strip("._-")

        if not sanitized:
            sanitized = "upload"

        max_length = 200
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length]

        ext = path.suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            ext = ".mbox"

        return f"{sanitized}{ext}"

    @staticmethod
    def validate_upload(
        filename: str,
        file_data: BinaryIO,
        file_size: int,
    ) -> dict:
        ext = FileValidator.validate_extension(filename)
        mime_type = FileValidator.validate_mime_type(file_data, filename)
        FileValidator.validate_file_size(file_size)
        sha256_hash = FileValidator.calculate_sha256(file_data)
        safe_filename = FileValidator.sanitize_filename(filename)

        return {
            "original_filename": filename,
            "safe_filename": safe_filename,
            "extension": ext,
            "mime_type": mime_type,
            "file_size": file_size,
            "sha256_hash": sha256_hash,
        }


class VirusScanner:
    @staticmethod
    async def scan_file(file_path: str) -> dict:
        return {
            "is_clean": True,
            "scanner": "hook",
            "result": "clean",
            "message": "Virus scanning hook - implement with ClamAV or similar",
        }

    @staticmethod
    async def scan_bytes(data: bytes) -> dict:
        return {
            "is_clean": True,
            "scanner": "hook",
            "result": "clean",
            "message": "Virus scanning hook - implement with ClamAV or similar",
        }
