from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import PartySource, PartyStatus, PartyType


class PartyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: PartyType
    contact_person: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    opening_balance: Decimal = Decimal("0")


class PartyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    type: PartyType | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    opening_balance: Decimal | None = None


class DuplicateCandidate(BaseModel):
    id: UUID
    party_code: str
    name: str
    similarity: float


class PartyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    party_code: str
    name: str
    type: PartyType
    contact_person: str | None
    phone: str | None
    email: str | None
    address: str | None
    status: PartyStatus
    opening_balance: Decimal
    source: PartySource
    created_at: datetime
    updated_at: datetime


class PartyCreateResponse(BaseModel):
    party: PartyOut
    duplicate_warning: list[DuplicateCandidate] = []
