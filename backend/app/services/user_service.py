from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.enums import AuditAction
from app.models.rbac import Role, User, UserRole
from app.schemas.auth import RegisterRequest
from app.schemas.user import UserCreate
from app.services.audit import write_audit


def register_user(db: Session, payload: RegisterRequest) -> User:
    """Public self-signup. The account is created inactive with no role, so it cannot log in
    (see `get_current_user`) or be granted any permission until an Admin approves it via
    `approve_user`. This keeps self-registration from bypassing the RBAC provisioning model."""
    if db.scalar(select(User).where(User.email == payload.email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"A user with email {payload.email} already exists")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        is_active=False,
        must_change_password=False,
    )
    db.add(user)
    db.flush()

    write_audit(
        db, user_id=None, action=AuditAction.created, module="users",
        record_type="user", record_id=user.id, new_value={"email": user.email, "source": "self_signup"},
    )
    db.commit()
    db.refresh(user)
    return user


def approve_user(db: Session, user_id: UUID, role_name: str, *, approved_by: UUID) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")

    role = db.scalar(select(Role).where(Role.name == role_name))
    if role is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Unknown role: {role_name}")

    user.is_active = True
    if role not in user.roles:
        db.add(UserRole(user_id=user.id, role_id=role.id))

    write_audit(
        db, user_id=approved_by, action=AuditAction.updated, module="users",
        record_type="user", record_id=user.id, new_value={"is_active": True, "role": role.name},
    )
    db.commit()
    db.refresh(user)
    return user


def create_user(db: Session, payload: UserCreate, *, created_by: UUID | None) -> User:
    if db.scalar(select(User).where(User.email == payload.email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"A user with email {payload.email} already exists")

    role = db.scalar(select(Role).where(Role.name == payload.role_name))
    if role is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Unknown role: {payload.role_name}")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        must_change_password=True,
    )
    db.add(user)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id))

    write_audit(
        db, user_id=created_by, action=AuditAction.created, module="users",
        record_type="user", record_id=user.id, new_value={"email": user.email, "role": role.name},
    )
    db.commit()
    db.refresh(user)
    return user
