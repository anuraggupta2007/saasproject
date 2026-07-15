import email
from email import policy
from email.message import Message
from email.parser import BytesParser
from typing import Any

from src.core.logging import get_logger

logger = get_logger(__name__)


class MimeParser:
    def __init__(self):
        self.max_nesting_depth = 50
        self.max_part_count = 1000

    def parse(
        self,
        raw_content: str | bytes,
        preserve_headers: bool = True,
    ) -> dict[str, Any]:
        if isinstance(raw_content, str):
            raw_content = raw_content.encode("utf-8", errors="replace")

        try:
            msg = BytesParser(policy=policy.default).parsebytes(raw_content)
        except Exception as e:
            logger.error("mime_parse_failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
                "message": None,
                "parts": [],
            }

        parsed = self._parse_message(msg, preserve_headers)

        return {
            "success": True,
            "message": parsed,
            "parts": self._extract_all_parts(parsed),
        }

    def _parse_message(
        self,
        msg: Message,
        preserve_headers: bool = True,
        depth: int = 0,
    ) -> dict[str, Any]:
        if depth > self.max_nesting_depth:
            logger.warning("max_nesting_depth_exceeded", depth=depth)
            return self._create_error_part("Maximum nesting depth exceeded")

        content_type = msg.get_content_type()
        content_subtype = msg.get_content_subtype() if hasattr(msg, "get_content_subtype") else None

        charset = None
        if hasattr(msg, "get_content_charset"):
            charset = msg.get_content_charset()

        content_disposition = None
        if msg.get_content_disposition():
            content_disposition = msg.get_content_disposition()

        content_id = msg.get("Content-ID", "").strip("<>")

        filename = None
        if hasattr(msg, "get_filename"):
            filename = msg.get_filename()

        headers = {}
        if preserve_headers:
            for key, value in msg.items():
                if key not in headers:
                    headers[key] = value
                else:
                    if isinstance(headers[key], list):
                        headers[key].append(value)
                    else:
                        headers[key] = [headers[key], value]

        part = {
            "content_type": content_type,
            "content_subtype": content_subtype,
            "charset": charset,
            "content_encoding": msg.get("Content-Transfer-Encoding"),
            "content_disposition": content_disposition,
            "content_id": content_id,
            "filename": filename,
            "headers": headers,
            "boundary": None,
            "raw_size": len(msg.as_bytes()),
            "children": [],
            "payload": None,
        }

        if msg.get_content_maintype() == "multipart":
            part["boundary"] = msg.get_boundary()
            for i, subpart in enumerate(msg.iter_parts()):
                if len(part["children"]) >= self.max_part_count:
                    logger.warning("max_part_count_exceeded", count=i)
                    break
                child = self._parse_message(subpart, preserve_headers, depth + 1)
                child["part_index"] = i
                part["children"].append(child)
        else:
            try:
                payload = msg.get_payload(decode=False)
                if isinstance(payload, str):
                    part["payload"] = payload
                elif isinstance(payload, bytes):
                    part["payload"] = payload.decode(charset or "utf-8", errors="replace")
                else:
                    part["payload"] = str(payload) if payload else None
            except Exception as e:
                logger.warning("payload_decode_failed", error=str(e))
                part["payload"] = None

        return part

    def _create_error_part(self, error_message: str) -> dict[str, Any]:
        return {
            "content_type": "application/octet-stream",
            "content_subtype": "octet-stream",
            "charset": None,
            "content_encoding": None,
            "content_disposition": None,
            "content_id": None,
            "filename": None,
            "headers": {},
            "boundary": None,
            "raw_size": 0,
            "children": [],
            "payload": None,
            "error": error_message,
        }

    def _extract_all_parts(
        self,
        part: dict[str, Any],
        depth: int = 0,
    ) -> list[dict[str, Any]]:
        parts = []

        part_info = {
            "content_type": part.get("content_type"),
            "content_subtype": part.get("content_subtype"),
            "charset": part.get("charset"),
            "content_encoding": part.get("content_encoding"),
            "content_disposition": part.get("content_disposition"),
            "content_id": part.get("content_id"),
            "filename": part.get("filename"),
            "raw_size": part.get("raw_size", 0),
            "nesting_level": depth,
            "part_index": part.get("part_index", 0),
            "has_children": bool(part.get("children")),
            "error": part.get("error"),
        }
        parts.append(part_info)

        for child in part.get("children", []):
            child_parts = self._extract_all_parts(child, depth + 1)
            parts.extend(child_parts)

        return parts

    def get_headers(self, raw_content: str | bytes) -> dict[str, Any]:
        if isinstance(raw_content, str):
            raw_content = raw_content.encode("utf-8", errors="replace")

        try:
            msg = BytesParser(policy=policy.default).parsebytes(raw_content)
            return dict(msg.items())
        except Exception as e:
            logger.error("header_parse_failed", error=str(e))
            return {}

    def get_content_type_hierarchy(
        self,
        part: dict[str, Any],
    ) -> list[str]:
        hierarchy = [part.get("content_type", "")]

        for child in part.get("children", []):
            child_hierarchy = self.get_content_type_hierarchy(child)
            for ct in child_hierarchy:
                if ct not in hierarchy:
                    hierarchy.append(ct)

        return hierarchy
