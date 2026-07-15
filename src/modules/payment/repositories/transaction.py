import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.payment.models.transaction import Transaction, TransactionType, TransactionStatus
from src.models.base import BaseRepository


class TransactionRepository(BaseRepository[Transaction]):
    def __init__(self, session: AsyncSession):
        super().__init__(Transaction, session)

    async def get_by_payment(self, payment_id: uuid.UUID) -> list[Transaction]:
        result = await self.session.execute(
            select(Transaction).where(
                Transaction.payment_id == payment_id
            ).order_by(Transaction.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_user_transactions(
        self,
        user_id: uuid.UUID,
        transaction_type: Optional[TransactionType] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Transaction], int]:
        query = select(Transaction).where(Transaction.user_id == user_id)

        if transaction_type:
            query = query.where(Transaction.type == transaction_type)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(Transaction.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        transactions = list(result.scalars().all())

        return transactions, total

    async def create_transaction(
        self,
        payment_id: uuid.UUID,
        user_id: uuid.UUID,
        transaction_type: TransactionType,
        amount: float,
        currency: str = "USD",
        description: Optional[str] = None,
        provider_transaction_id: Optional[str] = None,
    ) -> Transaction:
        transaction = Transaction(
            payment_id=payment_id,
            user_id=user_id,
            type=transaction_type,
            status=TransactionStatus.COMPLETED,
            amount=amount,
            currency=currency,
            description=description,
            provider_transaction_id=provider_transaction_id,
        )
        self.session.add(transaction)
        await self.session.commit()
        await self.session.refresh(transaction)
        return transaction

    async def count_by_type(self, user_id: Optional[uuid.UUID] = None) -> dict:
        query = select(Transaction.type, func.count()).group_by(Transaction.type)
        if user_id:
            query = query.where(Transaction.user_id == user_id)

        result = await self.session.execute(query)
        return {row[0].value: row[1] for row in result.all()}
