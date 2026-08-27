from datetime import date as date_type, time as time_type

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, GUID, new_uuid
from app.models.enums import AttendanceStatus


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (UniqueConstraint("employee_id", "date", name="uq_attendance_employee_date"),)

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=new_uuid)
    employee_id: Mapped[GUID] = mapped_column(GUID, ForeignKey("employees.id"), nullable=False, index=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    check_in: Mapped[time_type | None] = mapped_column(Time, nullable=True)
    check_out: Mapped[time_type | None] = mapped_column(Time, nullable=True)
    status: Mapped[AttendanceStatus] = mapped_column(Enum(AttendanceStatus), nullable=False)
    # Computed at write time in the service layer (see services layer added with the Attendance
    # module) from check_in/check_out when both are present, rather than a DB GENERATED column.
    working_hours: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)
