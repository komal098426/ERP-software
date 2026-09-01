from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.deps import require_permission
from app.db.session import get_db
from app.models.gate_pass import GatePass
from app.models.enums import GatePassStatus, GatePassType
from app.models.rbac import User
from app.schemas.common import Page, PageMeta
from app.schemas.gate_pass import GatePassCreate, GatePassOut, GatePassUpdate
from app.services.gate_pass_service import create_gate_pass, update_gate_pass, delete_gate_pass

router = APIRouter(prefix="/gate-passes", tags=["gate-passes"])

DEFAULT_LIMIT = 25


def _get_gate_pass_or_404(db: Session, gp_id: UUID) -> GatePass:
    # Use joinedload to load the related Party so party_name property works instantly
    gp = db.query(GatePass).options(joinedload(GatePass.party)).filter(GatePass.id == gp_id).first()
    if gp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Gate Pass not found")
    return gp


@router.get("", response_model=Page[GatePassOut])
def list_gate_passes(
    type_filter: GatePassType | None = Query(default=None, alias="type"),
    party_id: UUID | None = Query(default=None, alias="partyId"),
    status_filter: GatePassStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=DEFAULT_LIMIT, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("gate_passes", "read")),
) -> Page[GatePassOut]:
    offset = int(cursor) if cursor else 0

    stmt = select(GatePass).options(joinedload(GatePass.party))
    count_stmt = select(func.count()).select_from(GatePass)

    if type_filter is not None:
        stmt = stmt.where(GatePass.type == type_filter)
        count_stmt = count_stmt.where(GatePass.type == type_filter)

    if party_id is not None:
        stmt = stmt.where(GatePass.party_id == party_id)
        count_stmt = count_stmt.where(GatePass.party_id == party_id)

    if status_filter is not None:
        stmt = stmt.where(GatePass.status == status_filter)
        count_stmt = count_stmt.where(GatePass.status == status_filter)

    if q:
        term = f"%{q.lower()}%"
        # Search by gate pass number or material description
        search_filter = or_(
            GatePass.gate_pass_number.ilike(term),
            GatePass.material.ilike(term),
            GatePass.yarn_count.ilike(term),
            GatePass.yarn_type.ilike(term),
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    total = db.scalar(count_stmt) or 0
    rows = db.scalars(stmt.order_by(GatePass.date.desc(), GatePass.created_at.desc()).offset(offset).limit(limit)).all()

    next_cursor = str(offset + limit) if offset + limit < total else None
    return Page(
        data=[GatePassOut.model_validate(gp) for gp in rows],
        meta=PageMeta(nextCursor=next_cursor, total=total),
    )


@router.post("", response_model=GatePassOut, status_code=status.HTTP_201_CREATED)
def create_gate_pass_endpoint(
    payload: GatePassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("gate_passes", "write")),
) -> GatePassOut:
    gp = create_gate_pass(db, payload, created_by=current_user.id)
    # Reload with party relationship
    return GatePassOut.model_validate(_get_gate_pass_or_404(db, gp.id))


@router.get("/{gp_id}", response_model=GatePassOut)
def get_gate_pass(
    gp_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("gate_passes", "read")),
) -> GatePassOut:
    return GatePassOut.model_validate(_get_gate_pass_or_404(db, gp_id))


@router.patch("/{gp_id}", response_model=GatePassOut)
def patch_gate_pass(
    gp_id: UUID,
    payload: GatePassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("gate_passes", "write")),
) -> GatePassOut:
    gp = _get_gate_pass_or_404(db, gp_id)
    updated_gp = update_gate_pass(db, gp, payload, updated_by=current_user.id)
    return GatePassOut.model_validate(updated_gp)


@router.delete("/{gp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gate_pass_endpoint(
    gp_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("gate_passes", "write")),
) -> None:
    gp = _get_gate_pass_or_404(db, gp_id)
    delete_gate_pass(db, gp, deleted_by=current_user.id)
