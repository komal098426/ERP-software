import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.rbac import Permission, Role, RolePermission, User, UserRole
from app.core.security import hash_password


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

    user = User(email=email, full_name="Test User", hashed_password=hash_password("password123"), must_change_password=False)
    db.add(user)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    db.refresh(user)
    return user
