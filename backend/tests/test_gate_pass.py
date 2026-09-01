from datetime import date
from decimal import Decimal
from uuid import UUID

from app.core.security import create_access_token
from app.models.enums import PartyType, GatePassType, GatePassStatus
from app.models.gate_pass import GatePass
from app.schemas.party import PartyCreate
from app.services.party_service import create_party
from tests.conftest import make_user_with_role


def auth_headers(user_id) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(subject=str(user_id))}"}


def test_list_gate_passes_requires_permission(client, db_session):
    user = make_user_with_role(db_session, module_actions=[("parties", "read")], email="noaccess_gp@example.com")
    response = client.get("/api/v1/gate-passes", headers=auth_headers(user.id))
    assert response.status_code == 403


def test_create_gate_pass_requires_write_permission(client, db_session):
    party, _ = create_party(db_session, PartyCreate(name="Party G1", type=PartyType.customer), created_by=None)
    reader = make_user_with_role(db_session, module_actions=[("gate_passes", "read")], email="reader_gp@example.com")

    response = client.post(
        "/api/v1/gate-passes",
        json={
            "type": "igp",
            "date": "2026-01-01",
            "party_id": str(party.id),
            "material": "Test Material",
            "weight": "100.00",
            "quantity": "100.00",
        },
        headers=auth_headers(reader.id),
    )
    assert response.status_code == 403


def test_create_gate_pass_success_igp(client, db_session):
    party, _ = create_party(db_session, PartyCreate(name="Party G2", type=PartyType.vendor), created_by=None)
    writer = make_user_with_role(
        db_session, module_actions=[("gate_passes", "read"), ("gate_passes", "write")], email="writer_gp@example.com"
    )

    response = client.post(
        "/api/v1/gate-passes",
        json={
            "type": "igp",
            "date": "2026-08-28",
            "party_id": str(party.id),
            "material": "CVC Yarn received",
            "yarn_count": "20/1",
            "yarn_type": "CVC",
            "bags_rolls": "10.00",
            "weight": "450.00",
            "quantity": "450.00",
            "store_destination": "Yarn Store",
            "status": "pending",
            "remarks": "Urgent import",
        },
        headers=auth_headers(writer.id),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["gate_pass_number"] == "IGP-00001"
    assert body["type"] == "igp"
    assert body["material"] == "CVC Yarn received"
    assert body["party_name"] == "Party G2"
    assert body["weight"] == "450.00"
    assert body["quantity"] == "450.00"


def test_create_gate_pass_success_ogp(client, db_session):
    party, _ = create_party(db_session, PartyCreate(name="Party G3", type=PartyType.customer), created_by=None)
    writer = make_user_with_role(
        db_session, module_actions=[("gate_passes", "read"), ("gate_passes", "write")], email="writer_gp2@example.com"
    )

    response = client.post(
        "/api/v1/gate-passes",
        json={
            "type": "ogp",
            "date": "2026-08-28",
            "party_id": str(party.id),
            "material": "Yarn Dispatch OGP",
            "weight": "250.00",
            "quantity": "250.00",
            "returnable": True,
            "expected_return": "2026-09-10",
        },
        headers=auth_headers(writer.id),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["gate_pass_number"] == "OGP-00001"
    assert body["type"] == "ogp"
    assert body["returnable"] is True
    assert body["expected_return"] == "2026-09-10"


def test_update_and_delete_gate_pass(client, db_session):
    party, _ = create_party(db_session, PartyCreate(name="Party G4", type=PartyType.customer), created_by=None)
    writer = make_user_with_role(
        db_session, module_actions=[("gate_passes", "read"), ("gate_passes", "write")], email="writer_gp3@example.com"
    )

    # Pre-populate a gate pass
    gp = GatePass(
        gate_pass_number="IGP-10001",
        type=GatePassType.igp,
        date=date(2026, 8, 28),
        party_id=party.id,
        material="Initial material",
        weight=Decimal("100"),
        quantity=Decimal("100"),
        status=GatePassStatus.pending,
    )
    db_session.add(gp)
    db_session.commit()

    # Update (Patch)
    response = client.patch(
        f"/api/v1/gate-passes/{gp.id}",
        json={"material": "Updated material description", "status": "completed"},
        headers=auth_headers(writer.id),
    )
    assert response.status_code == 200
    assert response.json()["material"] == "Updated material description"
    assert response.json()["status"] == "completed"

    # Delete
    response = client.delete(
        f"/api/v1/gate-passes/{gp.id}",
        headers=auth_headers(writer.id),
    )
    assert response.status_code == 204

    # Verify 404
    response = client.get(f"/api/v1/gate-passes/{gp.id}", headers=auth_headers(writer.id))
    assert response.status_code == 404
