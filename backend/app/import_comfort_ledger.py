"""One-off import of the real COMFORT yarn/fabric ledger from the source spreadsheet
the user shared (AL HABIB KNITTWEAR's commission-knitting records for party COMFORT).

Idempotent: safe to re-run. On each run it:
  - Creates the party (COMFORT) if missing.
  - Clears any previously imported YarnLedgerEntry rows for COMFORT and re-imports
    fresh, so corrections to this file always take effect on re-run.
  - Imports 3 fabric-dispatch entries (OGP 261/270/272; Amount = 0 for all, knitting_rate = 0,
    loss = 2% applied by service) and 3 yarn received entries (IGP 162/165) as
    YarnLedgerEntry rows, via the same service the API uses.
  - Prints a date-wise summary and verifies grand totals.

NOTE on balance
---------------
The source reconciliation date-wise table covers ONLY the 3 yarn receipt rows (no dispatches
are shown there yet). All 3 dispatch OGPs (261, 270, 272) come from a separate Fabric
Dispatch Register. Total dispatches (7787.50 kg) far exceed total receipts (3447.36 kg),
giving a deeply negative final balance (-4495.89 kg). More yarn batches are expected.

NOTE on OGP date order
-----------------------
OGP 261 is dated 2020-12-08, while OGP 270/272 are dated 2020-08-21 and 2020-08-22.
The OGP sequence numbers do not follow calendar order -- this appears to be the original
allocation in the source register and is imported as-is.

Source data
-----------
Fabric Dispatch Register (OGP-wise):
  Sr#  Date         OGP#   Description  Dispatched(KGS)  Amount(PKR)
   1   2020-12-08    261   2THTERRY     2901.00          0
   2   2020-08-21    270   2THTERRY     1062.00          0
   3   2020-08-22    272   2THTERRY     3824.50          0

Yarn Store Register (received):
  Sr#  Date         Count     KGS       Remarks
   1   2020-06-08   20/1CVC   1451.52  IGP: 162
   2   2020-06-08   16/1CVC    816.48  IGP: 162
   3   2020-10-08   20/1 CVC  1179.36  IGP: 165

Grand totals:
  Total yarn received  :  3447.36 kg  (1451.52 + 816.48 + 1179.36)
  Total dispatched     :  7787.50 kg  (2901.00 + 1062.00 + 3824.50)
  Total loss (2%)      :   155.75 kg  (58.02 + 21.24 + 76.49)
  Final balance        : -4495.89 kg  (awaiting remaining yarn batches)

Source reconciliation sheet (date-wise -- yarn receipts only, no dispatches yet):
  Date         Yarn Rec'd  Yarn Ret'd  Net Avail  Fab Disp  Loss(2%)  Daily Bal  Status
  2020-06-08   1451.52     0.00        1451.52    0.00      0.00       1451.52    Balanced
  2020-06-08    816.48     0.00         816.48    0.00      0.00       2268.00    Balanced
  2020-10-08   1179.36     0.00        1179.36    0.00      0.00       3447.36    Balanced

Run with: python -m app.import_comfort_ledger
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

PARTY_NAME = "COMFORT"
TWO_PLACES = Decimal("0.01")

# ---------------------------------------------------------------------------
# Source data: Fabric Dispatch Register
# (date, ogp, fabric_description, dispatched_kg, knitting_rate)
# Amount = 0 for all (no billing rate in this batch). Loss = 2% via service.
# ---------------------------------------------------------------------------
FABRIC_DISPATCH_REGISTER = [
    # Sr#1 -- OGP 261
    (date(2020, 12,  8), "261", "2THTERRY", Decimal("2901.00"),  Decimal("0.00")),
    # Sr#2 -- OGP 270
    (date(2020,  8, 21), "270", "2THTERRY", Decimal("1062.00"),  Decimal("0.00")),
    # Sr#3 -- OGP 272
    (date(2020,  8, 22), "272", "2THTERRY", Decimal("3824.50"),  Decimal("0.00")),
]

# ---------------------------------------------------------------------------
# Source data: Yarn Store Register
# (date, direction, igp_ref, yarn_count, bags, kg, remarks)
# ---------------------------------------------------------------------------
YARN_STORE_REGISTER = [
    # Sr#1 -- IGP 162
    (date(2020,  6,  8), "received", "162", "20/1CVC",  None, Decimal("1451.52"), "IGP: 162"),
    # Sr#2 -- IGP 162
    (date(2020,  6,  8), "received", "162", "16/1CVC",  None, Decimal("816.48"),  "IGP: 162"),
    # Sr#3 -- IGP 165
    (date(2020, 10,  8), "received", "165", "20/1 CVC", None, Decimal("1179.36"), "IGP: 165"),
]

# ---------------------------------------------------------------------------
# Grand total expectations for post-import sanity check.
# Balance is deeply negative; more yarn receipts are expected.
# ---------------------------------------------------------------------------
EXPECTED_TOTAL_RECEIVED   = Decimal("3447.36")
EXPECTED_TOTAL_DISPATCHED = Decimal("7787.50")
EXPECTED_TOTAL_LOSS       = Decimal("155.75")
EXPECTED_FINAL_BALANCE    = Decimal("-4495.89")


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
        print(f"Cleared {removed} existing YarnLedgerEntry rows for COMFORT (fresh import).")
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
    """Verify grand totals against source data and print date-wise summary."""
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
    if actual_balance != EXPECTED_FINAL_BALANCE:
        errors.append(
            f"final_balance: got {actual_balance}, expected {EXPECTED_FINAL_BALANCE}"
        )

    if errors:
        raise RuntimeError("COMFORT totals mismatch -- " + "; ".join(errors))

    print("[OK] Grand totals verified against source data.")
    print(f"  Total received  : {summary.total_received_kg:>10.2f} kg")
    print(f"  Total dispatched: {summary.total_dispatched_kg:>10.2f} kg")
    print(f"  Total loss (2%) : {summary.total_loss_kg:>10.2f} kg")
    print(f"  Final balance   : {actual_balance:>10.2f} kg  [NEGATIVE -- more yarn batches expected]")
    print("")
    print("  Date-wise summary (chronological, as stored):")
    for row in summary.date_wise:
        print(
            f"    {row.date}  "
            f"recv={row.received_kg:>9.2f}  "
            f"disp={row.dispatched_kg:>9.2f}  "
            f"loss={row.loss_kg:>6.2f}  "
            f"balance={row.running_balance_kg:>10.2f}"
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
            f"{yarn_count} yarn-movement entries for COMFORT."
        )

        verify_totals(db, party)

    finally:
        db.close()


if __name__ == "__main__":
    main()
