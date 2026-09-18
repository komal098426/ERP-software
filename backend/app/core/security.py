from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings

# NOTE: password hashing/verification used to live here, but password custody moved to Supabase
# Auth (see app/core/supabase_auth.py) -- Supabase issues and verifies the real access tokens.
# create_access_token/decode_access_token remain only as the token format the test suite's fake
# Supabase Auth stand-in uses (see tests/conftest.py); production code no longer calls them.


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload.get("sub")
    except JWTError:
        return None
