from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import AuditAction
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate
from app.services.audit import write_audit


def _next_transaction_code(db: Session) -> str:
    count = db.scalar(select(func.count()).select_from(Transaction)) or 0
    return f"TXN-{count + 1:06d}"


def create_transaction(db: Session, payload: TransactionCreate, *, created_by: UUID | None) -> Transaction:
    transaction = Transaction(
        transaction_code=_next_transaction_code(db),
        party_id=payload.party_id,
        entry_type=payload.entry_type,
        date=payload.date,
        amount=payload.amount,
        reference_number=payload.reference_number,
        description=payload.description,
        category=payload.category,
        payment_status=payload.payment_status,
        notes=payload.notes,
        created_by=created_by,
    )
    db.add(transaction)
    db.flush()  # assigns transaction.id without ending the transaction

    write_audit(
        db,
        user_id=created_by,
        action=AuditAction.created,
        module="transactions",
        record_type="transaction",
        record_id=transaction.id,
        new_value={"entry_type": transaction.entry_type.value, "amount": str(transaction.amount)},
    )
    db.commit()
    db.refresh(transaction)
    return transaction
