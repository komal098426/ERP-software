from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, GUID, new_uuid
from app.models.enums import DocumentOwnerType


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=new_uuid)
    owner_type: Mapped[DocumentOwnerType] = mapped_column(Enum(DocumentOwnerType), nullable=False)
    owner_id: Mapped[GUID] = mapped_column(GUID, nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_by: Mapped[GUID | None] = mapped_column(GUID, ForeignKey("users.id"), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
