from datetime import date
from decimal import Decimal

from app.core.security import create_access_token
from app.models.enums import PartyType, PaymentStatus, TransactionEntryType
from app.models.transaction import Transaction
from app.schemas.party import PartyCreate
from app.services.party_service import create_party
from tests.conftest import make_user_with_role


def auth_headers(user_id) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(subject=str(user_id))}"}


def test_list_transactions_scoped_to_party(client, db_session):
    party_a, _ = create_party(db_session, PartyCreate(name="Party A", type=PartyType.vendor), created_by=None)
    party_b, _ = create_party(db_session, PartyCreate(name="Party B", type=PartyType.vendor), created_by=None)

    db_session.add(
        Transaction(
            transaction_code="TXN-A",
            party_id=party_a.id,
            entry_type=TransactionEntryType.receivable,
            date=date(2026, 1, 1),
            amount=Decimal("100.00"),
            payment_status=PaymentStatus.paid,
        )
    )
    db_session.add(
        Transaction(
            transaction_code="TXN-B",
            party_id=party_b.id,
            entry_type=TransactionEntryType.receivable,
            date=date(2026, 1, 2),
            amount=Decimal("200.00"),
            payment_status=PaymentStatus.pending,
        )
    )
    db_session.commit()

    reader = make_user_with_role(db_session, module_actions=[("transactions", "read")], email="reader@example.com")

    response = client.get(f"/api/v1/transactions?partyId={party_a.id}", headers=auth_headers(reader.id))

    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] == 1
    assert body["data"][0]["transaction_code"] == "TXN-A"


def test_list_transactions_requires_permission(client, db_session):
    user = make_user_with_role(db_session, module_actions=[("parties", "read")], email="noaccess@example.com")

    response = client.get("/api/v1/transactions", headers=auth_headers(user.id))

    assert response.status_code == 403


def test_create_transaction_requires_write_permission(client, db_session):
    party, _ = create_party(db_session, PartyCreate(name="Party C", type=PartyType.customer), created_by=None)
    reader = make_user_with_role(db_session, module_actions=[("transactions", "read")], email="reader2@example.com")

    response = client.post(
        "/api/v1/transactions",
        json={"party_id": str(party.id), "entry_type": "receivable", "date": "2026-01-01", "amount": "50.00"},
        headers=auth_headers(reader.id),
    )

    assert response.status_code == 403


def test_create_transaction_success_and_audit(client, db_session):
    party, _ = create_party(db_session, PartyCreate(name="Party D", type=PartyType.vendor), created_by=None)
    finance_user = make_user_with_role(
        db_session, module_actions=[("transactions", "read"), ("transactions", "write")], email="finance2@example.com"
    )

    response = client.post(
        "/api/v1/transactions",
        json={
            "party_id": str(party.id),
            "entry_type": "payable",
            "date": "2026-02-15",
            "amount": "1250.75",
            "description": "Yarn returned",
        },
        headers=auth_headers(finance_user.id),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["party_id"] == str(party.id)
    assert body["amount"] == "1250.75"
    assert body["transaction_code"].startswith("TXN-")


def test_create_transaction_for_unknown_party_is_404(client, db_session):
    finance_user = make_user_with_role(
        db_session, module_actions=[("transactions", "write")], email="finance3@example.com"
    )

    response = client.post(
        "/api/v1/transactions",
        json={
            "party_id": "00000000-0000-0000-0000-000000000000",
            "entry_type": "receivable",
            "date": "2026-01-01",
            "amount": "10.00",
        },
        headers=auth_headers(finance_user.id),
    )

    assert response.status_code == 404
