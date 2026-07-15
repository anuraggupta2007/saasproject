import os
import hashlib
import magic
from pathlib import Path
from datetime import datetime, timezone

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)

ALLOWED_MIME_TYPES = {
    "message/rfc822",
    "application/eml",
    "text/html",
    "application/pdf",
    "text/plain",
    "application/json",
    "text/csv",
    "text/markdown",
    "application/xml",
    "text/xml",
    "multipart/related",
    "multipart/mixed",
    "multipart/alternative",
}

MAGIC_SIGNATURES = {
    "message/rfc822": [b"From:", b"Subject:", b"Date:", b"Received:"],
    "application/pdf": [b"%PDF-"],
    "text/html": [b"<!DOCTYPE", b"<html", b"<HTML"],
    "text/plain": [],
    "application/json": [b"{", b"["],
    "text/csv": [],
}

DANGEROUS_MIME_TYPES = {
    "application/x-executable",
    "application/x-msdownload",
    "application/x-bat",
    "application/x-sh",
    "application/javascript",
    "text/javascript",
}


class FileSecurityService:
    def __init__(self):
        self.allowed_mimes = ALLOWED_MIME_TYPES
        self.dangerous_mimes = DANGEROUS_MIME_TYPES
        self.magic_signatures = MAGIC_SIGNATURES

    def validate_mime_type(self, filename: str, declared_mime: str) -> dict:
        if declared_mime in self.dangerous_mimes:
            logger.warning("dangerous_mime_blocked", extra={"mime": declared_mime, "filename": filename})
            return {"valid": False, "reason": f"Dangerous MIME type: {declared_mime}"}

        if declared_mime not in self.allowed_mimes:
            logger.warning("mime_not_allowed", extra={"mime": declared_mime, "filename": filename})
            return {"valid": False, "reason": f"MIME type not allowed: {declared_mime}"}

        return {"valid": True}

    def validate_file_signature(self, file_path: str, expected_mime: str) -> dict:
        try:
            with open(file_path, "rb") as f:
                header = f.read(1024)
        except Exception as e:
            return {"valid": False, "reason": f"Cannot read file: {str(e)}"}

        detected_mime = magic.from_file(file_path, mime=True)

        if detected_mime in self.dangerous_mimes:
            return {"valid": False, "reason": f"Dangerous file type detected: {detected_mime}"}

        signatures = self.magic_signatures.get(expected_mime, [])
        if signatures:
            for sig in signatures:
                if sig in header:
                    return {"valid": True, "detected_mime": detected_mime}

        if detected_mime == expected_mime:
            return {"valid": True, "detected_mime": detected_mime}

        return {"valid": True, "detected_mime": detected_mime, "warning": "MIME type mismatch"}

    def calculate_file_hash(self, file_path: str) -> str:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def validate_filename(self, filename: str) -> dict:
        if not filename:
            return {"valid": False, "reason": "Empty filename"}

        dangerous_chars = ["..", "/", "\\", "\x00", "\n", "\r"]
        for char in dangerous_chars:
            if char in filename:
                return {"valid": False, "reason": f" dangerous character in filename: {repr(char)}"}

        if len(filename) > 255:
            return {"valid": False, "reason": "Filename too long"}

        dangerous_extensions = [
            ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
            ".sh", ".bash", ".csh", ".ksh",
            ".js", ".vbs", ".vbe", ".wsf", ".wsh",
            ".ps1", ".psm1", ".psd1",
            ".dll", ".sys", ".drv",
        ]
        ext = Path(filename).suffix.lower()
        if ext in dangerous_extensions:
            return {"valid": False, "reason": f"Dangerous file extension: {ext}"}

        return {"valid": True}

    def sanitize_filename(self, filename: str) -> str:
        filename = os.path.basename(filename)
        filename = "".join(c for c in filename if c.isalnum() or c in "._- ")
        filename = filename.strip(". ")
        if not filename:
            filename = "unnamed_file"
        return filename

    def validate_upload_size(self, file_size: int, max_size_mb: int = None) -> dict:
        if not max_size_mb:
            max_size_mb = settings.MAX_UPLOAD_SIZE_MB

        max_bytes = max_size_mb * 1024 * 1024

        if file_size > max_bytes:
            return {
                "valid": False,
                "reason": f"File too large: {file_size} bytes (max: {max_bytes} bytes)",
            }

        return {"valid": True}

    def scan_file(self, file_path: str) -> dict:
        mime_result = self.validate_file_signature(file_path, "application/octet-stream")

        file_hash = self.calculate_file_hash(file_path)
        file_size = os.path.getsize(file_path)

        return {
            "safe": mime_result["valid"],
            "file_hash": file_hash,
            "file_size": file_size,
            "detected_mime": mime_result.get("detected_mime"),
            "warnings": [mime_result["reason"]] if not mime_result.get("valid") else [],
        }
