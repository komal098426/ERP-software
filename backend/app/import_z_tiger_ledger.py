"""One-off import of the real Z TIGER yarn/fabric ledger from the source spreadsheet
the user shared (AL HABIB KNITTWEAR's commission-knitting records for party Z TIGER).

Idempotent: safe to re-run. On each run it:
  - Creates the party (Z TIGER) if missing.
  - Clears any previously imported YarnLedgerEntry rows for Z TIGER and re-imports
    fresh, so corrections to this file always take effect on re-run.
  - Imports 2 fabric-dispatch entries (OGP 2308/2314; knitting_rate = 17.00 PKR/kg
    derived from Amount ÷ kg, loss = 2% applied by service) and 2 yarn received entries
    (IGP 2172/2173, 24/1 CVC) as YarnLedgerEntry rows.
  - Prints a date-wise summary and verifies grand totals.

NOTE on date-wise table
-----------------------
The source reconciliation date-wise table covers only the 2 yarn receipt rows -- the
dispatches are not shown there. Running chronologically:
  2019-04-03  recv=861.84  disp=12     loss=0.24  balance=849.60
  2019-04-04  recv=677.96  disp=0      loss=0.00  balance=1527.56
  2019-04-10  recv=0       disp=561    loss=11.22 balance=955.34
Final balance is POSITIVE (955.34 kg) -- healthy ledger, more dispatches expected.

Source data
-----------
Fabric Dispatch Register (OGP-wise):
  Sr#  Date         OGP#   Description  Dispatched(KGS)  Amount(PKR)  Rate(PKR/kg)
   1   2019-04-03   2308   JUMB PQ        12.00           204.00       17.00
   2   2019-04-10   2314   JUMB PQ       561.00          9537.00       17.00

Yarn Store Register (received):
  Sr#  Date         Count     KGS      Remarks
   1   2019-04-03   24/1 CVC  861.84  IGP: 2172
   2   2019-04-04   24/1 CVC  677.96  IGP: 2173

Grand totals:
  Total yarn received  : 1539.80 kg  (861.84 + 677.96)
  Total dispatched     :  573.00 kg  (12.00 + 561.00)
  Total loss (2%)      :   11.46 kg  (0.24 + 11.22)
  Total amount         : 9741.00 PKR (204.00 + 9537.00)
  Final balance        :  955.34 kg

Run with: python -m app.import_z_tiger_ledger
"""

from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models.audit_log import AuditLogEntry
from app.models.enums import PartySource, PartyType, YarnMovementType
from app.models.party import Party
from app.models.rbac import User
from app.models.yarn_ledger import YarnLedgerEntry
from app.schemas.yarn_ledger import YarnLedgerEntryCreate
from app.services.duplicate_detection import normalize_name
from app.services.yarn_ledger_service import compute_summary, create_entry

PARTY_NAME = "Z TIGER"
TWO_PLACES = Decimal("0.01")

# ---------------------------------------------------------------------------
# Source data: Fabric Dispatch Register
# (date, ogp, fabric_description, dispatched_kg, knitting_rate)
# Rate = Amount / kg = 204 / 12 = 17.00 and 9537 / 561 = 17.00 PKR/kg.
# Loss = 2% computed by service.
# ---------------------------------------------------------------------------
FABRIC_DISPATCH_REGISTER = [
    # Sr#1 -- OGP 2308  (12 kg × 17.00 = 204.00 PKR)
    (date(2019, 4,  3), "2308", "JUMB PQ", Decimal("12.00"),  Decimal("17.00")),
    # Sr#2 -- OGP 2314  (561 kg × 17.00 = 9537.00 PKR)
    (date(2019, 4, 10), "2314", "JUMB PQ", Decimal("561.00"), Decimal("17.00")),
]

# ---------------------------------------------------------------------------
# Source data: Yarn Store Register
# (date, direction, igp_ref, yarn_count, bags, kg, remarks)
# ---------------------------------------------------------------------------
YARN_STORE_REGISTER = [
    # Sr#1 -- IGP 2172
    (date(2019, 4, 3), "received", "2172", "24/1 CVC", None, Decimal("861.84"), "IGP: 2172"),
    # Sr#2 -- IGP 2173
    (date(2019, 4, 4), "received", "2173", "24/1 CVC", None, Decimal("677.96"), "IGP: 2173"),
]

# ---------------------------------------------------------------------------
# Grand total expectations for post-import sanity check.
# ---------------------------------------------------------------------------
EXPECTED_TOTAL_RECEIVED   = Decimal("1539.80")
EXPECTED_TOTAL_DISPATCHED = Decimal("573.00")
EXPECTED_TOTAL_LOSS       = Decimal("11.46")
EXPECTED_TOTAL_AMOUNT     = Decimal("9741.00")
EXPECTED_FINAL_BALANCE    = Decimal("955.34")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _next_party_code(db) -> str:
    count = db.scalar(select(func.count()).select_from(Party)) or 0
    return f"PTY-{count + 1:04d}"


