import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.license.models.activation import Activation, ActivationStatus
from src.models.base import BaseRepository


class ActivationRepository(BaseRepository[Activation]):
    def __init__(self, session: AsyncSession):
        super().__init__(Activation, session)

    async def get_by_license_and_device(
        self,
        license_id: uuid.UUID,
        device_id: uuid.UUID,
    ) -> Optional[Activation]:
        result = await self.session.execute(
            select(Activation).where(
                and_(
                    Activation.license_id == license_id,
                    Activation.device_id == device_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_active_by_license(self, license_id: uuid.UUID) -> list[Activation]:
        result = await self.session.execute(
            select(Activation).where(
                and_(
                    Activation.license_id == license_id,
                    Activation.status == ActivationStatus.ACTIVE,
                )
            ).order_by(Activation.activated_at.desc())
        )
        return list(result.scalars().all())

    async def get_active_by_device(self, device_id: uuid.UUID) -> list[Activation]:
        result = await self.session.execute(
            select(Activation).where(
                and_(
                    Activation.device_id == device_id,
                    Activation.status == ActivationStatus.ACTIVE,
                )
            ).order_by(Activation.activated_at.desc())
        )
        return list(result.scalars().all())

    async def get_user_activations(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Activation], int]:
        query = select(Activation).where(Activation.user_id == user_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(Activation.activated_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        activations = list(result.scalars().all())

        return activations, total

    async def count_active_by_license(self, license_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.count()).where(
                and_(
                    Activation.license_id == license_id,
                    Activation.status == ActivationStatus.ACTIVE,
                )
            )
        )
        return result.scalar() or 0

    async def deactivate_by_id(self, activation_id: uuid.UUID) -> Optional[Activation]:
        activation = await self.get_by_id(activation_id)
        if activation:
            activation.status = ActivationStatus.INACTIVE
            activation.deactivated_at = datetime.now(timezone.utc)
            await self.session.commit()
            await self.session.refresh(activation)
        return activation

    async def deactivate_by_device_and_license(
        self,
        device_id: uuid.UUID,
        license_id: uuid.UUID,
    ) -> Optional[Activation]:
        activation = await self.get_by_license_and_device(license_id, device_id)
        if activation:
            activation.status = ActivationStatus.INACTIVE
            activation.deactivated_at = datetime.now(timezone.utc)
            await self.session.commit()
            await self.session.refresh(activation)
        return activation

    async def update_validation_token(
        self,
        activation_id: uuid.UUID,
        token: str,
    ) -> Optional[Activation]:
        activation = await self.get_by_id(activation_id)
        if activation:
            activation.validation_token = token
            activation.last_validated = datetime.now(timezone.utc)
            await self.session.commit()
            await self.session.refresh(activation)
        return activation

    async def get_activation_history(
        self,
        license_id: uuid.UUID,
    ) -> list[Activation]:
        result = await self.session.execute(
            select(Activation).where(
                Activation.license_id == license_id
            ).order_by(Activation.activated_at.desc())
        )
        return list(result.scalars().all())

    async def count_all_active(self) -> int:
        result = await self.session.execute(
            select(func.count()).where(Activation.status == ActivationStatus.ACTIVE)
        )
        return result.scalar() or 0
