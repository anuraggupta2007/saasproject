import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class PermissionBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-z:]+$")
    description: str | None = Field(None, max_length=500)
    resource: str = Field(..., min_length=2, max_length=50)
    action: str = Field(..., min_length=2, max_length=50)

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        allowed_actions = {"create", "read", "update", "delete", "manage"}
        if v not in allowed_actions:
            raise ValueError(f"Action must be one of: {allowed_actions}")
        return v


class PermissionCreate(PermissionBase):
    pass


class PermissionResponse(PermissionBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
