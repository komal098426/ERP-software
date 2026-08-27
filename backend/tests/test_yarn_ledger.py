from datetime import date
from decimal import Decimal

from app.core.security import create_access_token
from app.models.enums import PartyType, YarnMovementType
from app.schemas.party import PartyCreate
from app.schemas.yarn_ledger import YarnLedgerEntryCreate
from app.services.party_service import create_party
from app.services.yarn_ledger_service import compute_summary, create_entry
from tests.conftest import make_user_with_role


def auth_headers(user_id) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(subject=str(user_id))}"}


def test_dispatch_loss_and_amount_are_computed_not_trusted(db_session):
    """SRD-style guarantee: loss_kg/amount are derived from kg/rate/loss_percent server-side, so
    they can never disagree with the entry's own numbers (mirrors the spreadsheet's formula
    columns instead of trusting client-submitted derived values)."""
    party, _ = create_party(db_session, PartyCreate(name="Ledger Party", type=PartyType.customer), created_by=None)

    entry = create_entry(
        db_session,
        YarnLedgerEntryCreate(
            party_id=party.id,
            movement_type=YarnMovementType.dispatched,
            date=date(2026, 1, 1),
            yarn_count="2TH TERRY 20/1*10/1",
            kg=Decimal("100.00"),
            knitting_rate=Decimal("35.00"),
            loss_percent=Decimal("2.00"),
        ),
        created_by=None,
    )

    assert entry.loss_kg == Decimal("2.00")  # 100 * 2%
    assert entry.amount == Decimal("3500.00")  # 100 * 35


def test_received_and_returned_entries_have_no_loss_or_amount(db_session):
    party, _ = create_party(db_session, PartyCreate(name="Ledger Party 2", type=PartyType.customer), created_by=None)

    entry = create_entry(
        db_session,
        YarnLedgerEntryCreate(
            party_id=party.id, movement_type=YarnMovementType.received, date=date(2026, 1, 1),
            yarn_count="20/1CD", bags=Decimal("10.00"), kg=Decimal("450.00"),
        ),
        created_by=None,
    )

    assert entry.loss_kg == Decimal("0.00")
    assert entry.amount == Decimal("0.00")


def test_running_balance_matches_source_spreadsheet_sequence(db_session):
    """Reproduces the exact sequence from the party's original ledger screenshot: received
    7529.76 + 1360.8, then a small dispatch (4kg, 2% loss), then three returns. Expected running
    balance after each step is taken directly from the "BALANCE" column in that sheet."""
    party, _ = create_party(db_session, PartyCreate(name="Sequence Party", type=PartyType.customer), created_by=None)

    steps = [
        (YarnMovementType.received, Decimal("7529.76"), None, 7529.76),
        (YarnMovementType.received, Decimal("1360.80"), None, 8890.56),
        (YarnMovementType.dispatched, Decimal("4.00"), Decimal("100.00"), 8886.48),  # -4 - 0.08 loss
        (YarnMovementType.returned, Decimal("635.04"), None, 8251.44),
        (YarnMovementType.returned, Decimal("680.40"), None, 7571.04),
        (YarnMovementType.returned, Decimal("680.40"), None, 6890.64),
    ]

    for i, (movement_type, kg, rate, _) in enumerate(steps):
        create_entry(
            db_session,
            YarnLedgerEntryCreate(
                party_id=party.id, movement_type=movement_type, date=date(2026, 1, i + 1),
                yarn_count="20/1CVC", kg=kg, knitting_rate=rate,
            ),
            created_by=None,
        )

    summary = compute_summary(db_session, party.id)
    assert summary.balance_kg == Decimal("6890.64")


def test_yarn_ledger_write_requires_permission(client, db_session):
    party, _ = create_party(db_session, PartyCreate(name="Locked Party", type=PartyType.vendor), created_by=None)
    reader = make_user_with_role(db_session, module_actions=[("yarn_ledger", "read")], email="ledgerreader@example.com")

    response = client.post(
        "/api/v1/yarn-ledger",
        json={
            "party_id": str(party.id), "movement_type": "received", "date": "2026-01-01",
            "yarn_count": "20/1CD", "kg": "100.00",
        },
        headers=auth_headers(reader.id),
    )

    assert response.status_code == 403


def test_yarn_ledger_summary_endpoint(client, db_session):
    party, _ = create_party(db_session, PartyCreate(name="Summary Party", type=PartyType.customer), created_by=None)
    writer = make_user_with_role(
        db_session, module_actions=[("yarn_ledger", "read"), ("yarn_ledger", "write")], email="ledgerwriter@example.com"
    )

    client.post(
        "/api/v1/yarn-ledger",
        json={
            "party_id": str(party.id), "movement_type": "received", "date": "2026-01-01",
            "yarn_count": "20/1CD", "bags": "10.00", "kg": "500.00",
        },
        headers=auth_headers(writer.id),
    )
    client.post(
        "/api/v1/yarn-ledger",
        json={
            "party_id": str(party.id), "movement_type": "dispatched", "date": "2026-01-02",
            "yarn_count": "FABRIC A", "kg": "200.00", "knitting_rate": "35.00", "loss_percent": "2.00",
        },
        headers=auth_headers(writer.id),
    )

    response = client.get(f"/api/v1/yarn-ledger/summary?partyId={party.id}", headers=auth_headers(writer.id))

    assert response.status_code == 200
    body = response.json()
    assert body["total_received_kg"] == "500.00"
    assert body["total_dispatched_kg"] == "200.00"
    assert body["total_loss_kg"] == "4.00"
    assert body["balance_kg"] == "296.00"  # 500 - 200 - 4
    assert body["total_amount"] == "7000.00"
