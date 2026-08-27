from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.db.session import get_db
from app.models.party import Party
from app.models.rbac import User
from app.models.yarn_ledger import YarnLedgerEntry
from app.schemas.common import Page, PageMeta
from app.schemas.yarn_ledger import LedgerSummary, YarnLedgerEntryCreate, YarnLedgerEntryOut
from app.services.yarn_ledger_service import compute_summary, create_entry

router = APIRouter(prefix="/yarn-ledger", tags=["yarn-ledger"])

DEFAULT_LIMIT = 25


@router.get("", response_model=Page[YarnLedgerEntryOut])
def list_entries(
    partyId: UUID | None = Query(default=None),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=DEFAULT_LIMIT, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("yarn_ledger", "read")),
) -> Page[YarnLedgerEntryOut]:
    offset = int(cursor) if cursor else 0

    stmt = select(YarnLedgerEntry)
    count_stmt = select(func.count()).select_from(YarnLedgerEntry)
    if partyId is not None:
        stmt = stmt.where(YarnLedgerEntry.party_id == partyId)
        count_stmt = count_stmt.where(YarnLedgerEntry.party_id == partyId)

    total = db.scalar(count_stmt) or 0
    rows = db.scalars(stmt.order_by(YarnLedgerEntry.date.desc()).offset(offset).limit(limit)).all()

    next_cursor = str(offset + limit) if offset + limit < total else None
    return Page(
        data=[YarnLedgerEntryOut.model_validate(e) for e in rows], meta=PageMeta(nextCursor=next_cursor, total=total)
    )


@router.get("/summary", response_model=LedgerSummary)
def summary(
    partyId: UUID = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("yarn_ledger", "read")),
) -> LedgerSummary:
    return compute_summary(db, partyId)


@router.post("", response_model=YarnLedgerEntryOut, status_code=status.HTTP_201_CREATED)
def create_entry_endpoint(
    payload: YarnLedgerEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("yarn_ledger", "write")),
) -> YarnLedgerEntryOut:
    party = db.get(Party, payload.party_id)
    if party is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Party not found")

    entry = create_entry(db, payload, created_by=current_user.id)
    return YarnLedgerEntryOut.model_validate(entry)
