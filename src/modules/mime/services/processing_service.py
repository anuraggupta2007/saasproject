import time
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.mime.models.base import (
    MimeMessage,
    MimePart,
    MimeBody,
    MimeAttachment,
    MimeParseLog,
    ParseStatus,
    SecurityFlag,
)
from src.modules.mime.repositories.mime import (
    MimeMessageRepository,
    MimePartRepository,
    MimeBodyRepository,
    MimeAttachmentRepository,
    MimeParseLogRepository,
)
from src.modules.mime.services.parser import MimeParser
from src.modules.mime.services.decoder import ContentDecoder
from src.modules.mime.services.html_processor import HtmlProcessor
from src.modules.mime.services.text_processor import TextProcessor
from src.modules.mime.services.attachment_extractor import AttachmentExtractor
from src.modules.mime.security.validator import SecurityValidator

logger = get_logger(__name__)


class MimeProcessingService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.message_repo = MimeMessageRepository(session)
        self.part_repo = MimePartRepository(session)
        self.body_repo = MimeBodyRepository(session)
        self.attachment_repo = MimeAttachmentRepository(session)
        self.log_repo = MimeParseLogRepository(session)

        self.parser = MimeParser()
        self.decoder = ContentDecoder()
        self.html_processor = HtmlProcessor()
        self.text_processor = TextProcessor()
        self.attachment_extractor = AttachmentExtractor()
        self.security_validator = SecurityValidator()

    async def process_message(
        self,
        user_id: uuid.UUID,
        upload_id: uuid.UUID,
        raw_content: str | bytes,
    ) -> dict[str, Any]:
        start_time = time.time()

        message = MimeMessage(
            upload_id=upload_id,
            user_id=user_id,
            content_type="message/rfc822",
            total_size=len(raw_content) if isinstance(raw_content, bytes) else len(raw_content.encode("utf-8")),
            parse_status=ParseStatus.PARSING,
        )
        message = await self.message_repo.create(message)

        try:
            parse_result = self.parser.parse(raw_content)

            if not parse_result["success"]:
                await self._mark_failed(message.id, parse_result["error"])
                return {
                    "message_id": message.id,
                    "status": ParseStatus.FAILED,
                    "error": parse_result["error"],
                }

            root_part = parse_result["message"]

            await self._update_message_headers(message.id, root_part)

            mime_parts = await self._process_parts(
                message.id,
                root_part,
            )

            body_result = await self._process_body(
                message.id,
                root_part,
            )

            attachments = await self._extract_attachments(
                message.id,
                mime_parts,
            )

            security_result = await self._validate_security(
                message.id,
                root_part,
                attachments,
            )

            duration_ms = int((time.time() - start_time) * 1000)

            await self.message_repo.update(
                message.id,
                parse_status=ParseStatus.COMPLETED,
                parse_duration_ms=duration_ms,
                security_flag=security_result["flag"],
                security_details=security_result,
            )

            await self._log_event(
                message.id,
                "parsing_completed",
                "info",
                f"Message parsed successfully in {duration_ms}ms",
                {"duration_ms": duration_ms, "parts_count": len(mime_parts)},
            )

            logger.info(
                "message_parsed",
                message_id=str(message.id),
                duration_ms=duration_ms,
                parts_count=len(mime_parts),
                attachments_count=len(attachments),
            )

            return {
                "message_id": message.id,
                "status": ParseStatus.COMPLETED,
                "duration_ms": duration_ms,
                "parts_count": len(mime_parts),
                "attachments_count": len(attachments),
                "has_html": body_result.get("html_body") is not None,
                "has_text": body_result.get("text_body") is not None,
                "security_flag": security_result["flag"],
            }

        except Exception as e:
            logger.error("message_processing_failed", error=str(e))
            await self._mark_failed(message.id, str(e))
            raise

    async def get_message(
        self,
        message_id: uuid.UUID,
    ) -> MimeMessage | None:
        return await self.message_repo.get_with_parts(message_id)

    async def get_message_by_upload(
        self,
        upload_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> MimeMessage | None:
        return await self.message_repo.get_by_upload_id(upload_id, user_id)

    async def list_messages(
        self,
        user_id: uuid.UUID,
        status: ParseStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[MimeMessage], int]:
        return await self.message_repo.list_user_messages(
            user_id, status, page, page_size
        )

    async def get_html_body(
        self,
        message_id: uuid.UUID,
    ) -> dict[str, Any] | None:
        body = await self.body_repo.get_by_message_id(message_id)
        if not body or not body.html_body:
            return None

        return {
            "html": body.html_body,
            "size": body.html_size,
            "sanitized": body.html_sanitized,
            "cid_images": body.cid_images,
            "has_external_resources": body.has_external_resources,
        }

    async def get_text_body(
        self,
        message_id: uuid.UUID,
    ) -> dict[str, Any] | None:
        body = await self.body_repo.get_by_message_id(message_id)
        if not body or not body.text_body:
            return None

        return {
            "text": body.text_body,
            "size": body.text_size,
            "preview": body.preview_text,
        }

    async def get_attachments(
        self,
        message_id: uuid.UUID,
    ) -> list[MimeAttachment]:
        return await self.attachment_repo.get_message_attachments(message_id)

    async def get_attachment(
        self,
        attachment_id: uuid.UUID,
    ) -> MimeAttachment | None:
        return await self.attachment_repo.get_by_id(attachment_id)

    async def get_attachment_by_content_id(
        self,
        content_id: str,
    ) -> MimeAttachment | None:
        return await self.attachment_repo.get_by_content_id(content_id)

    async def list_parts(
        self,
        message_id: uuid.UUID,
    ) -> dict[str, Any]:
        parts = await self.part_repo.get_message_parts(message_id)
        attachments = await self.attachment_repo.get_message_attachments(message_id)

        max_depth = max((p.nesting_level for p in parts), default=0)

        return {
            "parts": parts,
            "total_count": len(parts),
            "attachment_count": len(attachments),
            "nesting_depth": max_depth,
        }

    async def get_preview(
        self,
        message_id: uuid.UUID,
    ) -> dict[str, Any] | None:
        message = await self.message_repo.get_by_id(message_id)
        if not message:
            return None

        body = await self.body_repo.get_by_message_id(message_id)
        attachments = await self.attachment_repo.get_message_attachments(message_id)

        preview_text = body.preview_text if body else None

        return {
            "message_id": message.id,
            "subject": message.subject,
            "from_address": message.from_address,
            "date": message.date,
            "preview_text": preview_text,
            "has_attachments": len(attachments) > 0,
            "attachment_count": len(attachments),
            "content_type": message.content_type,
        }

    async def get_stats(
        self,
        user_id: uuid.UUID,
    ) -> dict[str, Any]:
        base_stats = await self.message_repo.get_stats(user_id)

        return {
            "total_messages": base_stats["total_messages"],
            "parsed_messages": base_stats["parsed_messages"],
            "total_size": base_stats["total_size"],
        }

    async def _update_message_headers(
        self,
        message_id: uuid.UUID,
        root_part: dict[str, Any],
    ) -> None:
        headers = root_part.get("headers", {})

        subject = headers.get("Subject", "")
        if isinstance(subject, list):
            subject = subject[0] if subject else ""

        from_addr = headers.get("From", "")
        if isinstance(from_addr, list):
            from_addr = from_addr[0] if from_addr else ""

        to_addrs = headers.get("To", "")
        if isinstance(to_addrs, str):
            to_addrs = [to_addrs] if to_addrs else []
        elif not isinstance(to_addrs, list):
            to_addrs = []

        cc_addrs = headers.get("Cc", "")
        if isinstance(cc_addrs, str):
            cc_addrs = [cc_addrs] if cc_addrs else []
        elif not isinstance(cc_addrs, list):
            cc_addrs = []

        date_str = headers.get("Date", "")

        update_kwargs = {
            "subject": subject,
            "from_address": from_addr,
            "to_addresses": to_addrs,
            "cc_addresses": cc_addrs,
            "content_type": root_part.get("content_type", "message/rfc822"),
            "message_id": headers.get("Message-ID", ""),
        }

        await self.message_repo.update(message_id, **update_kwargs)

    async def _process_parts(
        self,
        message_id: uuid.UUID,
        part: dict[str, Any],
        parent_id: uuid.UUID | None = None,
        index: int = 0,
        depth: int = 0,
    ) -> list[MimePart]:
        parts = []

        mime_part = MimePart(
            message_id=message_id,
            parent_part_id=parent_id,
            part_index=index,
            content_type=part.get("content_type", "application/octet-stream"),
            content_subtype=part.get("content_subtype"),
            charset=part.get("charset"),
            content_encoding=part.get("content_encoding"),
            content_disposition=part.get("content_disposition"),
            content_id=part.get("content_id"),
            filename=part.get("filename"),
            raw_size=part.get("raw_size", 0),
            nesting_level=depth,
            boundary=part.get("boundary"),
            headers=part.get("headers"),
            is_attachment=bool(part.get("filename")),
            is_inline=part.get("content_disposition") == "inline",
        )

        mime_part = await self.part_repo.create(mime_part)
        parts.append(mime_part)

        for i, child in enumerate(part.get("children", [])):
            child_parts = await self._process_parts(
                message_id,
                child,
                parent_id=mime_part.id,
                index=i,
                depth=depth + 1,
            )
            parts.extend(child_parts)

        return parts

    async def _process_body(
        self,
        message_id: uuid.UUID,
        root_part: dict[str, Any],
    ) -> dict[str, Any]:
        html_body = None
        text_body = None
        cid_images = {}

        html_parts = self._find_parts_by_type(root_part, "text/html")
        text_parts = self._find_parts_by_type(root_part, "text/plain")

        for html_part in html_parts:
            if html_part.get("payload"):
                decoded = self.decoder.decode_text(
                    html_part["payload"],
                    html_part.get("content_encoding"),
                    html_part.get("charset"),
                )
                html_body = decoded
                break

        for text_part in text_parts:
            if text_part.get("payload"):
                decoded = self.decoder.decode_text(
                    text_part["payload"],
                    text_part.get("content_encoding"),
                    text_part.get("charset"),
                )
                text_body = decoded
                break

        inline_parts = self._find_inline_parts(root_part)
        for inline in inline_parts:
            content_id = inline.get("content_id")
            if content_id:
                cid_images[content_id] = f"cid:{content_id}"

        html_result = None
        if html_body:
            html_result = self.html_processor.process(
                html_body,
                cid_images=cid_images,
            )

        text_result = None
        if text_body:
            text_result = self.text_processor.process(text_body)

        body = MimeBody(
            message_id=message_id,
            html_body=html_result["html"] if html_result else None,
            html_size=html_result["size"] if html_result else 0,
            text_body=text_result["text"] if text_result else None,
            text_size=text_result["size"] if text_result else 0,
            preview_text=text_result.get("preview") if text_result else None,
            html_sanitized=html_result.get("sanitized", False) if html_result else False,
            cid_images=cid_images if cid_images else None,
            embedded_count=len(cid_images),
            link_count=html_result.get("link_count", 0) if html_result else 0,
            has_tracking_pixels=html_result.get("has_tracking_pixels", False) if html_result else False,
            has_external_resources=html_result.get("has_external_resources", False) if html_result else False,
        )

        body = await self.body_repo.create(body)

        return {
            "html_body": html_body,
            "text_body": text_body,
            "body_id": body.id,
        }

    async def _extract_attachments(
        self,
        message_id: uuid.UUID,
        parts: list[MimePart],
    ) -> list[MimeAttachment]:
        attachments = []

        for part in parts:
            if part.is_attachment or part.filename:
                content_id = part.content_id
                filename = part.filename or f"attachment_{part.id}"

                attachment = MimeAttachment(
                    message_id=message_id,
                    part_id=part.id,
                    filename=filename,
                    safe_filename=filename,
                    content_type=part.content_type,
                    content_id=content_id,
                    content_disposition=part.content_disposition or "attachment",
                    file_size=part.raw_size,
                    sha256_hash=part.sha256_hash or "",
                    is_inline=part.is_inline,
                    extension=self._get_extension(filename),
                    security_flag=part.security_flag,
                    is_safe=part.security_flag == SecurityFlag.NONE,
                )

                attachment = await self.attachment_repo.create(attachment)
                attachments.append(attachment)

        return attachments

    async def _validate_security(
        self,
        message_id: uuid.UUID,
        root_part: dict[str, Any],
        attachments: list[MimeAttachment],
    ) -> dict[str, Any]:
        all_parts = self._flatten_parts(root_part)

        message_result = self.security_validator.validate_message(
            message_size=root_part.get("raw_size", 0),
            part_count=len(all_parts),
            nesting_depth=self._get_max_depth(root_part),
        )

        part_flags = []
        for part in all_parts:
            part_result = self.security_validator.validate_part(
                content_type=part.get("content_type", ""),
                content_disposition=part.get("content_disposition"),
                filename=part.get("filename"),
                content_id=part.get("content_id"),
            )
            part_flags.append(part_result["flags"])

        html_parts = self._find_parts_by_type(root_part, "text/html")
        for html_part in html_parts:
            if html_part.get("payload"):
                decoded = self.decoder.decode_text(
                    html_part["payload"],
                    html_part.get("content_encoding"),
                    html_part.get("charset"),
                )
                html_result = self.security_validator.scan_html_content(decoded)
                if not html_result["is_safe"]:
                    part_flags.append(html_result["flags"])

        summary = self.security_validator.get_security_summary(
            message_result["flags"],
            part_flags,
        )

        return summary

    def _find_parts_by_type(
        self,
        part: dict[str, Any],
        content_type: str,
    ) -> list[dict[str, Any]]:
        results = []

        if part.get("content_type") == content_type:
            results.append(part)

        for child in part.get("children", []):
            results.extend(self._find_parts_by_type(child, content_type))

        return results

    def _find_inline_parts(
        self,
        part: dict[str, Any],
    ) -> list[dict[str, Any]]:
        results = []

        if part.get("content_id") and part.get("content_type", "").startswith("image/"):
            results.append(part)

        for child in part.get("children", []):
            results.extend(self._find_inline_parts(child))

        return results

    def _flatten_parts(
        self,
        part: dict[str, Any],
    ) -> list[dict[str, Any]]:
        results = [part]

        for child in part.get("children", []):
            results.extend(self._flatten_parts(child))

        return results

    def _get_max_depth(
        self,
        part: dict[str, Any],
        current_depth: int = 0,
    ) -> int:
        max_depth = current_depth

        for child in part.get("children", []):
            child_depth = self._get_max_depth(child, current_depth + 1)
            max_depth = max(max_depth, child_depth)

        return max_depth

    def _get_extension(self, filename: str) -> str | None:
        from pathlib import Path
        ext = Path(filename).suffix.lower()
        return ext if ext else None

    async def _mark_failed(
        self,
        message_id: uuid.UUID,
        error: str,
    ) -> None:
        await self.message_repo.update(
            message_id,
            parse_status=ParseStatus.FAILED,
            error_message=error,
        )

        await self._log_event(
            message_id,
            "parsing_failed",
            "error",
            error,
        )

    async def _log_event(
        self,
        message_id: uuid.UUID,
        event_type: str,
        severity: str,
        message: str,
        details: dict | None = None,
        duration_ms: int | None = None,
    ) -> None:
        log = MimeParseLog(
            message_id=message_id,
            event_type=event_type,
            severity=severity,
            message=message,
            details=details,
            duration_ms=duration_ms,
        )
        await self.log_repo.create(log)
