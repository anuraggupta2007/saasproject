import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.license.models.device import Device
from src.models.base import BaseRepository


class DeviceRepository(BaseRepository[Device]):
    def __init__(self, session: AsyncSession):
        super().__init__(Device, session)

    async def get_by_fingerprint(self, fingerprint: str) -> Optional[Device]:
        result = await self.session.execute(
            select(Device).where(Device.fingerprint == fingerprint)
        )
        return result.scalar_one_or_none()

    async def get_user_devices(
        self,
        user_id: uuid.UUID,
        active_only: bool = True,
    ) -> list[Device]:
        query = select(Device).where(Device.user_id == user_id)
        if active_only:
            query = query.where(Device.is_active == True)

        result = await self.session.execute(query.order_by(Device.last_seen.desc()))
        return list(result.scalars().all())

    async def get_or_create_device(
        self,
        user_id: uuid.UUID,
        fingerprint: str,
        device_name: Optional[str] = None,
        device_type: Optional[str] = None,
        os_type: Optional[str] = None,
        os_version: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Device:
        device = await self.get_by_fingerprint(fingerprint)

        if device:
            device.user_id = user_id
            device.device_name = device_name or device.device_name
            device.device_type = device_type or device.device_type
            device.os_type = os_type or device.os_type
            device.os_version = os_version or device.os_version
            device.ip_address = ip_address or device.ip_address
            device.is_active = True
            await self.session.commit()
            await self.session.refresh(device)
        else:
            device = Device(
                user_id=user_id,
                fingerprint=fingerprint,
                device_name=device_name,
                device_type=device_type,
                os_type=os_type,
                os_version=os_version,
                ip_address=ip_address,
            )
            self.session.add(device)
            await self.session.commit()
            await self.session.refresh(device)

        return device

    async def count_user_devices(self, user_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.count()).where(
                Device.user_id == user_id,
                Device.is_active == True
            )
        )
        return result.scalar() or 0

    async def deactivate_device(self, device_id: uuid.UUID) -> Optional[Device]:
        device = await self.get_by_id(device_id)
        if device:
            device.is_active = False
            await self.session.commit()
            await self.session.refresh(device)
        return device
