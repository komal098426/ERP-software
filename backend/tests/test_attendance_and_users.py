from app.core.security import create_access_token
from tests.conftest import make_user_with_role


def auth_headers(user_id) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(subject=str(user_id))}"}


def test_mark_attendance_computes_working_hours(client, db_session):
    hr = make_user_with_role(db_session, module_actions=[("employees", "write"), ("attendance", "write"), ("attendance", "read")], email="hr5@example.com")
    employee_resp = client.post("/api/v1/employees", json={"full_name": "Usman Tariq"}, headers=auth_headers(hr.id))
    employee_id = employee_resp.json()["employee"]["id"]

    response = client.post(
        "/api/v1/attendance",
        json={"employee_id": employee_id, "date": "2026-01-05", "status": "present", "check_in": "09:00:00", "check_out": "17:30:00"},
        headers=auth_headers(hr.id),
    )

    assert response.status_code == 201
    assert response.json()["working_hours"] == "8.50"


def test_marking_same_day_twice_updates_not_duplicates(client, db_session):
    hr = make_user_with_role(db_session, module_actions=[("employees", "write"), ("attendance", "write"), ("attendance", "read")], email="hr6@example.com")
    employee_id = client.post("/api/v1/employees", json={"full_name": "Nadia Iqbal"}, headers=auth_headers(hr.id)).json()["employee"]["id"]

    client.post(
        "/api/v1/attendance",
        json={"employee_id": employee_id, "date": "2026-01-06", "status": "late"},
        headers=auth_headers(hr.id),
    )
    client.post(
        "/api/v1/attendance",
        json={"employee_id": employee_id, "date": "2026-01-06", "status": "present"},
        headers=auth_headers(hr.id),
    )

    records = client.get(f"/api/v1/attendance?employeeId={employee_id}", headers=auth_headers(hr.id)).json()
    assert len(records) == 1
    assert records[0]["status"] == "present"


def test_admin_can_create_user_with_role(client, db_session):
    from app.models.rbac import Role

    db_session.add(Role(name="Viewer"))
    db_session.commit()

    admin = make_user_with_role(db_session, module_actions=[("users", "read"), ("users", "write")], email="admin2@example.com")

    response = client.post(
        "/api/v1/users",
        json={"email": "newviewer@example.com", "full_name": "New Viewer", "password": "SecurePass123", "role_name": "Viewer"},
        headers=auth_headers(admin.id),
    )

    assert response.status_code == 201
    assert response.json()["roles"] == ["Viewer"]


def test_creating_user_with_duplicate_email_is_409(client, db_session):
    from app.models.rbac import Role

    db_session.add(Role(name="Viewer"))
    db_session.commit()
    admin = make_user_with_role(db_session, module_actions=[("users", "write")], email="admin3@example.com")

    payload = {"email": "dupe@example.com", "full_name": "First", "password": "SecurePass123", "role_name": "Viewer"}
    client.post("/api/v1/users", json=payload, headers=auth_headers(admin.id))
    response = client.post("/api/v1/users", json=payload, headers=auth_headers(admin.id))

    assert response.status_code == 409


def test_self_registered_user_cannot_log_in_until_approved(client, db_session):
    from app.models.rbac import Role

    db_session.add(Role(name="Viewer"))
    db_session.commit()

    register_resp = client.post(
        "/api/v1/auth/register",
        json={"email": "signup1@example.com", "full_name": "Self Signup", "password": "SecurePass123"},
    )
    assert register_resp.status_code == 201

    login_resp = client.post("/api/v1/auth/login", json={"email": "signup1@example.com", "password": "SecurePass123"})
    assert login_resp.status_code == 401
    assert "pending" in login_resp.json()["detail"].lower()

    admin = make_user_with_role(db_session, module_actions=[("users", "read"), ("users", "write")], email="admin4@example.com")
    users = client.get("/api/v1/users", headers=auth_headers(admin.id)).json()
    pending = next(u for u in users if u["email"] == "signup1@example.com")
    assert pending["is_active"] is False
    assert pending["roles"] == []

    approve_resp = client.post(
        f"/api/v1/users/{pending['id']}/approve",
        json={"role_name": "Viewer"},
        headers=auth_headers(admin.id),
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["is_active"] is True
    assert approve_resp.json()["roles"] == ["Viewer"]

    login_resp = client.post("/api/v1/auth/login", json={"email": "signup1@example.com", "password": "SecurePass123"})
    assert login_resp.status_code == 200


def test_registering_with_existing_email_is_409(client, db_session):
    client.post(
        "/api/v1/auth/register",
        json={"email": "signup2@example.com", "full_name": "First", "password": "SecurePass123"},
    )
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "signup2@example.com", "full_name": "Second", "password": "SecurePass123"},
    )
    assert response.status_code == 409
