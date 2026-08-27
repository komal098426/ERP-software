from app.core.security import create_access_token
from tests.conftest import make_user_with_role


def auth_headers(user_id) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(subject=str(user_id))}"}


def test_create_employee_success(client, db_session):
    hr = make_user_with_role(db_session, module_actions=[("employees", "write")], email="hr1@example.com")

    response = client.post(
        "/api/v1/employees",
        json={"full_name": "Ali Khan", "national_id": "12345-6789012-3", "phone": "0300-1234567"},
        headers=auth_headers(hr.id),
    )

    assert response.status_code == 201
    assert response.json()["employee"]["employee_code"].startswith("EMP-")


def test_duplicate_national_id_is_blocked_with_409(client, db_session):
    hr = make_user_with_role(db_session, module_actions=[("employees", "write")], email="hr2@example.com")

    first = client.post(
        "/api/v1/employees",
        json={"full_name": "Bilal Ahmed", "national_id": "35202-1111111-1"},
        headers=auth_headers(hr.id),
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/employees",
        # Deliberately different formatting -- spaces/dashes stripped before comparison.
        json={"full_name": "Bilal A.", "national_id": "35202 1111111 1"},
        headers=auth_headers(hr.id),
    )

    assert second.status_code == 409
    assert second.json()["detail"]["employee_code"] == first.json()["employee"]["employee_code"]


def test_duplicate_email_across_any_status_is_blocked(client, db_session):
    hr = make_user_with_role(db_session, module_actions=[("employees", "write")], email="hr3@example.com")

    first = client.post(
        "/api/v1/employees",
        json={"full_name": "Sara Malik", "email": "Sara.Malik@example.com"},
        headers=auth_headers(hr.id),
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/employees",
        json={"full_name": "Sara M", "email": "sara.malik@example.com"},
        headers=auth_headers(hr.id),
    )
    assert second.status_code == 409


def test_similar_name_no_exact_match_is_allowed_with_warning(client, db_session):
    hr = make_user_with_role(db_session, module_actions=[("employees", "write")], email="hr4@example.com")

    first = client.post("/api/v1/employees", json={"full_name": "Zainab Hussain"}, headers=auth_headers(hr.id))
    assert first.status_code == 201

    second = client.post("/api/v1/employees", json={"full_name": "Zainab Husain"}, headers=auth_headers(hr.id))

    assert second.status_code == 201
    assert len(second.json()["duplicate_warning"]) == 1
