from datetime import date as date_type, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID, new_uuid
from app.models.enums import GatePassStatus, GatePassType


class GatePass(Base):
    __tablename__ = "gate_passes"

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=new_uuid)
    gate_pass_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    type: Mapped[GatePassType] = mapped_column(Enum(GatePassType), nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    party_id: Mapped[GUID] = mapped_column(GUID, ForeignKey("parties.id"), nullable=False, index=True)
    returnable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    material: Mapped[str] = mapped_column(String(255), nullable=False)
    yarn_count: Mapped[str | None] = mapped_column(String(50), nullable=True)
    yarn_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bags_rolls: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    weight: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    yarn_return: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    expected_return: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    store_destination: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    status: Mapped[GatePassStatus] = mapped_column(Enum(GatePassStatus), default=GatePassStatus.pending, nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    party: Mapped["Party"] = relationship()

    @property
    def party_name(self) -> str | None:
        return self.party.name if self.party else None

