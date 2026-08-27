from app.core.security import create_access_token
from tests.conftest import make_user_with_role


def auth_headers(user_id) -> dict[str, str]:
    token = create_access_token(subject=str(user_id))
    return {"Authorization": f"Bearer {token}"}


def test_viewer_cannot_create_party(client, db_session):
    """SRD §6/§16: RBAC is enforced server-side. A role with only read access gets 403 hitting a
    write endpoint directly, not just a hidden button in the UI."""
    viewer = make_user_with_role(db_session, module_actions=[("parties", "read")], email="viewer@example.com")

    response = client.post(
        "/api/v1/parties",
        json={"name": "Should Not Be Created", "type": "customer"},
        headers=auth_headers(viewer.id),
    )

    assert response.status_code == 403


def test_finance_role_can_create_party(client, db_session):
    finance_user = make_user_with_role(
        db_session, module_actions=[("parties", "read"), ("parties", "write")], email="finance@example.com"
    )

    response = client.post(
        "/api/v1/parties",
        json={"name": "Created By Finance", "type": "vendor"},
        headers=auth_headers(finance_user.id),
    )

    assert response.status_code == 201
    assert response.json()["party"]["name"] == "Created By Finance"


def test_unauthenticated_request_is_rejected(client):
    response = client.get("/api/v1/parties")
    assert response.status_code == 401
