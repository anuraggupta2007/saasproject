import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.payment.models.webhook_event import WebhookEvent, WebhookEventStatus
from src.models.base import BaseRepository


class WebhookEventRepository(BaseRepository[WebhookEvent]):
    def __init__(self, session: AsyncSession):
        super().__init__(WebhookEvent, session)

    async def get_by_provider_event_id(self, provider_event_id: str) -> Optional[WebhookEvent]:
        result = await self.session.execute(
            select(WebhookEvent).where(WebhookEvent.provider_event_id == provider_event_id)
        )
        return result.scalar_one_or_none()

    async def get_by_idempotency_key(self, idempotency_key: str) -> Optional[WebhookEvent]:
        result = await self.session.execute(
            select(WebhookEvent).where(WebhookEvent.idempotency_key == idempotency_key)
        )
        return result.scalar_one_or_none()

    async def get_pending_events(
        self,
        limit: int = 100,
    ) -> list[WebhookEvent]:
        result = await self.session.execute(
            select(WebhookEvent).where(
                and_(
                    WebhookEvent.status == WebhookEventStatus.PENDING,
                    WebhookEvent.retry_count < WebhookEvent.max_retries,
                )
            ).order_by(WebhookEvent.created_at.asc()).limit(limit)
        )
        return list(result.scalars().all())

    async def get_failed_events(self) -> list[WebhookEvent]:
        result = await self.session.execute(
            select(WebhookEvent).where(
                WebhookEvent.status == WebhookEventStatus.FAILED
            ).order_by(WebhookEvent.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_status(
        self,
        event_id: uuid.UUID,
        status: WebhookEventStatus,
        error_message: Optional[str] = None,
    ) -> Optional[WebhookEvent]:
        event = await self.get_by_id(event_id)
        if event:
            event.status = status
            if status == WebhookEventStatus.PROCESSED:
                event.processed_at = datetime.now(timezone.utc)
            elif status == WebhookEventStatus.FAILED:
                event.error_message = error_message
                event.retry_count += 1
            await self.session.commit()
            await self.session.refresh(event)
        return event

    async def count_by_status(self) -> dict:
        result = await self.session.execute(
            select(WebhookEvent.status, func.count()).group_by(WebhookEvent.status)
        )
        return {row[0].value: row[1] for row in result.all()}

    async def is_duplicate(self, provider_event_id: str) -> bool:
        existing = await self.get_by_provider_event_id(provider_event_id)
        return existing is not None
