from datetime import date as date_type, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PaymentStatus, TransactionEntryType


class TransactionCreate(BaseModel):
    party_id: UUID
    entry_type: TransactionEntryType
    date: date_type
    amount: Decimal = Field(gt=0, decimal_places=2)
    reference_number: str | None = None
    description: str | None = None
    category: str | None = None
    payment_status: PaymentStatus = PaymentStatus.pending
    notes: str | None = None


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    transaction_code: str
    party_id: UUID
    entry_type: TransactionEntryType
    date: date_type
    reference_number: str | None
    amount: Decimal
    description: str | None
    category: str | None
    payment_status: PaymentStatus
    created_at: datetime
