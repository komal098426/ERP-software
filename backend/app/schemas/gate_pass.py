from datetime import date as date_type, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import GatePassStatus, GatePassType


class GatePassCreate(BaseModel):
    type: GatePassType
    date: date_type
    party_id: UUID
    returnable: bool = False
    material: str = Field(min_length=1)
    yarn_count: str | None = None
    yarn_type: str | None = None
    bags_rolls: Decimal | None = None
    weight: Decimal = Field(gt=0)
    quantity: Decimal = Field(gt=0)
    yarn_return: Decimal | None = None
    expected_return: date_type | None = None
    store_destination: str | None = None
    status: GatePassStatus = GatePassStatus.pending
    remarks: str | None = None


class GatePassUpdate(BaseModel):
    date: date_type | None = None
    party_id: UUID | None = None
    returnable: bool | None = None
    material: str | None = None
    yarn_count: str | None = None
    yarn_type: str | None = None
    bags_rolls: Decimal | None = None
    weight: Decimal | None = None
    quantity: Decimal | None = None
    yarn_return: Decimal | None = None
    expected_return: date_type | None = None
    store_destination: str | None = None
    status: GatePassStatus | None = None
    remarks: str | None = None


class GatePassOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    gate_pass_number: str
    type: GatePassType
    date: date_type
    party_id: UUID
    party_name: str | None
    returnable: bool
    material: str
    yarn_count: str | None
    yarn_type: str | None
    bags_rolls: Decimal | None
    weight: Decimal
    quantity: Decimal
    yarn_return: Decimal | None
    expected_return: date_type | None
    store_destination: str | None
    status: GatePassStatus
    remarks: str | None
    created_at: datetime
    updated_at: datetime
