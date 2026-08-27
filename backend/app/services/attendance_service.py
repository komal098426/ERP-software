from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord
from app.models.enums import AuditAction
from app.schemas.attendance import AttendanceCreate
from app.services.audit import write_audit


def _compute_working_hours(record: AttendanceRecord) -> Decimal | None:
    if record.check_in is None or record.check_out is None:
        return None
    start = datetime.combine(datetime.today(), record.check_in)
    end = datetime.combine(datetime.today(), record.check_out)
    hours = (end - start).total_seconds() / 3600
    if hours < 0:
        return None
    return Decimal(str(round(hours, 2)))


def mark_attendance(db: Session, payload: AttendanceCreate, *, marked_by: UUID | None) -> AttendanceRecord:
    """Upsert semantics: one record per (employee, date) per the model's unique constraint --
    marking the same day again updates that day's record instead of erroring, since "mark
    attendance" is naturally idempotent from the caller's point of view."""
    existing = db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == payload.employee_id, AttendanceRecord.date == payload.date
        )
    )
    action = AuditAction.updated if existing else AuditAction.created
    record = existing or AttendanceRecord(employee_id=payload.employee_id, date=payload.date)

    record.status = payload.status
    record.check_in = payload.check_in
    record.check_out = payload.check_out
    record.remarks = payload.remarks
    record.working_hours = _compute_working_hours(record)

    if existing is None:
        db.add(record)
    db.flush()

    write_audit(
        db, user_id=marked_by, action=action, module="attendance", record_type="attendance_record",
        record_id=record.id, new_value={"status": record.status.value, "date": str(record.date)},
    )
    db.commit()
    db.refresh(record)
    return record
