import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update, delete, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.mime.models.base import (
    MimeMessage,
    MimePart,
    MimeBody,
    MimeAttachment,
    MimeParseLog,
    ParseStatus,
    SecurityFlag,
)


class MimeMessageRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, message: MimeMessage) -> MimeMessage:
        self.session.add(message)
        await self.session.flush()
        await self.session.refresh(message)
        return message

    async def get_by_id(self, message_id: uuid.UUID) -> MimeMessage | None:
        result = await self.session.execute(
            select(MimeMessage).where(MimeMessage.id == message_id)
        )
        return result.scalar_one_or_none()

    async def get_with_parts(self, message_id: uuid.UUID) -> MimeMessage | None:
        result = await self.session.execute(
            select(MimeMessage)
            .options(selectinload(MimeMessage.parts))
            .options(selectinload(MimeMessage.attachments))
            .options(selectinload(MimeMessage.body))
            .where(MimeMessage.id == message_id)
        )
        return result.scalar_one_or_none()

    async def get_by_upload_id(
        self,
        upload_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> MimeMessage | None:
        result = await self.session.execute(
            select(MimeMessage).where(
                MimeMessage.upload_id == upload_id,
                MimeMessage.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        message_id: uuid.UUID,
        **kwargs,
    ) -> MimeMessage | None:
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.session.execute(
            update(MimeMessage).where(MimeMessage.id == message_id).values(**kwargs)
        )
        await self.session.flush()
        return await self.get_by_id(message_id)

    async def delete(self, message_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            delete(MimeMessage).where(MimeMessage.id == message_id)
        )
        await self.session.flush()
        return result.rowcount > 0

    async def list_user_messages(
        self,
        user_id: uuid.UUID,
        status: ParseStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[MimeMessage], int]:
        query = select(MimeMessage).where(MimeMessage.user_id == user_id)

        if status:
            query = query.where(MimeMessage.parse_status == status)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.offset((page - 1) * page_size).limit(page_size)
        query = query.order_by(MimeMessage.created_at.desc())
        result = await self.session.execute(query)

        return list(result.scalars().all()), total

    async def get_stats(self, user_id: uuid.UUID) -> dict:
        base_query = select(MimeMessage).where(MimeMessage.user_id == user_id)

        total_messages = (
            await self.session.execute(
                select(func.count()).select_from(base_query.subquery())
            )
        ).scalar() or 0

        parsed_messages = (
            await self.session.execute(
                select(func.count()).select_from(
                    base_query.where(
                        MimeMessage.parse_status == ParseStatus.COMPLETED
                    ).subquery()
                )
            )
        ).scalar() or 0

        total_size = (
            await self.session.execute(
                select(func.coalesce(func.sum(MimeMessage.total_size), 0)).where(
                    MimeMessage.user_id == user_id
                )
            )
        ).scalar() or 0

        return {
            "total_messages": total_messages,
            "parsed_messages": parsed_messages,
            "total_size": total_size,
        }


class MimePartRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, part: MimePart) -> MimePart:
        self.session.add(part)
        await self.session.flush()
        await self.session.refresh(part)
        return part

    async def create_many(self, parts: list[MimePart]) -> list[MimePart]:
        self.session.add_all(parts)
        await self.session.flush()
        for part in parts:
            await self.session.refresh(part)
        return parts

    async def get_by_id(self, part_id: uuid.UUID) -> MimePart | None:
        result = await self.session.execute(
            select(MimePart).where(MimePart.id == part_id)
        )
        return result.scalar_one_or_none()

    async def get_message_parts(
        self,
        message_id: uuid.UUID,
    ) -> list[MimePart]:
        result = await self.session.execute(
            select(MimePart)
            .where(MimePart.message_id == message_id)
            .order_by(MimePart.part_index)
        )
        return list(result.scalars().all())

    async def get_parts_by_type(
        self,
        message_id: uuid.UUID,
        content_type: str,
    ) -> list[MimePart]:
        result = await self.session.execute(
            select(MimePart).where(
                MimePart.message_id == message_id,
                MimePart.content_type == content_type,
            )
        )
        return list(result.scalars().all())

    async def get_attachments(
        self,
        message_id: uuid.UUID,
    ) -> list[MimePart]:
        result = await self.session.execute(
            select(MimePart).where(
                MimePart.message_id == message_id,
                MimePart.is_attachment == True,
            )
        )
        return list(result.scalars().all())

    async def delete_message_parts(self, message_id: uuid.UUID) -> int:
        result = await self.session.execute(
            delete(MimePart).where(MimePart.message_id == message_id)
        )
        await self.session.flush()
        return result.rowcount


class MimeBodyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, body: MimeBody) -> MimeBody:
        self.session.add(body)
        await self.session.flush()
        await self.session.refresh(body)
        return body

    async def get_by_message_id(
        self,
        message_id: uuid.UUID,
    ) -> MimeBody | None:
        result = await self.session.execute(
            select(MimeBody).where(MimeBody.message_id == message_id)
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        message_id: uuid.UUID,
        **kwargs,
    ) -> MimeBody | None:
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.session.execute(
            update(MimeBody).where(MimeBody.message_id == message_id).values(**kwargs)
        )
        await self.session.flush()
        return await self.get_by_message_id(message_id)

    async def delete(self, message_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            delete(MimeBody).where(MimeBody.message_id == message_id)
        )
        await self.session.flush()
        return result.rowcount > 0


class MimeAttachmentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, attachment: MimeAttachment) -> MimeAttachment:
        self.session.add(attachment)
        await self.session.flush()
        await self.session.refresh(attachment)
        return attachment

    async def create_many(
        self, attachments: list[MimeAttachment]
    ) -> list[MimeAttachment]:
        self.session.add_all(attachments)
        await self.session.flush()
        for att in attachments:
            await self.session.refresh(att)
        return attachments

    async def get_by_id(self, attachment_id: uuid.UUID) -> MimeAttachment | None:
        result = await self.session.execute(
            select(MimeAttachment).where(MimeAttachment.id == attachment_id)
        )
        return result.scalar_one_or_none()

    async def get_by_content_id(
        self,
        content_id: str,
    ) -> MimeAttachment | None:
        result = await self.session.execute(
            select(MimeAttachment).where(
                MimeAttachment.content_id == content_id
            )
        )
        return result.scalar_one_or_none()

    async def get_message_attachments(
        self,
        message_id: uuid.UUID,
    ) -> list[MimeAttachment]:
        result = await self.session.execute(
            select(MimeAttachment)
            .where(MimeAttachment.message_id == message_id)
            .order_by(MimeAttachment.created_at)
        )
        return list(result.scalars().all())

    async def get_inline_attachments(
        self,
        message_id: uuid.UUID,
    ) -> list[MimeAttachment]:
        result = await self.session.execute(
            select(MimeAttachment).where(
                MimeAttachment.message_id == message_id,
                MimeAttachment.is_inline == True,
            )
        )
        return list(result.scalars().all())

    async def update(
        self,
        attachment_id: uuid.UUID,
        **kwargs,
    ) -> MimeAttachment | None:
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.session.execute(
            update(MimeAttachment)
            .where(MimeAttachment.id == attachment_id)
            .values(**kwargs)
        )
        await self.session.flush()
        return await self.get_by_id(attachment_id)

    async def delete(self, attachment_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            delete(MimeAttachment).where(MimeAttachment.id == attachment_id)
        )
        await self.session.flush()
        return result.rowcount > 0

    async def delete_message_attachments(
        self,
        message_id: uuid.UUID,
    ) -> int:
        result = await self.session.execute(
            delete(MimeAttachment).where(
                MimeAttachment.message_id == message_id
            )
        )
        await self.session.flush()
        return result.rowcount


class MimeParseLogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, log: MimeParseLog) -> MimeParseLog:
        self.session.add(log)
        await self.session.flush()
        await self.session.refresh(log)
        return log

    async def get_message_logs(
        self,
        message_id: uuid.UUID,
        severity: str | None = None,
    ) -> list[MimeParseLog]:
        query = select(MimeParseLog).where(
            MimeParseLog.message_id == message_id
        )

        if severity:
            query = query.where(MimeParseLog.severity == severity)

        query = query.order_by(MimeParseLog.created_at)
        result = await self.session.execute(query)

        return list(result.scalars().all())

    async def get_error_logs(
        self,
        message_id: uuid.UUID,
    ) -> list[MimeParseLog]:
        return await self.get_message_logs(message_id, severity="error")
