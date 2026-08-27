from datetime import date as date_type, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, GUID, new_uuid
from app.models.enums import ReconciliationStatus


class ReconciliationRecord(Base):
    __tablename__ = "reconciliation_records"

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=new_uuid)
    reconciliation_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    party_id: Mapped[GUID] = mapped_column(GUID, ForeignKey("parties.id"), nullable=False, index=True)
    transaction_id: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("transactions.id"), nullable=True)
    expected_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    actual_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    # Computed at write time in the service layer (see services/reconciliation.py, added with the
    # Reconciliation module) rather than a DB GENERATED column, so behavior matches on SQLite and Postgres.
    difference: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    status: Mapped[ReconciliationStatus] = mapped_column(
        Enum(ReconciliationStatus), default=ReconciliationStatus.pending
    )
    reconciliation_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    reviewed_by: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
