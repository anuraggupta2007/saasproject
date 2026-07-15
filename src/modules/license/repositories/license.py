import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.license.models.license import License, LicenseStatus, LicenseType
from src.models.base import BaseRepository


class LicenseRepository(BaseRepository[License]):
    def __init__(self, session: AsyncSession):
        super().__init__(License, session)

    async def get_by_key(self, license_key: str) -> Optional[License]:
        result = await self.session.execute(
            select(License).where(License.license_key == license_key)
        )
        return result.scalar_one_or_none()

    async def get_user_licenses(
        self,
        user_id: uuid.UUID,
        status: Optional[LicenseStatus] = None,
        license_type: Optional[LicenseType] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[License], int]:
        query = select(License).where(License.user_id == user_id)

        if status:
            query = query.where(License.status == status)
        if license_type:
            query = query.where(License.license_type == license_type)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(License.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        licenses = list(result.scalars().all())

        return licenses, total

    async def get_active_license(self, user_id: uuid.UUID) -> Optional[License]:
        result = await self.session.execute(
            select(License).where(
                and_(
                    License.user_id == user_id,
                    License.status == LicenseStatus.ACTIVE,
                    or_(License.expires_at.is_(None), License.expires_at > datetime.now(timezone.utc))
                )
            ).order_by(License.created_at.desc())
        )
        return result.scalar_one_or_none()

    async def get_expiring_licenses(self, within_days: int = 7) -> list[License]:
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) + timedelta(days=within_days)

        result = await self.session.execute(
            select(License).where(
                and_(
                    License.status == LicenseStatus.ACTIVE,
                    License.expires_at.isnot(None),
                    License.expires_at <= cutoff,
                    License.expires_at > datetime.now(timezone.utc)
                )
            )
        )
        return list(result.scalars().all())

    async def get_expired_licenses(self) -> list[License]:
        result = await self.session.execute(
            select(License).where(
                and_(
                    License.status == LicenseStatus.ACTIVE,
                    License.expires_at.isnot(None),
                    License.expires_at <= datetime.now(timezone.utc)
                )
            )
        )
        return list(result.scalars().all())

    async def count_by_status(self, user_id: Optional[uuid.UUID] = None) -> dict:
        query = select(License.status, func.count()).group_by(License.status)
        if user_id:
            query = query.where(License.user_id == user_id)

        result = await self.session.execute(query)
        return {row[0].value: row[1] for row in result.all()}

    async def count_by_type(self) -> dict:
        result = await self.session.execute(
            select(License.license_type, func.count()).group_by(License.license_type)
        )
        return {row[0].value: row[1] for row in result.all()}

    async def increment_activations(self, license_id: uuid.UUID) -> Optional[License]:
        license = await self.get_by_id(license_id)
        if license:
            license.current_activations += 1
            await self.session.commit()
            await self.session.refresh(license)
        return license

    async def decrement_activations(self, license_id: uuid.UUID) -> Optional[License]:
        license = await self.get_by_id(license_id)
        if license and license.current_activations > 0:
            license.current_activations -= 1
            await self.session.commit()
            await self.session.refresh(license)
        return license
