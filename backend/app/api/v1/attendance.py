from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import extract, select
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.db.session import get_db
from app.models.attendance import AttendanceRecord
from app.models.rbac import User
from app.schemas.attendance import AttendanceCreate, AttendanceOut
from app.services.attendance_service import mark_attendance

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("", response_model=list[AttendanceOut])
def list_attendance(
    employeeId: UUID = Query(...),
    year: int | None = Query(default=None),
    month: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("attendance", "read")),
) -> list[AttendanceOut]:
    stmt = select(AttendanceRecord).where(AttendanceRecord.employee_id == employeeId)
    if year is not None:
        stmt = stmt.where(extract("year", AttendanceRecord.date) == year)
    if month is not None:
        stmt = stmt.where(extract("month", AttendanceRecord.date) == month)
    rows = db.scalars(stmt.order_by(AttendanceRecord.date.desc())).all()
    return [AttendanceOut.model_validate(r) for r in rows]


@router.post("", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def mark_attendance_endpoint(
    payload: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance", "write")),
) -> AttendanceOut:
    record = mark_attendance(db, payload, marked_by=current_user.id)
    return AttendanceOut.model_validate(record)
