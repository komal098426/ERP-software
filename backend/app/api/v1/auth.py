from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import supabase_auth
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.rbac import User
from app.schemas.auth import CurrentUser, LoginRequest, RegisterRequest, RegisterResponse, TokenResponse
from app.services.user_service import register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        try:
            session = supabase_auth.sign_in(payload.email, payload.password)
        except supabase_auth.SupabaseAuthError:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        user = db.scalar(select(User).where(User.email == payload.email))
        if user is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        if not user.is_active:
            detail = "Your account is pending administrator approval." if not user.roles else "Account is inactive"
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=detail)

        return TokenResponse(access_token=session["access_token"])
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database authentication error: {type(exc).__name__}: {str(exc)}",
        )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    register_user(db, payload)
    return RegisterResponse(message="Account created. An administrator must approve it before you can sign in.")


@router.get("/me", response_model=CurrentUser)
def me(current_user: User = Depends(get_current_user)) -> CurrentUser:
    return CurrentUser(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        roles=[role.name for role in current_user.roles],
        must_change_password=current_user.must_change_password,
    )
