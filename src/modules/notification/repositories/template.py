import uuid
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.notification.models.template import (
    NotificationTemplate,
    TemplateType,
    DeliveryLog,
    UserNotificationPreference,
    ProviderConfig,
)
from src.models.base import BaseRepository


class TemplateRepository(BaseRepository[NotificationTemplate]):
    def __init__(self, session: AsyncSession):
        super().__init__(NotificationTemplate, session)

    async def get_by_name_and_locale(
        self,
        name: str,
        locale: str = "en",
    ) -> Optional[NotificationTemplate]:
        result = await self.session.execute(
            select(NotificationTemplate).where(
                and_(
                    NotificationTemplate.name == name,
                    NotificationTemplate.locale == locale,
                    NotificationTemplate.is_active == True,
                )
            ).order_by(NotificationTemplate.version.desc())
        )
        return result.scalar_one_or_none()

    async def get_templates_by_type(
        self,
        template_type: TemplateType,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[NotificationTemplate], int]:
        query = select(NotificationTemplate).where(
            NotificationTemplate.template_type == template_type
        )

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(NotificationTemplate.name.asc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        templates = list(result.scalars().all())

        return templates, total

    async def increment_version(self, template_id: uuid.UUID) -> Optional[NotificationTemplate]:
        template = await self.get_by_id(template_id)
        if template:
            template.version += 1
            await self.session.commit()
            await self.session.refresh(template)
        return template


class DeliveryLogRepository(BaseRepository[DeliveryLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(DeliveryLog, session)

    async def get_by_notification(self, notification_id: uuid.UUID) -> list[DeliveryLog]:
        result = await self.session.execute(
            select(DeliveryLog).where(
                DeliveryLog.notification_id == notification_id
            ).order_by(DeliveryLog.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_logs_by_status(
        self,
        status: str,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[DeliveryLog], int]:
        query = select(DeliveryLog).where(DeliveryLog.status == status)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(DeliveryLog.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        logs = list(result.scalars().all())

        return logs, total

    async def count_by_status(self) -> dict:
        result = await self.session.execute(
            select(DeliveryLog.status, func.count()).group_by(DeliveryLog.status)
        )
        return {row[0]: row[1] for row in result.all()}

    async def count_by_provider(self) -> dict:
        result = await self.session.execute(
            select(DeliveryLog.provider, func.count()).group_by(DeliveryLog.provider)
        )
        return {row[0] or "unknown": row[1] for row in result.all()}


class UserPreferencesRepository(BaseRepository[UserNotificationPreference]):
    def __init__(self, session: AsyncSession):
        super().__init__(UserNotificationPreference, session)

    async def get_by_user(self, user_id: uuid.UUID) -> Optional[UserNotificationPreference]:
        result = await self.session.execute(
            select(UserNotificationPreference).where(
                UserNotificationPreference.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def get_or_create(self, user_id: uuid.UUID) -> UserNotificationPreference:
        prefs = await self.get_by_user(user_id)
        if not prefs:
            prefs = UserNotificationPreference(user_id=user_id)
            self.session.add(prefs)
            await self.session.commit()
            await self.session.refresh(prefs)
        return prefs

    async def is_channel_enabled(self, user_id: uuid.UUID, channel: str) -> bool:
        prefs = await self.get_by_user(user_id)
        if not prefs:
            return True

        channel_map = {
            "email": prefs.email_enabled,
            "sms": prefs.sms_enabled,
            "push": prefs.push_enabled,
            "in_app": prefs.in_app_enabled,
            "webhook": prefs.webhook_enabled,
        }

        return channel_map.get(channel, True)

    async def is_quiet_hours(self, user_id: uuid.UUID) -> bool:
        from datetime import datetime, timezone
        import pytz

        prefs = await self.get_by_user(user_id)
        if not prefs or prefs.quiet_hours_start is None or prefs.quiet_hours_end is None:
            return False

        tz = pytz.timezone(prefs.timezone_str or "UTC")
        now = datetime.now(tz)
        current_hour = now.hour

        start = prefs.quiet_hours_start
        end = prefs.quiet_hours_end

        if start <= end:
            return start <= current_hour < end
        else:
            return current_hour >= start or current_hour < end


class ProviderConfigRepository(BaseRepository[ProviderConfig]):
    def __init__(self, session: AsyncSession):
        super().__init__(ProviderConfig, session)

    async def get_active_provider(
        self,
        provider_type: str,
    ) -> Optional[ProviderConfig]:
        result = await self.session.execute(
            select(ProviderConfig).where(
                and_(
                    ProviderConfig.provider_type == provider_type,
                    ProviderConfig.is_active == True,
                )
            ).order_by(ProviderConfig.priority.desc())
        )
        return result.scalar_one_or_none()

    async def get_providers_by_type(self, provider_type: str) -> list[ProviderConfig]:
        result = await self.session.execute(
            select(ProviderConfig).where(
                ProviderConfig.provider_type == provider_type
            ).order_by(ProviderConfig.priority.desc())
        )
        return list(result.scalars().all())

    async def set_default_provider(self, provider_id: uuid.UUID) -> bool:
        provider = await self.get_by_id(provider_id)
        if not provider:
            return False

        existing_defaults = await self.session.execute(
            select(ProviderConfig).where(
                and_(
                    ProviderConfig.provider_type == provider.provider_type,
                    ProviderConfig.is_default == True,
                )
            )
        )

        for p in existing_defaults.scalars().all():
            p.is_default = False

        provider.is_default = True
        await self.session.commit()
        return True
