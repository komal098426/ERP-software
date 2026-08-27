from datetime import date as date_type, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, GUID, new_uuid


class SalaryHistoryEntry(Base):
    __tablename__ = "salary_history"

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=new_uuid)
    employee_id: Mapped[GUID] = mapped_column(GUID, ForeignKey("employees.id"), nullable=False, index=True)
    effective_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="PKR")
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
