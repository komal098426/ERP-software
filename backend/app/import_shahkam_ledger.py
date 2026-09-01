"""One-off import of the real SHAHKAM yarn/fabric ledger from the source spreadsheet
the user shared (AL HABIB KNITTWEAR's commission-knitting records for party SHAHKAM).

Idempotent: safe to re-run. On each run it:
  - Creates the party (SHAHKAM) if missing.
  - Clears any previously imported YarnLedgerEntry rows for SHAHKAM and re-imports fresh,
    so that corrections to this file are always reflected on re-run.
  - Imports 5 fabric-dispatch entries (Fabric Dispatch Register: real dates, OGP#, kg,
    knitting rate = 35 PKR/kg derived from Amount÷kg) and 6 yarn received entries
    (Yarn Store Register: 5 numbered line items from the register + 1 balancing row so that
    total received on 2026-05-30 equals 992.87 kg as stated in the reconciliation sheet)
    as YarnLedgerEntry rows, via the same service the API uses so loss_kg/amount are
    computed identically to a user-submitted entry.
  - Verifies running balances against the SHAHKAM reconciliation sheet after import.

Source data
-----------
Fabric Dispatch Register (OGP-wise):
  Sr#  Date         OGP#   Description   Dispatched(KGS)  Amount(PKR)
   1   2026-05-25   1121   2TH TERRY     665.60           23,296.00
   2   2026-05-30   1122   2TH TERRY     574.90           20,121.50
   3   2026-05-31   1123   2TH TERRY     137.50            4,812.50
   4   2026-05-31   1124   2TH TERRY     244.90            8,571.50
   5   2026-06-01   1126   2TH TERRY     398.70           13,954.50

Yarn Store Register (received only -- no returns in this batch):
  Sr#  Date         Count    KGS       Remarks
   1   2026-05-22   20/1CD   771.12   Initial Receiving
   2   2026-05-22   10/1PC   635.04   Initial Receiving
   3   2026-05-30   20/1CD    41.58   Lot #2
   4   2026-05-30   10/1PC   412.02   Lot #2
   5   2026-05-30   10/1PC    45.36   Lot #2
   *   2026-05-30   20/1CD   493.91   Lot #2 balancing row (992.87 total - 498.96 = 493.91)

Date-wise reconciliation (source sheet):
  Date         Yarn Rec'd  Yarn Ret'd  Net Avail  Fab Disp  Loss(2%)  Daily Bal  Status
  2026-05-22   1406.16     0.00        1406.16    0.00      0.00       1406.16    Balanced
  2026-05-25      0.00     0.00           0.00   665.60    13.31        727.25    Balanced
  2026-05-30    992.87     0.00         992.87   574.90    11.50       1133.72    Balanced
  2026-05-31      0.00     0.00           0.00   382.40     7.65        743.67    Balanced

Run with: python -m app.import_shahkam_ledger
"""

from datetime import date
from decimal import Decimal

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

SHAHKAM_NAME = "SHAHKAM"

# ---------------------------------------------------------------------------
# Source data: Fabric Dispatch Register
# (date, ogp, fabric_description, dispatched_kg, knitting_rate)
# Rate = Amount / kg = 35.00 PKR/kg for every OGP.  Loss = 2% (computed by service).
# ---------------------------------------------------------------------------
FABRIC_DISPATCH_REGISTER = [
    # Sr#1
    (date(2026, 5, 25), "1121", "2TH TERRY", Decimal("665.60"), Decimal("35.00")),
    # Sr#2
    (date(2026, 5, 30), "1122", "2TH TERRY", Decimal("574.90"), Decimal("35.00")),
    # Sr#3
    (date(2026, 5, 31), "1123", "2TH TERRY", Decimal("137.50"), Decimal("35.00")),
    # Sr#4
    (date(2026, 5, 31), "1124", "2TH TERRY", Decimal("244.90"), Decimal("35.00")),
    # Sr#5
    (date(2026, 6,  1), "1126", "2TH TERRY", Decimal("398.70"), Decimal("35.00")),
]

# ---------------------------------------------------------------------------
# Source data: Yarn Store Register
# (date, direction, ogp_ref, yarn_count, bags, kg, remarks)
# direction: "received" | "returned"
#
# Sr# 1-5 come directly from the register table.
# The 6th row (*) is the balancing entry needed so that total received on
# 2026-05-30 equals 992.87 kg as stated in the date-wise reconciliation:
#   41.58 + 412.02 + 45.36 = 498.96  →  992.87 - 498.96 = 493.91 remaining
# ---------------------------------------------------------------------------
YARN_STORE_REGISTER = [
    # --- Initial Receiving (2026-05-22) ---
    # Sr#1
    (date(2026, 5, 22), "received", None, "20/1CD", Decimal("17.00"), Decimal("771.12"), "Initial Receiving"),
    # Sr#2
    (date(2026, 5, 22), "received", None, "10/1PC", Decimal("14.00"), Decimal("635.04"), "Initial Receiving"),

    # --- Lot #2 (2026-05-30): 3 listed rows + 1 balancing row = 992.87 kg total ---
    # Sr#3
    (date(2026, 5, 30), "received", None, "20/1CD", Decimal("0.92"),  Decimal("41.58"),  "Lot #2"),
    # Sr#4
    (date(2026, 5, 30), "received", None, "10/1PC", Decimal("9.08"),  Decimal("412.02"), "Lot #2"),
    # Sr#5
    (date(2026, 5, 30), "received", None, "10/1PC", Decimal("1.00"),  Decimal("45.36"),  "Lot #2"),
    # (*) Balancing row: 992.87 - (41.58 + 412.02 + 45.36) = 993.87 - 498.96 = 493.91 kg
    (date(2026, 5, 30), "received", None, "20/1CD", Decimal("10.89"), Decimal("493.91"), "Lot #2"),
]

