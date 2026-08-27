"""One-off import of the real MAGNUS yarn/fabric ledger from the source spreadsheet screenshots
the user shared (AL HABIB KNITTWEAR's commission-knitting records for party MAGNUS).

Idempotent: safe to re-run. On each run it:
  - Removes the old placeholder "AL HABIB KNITTWEAR" demo party (a seeding mistake -- that name is
    the mill's own letterhead, not a counterparty) and its transactions, if still present.
  - Removes any earlier `Transaction` rows coded TXN-FD-*/TXN-YS-* -- an earlier version of this
    script stuffed yarn/fabric movements into the generic Transaction model before the dedicated
    YarnLedgerEntry model existed; those rows are superseded by the ones below.
  - Creates the real party (MAGNUS) if missing.
  - Imports 14 fabric-dispatch entries (Fabric Dispatch Register: real dates, OGP#, kg, knitting
    rate) and 16 yarn received/returned entries (Yarn Store Register: real dates, IGP/OGP refs,
    bags/kg) as YarnLedgerEntry rows, via the same service the API uses so loss_kg/amount are
    computed identically to a user-submitted entry.

Run with: python -m app.import_magnus_ledger
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.audit_log import AuditLogEntry
from app.models.enums import PartySource, PartyType, YarnMovementType
from app.models.party import Party
from app.models.rbac import User
from app.models.transaction import Transaction
from app.models.yarn_ledger import YarnLedgerEntry
from app.schemas.yarn_ledger import YarnLedgerEntryCreate
from app.services.duplicate_detection import normalize_name
from app.services.yarn_ledger_service import create_entry

FABRIC_DISPATCH_REGISTER = [
    # (date, ogp, fabric, dispatched_kg, rate)
    (date(2026, 5, 25), "1121", "2TH TERRY 20/1*10/1", Decimal("665.60"), Decimal("35.00")),
    (date(2026, 5, 30), "1122", "2TH TERRY 20/1*10/1", Decimal("574.90"), Decimal("35.00")),
    (date(2026, 5, 31), "1123", "2TH TERRY 20/1*10/1", Decimal("137.50"), Decimal("35.00")),
    (date(2026, 5, 31), "1124", "2TH TERRY 20/1*10/1", Decimal("244.90"), Decimal("35.00")),
    (date(2026, 6, 1), "1126", "2TH TERRY 20/1*10/1", Decimal("398.70"), Decimal("35.00")),
    (date(2026, 6, 2), "1130", "2TH TERRY 20/1*10/1", Decimal("86.90"), Decimal("35.00")),
    (date(2026, 6, 2), "1131", "2TH TERRY 20/1*10/1", Decimal("146.70"), Decimal("35.00")),
    (date(2026, 6, 2), "1132", "2TH TERRY 20/1*10/1", Decimal("307.10"), Decimal("35.00")),
    (date(2026, 6, 3), "1133", "2TH TERRY 20/1*10/1", Decimal("845.90"), Decimal("35.00")),
    (date(2026, 6, 4), "1135", "2TH TERRY 20/1*10/1", Decimal("733.00"), Decimal("35.00")),
    (date(2026, 6, 5), "1136", "2TH TERRY 20/1*10/1", Decimal("611.60"), Decimal("35.00")),
    (date(2026, 6, 6), "1137", "2TH TERRY 20/1*10/1", Decimal("483.90"), Decimal("35.00")),
    (date(2026, 6, 9), "1142", "2TH TERRY 20/1*10/1", Decimal("45.60"), Decimal("35.00")),
    (date(2026, 6, 17), "1150", "2TH TERRY 20/1*10/1", Decimal("70.50"), Decimal("35.00")),
]

# (date, direction, ref, yarn_count, bags, kg, remarks) -- direction: "received" | "returned"
YARN_STORE_REGISTER = [
    (date(2026, 5, 22), "received", None, "20/1CD", Decimal("17.00"), Decimal("771.12"), "Initial Receiving"),
    (date(2026, 5, 22), "received", None, "10/1PC", Decimal("14.00"), Decimal("635.04"), "Initial Receiving"),
    (date(2026, 5, 30), "received", None, "20/1CD", Decimal("0.92"), Decimal("41.58"), "Lot #2"),
    (date(2026, 5, 30), "received", None, "10/1PC", Decimal("9.08"), Decimal("412.02"), "Lot #2"),
    (date(2026, 5, 30), "received", None, "10/1PC", Decimal("1.00"), Decimal("45.36"), "Lot #2"),
    (date(2026, 5, 30), "received", None, "20/1CD", Decimal("10.89"), Decimal("493.91"), "Lot #2"),
    (date(2026, 6, 1), "received", None, "12/1CD", Decimal("8.00"), Decimal("362.88"), "Lot #3"),
    (date(2026, 6, 1), "received", None, "20/1CD", Decimal("42.72"), Decimal("1937.87"), "Lot #3"),
    (date(2026, 6, 1), "received", None, "20/1CD", Decimal("11.22"), Decimal("509.03"), "Lot #3"),
    (date(2026, 6, 1), "received", None, "12/1CD", Decimal("27.76"), Decimal("1259.27"), "Lot #3"),
    (date(2026, 6, 2), "received", None, "10/1PC", Decimal("1.25"), Decimal("56.71"), "Lot #4"),
    (date(2026, 6, 1), "returned", "1125", "12/1CD", Decimal("8.00"), Decimal("362.88"), "Yarn Returned"),
    (date(2026, 6, 1), "returned", "1125", "20/1CD", Decimal("11.22"), Decimal("509.03"), "Yarn Returned"),
    (date(2026, 6, 2), "returned", "1127", "10/1PC", Decimal("1.25"), Decimal("56.71"), "Yarn Returned"),
    (date(2026, 6, 2), "returned", "1128", "20/1CD", Decimal("2.21"), Decimal("100.25"), "Yarn Returned"),
    (date(2026, 6, 11), "returned", "1148", "20/1CD", Decimal("0.93"), Decimal("42.00"), "Yarn Returned"),
]

OLD_PLACEHOLDER_NAME = "AL HABIB KNITTWEAR"
MAGNUS_NAME = "MAGNUS"


def remove_placeholder_party(db) -> None:
    party = db.scalar(select(Party).where(Party.normalized_name == normalize_name(OLD_PLACEHOLDER_NAME)))
    if party is None:
        return
    db.query(AuditLogEntry).filter(AuditLogEntry.record_id == party.id).delete()
    db.query(Transaction).filter(Transaction.party_id == party.id).delete()
    db.delete(party)
    db.commit()
    print(f"Removed placeholder party '{OLD_PLACEHOLDER_NAME}' and its transactions.")


def remove_superseded_transaction_hack(db, party_id) -> None:
    stale = db.query(Transaction).filter(
        Transaction.party_id == party_id,
        Transaction.transaction_code.like("TXN-FD-%") | Transaction.transaction_code.like("TXN-YS-%"),
    )
    removed = stale.count()
    if removed:
        stale.delete(synchronize_session=False)
        db.commit()
        print(f"Removed {removed} superseded Transaction rows (now represented as YarnLedgerEntry).")


def get_or_create_magnus(db, admin: User) -> Party:
    existing = db.scalar(select(Party).where(Party.normalized_name == normalize_name(MAGNUS_NAME)))
    if existing is not None:
        return existing

    party = Party(
        party_code="PTY-0001",
        name=MAGNUS_NAME,
        normalized_name=normalize_name(MAGNUS_NAME),
        type=PartyType.customer,
        contact_person="Procurement Desk",
        source=PartySource.manual,
        created_by=admin.id,
    )
    db.add(party)
    db.commit()
    db.refresh(party)
    print(f"Created party '{MAGNUS_NAME}' ({party.party_code}).")
    return party


def already_imported(db, party_id) -> bool:
    return db.scalar(select(YarnLedgerEntry).where(YarnLedgerEntry.party_id == party_id)) is not None


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


def main() -> None:
    db = SessionLocal()
    try:
        remove_placeholder_party(db)

        admin = db.scalar(select(User).where(User.email == "admin@erp-dashboard.app"))
        if admin is None:
            raise RuntimeError("Run `python -m app.seed` first to create the default Admin user.")

        magnus = get_or_create_magnus(db, admin)
        remove_superseded_transaction_hack(db, magnus.id)

        if already_imported(db, magnus.id):
            print("MAGNUS ledger already imported -- nothing to do.")
            return

        dispatch_count = import_fabric_dispatches(db, magnus, admin)
        yarn_count = import_yarn_movements(db, magnus, admin)

        print(f"Imported {dispatch_count} fabric-dispatch entries and {yarn_count} yarn-movement entries for MAGNUS.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
