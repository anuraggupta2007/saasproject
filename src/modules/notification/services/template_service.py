import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.notification.models.template import (
    NotificationTemplate,
    TemplateType,
    UserNotificationPreference,
)
from src.modules.notification.repositories.template import (
    TemplateRepository,
    UserPreferencesRepository,
)

logger = get_logger(__name__)


class TemplateService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.template_repo = TemplateRepository(session)

    async def create_template(
        self,
        name: str,
        template_type: str,
        body_text: str,
        subject: Optional[str] = None,
        body_html: Optional[str] = None,
        variables: Optional[list] = None,
        locale: str = "en",
        metadata: Optional[dict] = None,
    ) -> NotificationTemplate:
        template = NotificationTemplate(
            name=name,
            template_type=TemplateType(template_type),
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            variables=variables or [],
            locale=locale,
            metadata_json=metadata or {},
        )

        template = await self.template_repo.create(template)

        logger.info(
            "template_created",
            template_id=str(template.id),
            name=name,
            type=template_type,
        )

        return template

    async def get_template(self, template_id: uuid.UUID) -> Optional[NotificationTemplate]:
        return await self.template_repo.get_by_id(template_id)

    async def get_template_by_name(
        self,
        name: str,
        locale: str = "en",
    ) -> Optional[NotificationTemplate]:
        return await self.template_repo.get_by_name_and_locale(name, locale)

    async def update_template(
        self,
        template_id: uuid.UUID,
        **kwargs,
    ) -> Optional[NotificationTemplate]:
        template = await self.template_repo.get_by_id(template_id)
        if not template:
            return None

        for key, value in kwargs.items():
            if hasattr(template, key) and value is not None:
                setattr(template, key, value)

        await self.session.commit()
        await self.session.refresh(template)

        logger.info("template_updated", template_id=str(template_id))
        return template

    async def list_templates(
        self,
        template_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[NotificationTemplate], int]:
        type_enum = TemplateType(template_type) if template_type else None
        return await self.template_repo.get_templates_by_type(type_enum, page, page_size)

    async def preview_template(
        self,
        name: str,
        variables: dict = None,
        locale: str = "en",
    ) -> dict:
        template = await self.template_repo.get_by_name_and_locale(name, locale)
        if not template:
            return {"error": "Template not found"}

        rendered_subject = None
        if template.subject:
            rendered_subject = self._render(template.subject, variables or {})

        rendered_text = self._render(template.body_text, variables or {})
        rendered_html = None
        if template.body_html:
            rendered_html = self._render(template.body_html, variables or {})

        return {
            "subject": rendered_subject,
            "body_text": rendered_text,
            "body_html": rendered_html,
        }

    async def deactivate_template(self, template_id: uuid.UUID) -> bool:
        template = await self.template_repo.get_by_id(template_id)
        if template:
            template.is_active = False
            await self.session.commit()
            return True
        return False

    def _render(self, template: str, variables: dict) -> str:
        result = template
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result


class UserPreferencesService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.prefs_repo = UserPreferencesRepository(session)

    async def get_preferences(self, user_id: uuid.UUID) -> UserNotificationPreference:
        return await self.prefs_repo.get_or_create(user_id)

    async def update_preferences(
        self,
        user_id: uuid.UUID,
        **kwargs,
    ) -> UserNotificationPreference:
        prefs = await self.prefs_repo.get_or_create(user_id)

        for key, value in kwargs.items():
            if hasattr(prefs, key) and value is not None:
                setattr(prefs, key, value)

        await self.session.commit()
        await self.session.refresh(prefs)

        logger.info(
            "preferences_updated",
            user_id=str(user_id),
            updates=list(kwargs.keys()),
        )

        return prefs

    async def is_channel_enabled(self, user_id: uuid.UUID, channel: str) -> bool:
        return await self.prefs_repo.is_channel_enabled(user_id, channel)

    async def get_quiet_hours_status(self, user_id: uuid.UUID) -> bool:
        return await self.prefs_repo.is_quiet_hours(user_id)
