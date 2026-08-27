from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.db.session import get_db
from app.models.party import Party
from app.models.rbac import User
from app.models.transaction import Transaction
from app.schemas.common import Page, PageMeta
from app.schemas.transaction import TransactionCreate, TransactionOut
from app.services.transaction_service import create_transaction

router = APIRouter(prefix="/transactions", tags=["transactions"])

DEFAULT_LIMIT = 25


@router.get("", response_model=Page[TransactionOut])
def list_transactions(
    partyId: UUID | None = Query(default=None),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=DEFAULT_LIMIT, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("transactions", "read")),
) -> Page[TransactionOut]:
    offset = int(cursor) if cursor else 0

    stmt = select(Transaction).where(Transaction.is_archived.is_(False))
    count_stmt = select(func.count()).select_from(Transaction).where(Transaction.is_archived.is_(False))
    if partyId is not None:
        stmt = stmt.where(Transaction.party_id == partyId)
        count_stmt = count_stmt.where(Transaction.party_id == partyId)

    total = db.scalar(count_stmt) or 0
    rows = db.scalars(stmt.order_by(Transaction.date.desc()).offset(offset).limit(limit)).all()

    next_cursor = str(offset + limit) if offset + limit < total else None
    return Page(
        data=[TransactionOut.model_validate(t) for t in rows], meta=PageMeta(nextCursor=next_cursor, total=total)
    )


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction_endpoint(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("transactions", "write")),
) -> TransactionOut:
    party = db.get(Party, payload.party_id)
    if party is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Party not found")

    transaction = create_transaction(db, payload, created_by=current_user.id)
    return TransactionOut.model_validate(transaction)