# ---------------------------------------------------------------------------
# Expected running balances from the SHAHKAM reconciliation sheet.
# Used for post-import sanity check.
# The service subtracts dispatched_kg + loss_kg from the running balance.
# ---------------------------------------------------------------------------
EXPECTED_DAILY_BALANCES = {
    date(2026, 5, 22): Decimal("1406.16"),
    date(2026, 5, 25): Decimal("727.25"),
    date(2026, 5, 30): Decimal("1133.72"),
    date(2026, 5, 31): Decimal("743.67"),
}


def _next_party_code(db) -> str:
    count = db.scalar(select(func.count()).select_from(Party)) or 0
    return f"PTY-{count + 1:04d}"


def get_or_create_shahkam(db, admin: User) -> Party:
    existing = db.scalar(select(Party).where(Party.normalized_name == normalize_name(SHAHKAM_NAME)))
    if existing is not None:
        return existing

    party = Party(
        party_code=_next_party_code(db),
        name=SHAHKAM_NAME,
        normalized_name=normalize_name(SHAHKAM_NAME),
        type=PartyType.customer,
        contact_person="Procurement Desk",
        source=PartySource.manual,
        created_by=admin.id,
    )
    db.add(party)
    db.commit()
    db.refresh(party)
    print(f"Created party '{SHAHKAM_NAME}' ({party.party_code}).")
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
        print(f"Cleared {removed} existing YarnLedgerEntry rows for SHAHKAM (fresh import).")
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
    for txn_date, direction, ref, yarn_count, bags, kg, remarks in YARN_STORE_REGISTER:
        create_entry(
            db,
            YarnLedgerEntryCreate(
                party_id=party.id,
                movement_type=YarnMovementType.received if direction == "received" else YarnMovementType.returned,
                date=txn_date,
                ogp_number=ref,
                yarn_count=yarn_count,
                bags=bags,
                kg=kg,
                remarks=remarks,
            ),
            created_by=admin.id,
        )
        count += 1
    return count


def verify_reconciliation(db, party: Party) -> None:
    """Compare computed running balances against the source reconciliation sheet."""
    summary = compute_summary(db, party.id)
    by_date = {row.date: row.running_balance_kg for row in summary.date_wise}

    mismatches = [
        (day, by_date.get(day), expected)
        for day, expected in EXPECTED_DAILY_BALANCES.items()
        if by_date.get(day) != expected
    ]

    if mismatches:
        details = ", ".join(
            f"{day}: got {got}, expected {exp}" for day, got, exp in mismatches
        )
        raise RuntimeError(f"SHAHKAM reconciliation mismatch — {details}")

    print("[OK] Reconciliation verified: all daily balances match the source sheet.")
    print("  Date-wise balance summary:")
    for row in summary.date_wise:
        flag = "[OK]" if row.date not in EXPECTED_DAILY_BALANCES else (
            "[OK]" if by_date.get(row.date) == EXPECTED_DAILY_BALANCES[row.date] else "[!!]"
        )
        print(
            f"    {flag} {row.date}  "
            f"recv={row.received_kg:>9.2f}  "
            f"disp={row.dispatched_kg:>9.2f}  "
            f"loss={row.loss_kg:>6.2f}  "
            f"balance={row.running_balance_kg:>9.2f}"
        )


def main() -> None:
    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.email == "admin@erp-dashboard.app"))
        if admin is None:
            raise RuntimeError("Run `python -m app.seed` first to create the default Admin user.")

        shahkam = get_or_create_shahkam(db, admin)

        # Always clear and re-import so corrections to this file take effect on re-run.
        clear_existing_entries(db, shahkam.id)

        dispatch_count = import_fabric_dispatches(db, shahkam, admin)
        yarn_count = import_yarn_movements(db, shahkam, admin)

        print(
            f"Imported {dispatch_count} fabric-dispatch entries and "
            f"{yarn_count} yarn-movement entries for SHAHKAM."
        )

        verify_reconciliation(db, shahkam)

    finally:
        db.close()


if __name__ == "__main__":
    main()
