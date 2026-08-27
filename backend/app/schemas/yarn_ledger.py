from datetime import date as date_type, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PaymentStatus, YarnMovementType


class YarnLedgerEntryCreate(BaseModel):
    party_id: UUID
    movement_type: YarnMovementType
    date: date_type
    yarn_count: str = Field(min_length=1, max_length=30)
    kg: Decimal = Field(gt=0, decimal_places=2)
    igp_number: str | None = None
    ogp_number: str | None = None
    bags: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    fabric_description: str | None = None
    knitting_rate: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    loss_percent: Decimal = Field(default=Decimal("2.00"), ge=0, le=100, decimal_places=2)
    remarks: str | None = None


class YarnLedgerEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    party_id: UUID
    movement_type: YarnMovementType
    date: date_type
    igp_number: str | None
    ogp_number: str | None
    yarn_count: str
    bags: Decimal | None
    kg: Decimal
    fabric_description: str | None
    knitting_rate: Decimal | None
    loss_percent: Decimal
    loss_kg: Decimal
    amount: Decimal
    payment_status: PaymentStatus
    remarks: str | None
    created_at: datetime


class CountBreakdown(BaseModel):
    yarn_count: str
    received_kg: Decimal
    returned_kg: Decimal
    dispatched_kg: Decimal
    net_kg: Decimal  # received - returned - dispatched, per count


class DateWiseRow(BaseModel):
    date: date_type
    received_kg: Decimal
    returned_kg: Decimal
    dispatched_kg: Decimal
    loss_kg: Decimal
    amount: Decimal
    running_balance_kg: Decimal


class LedgerSummary(BaseModel):
    total_received_kg: Decimal
    total_returned_kg: Decimal
    total_dispatched_kg: Decimal
    total_loss_kg: Decimal
    balance_kg: Decimal
    total_amount: Decimal
    count_breakdown: list[CountBreakdown]
    date_wise: list[DateWiseRow]
