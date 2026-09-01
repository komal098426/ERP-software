"""One-off import of the real LEATHER TEX yarn/fabric ledger from the source spreadsheet
the user shared (AL HABIB KNITTWEAR's commission-knitting records for party LEATHER TEX).

Idempotent: safe to re-run. On each run it:
  - Creates the party (LEATHER TEX) if missing.
  - Clears any previously imported YarnLedgerEntry rows for LEATHER TEX and re-imports
    fresh, so corrections to this file always take effect on re-run.
  - Imports 3 fabric-dispatch entries (Fabric Dispatch Register: real dates, OGP#, kg;
    Amount = 0 for all entries so knitting_rate = 0, loss = 2% applied by service) and
    3 yarn received entries (Yarn Store Register: same IGP 2081, three counts) as
    YarnLedgerEntry rows, via the same service the API uses.
  - Prints a date-wise summary and verifies grand totals.

NOTE on balance
---------------
The source reconciliation date-wise table covers only the first dispatch (OGP 2036,
2018-12-05, 5.20 kg). OGP 2038 (2018-12-06, 10 kg) and OGP 2039 (2018-12-07, 843 kg)
appear in the Fabric Dispatch Register but not in the date-wise table, suggesting more
yarn receipts are expected in a subsequent batch. The final balance after all 3 dispatches
is NEGATIVE (-106.60 kg) -- this is expected until the remaining yarn lots are imported.

NOTE on rounding (0.01 diff)
------------------------------
The source sheet shows loss = 0.10 and balance = 763.45 after OGP 2036. Computed:
  5.20 kg * 2% = 0.104 -> rounded to 0.10 kg (ROUND_HALF_UP)
  768.76 - 5.20 - 0.10 = 763.46 kg
The sheet shows 763.45 (off by 0.01) -- a rounding artefact in the manual spreadsheet.
The service's value (763.46) is arithmetically correct.

Source data
-----------
Fabric Dispatch Register (OGP-wise):
  Sr#  Date         OGP#   Description    Dispatched(KGS)  Amount(PKR)
   1   2018-12-05   2036   2 TH FLEECE      5.20           0
   2   2018-12-06   2038   P.K SAMPLE      10.00           0
   3   2018-12-07   2039   2 TH FLEECE    843.00           0

Yarn Store Register (received):
  Sr#  Date         Count     KGS      Remarks
   1   2018-12-03   20/1 PC  544.32   IGP: 2081
   2   2018-12-03   12/1 PC  181.44   IGP: 2081
   3   2018-12-03   12/1 PC   43.00   IGP: 2081

Grand totals:
  Total yarn received  :   768.76 kg  (544.32 + 181.44 + 43.00)
  Total dispatched     :   858.20 kg  (5.20 + 10.00 + 843.00)
  Total loss (2%)      :    17.16 kg  (0.10 + 0.20 + 16.86)
  Final balance        :  -106.60 kg  (awaiting next yarn batch)

Source reconciliation sheet (date-wise, partial -- covers first dispatch only):
  Date         Yarn Rec'd  Yarn Ret'd  Net Avail  Fab Disp  Loss(2%)  Daily Bal  Status
  2018-12-03    544.32     0.00         544.32    0.00      0.00       544.32     Balanced
  2018-12-03    181.44     0.00         181.44    0.00      0.00       725.76     Balanced
  2018-12-03     43.00     0.00          43.00    0.00      0.00       768.76     Balanced
  2018-12-05      0.00     0.00           0.00    5.20      0.10       763.45*    Balanced
  (* sheet shows 763.45; service computes 763.46 due to rounding -- 0.01 artefact)

Run with: python -m app.import_leather_tex_ledger
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

PARTY_NAME = "LEATHER TEX"
TWO_PLACES = Decimal("0.01")

# ---------------------------------------------------------------------------
# Source data: Fabric Dispatch Register
# (date, ogp, fabric_description, dispatched_kg, knitting_rate)
# Amount = 0 for all (job-work; no billing rate in this batch).
# Loss = 2% computed by service.
# ---------------------------------------------------------------------------
FABRIC_DISPATCH_REGISTER = [
    # Sr#1 -- OGP 2036
    (date(2018, 12, 5), "2036", "2 TH FLEECE", Decimal("5.20"),  Decimal("0.00")),
    # Sr#2 -- OGP 2038
    (date(2018, 12, 6), "2038", "P.K SAMPLE",  Decimal("10.00"), Decimal("0.00")),
    # Sr#3 -- OGP 2039
    (date(2018, 12, 7), "2039", "2 TH FLEECE", Decimal("843.00"), Decimal("0.00")),
]

# ---------------------------------------------------------------------------
# Source data: Yarn Store Register
# (date, direction, igp_ref, yarn_count, bags, kg, remarks)
# direction: "received" | "returned"
# All three bags arrived on the same day under IGP 2081.
# ---------------------------------------------------------------------------
YARN_STORE_REGISTER = [
    # Sr#1
    (date(2018, 12, 3), "received", "2081", "20/1 PC", None, Decimal("544.32"), "IGP: 2081"),
    # Sr#2
    (date(2018, 12, 3), "received", "2081", "12/1 PC", None, Decimal("181.44"), "IGP: 2081"),
    # Sr#3
    (date(2018, 12, 3), "received", "2081", "12/1 PC", None, Decimal("43.00"),  "IGP: 2081"),
]

# ---------------------------------------------------------------------------
# Grand total expectations for post-import sanity check.
# Balance is NEGATIVE because dispatches exceed this batch's receipts.
# More yarn receipts are expected in a subsequent import.
# ---------------------------------------------------------------------------
EXPECTED_TOTAL_RECEIVED   = Decimal("768.76")
EXPECTED_TOTAL_DISPATCHED = Decimal("858.20")
EXPECTED_TOTAL_LOSS       = Decimal("17.16")
EXPECTED_FINAL_BALANCE    = Decimal("-106.60")


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
        print(f"Cleared {removed} existing YarnLedgerEntry rows for LEATHER TEX (fresh import).")
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
    """Verify grand totals against the source data.

    Per-date running balances are printed for reference but not validated against
    the sheet (sheet only covers the first dispatch; subsequent dispatches are not
    in the date-wise table yet).
    """
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
        raise RuntimeError("LEATHER TEX totals mismatch -- " + "; ".join(errors))

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
            f"{yarn_count} yarn-movement entries for LEATHER TEX."
        )

        verify_totals(db, party)

    finally:
        db.close()


if __name__ == "__main__":
    main()
