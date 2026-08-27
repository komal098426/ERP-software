import csv
import io
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.db.session import get_db
from app.models.party import Party
from app.models.rbac import User
from app.models.transaction import Transaction
from app.models.yarn_ledger import YarnLedgerEntry

router = APIRouter(prefix="/reports", tags=["reports"])


def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    buffer = io.StringIO()
    if rows:
        writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/parties.csv")
def export_parties_csv(
    db: Session = Depends(get_db), _: User = Depends(require_permission("reports", "read"))
) -> StreamingResponse:
    parties = db.scalars(select(Party).order_by(Party.name)).all()
    rows = [
        {
            "party_code": p.party_code, "name": p.name, "type": p.type.value, "status": p.status.value,
            "contact_person": p.contact_person or "", "phone": p.phone or "", "email": p.email or "",
            "opening_balance": str(p.opening_balance), "created_at": p.created_at.isoformat(),
        }
        for p in parties
    ]
    return _csv_response(rows, "parties.csv")


@router.get("/transactions.csv")
def export_transactions_csv(
    partyId: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("reports", "read")),
) -> StreamingResponse:
    stmt = select(Transaction).order_by(Transaction.date.desc())
    if partyId is not None:
        stmt = stmt.where(Transaction.party_id == partyId)
    rows = [
        {
            "transaction_code": t.transaction_code, "date": str(t.date), "entry_type": t.entry_type.value,
            "amount": str(t.amount), "payment_status": t.payment_status.value,
            "reference_number": t.reference_number or "", "description": t.description or "",
        }
        for t in db.scalars(stmt).all()
    ]
    return _csv_response(rows, "transactions.csv")


@router.get("/yarn-ledger.csv")
def export_yarn_ledger_csv(
    partyId: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("reports", "read")),
) -> StreamingResponse:
    stmt = select(YarnLedgerEntry).order_by(YarnLedgerEntry.date.desc())
    if partyId is not None:
        stmt = stmt.where(YarnLedgerEntry.party_id == partyId)
    rows = [
        {
            "date": str(e.date), "movement_type": e.movement_type.value, "igp_number": e.igp_number or "",
            "ogp_number": e.ogp_number or "", "yarn_count": e.yarn_count, "bags": str(e.bags or ""),
            "kg": str(e.kg), "fabric_description": e.fabric_description or "",
            "knitting_rate": str(e.knitting_rate or ""), "loss_kg": str(e.loss_kg), "amount": str(e.amount),
            "remarks": e.remarks or "",
        }
        for e in db.scalars(stmt).all()
    ]
    return _csv_response(rows, "yarn-ledger.csv")
