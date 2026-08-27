from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.rbac import Permission, Role, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_error

    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_error

    user = db.get(User, UUID(user_id))
    if user is None or not user.is_active:
        raise credentials_error
    return user


def require_permission(module: str, action: str):
    """FastAPI dependency factory enforcing the RBAC matrix (SRD §6) server-side, not just
    hidden in the UI. Every future router copies this pattern: `Depends(require_permission("employees", "write"))`.
    """

    def _check(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        role_ids = [role.id for role in current_user.roles]
        if not role_ids:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="No role assigned")

        has_permission = (
            db.query(Permission)
            .join(Permission.roles)
            .filter(Role.id.in_(role_ids), Permission.module == module, Permission.action == action)
            .first()
            is not None
        )
        if not has_permission:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=f"Missing permission: {module}:{action}")
        return current_user

    return _check
