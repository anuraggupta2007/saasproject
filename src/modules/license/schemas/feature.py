import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any
from enum import Enum


class FeatureType(str, Enum):
    BOOLEAN = "boolean"
    INTEGER = "integer"
    STRING = "string"
    JSON = "json"


class FeatureCreateRequest(BaseModel):
    key: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    feature_type: FeatureType = FeatureType.BOOLEAN
    default_value: Any = False
    is_global: bool = False


class FeatureUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_value: Optional[Any] = None
    is_global: Optional[bool] = None


class FeatureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str
    name: str
    description: Optional[str] = None
    feature_type: str
    default_value: Any
    is_global: bool
    created_at: Optional[datetime] = None


class FeatureListResponse(BaseModel):
    features: list[FeatureResponse]
    total: int


class FeatureCheckRequest(BaseModel):
    feature_key: str
    user_id: Optional[uuid.UUID] = None
    license_id: Optional[uuid.UUID] = None


class FeatureCheckResponse(BaseModel):
    allowed: bool
    feature_key: str
    value: Any = None
    limit: Optional[int] = None
    current_usage: Optional[int] = None
    message: str = ""


class PlanFeatureAssignRequest(BaseModel):
    plan_id: uuid.UUID
    feature_id: uuid.UUID
    value: Any
    limit_value: Optional[int] = None


class PlanFeatureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    plan_id: uuid.UUID
    feature_id: uuid.UUID
    value: Any
    limit_value: Optional[int] = None


class FeatureAccessResponse(BaseModel):
    features: dict[str, FeatureCheckResponse]
    plan_name: Optional[str] = None
    license_type: Optional[str] = None
