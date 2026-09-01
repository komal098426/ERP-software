from collections import defaultdict
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.db.session import get_db
from app.models.enums import YarnMovementType
from app.models.party import Party
from app.models.rbac import User
from app.models.transaction import Transaction
from app.models.yarn_ledger import YarnLedgerEntry

router = APIRouter(prefix="/analytics", tags=["analytics"])


class MonthlyPoint(BaseModel):
    month: str          # "YYYY-MM"
    dispatched_kg: Decimal
    received_kg: Decimal
    billed_amount: Decimal


class SummaryResponse(BaseModel):
    # counts
    party_count: int
    transaction_count: int
    yarn_entry_count: int
    # yarn kg totals
    total_received_kg: Decimal
    total_returned_kg: Decimal
    total_dispatched_kg: Decimal
    total_loss_kg: Decimal
    balance_kg: Decimal
    # billing
    total_billed_amount: Decimal
    # trend — last 12 calendar months, ordered oldest → newest
    monthly_trend: list[MonthlyPoint]


@router.get("/summary", response_model=SummaryResponse)
def summary(
    partyId: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("analytics", "read")),
) -> SummaryResponse:
    """Full analytics summary for the dashboard.

    When partyId is supplied every metric is scoped to that party; otherwise
    it covers all parties.  Monthly trend covers the last 12 calendar months
    (oldest → newest) so the bar chart always has a consistent x-axis.
    """
    # ── counts ──────────────────────────────────────────────────────────────
    party_stmt = select(func.count()).select_from(Party)
    txn_stmt = select(func.count()).select_from(Transaction)
    yarn_count_stmt = select(func.count()).select_from(YarnLedgerEntry)
    if partyId is not None:
        party_stmt = party_stmt.where(Party.id == partyId)
        txn_stmt = txn_stmt.where(Transaction.party_id == partyId)
        yarn_count_stmt = yarn_count_stmt.where(YarnLedgerEntry.party_id == partyId)

    party_count = db.scalar(party_stmt) or 0
    transaction_count = db.scalar(txn_stmt) or 0
    yarn_entry_count = db.scalar(yarn_count_stmt) or 0

    # ── yarn kg / billing aggregates ────────────────────────────────────────
    yarn_q = select(YarnLedgerEntry)
    if partyId is not None:
        yarn_q = yarn_q.where(YarnLedgerEntry.party_id == partyId)

    entries = db.scalars(yarn_q).all()

    total_received = Decimal("0.00")
    total_returned = Decimal("0.00")
    total_dispatched = Decimal("0.00")
    total_loss = Decimal("0.00")
    total_billed = Decimal("0.00")

    # monthly buckets: {"YYYY-MM": {received, dispatched, billed}}
    monthly: dict[str, dict[str, Decimal]] = defaultdict(
        lambda: {
            "received": Decimal("0.00"),
            "dispatched": Decimal("0.00"),
            "billed": Decimal("0.00"),
        }
    )

    for e in entries:
        month_key = e.date.strftime("%Y-%m")
        if e.movement_type == YarnMovementType.received:
            total_received += e.kg
            monthly[month_key]["received"] += e.kg
        elif e.movement_type == YarnMovementType.returned:
            total_returned += e.kg
        else:  # dispatched
            total_dispatched += e.kg
            total_loss += e.loss_kg
            total_billed += e.amount
            monthly[month_key]["dispatched"] += e.kg
            monthly[month_key]["billed"] += e.amount

    balance_kg = total_received - total_returned - total_dispatched - total_loss

    # ── last 12 months trend (sorted oldest → newest) ────────────────────────
    all_months_sorted = sorted(monthly.keys())
    last_12 = all_months_sorted[-12:]
    monthly_trend = [
        MonthlyPoint(
            month=m,
            dispatched_kg=monthly[m]["dispatched"],
            received_kg=monthly[m]["received"],
            billed_amount=monthly[m]["billed"],
        )
        for m in last_12
    ]

    return SummaryResponse(
        party_count=party_count,
        transaction_count=transaction_count,
        yarn_entry_count=yarn_entry_count,
        total_received_kg=total_received,
        total_returned_kg=total_returned,
        total_dispatched_kg=total_dispatched,
        total_loss_kg=total_loss,
        balance_kg=balance_kg,
        total_billed_amount=total_billed,
        monthly_trend=monthly_trend,
    )
