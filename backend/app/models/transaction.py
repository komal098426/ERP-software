from datetime import date as date_type, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID, new_uuid
from app.models.enums import PaymentStatus, TransactionEntryType


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=new_uuid)
    transaction_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    party_id: Mapped[GUID] = mapped_column(GUID, ForeignKey("parties.id"), nullable=False, index=True)
    entry_type: Mapped[TransactionEntryType] = mapped_column(Enum(TransactionEntryType), nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payment_status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.pending)
    document_id: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("documents.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    party: Mapped["Party"] = relationship(back_populates="transactions")
