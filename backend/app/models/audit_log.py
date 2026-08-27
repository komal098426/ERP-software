from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, GUID, new_uuid
from app.models.enums import AuditAction


class AuditLogEntry(Base):
    __tablename__ = "audit_log"

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=new_uuid)
    user_id: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    action: Mapped[AuditAction] = mapped_column(Enum(AuditAction), nullable=False)
    module: Mapped[str] = mapped_column(String(50), nullable=False)
    record_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    record_id: Mapped[GUID] = mapped_column(GUID, nullable=False, index=True)
    old_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
