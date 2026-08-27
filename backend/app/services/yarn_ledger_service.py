from collections import defaultdict
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import AuditAction, YarnMovementType
from app.models.yarn_ledger import YarnLedgerEntry
from app.schemas.yarn_ledger import (
    CountBreakdown,
    DateWiseRow,
    LedgerSummary,
    YarnLedgerEntryCreate,
)
from app.services.audit import write_audit

TWO_PLACES = Decimal("0.01")


def _round(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def create_entry(db: Session, payload: YarnLedgerEntryCreate, *, created_by: UUID | None) -> YarnLedgerEntry:
    """Loss and amount are always derived from kg/rate/loss_percent here, never taken from the
    client, so an entry can never show a loss or amount that disagrees with its own kg and rate --
    the spreadsheet enforced this by formula; this is the same guarantee in code."""
    is_dispatch = payload.movement_type == YarnMovementType.dispatched
    loss_kg = _round(payload.kg * payload.loss_percent / Decimal("100")) if is_dispatch else Decimal("0.00")
    amount = _round(payload.kg * payload.knitting_rate) if is_dispatch and payload.knitting_rate else Decimal("0.00")

    entry = YarnLedgerEntry(
        party_id=payload.party_id,
        movement_type=payload.movement_type,
        date=payload.date,
        igp_number=payload.igp_number,
        ogp_number=payload.ogp_number,
        yarn_count=payload.yarn_count,
        bags=payload.bags,
        kg=payload.kg,
        fabric_description=payload.fabric_description,
        knitting_rate=payload.knitting_rate,
        loss_percent=payload.loss_percent if is_dispatch else Decimal("0.00"),
        loss_kg=loss_kg,
        amount=amount,
        remarks=payload.remarks,
        created_by=created_by,
    )
    db.add(entry)
    db.flush()

    write_audit(
        db,
        user_id=created_by,
        action=AuditAction.created,
        module="yarn_ledger",
        record_type="yarn_ledger_entry",
        record_id=entry.id,
        new_value={"movement_type": entry.movement_type.value, "kg": str(entry.kg)},
    )
    db.commit()
    db.refresh(entry)
    return entry


def compute_summary(db: Session, party_id: UUID) -> LedgerSummary:
    entries = db.scalars(
        select(YarnLedgerEntry).where(YarnLedgerEntry.party_id == party_id).order_by(YarnLedgerEntry.date)
    ).all()

    total_received = total_returned = total_dispatched = total_loss = total_amount = Decimal("0.00")
    by_count: dict[str, dict[str, Decimal]] = defaultdict(
        lambda: {"received": Decimal("0.00"), "returned": Decimal("0.00"), "dispatched": Decimal("0.00")}
    )
    by_date: dict = {}
    running_balance = Decimal("0.00")

    for entry in entries:
        bucket = by_count[entry.yarn_count]
        day = by_date.setdefault(
            entry.date,
            {"received": Decimal("0.00"), "returned": Decimal("0.00"), "dispatched": Decimal("0.00"),
             "loss": Decimal("0.00"), "amount": Decimal("0.00")},
        )

        if entry.movement_type == YarnMovementType.received:
            total_received += entry.kg
            bucket["received"] += entry.kg
            day["received"] += entry.kg
            running_balance += entry.kg
        elif entry.movement_type == YarnMovementType.returned:
            total_returned += entry.kg
            bucket["returned"] += entry.kg
            day["returned"] += entry.kg
            running_balance -= entry.kg
        else:  # dispatched
            total_dispatched += entry.kg
            total_loss += entry.loss_kg
            total_amount += entry.amount
            bucket["dispatched"] += entry.kg
            day["dispatched"] += entry.kg
            day["loss"] += entry.loss_kg
            day["amount"] += entry.amount
            running_balance -= entry.kg + entry.loss_kg

        day["balance"] = running_balance

    count_breakdown = [
        CountBreakdown(
            yarn_count=count,
            received_kg=v["received"],
            returned_kg=v["returned"],
            dispatched_kg=v["dispatched"],
            net_kg=v["received"] - v["returned"] - v["dispatched"],
        )
        for count, v in sorted(by_count.items())
    ]

    date_wise = [
        DateWiseRow(
            date=day,
            received_kg=v["received"],
            returned_kg=v["returned"],
            dispatched_kg=v["dispatched"],
            loss_kg=v["loss"],
            amount=v["amount"],
            running_balance_kg=v["balance"],
        )
        for day, v in sorted(by_date.items())
    ]

    return LedgerSummary(
        total_received_kg=total_received,
        total_returned_kg=total_returned,
        total_dispatched_kg=total_dispatched,
        total_loss_kg=total_loss,
        balance_kg=running_balance,
        total_amount=total_amount,
        count_breakdown=count_breakdown,
        date_wise=date_wise,
    )
