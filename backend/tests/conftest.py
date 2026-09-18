from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core import supabase_auth
from app.core.security import create_access_token, decode_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.rbac import Permission, Role, RolePermission, User, UserRole


class _FakeSupabaseAuth:
    """Stands in for the real Supabase Auth REST API in tests: no network calls, and tokens are
    just the app's own JWT helper (see app/core/security.py) carrying a Supabase-style user id.
    """

    def __init__(self):
        self.users_by_email: dict[str, dict] = {}

    def admin_create_user(self, email, password=None, *, email_confirm=True):
        record = self.users_by_email.setdefault(email, {"id": str(uuid4()), "password": password})
        return {"id": record["id"], "email": email}

    def sign_in(self, email, password):
        record = self.users_by_email.get(email)
        if record is None or record["password"] != password:
            raise supabase_auth.SupabaseAuthError("Invalid email or password")
        token = create_access_token(subject=record["id"])
        return {"access_token": token, "user": {"id": record["id"], "email": email}}

    def get_user(self, token):
        user_id = decode_access_token(token)
        if user_id is None:
            raise supabase_auth.SupabaseAuthError("Invalid or expired token")
        return {"id": user_id, "email": "unknown"}

    def admin_send_password_reset(self, email):
        return None


@pytest.fixture(autouse=True)
def fake_supabase_auth(monkeypatch):
    fake = _FakeSupabaseAuth()
    monkeypatch.setattr(supabase_auth, "admin_create_user", fake.admin_create_user)
    monkeypatch.setattr(supabase_auth, "sign_in", fake.sign_in)
    monkeypatch.setattr(supabase_auth, "get_user", fake.get_user)
    monkeypatch.setattr(supabase_auth, "admin_send_password_reset", fake.admin_send_password_reset)
    return fake


@pytest.fixture()
def engine():
    # StaticPool: an in-memory sqlite DB is per-connection, so the TestClient's request thread
    # would otherwise see an empty database unless every session shares this one connection.
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture()
def db_session(engine) -> Session:
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture()
def client(engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    from fastapi.testclient import TestClient

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def make_user_with_role(db: Session, *, module_actions: list[tuple[str, str]], email: str = "test@example.com") -> User:
    role = Role(name=f"role-{email}")
    db.add(role)
    db.flush()

    for module, action in module_actions:
        permission = Permission(module=module, action=action)
        db.add(permission)
        db.flush()
        db.add(RolePermission(role_id=role.id, permission_id=permission.id))

    user = User(email=email, full_name="Test User", must_change_password=False)
    db.add(user)
    db.flush()
    user.auth_user_id = user.id  # so auth_headers(user.id) (a raw JWT) resolves via get_current_user
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    db.refresh(user)
    return user
