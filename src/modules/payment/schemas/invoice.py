import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum


class InvoiceStatusSchema(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class InvoiceLineItem(BaseModel):
    description: str
    quantity: int = Field(default=1, ge=1)
    unit_price: float
    amount: float
    tax_rate: Optional[float] = None
    tax_amount: Optional[float] = None


class InvoiceCreateRequest(BaseModel):
    user_id: uuid.UUID
    subscription_id: Optional[uuid.UUID] = None
    line_items: List[InvoiceLineItem]
    tax_rate: float = Field(default=0, ge=0, le=100)
    discount_amount: float = Field(default=0, ge=0)
    currency: str = Field(default="USD", max_length=3)
    billing_address: Optional[dict] = None
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    invoice_number: str
    status: InvoiceStatusSchema
    subtotal: float
    tax_amount: float
    tax_rate: float
    discount_amount: float
    total_amount: float
    currency: str
    billing_address: Optional[dict] = None
    line_items: List[dict] = Field(default_factory=list)
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    created_at: Optional[datetime] = None


class InvoiceListResponse(BaseModel):
    invoices: List[InvoiceResponse]
    total: int
    page: int
    page_size: int


class InvoicePDFResponse(BaseModel):
    invoice_id: uuid.UUID
    pdf_url: str
    expires_at: datetime
