from datetime import date as date_type, datetime, time as time_type
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import AttendanceStatus


class AttendanceCreate(BaseModel):
    employee_id: UUID
    date: date_type
    status: AttendanceStatus
    check_in: time_type | None = None
    check_out: time_type | None = None
    remarks: str | None = None


class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_id: UUID
    date: date_type
    check_in: time_type | None
    check_out: time_type | None
    status: AttendanceStatus
    working_hours: Decimal | None
    remarks: str | None
