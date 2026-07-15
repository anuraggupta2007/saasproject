import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.payment.schemas.payment import (
    PaymentCreateRequest,
    PaymentResponse,
    PaymentListResponse,
)
from src.modules.payment.schemas.invoice import (
    InvoiceCreateRequest,
    InvoiceResponse,
    InvoiceListResponse,
)
from src.modules.payment.schemas.coupon import (
    CouponCreateRequest,
    CouponResponse,
    CouponValidateRequest,
    CouponValidateResponse,
    CouponApplyRequest,
)
from src.modules.payment.schemas.checkout import (
    CheckoutCreateRequest,
    CheckoutResponse,
    CheckoutVerifyRequest,
    CheckoutVerifyResponse,
)
from src.modules.payment.services.payment_service import PaymentService
from src.modules.payment.services.checkout_service import CheckoutService
from src.modules.payment.services.invoice_service import InvoiceService
from src.modules.payment.services.coupon_service import CouponService
from src.modules.payment.services.refund_service import RefundService
from src.modules.payment.models.payment import PaymentProvider

router = APIRouter(prefix="/payment", tags=["Payment"])


@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    summary="Create checkout session",
)
async def create_checkout(
    request: CheckoutCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CheckoutService(db)

    result = await service.create_checkout_session(
        user_id=uuid.UUID(current_user["id"]),
        amount=0,
        currency="USD",
        provider=PaymentProvider.STRIPE,
        success_url=request.success_url,
        cancel_url=request.cancel_url,
        metadata=request.metadata,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return CheckoutResponse(
        checkout_id=result.get("session_id", ""),
        checkout_url=result["checkout_url"],
        mode="hosted",
    )


@router.post(
    "/checkout/verify",
    response_model=CheckoutVerifyResponse,
    summary="Verify checkout payment",
)
async def verify_checkout(
    request: CheckoutVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CheckoutService(db)

    result = await service.verify_checkout(
        checkout_id=request.checkout_id,
        session_id=request.session_id,
        payment_intent_id=request.payment_intent_id,
    )

    return CheckoutVerifyResponse(**result)


@router.post(
    "/create",
    response_model=PaymentResponse,
    summary="Create a payment",
)
async def create_payment(
    request: PaymentCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)

    result = await service.create_payment(
        user_id=uuid.UUID(current_user["id"]),
        amount=request.amount,
        currency=request.currency,
        payment_method=request.payment_method,
        provider=request.provider,
        subscription_id=request.subscription_id,
        invoice_id=request.invoice_id,
        description=request.description,
        metadata=request.metadata,
        idempotency_key=request.idempotency_key,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return PaymentResponse(
        id=result["payment_id"],
        user_id=uuid.UUID(current_user["id"]),
        amount=request.amount,
        currency=request.currency,
        status=result["status"],
        provider=request.provider,
    )


@router.get(
    "/history",
    response_model=PaymentListResponse,
    summary="Get payment history",
)
async def get_payment_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)

    payments, total = await service.list_user_payments(
        user_id=uuid.UUID(current_user["id"]),
        page=page,
        page_size=page_size,
    )

    return PaymentListResponse(
        payments=[PaymentResponse.model_validate(p) for p in payments],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/{payment_id}/verify",
    summary="Verify a payment",
)
async def verify_payment(
    payment_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)

    result = await service.verify_payment(payment_id)

    if not result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return result


@router.post(
    "/refund",
    summary="Request a refund",
)
async def request_refund(
    payment_id: uuid.UUID,
    amount: float = Query(None),
    reason: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RefundService(db)

    result = await service.request_refund(
        user_id=uuid.UUID(current_user["id"]),
        payment_id=payment_id,
        amount=amount,
        reason=reason,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return result


@router.get(
    "/invoices",
    response_model=InvoiceListResponse,
    summary="Get invoices",
)
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvoiceService(db)

    invoices, total = await service.list_user_invoices(
        user_id=uuid.UUID(current_user["id"]),
        page=page,
        page_size=page_size,
    )

    return InvoiceListResponse(
        invoices=[InvoiceResponse.model_validate(i) for i in invoices],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/invoices/{invoice_id}",
    response_model=InvoiceResponse,
    summary="Get invoice details",
)
async def get_invoice(
    invoice_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvoiceService(db)

    invoice = await service.get_invoice(invoice_id)
    if not invoice or invoice.user_id != uuid.UUID(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    return InvoiceResponse.model_validate(invoice)


@router.get(
    "/invoices/{invoice_id}/download",
    summary="Download invoice PDF",
)
async def download_invoice(
    invoice_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvoiceService(db)

    invoice = await service.get_invoice(invoice_id)
    if not invoice or invoice.user_id != uuid.UUID(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    pdf_url = await service.generate_invoice_pdf(invoice_id)

    return {"pdf_url": pdf_url}


@router.post(
    "/coupons/validate",
    response_model=CouponValidateResponse,
    summary="Validate a coupon",
)
async def validate_coupon(
    request: CouponValidateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CouponService(db)

    result = await service.validate_coupon(
        code=request.code,
        user_id=uuid.UUID(current_user["id"]),
        amount=request.amount,
        plan_id=request.plan_id,
    )

    return CouponValidateResponse(**result)


@router.post(
    "/coupons/apply",
    summary="Apply a coupon to payment",
)
async def apply_coupon(
    request: CouponApplyRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CouponService(db)

    payment_service = PaymentService(db)
    payment = await payment_service.get_payment(request.payment_id)

    if not payment or payment.user_id != uuid.UUID(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    result = await service.apply_coupon(
        code=request.code,
        user_id=uuid.UUID(current_user["id"]),
        payment_id=request.payment_id,
        amount=float(payment.amount),
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return result


@router.get(
    "/methods",
    summary="Get saved payment methods",
)
async def list_payment_methods(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CheckoutService(db)

    methods = await service.get_saved_payment_methods(
        user_id=uuid.UUID(current_user["id"]),
        provider=PaymentProvider.STRIPE,
        customer_id=current_user.get("stripe_customer_id", ""),
    )

    return {"payment_methods": methods}
