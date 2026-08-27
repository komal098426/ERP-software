from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID, new_uuid
from app.models.enums import PartySource, PartyStatus, PartyType


class Party(Base):
    __tablename__ = "parties"

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=new_uuid)
    party_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    type: Mapped[PartyType] = mapped_column(Enum(PartyType), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[PartyStatus] = mapped_column(Enum(PartyStatus), default=PartyStatus.active, nullable=False)
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    created_by: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    source: Mapped[PartySource] = mapped_column(Enum(PartySource), default=PartySource.manual)
    import_raw: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deactivated_by: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    merged_into: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("parties.id"), nullable=True)

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="party")
