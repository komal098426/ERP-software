"""One-off import of the real TIME CLOTHING yarn/fabric ledger from the source spreadsheet
the user shared (AL HABIB KNITTWEAR's commission-knitting records for party TIME CLOTHING).

Idempotent: safe to re-run. On each run it:
  - Creates the party (TIME CLOTHING) if missing.
  - Clears any previously imported YarnLedgerEntry rows for TIME CLOTHING and re-imports
    fresh, so corrections to this file always take effect on re-run.
  - Imports 4 fabric-dispatch entries (Fabric Dispatch Register: real dates, OGP#, kg;
    Amount = 0 for all entries so knitting_rate = 0, loss = 2% applied by service) and
    4 yarn received entries (Yarn Store Register: IGP references, yarn counts, kg) as
    YarnLedgerEntry rows, via the same service the API uses.
  - Prints a date-wise summary and verifies grand totals.

NOTE on date ordering
---------------------
The source reconciliation sheet rows are NOT in chronological order (the sheet lists
Feb-01 before Jan-09). The service always processes entries ordered by date, so
intermediate running balances differ from the sheet.  This script verifies grand totals
(total received, total dispatched, total loss, final balance) only, which must match
regardless of ordering.

Source data
-----------
Fabric Dispatch Register (OGP-wise):
  Sr#  Date         OGP#   Description  Dispatched(KGS)  Amount(PKR)
   1   2018-01-09   1014   S/J          1004.00          0
   2   2018-01-15   1016   S/J           705.00          0
   3   2018-01-15   1016   S/J           552.00          0
   4   2018-01-15   1016   S/J           340.00          0

Yarn Store Register (received):
  Sr#  Date         Count      KGS       Remarks
   1   2017-12-29   30/1 COMD  3129.84  IGP: 471
   2   2018-02-01   24/1 COMD  1814.40  IGP: 472
   3   2018-01-16   24/1 CF    2676.24  IGP: 475
   4   2018-01-15   24/1 CMD   1995.84  IGP: 476

Grand totals (verified):
  Total yarn received  : 9616.32 kg  (3129.84 + 1814.40 + 2676.24 + 1995.84)
  Total dispatched     : 2601.00 kg  (1004 + 705 + 552 + 340)
  Total loss (2%)      :   52.02 kg
  Final balance        : 6963.30 kg

Source reconciliation sheet (date-wise, in sheet order -- NOT chronological):
  Date         Yarn Rec'd  Yarn Ret'd  Net Avail  Fab Disp  Loss(2%)  Daily Bal  Status
  2017-12-29   3129.84     0.00        3129.84    0.00       0.00      3129.84    Balanced
  2018-02-01   1814.40     0.00        1814.40    0.00       0.00      4944.24    Balanced
  2018-01-09      0.00     0.00           0.00    1004.00   20.08      3920.16    Balanced
  2018-01-15      0.00     0.00           0.00     705.00   14.10      3201.06    Balanced

Run with: python -m app.import_time_clothing_ledger
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

PARTY_NAME = "TIME CLOTHING"
TWO_PLACES = Decimal("0.01")

# ---------------------------------------------------------------------------
# Source data: Fabric Dispatch Register
# (date, ogp, fabric_description, dispatched_kg, knitting_rate)
# Amount = 0 for all entries (job-work only, no rate billed in this batch).
# Loss = 2% computed by service.
# ---------------------------------------------------------------------------
FABRIC_DISPATCH_REGISTER = [
    # Sr#1 -- OGP 1014
    (date(2018, 1,  9), "1014", "S/J", Decimal("1004.00"), Decimal("0.00")),
    # Sr#2 -- OGP 1016 (3 separate entries on the same OGP)
    (date(2018, 1, 15), "1016", "S/J", Decimal("705.00"),  Decimal("0.00")),
    # Sr#3
    (date(2018, 1, 15), "1016", "S/J", Decimal("552.00"),  Decimal("0.00")),
    # Sr#4
    (date(2018, 1, 15), "1016", "S/J", Decimal("340.00"),  Decimal("0.00")),
]

# ---------------------------------------------------------------------------
# Source data: Yarn Store Register
# (date, direction, igp_ref, yarn_count, bags, kg, remarks)
# direction: "received" | "returned"
# ---------------------------------------------------------------------------
YARN_STORE_REGISTER = [
    # Sr#1
    (date(2017, 12, 29), "received", "471", "30/1 COMD", None, Decimal("3129.84"), "IGP: 471"),
    # Sr#2
    (date(2018,  2,  1), "received", "472", "24/1 COMD", None, Decimal("1814.40"), "IGP: 472"),
    # Sr#3
    (date(2018,  1, 16), "received", "475", "24/1 CF",   None, Decimal("2676.24"), "IGP: 475"),
    # Sr#4
    (date(2018,  1, 15), "received", "476", "24/1 CMD",  None, Decimal("1995.84"), "IGP: 476"),
]

# ---------------------------------------------------------------------------
# Grand total expectations for post-import sanity check.
# (Per-date running balances are NOT checked here because the source sheet
#  rows are in a non-chronological order that the service cannot replicate.)
# ---------------------------------------------------------------------------
EXPECTED_TOTAL_RECEIVED   = Decimal("9616.32")
EXPECTED_TOTAL_DISPATCHED = Decimal("2601.00")
EXPECTED_TOTAL_LOSS       = Decimal("52.02")
EXPECTED_FINAL_BALANCE    = Decimal("6963.30")


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
        print(f"Cleared {removed} existing YarnLedgerEntry rows for TIME CLOTHING (fresh import).")
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
    """Verify grand totals against the source reconciliation sheet.

    Per-date running balances are intentionally NOT checked because the source
    sheet rows are listed in a non-chronological order; the service always sorts
    by date, so intermediate balances necessarily differ from the sheet view.
    Grand totals are invariant to ordering and must always match.
    """
    summary = compute_summary(db, party.id)

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
    actual_balance = (summary.total_received_kg
                      - summary.total_returned_kg
                      - summary.total_dispatched_kg
                      - summary.total_loss_kg).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    if actual_balance != EXPECTED_FINAL_BALANCE:
        errors.append(
            f"final_balance: got {actual_balance}, expected {EXPECTED_FINAL_BALANCE}"
        )

    if errors:
        raise RuntimeError("TIME CLOTHING totals mismatch -- " + "; ".join(errors))

    print("[OK] Grand totals verified against source reconciliation sheet.")
    print(f"  Total received  : {summary.total_received_kg:>10.2f} kg")
    print(f"  Total dispatched: {summary.total_dispatched_kg:>10.2f} kg")
    print(f"  Total loss (2%) : {summary.total_loss_kg:>10.2f} kg")
    print(f"  Final balance   : {actual_balance:>10.2f} kg")
    print("")
    print("  Date-wise summary (chronological, as stored):")
    for row in summary.date_wise:
        print(
            f"    {row.date}  "
            f"recv={row.received_kg:>9.2f}  "
            f"disp={row.dispatched_kg:>9.2f}  "
            f"loss={row.loss_kg:>6.2f}  "
            f"balance={row.running_balance_kg:>9.2f}"
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
            f"{yarn_count} yarn-movement entries for TIME CLOTHING."
        )

        verify_totals(db, party)

    finally:
        db.close()


if __name__ == "__main__":
    main()
