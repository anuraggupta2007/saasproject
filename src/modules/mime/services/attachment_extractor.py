import hashlib
import os
from pathlib import Path
from typing import Any

from src.core.logging import get_logger

logger = get_logger(__name__)


class AttachmentExtractor:
    def __init__(self):
        self.dangerous_extensions = {
            ".exe", ".bat", ".cmd", ".com", ".msi", ".pif",
            ".scr", ".vbs", ".js", ".jse", ".ws", ".wsh",
            ".ps1", ".psm1", ".psd1", ".psc1", ".reg",
            ".dll", ".sys", ".ocx", ".cpl", ".inf",
            ".hta", ".mst", ".gadget", ".application",
            ".msp", ".mst", ".adget",
        }

        self.suspicious_extensions = {
            ".doc", ".docm", ".xls", ".xlsm", ".ppt", ".pptm",
            ".dot", ".dotm", ".xlt", ".xltm", ".pot", ".potm",
            ".pub", ".accdb", ".ade", ".adp", ".asx", ".bas",
            ".bgi", ".cda", ".chm", ".cpl", ".crt", ".csh",
        }

        self.archive_extensions = {
            ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2",
            ".xz", ".tgz", ".tbz2", ".txz",
        }

    def extract(
        self,
        content_type: str,
        filename: str | None,
        content_id: str | None,
        content_disposition: str | None,
        payload: bytes,
        charset: str | None = None,
    ) -> dict[str, Any]:
        if not filename and content_id:
            filename = self._generate_filename_from_cid(content_id, content_type)

        if not filename:
            filename = self._generate_filename(content_type)

        safe_filename = self._sanitize_filename(filename)

        extension = self._get_extension(filename, content_type)

        file_size = len(payload)
        sha256_hash = self._calculate_hash(payload)

        is_inline = content_disposition == "inline" or bool(content_id)
        disposition = content_disposition or ("inline" if is_inline else "attachment")

        security_result = self._check_security(filename, extension, payload)

        return {
            "filename": filename,
            "safe_filename": safe_filename,
            "extension": extension,
            "content_type": content_type,
            "content_id": content_id,
            "content_disposition": disposition,
            "file_size": file_size,
            "sha256_hash": sha256_hash,
            "is_inline": is_inline,
            "is_safe": security_result["is_safe"],
            "security_flag": security_result["flag"],
            "security_details": security_result["details"],
        }

    def _generate_filename_from_cid(
        self,
        content_id: str,
        content_type: str,
    ) -> str:
        cid = content_id.strip("<>")
        cid_name = cid.split("@")[0] if "@" in cid else cid

        extension = self._get_extension(None, content_type)

        safe_name = "".join(
            c if c.isalnum() or c in "-_" else "_"
            for c in cid_name
        )

        if not safe_name:
            safe_name = "inline"

        return f"{safe_name}{extension}"

    def _generate_filename(self, content_type: str) -> str:
        ext = self._get_extension(None, content_type)

        content_type_names = {
            "text/plain": "document",
            "text/html": "page",
            "application/pdf": "document",
            "application/zip": "archive",
            "application/json": "data",
            "application/xml": "data",
            "image/jpeg": "image",
            "image/png": "image",
            "image/gif": "image",
            "image/webp": "image",
            "audio/mpeg": "audio",
            "audio/wav": "audio",
            "video/mp4": "video",
            "video/webm": "video",
        }

        base_name = content_type_names.get(content_type, "file")

        return f"{base_name}{ext}"

    def _get_extension(
        self,
        filename: str | None,
        content_type: str,
    ) -> str:
        if filename:
            ext = Path(filename).suffix.lower()
            if ext:
                return ext

        mime_extensions = {
            "text/plain": ".txt",
            "text/html": ".html",
            "text/css": ".css",
            "text/csv": ".csv",
            "text/xml": ".xml",
            "application/json": ".json",
            "application/xml": ".xml",
            "application/pdf": ".pdf",
            "application/zip": ".zip",
            "application/gzip": ".gz",
            "application/x-tar": ".tar",
            "application/x-7z-compressed": ".7z",
            "application/msword": ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "application/vnd.ms-excel": ".xls",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
            "application/vnd.ms-powerpoint": ".ppt",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "image/svg+xml": ".svg",
            "audio/mpeg": ".mp3",
            "audio/wav": ".wav",
            "audio/ogg": ".ogg",
            "video/mp4": ".mp4",
            "video/webm": ".webm",
            "video/quicktime": ".mov",
            "message/rfc822": ".eml",
            "message/partial": ".eml",
            "multipart/mixed": ".eml",
        }

        return mime_extensions.get(content_type, ".bin")

    def _sanitize_filename(self, filename: str) -> str:
        name = Path(filename).stem
        ext = Path(filename).suffix

        name = "".join(
            c if c.isalnum() or c in "-_. " else "_"
            for c in name
        )

        name = name.strip(". ")

        if not name:
            name = "file"

        if len(name) > 200:
            name = name[:200]

        return f"{name}{ext}"

    def _calculate_hash(self, data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    def _check_security(
        self,
        filename: str,
        extension: str,
        payload: bytes,
    ) -> dict[str, Any]:
        details = {
            "filename": filename,
            "extension": extension,
            "checks": [],
        }

        if extension in self.dangerous_extensions:
            details["checks"].append("dangerous_extension")
            return {
                "is_safe": False,
                "flag": "dangerous",
                "details": details,
            }

        if extension in self.suspicious_extensions:
            details["checks"].append("suspicious_extension")
            return {
                "is_safe": True,
                "flag": "suspicious",
                "details": details,
            }

        if self._has_double_extension(filename):
            details["checks"].append("double_extension")
            return {
                "is_safe": True,
                "flag": "suspicious",
                "details": details,
            }

        if self._has_hidden_extension(filename):
            details["checks"].append("hidden_extension")
            return {
                "is_safe": False,
                "flag": "dangerous",
                "details": details,
            }

        if extension in self.archive_extensions:
            details["checks"].append("archive_file")
            return {
                "is_safe": True,
                "flag": "suspicious",
                "details": details,
            }

        if self._contains_executable_content(payload, extension):
            details["checks"].append("executable_content")
            return {
                "is_safe": False,
                "flag": "dangerous",
                "details": details,
            }

        return {
            "is_safe": True,
            "flag": "none",
            "details": details,
        }

    def _has_double_extension(self, filename: str) -> bool:
        parts = Path(filename).stem.split(".")
        if len(parts) >= 2:
            double_ext = f".{parts[-1]}".lower()
            return double_ext in self.dangerous_extensions
        return False

    def _has_hidden_extension(self, filename: str) -> bool:
        return filename.endswith(". ") or ".." in filename

    def _contains_executable_content(
        self,
        payload: bytes,
        extension: str,
    ) -> bool:
        if extension not in (".exe", ".dll", ".sys", ".ocx", ".com", ".scr"):
            return False

        if payload[:2] == b"MZ":
            return True

        if payload[:4] in (b"\x7fELF", b"\xfe\xed\xfa\xce", b"\xfe\xed\xfa\xcf"):
            return True

        return False

    def is_safe_content_type(self, content_type: str) -> bool:
        safe_types = {
            "text/plain",
            "text/html",
            "text/csv",
            "text/xml",
            "application/json",
            "application/xml",
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/svg+xml",
            "audio/mpeg",
            "audio/wav",
            "video/mp4",
            "video/webm",
        }

        return content_type in safe_types

    def get_file_info(self, payload: bytes) -> dict[str, Any]:
        info = {
            "size": len(payload),
            "md5": hashlib.md5(payload).hexdigest(),
            "sha1": hashlib.sha1(payload).hexdigest(),
            "sha256": hashlib.sha256(payload).hexdigest(),
        }

        if payload[:2] == b"PK":
            info["magic"] = "ZIP/Office Open XML"
        elif payload[:2] == b"MZ":
            info["magic"] = "PE Executable"
        elif payload[:4] == b"%PDF":
            info["magic"] = "PDF"
        elif payload[:8] == b"\x89PNG\r\n\x1a\n":
            info["magic"] = "PNG"
        elif payload[:3] == b"\xff\xd8\xff":
            info["magic"] = "JPEG"
        elif payload[:4] == b"GIF8":
            info["magic"] = "GIF"
        elif payload[:4] == b"RIFF":
            info["magic"] = "RIFF (WAV/WebP)"
        else:
            info["magic"] = "Unknown"

        return info
