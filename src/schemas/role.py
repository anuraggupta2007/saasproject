import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class RoleBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-z_]+$")
    description: str | None = Field(None, max_length=500)


class RoleCreate(RoleBase):
    permissions: list[uuid.UUID] = Field(default_factory=list)
    is_default: bool = False


class RoleUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=50, pattern=r"^[a-z_]+$")
    description: str | None = Field(None, max_length=500)
    is_default: bool | None = None


class RoleResponse(RoleBase):
    id: uuid.UUID
    is_default: bool
    is_system: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


from src.schemas.permission import PermissionResponse


class RoleWithPermissions(RoleResponse):
    permissions: list[PermissionResponse] = []
