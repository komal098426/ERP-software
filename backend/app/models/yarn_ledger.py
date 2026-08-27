from datetime import date as date_type, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, GUID, new_uuid
from app.models.enums import PaymentStatus, YarnMovementType


class YarnLedgerEntry(Base):
    """A physical stock movement against a party's yarn/fabric account: yarn received from the
    party, yarn returned to the party, or fabric dispatched to the party (billable, incurs a 2%
    process-loss allowance). See services/yarn_ledger_service.py for the running-balance math."""

    __tablename__ = "yarn_ledger_entries"

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=new_uuid)
    party_id: Mapped[GUID] = mapped_column(GUID, ForeignKey("parties.id"), nullable=False, index=True)
    movement_type: Mapped[YarnMovementType] = mapped_column(Enum(YarnMovementType), nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)

    igp_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ogp_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    yarn_count: Mapped[str] = mapped_column(String(30), nullable=False)  # e.g. "20/1CD"

    bags: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    fabric_description: Mapped[str | None] = mapped_column(String(100), nullable=True)
    knitting_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    loss_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("2.00"))
    # loss_kg and amount are computed server-side at write time (services/yarn_ledger_service.py),
    # not user-entered, so they always agree with kg/rate/loss_percent -- mirrors the spreadsheet's
    # formula columns rather than letting the two drift apart.
    loss_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    payment_status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.pending)

    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
