from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import EmployeeStatus
from app.models.rbac import User
from app.schemas.common import Page, PageMeta
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeCreateResponse,
    EmployeeOut,
    EmployeeUpdate,
    NameDuplicateCandidate,
)
from app.services.employee_service import (
    create_employee,
    find_possible_name_duplicates,
    set_employee_status,
    update_employee,
)

router = APIRouter(prefix="/employees", tags=["employees"])

DEFAULT_LIMIT = 25


def _get_employee_or_404(db: Session, employee_id: UUID) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


@router.get("", response_model=Page[EmployeeOut])
def list_employees(
    q: str | None = Query(default=None),
    status_filter: EmployeeStatus | None = Query(default=None, alias="status"),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=DEFAULT_LIMIT, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("employees", "read")),
) -> Page[EmployeeOut]:
    offset = int(cursor) if cursor else 0
    stmt = select(Employee)
    count_stmt = select(func.count()).select_from(Employee)
    if status_filter is not None:
        stmt = stmt.where(Employee.status == status_filter)
        count_stmt = count_stmt.where(Employee.status == status_filter)
    if q:
        term = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(Employee.full_name).like(term), Employee.employee_code.ilike(term)))
        count_stmt = count_stmt.where(or_(func.lower(Employee.full_name).like(term), Employee.employee_code.ilike(term)))

    total = db.scalar(count_stmt) or 0
    rows = db.scalars(stmt.order_by(Employee.full_name).offset(offset).limit(limit)).all()
    next_cursor = str(offset + limit) if offset + limit < total else None
    return Page(data=[EmployeeOut.model_validate(e) for e in rows], meta=PageMeta(nextCursor=next_cursor, total=total))


@router.post("", response_model=EmployeeCreateResponse, status_code=status.HTTP_201_CREATED)
def create_employee_endpoint(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("employees", "write")),
) -> EmployeeCreateResponse:
    employee = create_employee(db, payload, created_by=current_user.id)  # raises 409 on exact duplicate
    name_duplicates = [
        NameDuplicateCandidate(id=e.id, employee_code=e.employee_code, full_name=e.full_name, status=e.status)
        for e in find_possible_name_duplicates(db, employee.full_name)
        if e.id != employee.id
    ]
    return EmployeeCreateResponse(employee=EmployeeOut.model_validate(employee), duplicate_warning=name_duplicates)


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(
    employee_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_permission("employees", "read"))
) -> EmployeeOut:
    return EmployeeOut.model_validate(_get_employee_or_404(db, employee_id))


@router.patch("/{employee_id}", response_model=EmployeeOut)
def patch_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("employees", "write")),
) -> EmployeeOut:
    employee = _get_employee_or_404(db, employee_id)
    return EmployeeOut.model_validate(update_employee(db, employee, payload, updated_by=current_user.id))


@router.post("/{employee_id}/status/{new_status}", response_model=EmployeeOut)
def change_employee_status(
    employee_id: UUID,
    new_status: EmployeeStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("employees", "write")),
) -> EmployeeOut:
    employee = _get_employee_or_404(db, employee_id)
    return EmployeeOut.model_validate(set_employee_status(db, employee, new_status, actor_id=current_user.id))