def get_or_create_party(db, admin: User) -> Party:
    existing = db.scalar(select(Party).where(Party.normalized_name == normalize_name(PARTY_NAME)))
    if existing is not None:
        return existing

    party = Party(
        party_code=_next_party_code(db),
        name=PARTY_NAME,
        normalized_name=normalize_name(PARTY_NAME),
        type=PartyType.customer,
        contact_person="Procurement Desk",
        source=PartySource.manual,
        created_by=admin.id,
    )
    db.add(party)
    db.commit()
    db.refresh(party)
    print(f"Created party '{PARTY_NAME}' ({party.party_code}).")
    return party


def clear_existing_entries(db, party_id) -> int:
    """Remove all YarnLedgerEntry rows (and their audit logs) for this party so
    a re-run always reflects the current source data in this file."""
    entries = db.query(YarnLedgerEntry).filter(YarnLedgerEntry.party_id == party_id).all()
    removed = len(entries)
    if removed:
        for entry in entries:
            db.query(AuditLogEntry).filter(AuditLogEntry.record_id == entry.id).delete()
            db.delete(entry)
        db.commit()
        print(f"Cleared {removed} existing YarnLedgerEntry rows for Z TIGER (fresh import).")
    return removed


def import_fabric_dispatches(db, party: Party, admin: User) -> int:
    count = 0
    for txn_date, ogp, fabric, kg, rate in FABRIC_DISPATCH_REGISTER:
        create_entry(
            db,
            YarnLedgerEntryCreate(
                party_id=party.id,
                movement_type=YarnMovementType.dispatched,
                date=txn_date,
                ogp_number=ogp,
                yarn_count=fabric,
                kg=kg,
                fabric_description=fabric,
                knitting_rate=rate,
                loss_percent=Decimal("2.00"),
            ),
            created_by=admin.id,
        )
        count += 1
    return count


def import_yarn_movements(db, party: Party, admin: User) -> int:
    count = 0
    for txn_date, direction, igp_ref, yarn_count, bags, kg, remarks in YARN_STORE_REGISTER:
        create_entry(
            db,
            YarnLedgerEntryCreate(
                party_id=party.id,
                movement_type=YarnMovementType.received if direction == "received" else YarnMovementType.returned,
                date=txn_date,
                igp_number=igp_ref,
                yarn_count=yarn_count,
                bags=bags,
                kg=kg,
                remarks=remarks,
            ),
            created_by=admin.id,
        )
        count += 1
    return count


def verify_totals(db, party: Party) -> None:
    """Verify grand totals (received, dispatched, loss, amount, balance) against source data."""
    summary = compute_summary(db, party.id)

    actual_balance = (
        summary.total_received_kg
        - summary.total_returned_kg
        - summary.total_dispatched_kg
        - summary.total_loss_kg
    ).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    errors = []
    if summary.total_received_kg != EXPECTED_TOTAL_RECEIVED:
        errors.append(
            f"total_received: got {summary.total_received_kg}, expected {EXPECTED_TOTAL_RECEIVED}"
        )
    if summary.total_dispatched_kg != EXPECTED_TOTAL_DISPATCHED:
        errors.append(
            f"total_dispatched: got {summary.total_dispatched_kg}, expected {EXPECTED_TOTAL_DISPATCHED}"
        )
    if summary.total_loss_kg != EXPECTED_TOTAL_LOSS:
        errors.append(
            f"total_loss: got {summary.total_loss_kg}, expected {EXPECTED_TOTAL_LOSS}"
        )
    if summary.total_amount != EXPECTED_TOTAL_AMOUNT:
        errors.append(
            f"total_amount: got {summary.total_amount}, expected {EXPECTED_TOTAL_AMOUNT}"
        )
    if actual_balance != EXPECTED_FINAL_BALANCE:
        errors.append(
            f"final_balance: got {actual_balance}, expected {EXPECTED_FINAL_BALANCE}"
        )

    if errors:
        raise RuntimeError("Z TIGER totals mismatch -- " + "; ".join(errors))

    print("[OK] Grand totals verified against source data.")
    print(f"  Total received  : {summary.total_received_kg:>10.2f} kg")
    print(f"  Total dispatched: {summary.total_dispatched_kg:>10.2f} kg")
    print(f"  Total loss (2%) : {summary.total_loss_kg:>10.2f} kg")
    print(f"  Total amount    : {summary.total_amount:>10.2f} PKR")
    print(f"  Final balance   : {actual_balance:>10.2f} kg")
    print("")
    print("  Date-wise summary (chronological, as stored):")
    for row in summary.date_wise:
        print(
            f"    {row.date}  "
            f"recv={row.received_kg:>8.2f}  "
            f"disp={row.dispatched_kg:>8.2f}  "
            f"loss={row.loss_kg:>5.2f}  "
            f"amt={row.amount:>8.2f}  "
            f"balance={row.running_balance_kg:>8.2f}"
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.email == "admin@erp-dashboard.app"))
        if admin is None:
            raise RuntimeError("Run `python -m app.seed` first to create the default Admin user.")

        party = get_or_create_party(db, admin)

        # Always clear and re-import so corrections to this file take effect on re-run.
        clear_existing_entries(db, party.id)

        dispatch_count = import_fabric_dispatches(db, party, admin)
        yarn_count = import_yarn_movements(db, party, admin)

        print(
            f"Imported {dispatch_count} fabric-dispatch entries and "
            f"{yarn_count} yarn-movement entries for Z TIGER."
        )

        verify_totals(db, party)

    finally:
        db.close()


if __name__ == "__main__":
    main()
