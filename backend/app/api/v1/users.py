from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.db.session import get_db
from app.models.rbac import Role, User
from app.schemas.user import RoleOut, UserApprove, UserCreate, UserOut
from app.services.user_service import approve_user, create_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db), _: User = Depends(require_permission("users", "read"))
) -> list[UserOut]:
    rows = db.scalars(select(User).order_by(User.full_name)).all()
    return [UserOut(id=u.id, email=u.email, full_name=u.full_name, is_active=u.is_active,
                     must_change_password=u.must_change_password, roles=[r.name for r in u.roles]) for u in rows]


@router.get("/roles", response_model=list[RoleOut])
def list_roles(
    db: Session = Depends(get_db), _: User = Depends(require_permission("users", "read"))
) -> list[RoleOut]:
    rows = db.scalars(select(Role).order_by(Role.name)).all()
    return [RoleOut(id=r.id, name=r.name) for r in rows]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "write")),
) -> UserOut:
    user = create_user(db, payload, created_by=current_user.id)
    return UserOut(id=user.id, email=user.email, full_name=user.full_name, is_active=user.is_active,
                    must_change_password=user.must_change_password, roles=[r.name for r in user.roles])


@router.post("/{user_id}/approve", response_model=UserOut)
def approve_user_endpoint(
    user_id: UUID,
    payload: UserApprove,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "write")),
) -> UserOut:
    user = approve_user(db, user_id, payload.role_name, approved_by=current_user.id)
    return UserOut(id=user.id, email=user.email, full_name=user.full_name, is_active=user.is_active,
                    must_change_password=user.must_change_password, roles=[r.name for r in user.roles])
