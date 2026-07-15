import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum


class DeviceType(str, Enum):
    DESKTOP = "desktop"
    LAPTOP = "laptop"
    TABLET = "tablet"
    MOBILE = "mobile"
    SERVER = "server"
    UNKNOWN = "unknown"


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    fingerprint: str
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    os_type: Optional[str] = None
    os_version: Optional[str] = None
    ip_address: Optional[str] = None
    last_seen: Optional[datetime] = None
    is_active: bool = True
    created_at: Optional[datetime] = None


class DeviceRegisterRequest(BaseModel):
    fingerprint: str = Field(min_length=1, max_length=255)
    device_name: Optional[str] = None
    device_type: Optional[DeviceType] = None
    os_type: Optional[str] = None
    os_version: Optional[str] = None
    ip_address: Optional[str] = None


class DeviceListResponse(BaseModel):
    devices: list[DeviceResponse]
    total: int


class DeviceTransferRequest(BaseModel):
    source_device_id: uuid.UUID
    target_device_fingerprint: str
    license_id: uuid.UUID
