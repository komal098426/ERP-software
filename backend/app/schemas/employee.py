from datetime import date as date_type, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import EmployeeStatus, EmploymentType


class EmployeeCreate(BaseModel):
    full_name: str
    guardian_name: str | None = None
    national_id: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    department: str | None = None
    designation: str | None = None
    joining_date: date_type | None = None
    employment_type: EmploymentType | None = None


class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    guardian_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    department: str | None = None
    designation: str | None = None
    joining_date: date_type | None = None
    employment_type: EmploymentType | None = None


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_code: str
    full_name: str
    guardian_name: str | None
    national_id: str | None
    phone: str | None
    email: str | None
    department: str | None
    designation: str | None
    joining_date: date_type | None
    employment_type: EmploymentType | None
    status: EmployeeStatus
    created_at: datetime


class NameDuplicateCandidate(BaseModel):
    id: UUID
    employee_code: str
    full_name: str
    status: EmployeeStatus


class EmployeeCreateResponse(BaseModel):
    employee: EmployeeOut
    duplicate_warning: list[NameDuplicateCandidate] = []
