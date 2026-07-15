from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.base import BaseRepository
from src.modules.public_api.models import (
    APIKey, APIKeyUsageLog, Webhook, WebhookDelivery,
    RateLimit, OAuth2Client, APIAuditLog
)


class APIKeyRepository(BaseRepository[APIKey]):
    def __init__(self, session: AsyncSession):
        super().__init__(APIKey, session)

    async def create_key(
        self,
        user_id: UUID,
        name: str,
        key_prefix: str,
        key_hash: str,
        scopes: list[str],
        tier: str = "free",
        expires_at: datetime = None,
        ip_restrictions: list[str] = None,
        rate_limit_override: int = None,
        daily_quota_override: int = None,
        metadata: dict = None,
    ) -> APIKey:
        key = APIKey(
            user_id=user_id,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            scopes=scopes,
            tier=tier,
            expires_at=expires_at,
            ip_restrictions=ip_restrictions or [],
            rate_limit_override=rate_limit_override,
            daily_quota_override=daily_quota_override,
            metadata_=metadata or {},
        )
        self.session.add(key)
        await self.session.commit()
        await self.session.refresh(key)
        return key

    async def get_by_hash(self, key_hash: str) -> Optional[APIKey]:
        query = select(APIKey).where(APIKey.key_hash == key_hash)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_user_keys(self, user_id: UUID, active_only: bool = True) -> list[APIKey]:
        query = select(APIKey).where(APIKey.user_id == user_id)
        if active_only:
            query = query.where(APIKey.is_active == True)
        query = query.order_by(APIKey.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def deactivate_key(self, key_id: UUID) -> bool:
        stmt = update(APIKey).where(APIKey.id == key_id).values(is_active=False)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount > 0

    async def rotate_key(self, key_id: UUID, new_key_hash: str, new_prefix: str) -> Optional[APIKey]:
        stmt = (
            update(APIKey)
            .where(APIKey.id == key_id)
            .values(
                key_hash=new_key_hash,
                key_prefix=new_prefix,
                updated_at=datetime.utcnow(),
            )
            .returning(APIKey)
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.scalar_one_or_none()

    async def update_last_used(self, key_id: UUID):
        stmt = update(APIKey).where(APIKey.id == key_id).values(last_used_at=datetime.utcnow())
        await self.session.execute(stmt)
        await self.session.commit()

    async def get_expired_keys(self) -> list[APIKey]:
        now = datetime.utcnow()
        query = select(APIKey).where(
            and_(APIKey.expires_at != None, APIKey.expires_at < now, APIKey.is_active == True)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def count_user_keys(self, user_id: UUID) -> int:
        query = select(func.count()).where(APIKey.user_id == user_id)
        result = await self.session.execute(query)
        return result.scalar()


class APIKeyUsageRepository(BaseRepository[APIKeyUsageLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(APIKeyUsageLog, session)

    async def log_usage(
        self,
        api_key_id: UUID,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: int = None,
        ip_address: str = None,
        user_agent: str = None,
        request_size_bytes: int = None,
        response_size_bytes: int = None,
    ) -> APIKeyUsageLog:
        log = APIKeyUsageLog(
            api_key_id=api_key_id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            ip_address=ip_address,
            user_agent=user_agent,
            request_size_bytes=request_size_bytes,
            response_size_bytes=response_size_bytes,
        )
        self.session.add(log)
        await self.session.commit()
        return log

    async def get_usage_count(
        self, api_key_id: UUID, since: datetime, endpoint: str = None
    ) -> int:
        query = select(func.count()).where(
            and_(APIKeyUsageLog.api_key_id == api_key_id, APIKeyUsageLog.timestamp >= since)
        )
        if endpoint:
            query = query.where(APIKeyUsageLog.endpoint == endpoint)
        result = await self.session.execute(query)
        return result.scalar()

    async def get_usage_summary(self, api_key_id: UUID, hours: int = 24) -> dict:
        since = datetime.utcnow() - timedelta(hours=hours)
        query = (
            select(
                func.count().label("total_requests"),
                func.avg(APIKeyUsageLog.response_time_ms).label("avg_response_time"),
                func.sum(func.cast(APIKeyUsageLog.status_code >= 400, Integer)).label("errors"),
            )
            .where(
                and_(APIKeyUsageLog.api_key_id == api_key_id, APIKeyUsageLog.timestamp >= since)
            )
        )
        result = await self.session.execute(query)
        row = result.one()
        total = row.total_requests or 0
        return {
            "total_requests": total,
            "avg_response_time_ms": float(row.avg_response_time or 0),
            "errors": row.errors or 0,
            "error_rate": (row.errors or 0) / total if total > 0 else 0,
        }


class WebhookRepository(BaseRepository[Webhook]):
    def __init__(self, session: AsyncSession):
        super().__init__(Webhook, session)

    async def create_webhook(
        self,
        user_id: UUID,
        url: str,
        events: list[str],
        secret: str,
        description: str = None,
        metadata: dict = None,
    ) -> Webhook:
        webhook = Webhook(
            user_id=user_id,
            url=url,
            events=events,
            secret=secret,
            description=description,
            metadata_=metadata or {},
        )
        self.session.add(webhook)
        await self.session.commit()
        await self.session.refresh(webhook)
        return webhook

    async def get_user_webhooks(self, user_id: UUID) -> list[Webhook]:
        query = select(Webhook).where(Webhook.user_id == user_id).order_by(Webhook.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_active_for_event(self, event: str) -> list[Webhook]:
        query = select(Webhook).where(
            and_(Webhook.is_active == True, Webhook.events.contains([event]))
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def deactivate_webhook(self, webhook_id: UUID) -> bool:
        stmt = update(Webhook).where(Webhook.id == webhook_id).values(is_active=False)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount > 0


class WebhookDeliveryRepository(BaseRepository[WebhookDelivery]):
    def __init__(self, session: AsyncSession):
        super().__init__(WebhookDelivery, session)

    async def create_delivery(
        self,
        webhook_id: UUID,
        event: str,
        payload: dict,
        max_attempts: int = 5,
    ) -> WebhookDelivery:
        delivery = WebhookDelivery(
            webhook_id=webhook_id,
            event=event,
            payload=payload,
            max_attempts=max_attempts,
        )
        self.session.add(delivery)
        await self.session.commit()
        await self.session.refresh(delivery)
        return delivery

    async def update_delivery(
        self,
        delivery_id: UUID,
        status: str = None,
        status_code: int = None,
        response_body: str = None,
        attempts: int = None,
        next_retry_at: datetime = None,
        error_message: str = None,
    ) -> Optional[WebhookDelivery]:
        values = {}
        if status: values["status"] = status
        if status_code: values["status_code"] = status_code
        if response_body: values["response_body"] = response_body
        if attempts is not None: values["attempts"] = attempts
        if next_retry_at: values["next_retry_at"] = next_retry_at
        if error_message: values["error_message"] = error_message
        if status == "delivered": values["completed_at"] = datetime.utcnow()

        stmt = update(WebhookDelivery).where(WebhookDelivery.id == delivery_id).values(**values).returning(WebhookDelivery)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.scalar_one_or_none()

    async def get_pending_retries(self, limit: int = 100) -> list[WebhookDelivery]:
        now = datetime.utcnow()
        query = (
            select(WebhookDelivery)
            .where(
                and_(
                    WebhookDelivery.status == "retrying",
                    WebhookDelivery.next_retry_at <= now,
                    WebhookDelivery.attempts < WebhookDelivery.max_attempts,
                )
            )
            .order_by(WebhookDelivery.next_retry_at)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())


class RateLimitRepository(BaseRepository[RateLimit]):
    def __init__(self, session: AsyncSession):
        super().__init__(RateLimit, session)

    async def get_or_create_window(
        self, api_key_id: UUID, window_start: datetime, window_type: str
    ) -> RateLimit:
        query = select(RateLimit).where(
            and_(
                RateLimit.api_key_id == api_key_id,
                RateLimit.window_start == window_start,
                RateLimit.window_type == window_type,
            )
        )
        result = await self.session.execute(query)
        limit = result.scalar_one_or_none()
        if not limit:
            limit = RateLimit(
                api_key_id=api_key_id,
                window_start=window_start,
                window_type=window_type,
            )
            self.session.add(limit)
            await self.session.commit()
        return limit

    async def increment_count(self, api_key_id: UUID, window_start: datetime, window_type: str) -> int:
        limit = await self.get_or_create_window(api_key_id, window_start, window_type)
        limit.request_count += 1
        await self.session.commit()
        return limit.request_count


class OAuth2ClientRepository(BaseRepository[OAuth2Client]):
    def __init__(self, session: AsyncSession):
        super().__init__(OAuth2Client, session)

    async def create_client(
        self,
        user_id: UUID,
        client_id: str,
        client_secret_hash: str,
        name: str,
        description: str = None,
        redirect_uris: list[str] = None,
        grant_types: list[str] = None,
        scopes: list[str] = None,
    ) -> OAuth2Client:
        client = OAuth2Client(
            user_id=user_id,
            client_id=client_id,
            client_secret_hash=client_secret_hash,
            name=name,
            description=description,
            redirect_uris=redirect_uris or [],
            grant_types=grant_types or ["client_credentials"],
            scopes=scopes or ["read"],
        )
        self.session.add(client)
        await self.session.commit()
        await self.session.refresh(client)
        return client

    async def get_by_client_id(self, client_id: str) -> Optional[OAuth2Client]:
        query = select(OAuth2Client).where(OAuth2Client.client_id == client_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_user_clients(self, user_id: UUID) -> list[OAuth2Client]:
        query = select(OAuth2Client).where(OAuth2Client.user_id == user_id).order_by(OAuth2Client.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())


class APIAuditLogRepository(BaseRepository[APIAuditLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(APIAuditLog, session)

    async def log_action(
        self,
        action: str,
        api_key_id: UUID = None,
        user_id: UUID = None,
        resource_type: str = None,
        resource_id: str = None,
        details: dict = None,
        ip_address: str = None,
        user_agent: str = None,
    ) -> APIAuditLog:
        log = APIAuditLog(
            api_key_id=api_key_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.session.add(log)
        await self.session.commit()
        return log

    async def get_recent_logs(
        self,
        user_id: UUID = None,
        api_key_id: UUID = None,
        action: str = None,
        limit: int = 100,
    ) -> list[APIAuditLog]:
        query = select(APIAuditLog)
        if user_id:
            query = query.where(APIAuditLog.user_id == user_id)
        if api_key_id:
            query = query.where(APIAuditLog.api_key_id == api_key_id)
        if action:
            query = query.where(APIAuditLog.action == action)
        query = query.order_by(APIAuditLog.timestamp.desc()).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all())
