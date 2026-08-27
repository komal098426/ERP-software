from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.db.session import get_db
from app.models.party import Party
from app.models.rbac import User
from app.models.transaction import Transaction

router = APIRouter(prefix="/analytics", tags=["analytics"])


class SummaryResponse(BaseModel):
    party_count: int
    transaction_count: int


@router.get("/summary", response_model=SummaryResponse)
def summary(
    partyId: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("analytics", "read")),
) -> SummaryResponse:
    """Party/transaction counts only for the dashboard shell. The full formula set from SRD §11
    (outstanding balance, reconciliation rate, MoM growth, etc.) lands with the Analytics module.
    """
    party_stmt = select(func.count()).select_from(Party)
    txn_stmt = select(func.count()).select_from(Transaction)
    if partyId is not None:
        party_stmt = party_stmt.where(Party.id == partyId)
        txn_stmt = txn_stmt.where(Transaction.party_id == partyId)

    return SummaryResponse(
        party_count=db.scalar(party_stmt) or 0,
        transaction_count=db.scalar(txn_stmt) or 0,
    )
