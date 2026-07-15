import uuid
from typing import Optional, Any

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.license.models.feature import Feature, PlanFeature
from src.models.base import BaseRepository


class FeatureRepository(BaseRepository[Feature]):
    def __init__(self, session: AsyncSession):
        super().__init__(Feature, session)

    async def get_by_key(self, key: str) -> Optional[Feature]:
        result = await self.session.execute(
            select(Feature).where(Feature.key == key)
        )
        return result.scalar_one_or_none()

    async def get_all_features(self) -> list[Feature]:
        result = await self.session.execute(
            select(Feature).order_by(Feature.key)
        )
        return list(result.scalars().all())

    async def get_global_features(self) -> list[Feature]:
        result = await self.session.execute(
            select(Feature).where(Feature.is_global == True)
        )
        return list(result.scalars().all())


class PlanFeatureRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_plan_features(self, plan_id: uuid.UUID) -> list[PlanFeature]:
        result = await self.session.execute(
            select(PlanFeature).where(PlanFeature.plan_id == plan_id)
        )
        return list(result.scalars().all())

    async def get_feature_for_plan(
        self,
        plan_id: uuid.UUID,
        feature_id: uuid.UUID,
    ) -> Optional[PlanFeature]:
        result = await self.session.execute(
            select(PlanFeature).where(
                and_(
                    PlanFeature.plan_id == plan_id,
                    PlanFeature.feature_id == feature_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def set_plan_feature(
        self,
        plan_id: uuid.UUID,
        feature_id: uuid.UUID,
        value: Any,
        limit_value: Optional[int] = None,
    ) -> PlanFeature:
        existing = await self.get_feature_for_plan(plan_id, feature_id)

        if existing:
            existing.value = value
            existing.limit_value = limit_value
            await self.session.commit()
            await self.session.refresh(existing)
            return existing

        plan_feature = PlanFeature(
            plan_id=plan_id,
            feature_id=feature_id,
            value=value,
            limit_value=limit_value,
        )
        self.session.add(plan_feature)
        await self.session.commit()
        await self.session.refresh(plan_feature)
        return plan_feature

    async def delete_plan_feature(
        self,
        plan_id: uuid.UUID,
        feature_id: uuid.UUID,
    ) -> bool:
        plan_feature = await self.get_feature_for_plan(plan_id, feature_id)
        if plan_feature:
            await self.session.delete(plan_feature)
            await self.session.commit()
            return True
        return False

    async def count_plan_features(self, plan_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.count()).where(PlanFeature.plan_id == plan_id)
        )
        return result.scalar() or 0
