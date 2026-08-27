from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.db.session import get_db
from app.models.enums import PartyStatus
from app.models.party import Party
from app.models.rbac import User
from app.schemas.common import Page, PageMeta
from app.schemas.party import PartyCreate, PartyCreateResponse, PartyOut, PartyUpdate
from app.services.party_service import create_party, deactivate_party, update_party

router = APIRouter(prefix="/parties", tags=["parties"])

DEFAULT_LIMIT = 25


def _get_party_or_404(db: Session, party_id: UUID) -> Party:
    party = db.get(Party, party_id)
    if party is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Party not found")
    return party


@router.get("", response_model=Page[PartyOut])
def list_parties(
    q: str | None = Query(default=None, description="Search term, matched against party name"),
    status_filter: PartyStatus | None = Query(default=None, alias="status"),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=DEFAULT_LIMIT, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("parties", "read")),
) -> Page[PartyOut]:
    offset = int(cursor) if cursor else 0

    stmt = select(Party)
    count_stmt = select(func.count()).select_from(Party)
    if status_filter is not None:
        stmt = stmt.where(Party.status == status_filter)
        count_stmt = count_stmt.where(Party.status == status_filter)
    if q:
        term = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(Party.name).like(term), Party.party_code.ilike(term)))
        count_stmt = count_stmt.where(or_(func.lower(Party.name).like(term), Party.party_code.ilike(term)))

    total = db.scalar(count_stmt) or 0
    rows = db.scalars(stmt.order_by(Party.name).offset(offset).limit(limit)).all()

    next_cursor = str(offset + limit) if offset + limit < total else None
    return Page(data=[PartyOut.model_validate(p) for p in rows], meta=PageMeta(nextCursor=next_cursor, total=total))


@router.post("", response_model=PartyCreateResponse, status_code=status.HTTP_201_CREATED)
def create_party_endpoint(
    payload: PartyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties", "write")),
) -> PartyCreateResponse:
    party, duplicates = create_party(db, payload, created_by=current_user.id)
    return PartyCreateResponse(party=PartyOut.model_validate(party), duplicate_warning=duplicates)


@router.get("/{party_id}", response_model=PartyOut)
def get_party(
    party_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("parties", "read")),
) -> PartyOut:
    return PartyOut.model_validate(_get_party_or_404(db, party_id))


@router.patch("/{party_id}", response_model=PartyOut)
def patch_party(
    party_id: UUID,
    payload: PartyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties", "write")),
) -> PartyOut:
    party = _get_party_or_404(db, party_id)
    updated = update_party(db, party, payload, updated_by=current_user.id)
    return PartyOut.model_validate(updated)


@router.post("/{party_id}/deactivate", response_model=PartyOut)
def deactivate_party_endpoint(
    party_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties", "write")),
) -> PartyOut:
    party = _get_party_or_404(db, party_id)
    deactivated = deactivate_party(db, party, deactivated_by=current_user.id)
    return PartyOut.model_validate(deactivated)
