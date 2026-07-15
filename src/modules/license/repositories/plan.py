import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.license.models.plan import Plan, PlanStatus, BillingCycle
from src.models.base import BaseRepository


class PlanRepository(BaseRepository[Plan]):
    def __init__(self, session: AsyncSession):
        super().__init__(Plan, session)

    async def get_by_name(self, name: str) -> Optional[Plan]:
        result = await self.session.execute(
            select(Plan).where(Plan.name == name)
        )
        return result.scalar_one_or_none()

    async def get_active_plans(
        self,
        billing_cycle: Optional[BillingCycle] = None,
    ) -> list[Plan]:
        query = select(Plan).where(Plan.status == PlanStatus.ACTIVE)

        if billing_cycle:
            query = query.where(Plan.billing_cycle == billing_cycle)

        query = query.order_by(Plan.sort_order.asc(), Plan.price.asc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_all_plans(
        self,
        include_inactive: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Plan], int]:
        query = select(Plan)

        if not include_inactive:
            query = query.where(Plan.status == PlanStatus.ACTIVE)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(Plan.sort_order.asc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        plans = list(result.scalars().all())

        return plans, total

    async def count_by_status(self) -> dict:
        result = await self.session.execute(
            select(Plan.status, func.count()).group_by(Plan.status)
        )
        return {row[0].value: row[1] for row in result.all()}
