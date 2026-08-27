from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.enums import AuditAction
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.services.audit import write_audit
from app.services.duplicate_detection import (
    EMPLOYEE_NAME_SIMILARITY_THRESHOLD,
    find_similar,
    normalize_contact_value,
)


def _next_employee_code(db: Session) -> str:
    count = db.scalar(select(func.count()).select_from(Employee)) or 0
    return f"EMP-{count + 1:04d}"


def check_exact_duplicate(db: Session, payload: EmployeeCreate) -> Employee | None:
    """SRD §8: block on an exact match of national_id, email, or phone against ANY employee
    (including inactive/resigned) -- these identifiers belong to a real person regardless of
    their current employment status, so a stale record must still be caught."""
    conditions = []
    if payload.national_id:
        conditions.append(Employee.national_id == normalize_contact_value(payload.national_id))
    if payload.email:
        conditions.append(func.lower(Employee.email) == normalize_contact_value(payload.email))
    if payload.phone:
        conditions.append(Employee.phone == normalize_contact_value(payload.phone))

    if not conditions:
        return None

    from sqlalchemy import or_

    return db.scalar(select(Employee).where(or_(*conditions)))


def find_possible_name_duplicates(db: Session, full_name: str) -> list[Employee]:
    existing = db.scalars(select(Employee)).all()
    candidates = [(str(e.id), e.full_name) for e in existing]
    matches = find_similar(full_name, candidates, EMPLOYEE_NAME_SIMILARITY_THRESHOLD)
    by_id = {str(e.id): e for e in existing}
    return [by_id[cid] for cid, _ in matches]


def create_employee(db: Session, payload: EmployeeCreate, *, created_by: UUID | None) -> Employee:
    duplicate = check_exact_duplicate(db, payload)
    if duplicate is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={
                "message": f"Employee already exists ({duplicate.employee_code} — {duplicate.full_name}).",
                "employee_id": str(duplicate.id),
                "employee_code": duplicate.employee_code,
                "status": duplicate.status.value,
            },
        )

    employee = Employee(
        employee_code=_next_employee_code(db),
        full_name=payload.full_name,
        guardian_name=payload.guardian_name,
        national_id=normalize_contact_value(payload.national_id) if payload.national_id else None,
        phone=normalize_contact_value(payload.phone) if payload.phone else None,
        email=payload.email.lower() if payload.email else None,
        department=payload.department,
        designation=payload.designation,
        joining_date=payload.joining_date,
        employment_type=payload.employment_type,
    )
    db.add(employee)
    db.flush()

    write_audit(
        db, user_id=created_by, action=AuditAction.created, module="employees",
        record_type="employee", record_id=employee.id, new_value={"full_name": employee.full_name},
    )
    db.commit()
    db.refresh(employee)
    return employee


def update_employee(db: Session, employee: Employee, payload: EmployeeUpdate, *, updated_by: UUID | None) -> Employee:
    changes = payload.model_dump(exclude_unset=True)
    old_value = {field: getattr(employee, field) for field in changes}
    for field, value in changes.items():
        setattr(employee, field, value)

    write_audit(
        db, user_id=updated_by, action=AuditAction.updated, module="employees",
        record_type="employee", record_id=employee.id,
        old_value={k: str(v) for k, v in old_value.items()}, new_value={k: str(v) for k, v in changes.items()},
    )
    db.commit()
    db.refresh(employee)
    return employee


def set_employee_status(db, employee: Employee, new_status, *, actor_id: UUID | None) -> Employee:
    from datetime import datetime, timezone

    from app.models.enums import EmployeeStatus

    old_status = employee.status
    employee.status = new_status
    if new_status in (EmployeeStatus.inactive, EmployeeStatus.resigned, EmployeeStatus.terminated):
        employee.deactivated_at = datetime.now(timezone.utc)
        employee.deactivated_by = actor_id
    elif new_status == EmployeeStatus.active:
        employee.deactivated_at = None
        employee.deactivated_by = None

    action = AuditAction.reactivated if new_status == EmployeeStatus.active else AuditAction.deactivated
    write_audit(
        db, user_id=actor_id, action=action, module="employees", record_type="employee",
        record_id=employee.id, old_value={"status": old_status.value}, new_value={"status": new_status.value},
    )
    db.commit()
    db.refresh(employee)
    return employee
