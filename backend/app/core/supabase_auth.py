"""Thin wrapper around the Supabase Auth (GoTrue) REST API.

Token verification calls Supabase's own `/auth/v1/user` endpoint rather than decoding the JWT
locally, so this code doesn't need to track whether the project signs tokens with a shared HS256
secret or newer asymmetric keys -- Supabase is always the one deciding whether a token is valid.

Callers must `import app.core.supabase_auth as supabase_auth` and call e.g.
`supabase_auth.sign_in(...)` rather than `from ... import sign_in`, so tests can monkeypatch these
functions on the module.
"""

import httpx

from app.core.config import settings


class SupabaseAuthError(Exception):
    """Raised when Supabase Auth rejects a credential/token or the request otherwise fails."""


def _headers(*, use_service_role: bool = False) -> dict[str, str]:
    key = settings.supabase_service_role_key if use_service_role else settings.supabase_anon_key
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def sign_in(email: str, password: str) -> dict:
    response = httpx.post(
        f"{settings.supabase_url}/auth/v1/token?grant_type=password",
        json={"email": email, "password": password},
        headers=_headers(),
        timeout=10,
    )
    if response.status_code != 200:
        raise SupabaseAuthError(response.json().get("error_description", "Invalid email or password"))
    return response.json()


def get_user(access_token: str) -> dict:
    response = httpx.get(
        f"{settings.supabase_url}/auth/v1/user",
        headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if response.status_code != 200:
        raise SupabaseAuthError("Invalid or expired token")
    return response.json()


def admin_create_user(email: str, password: str | None = None, *, email_confirm: bool = True) -> dict:
    payload = {"email": email, "email_confirm": email_confirm}
    if password:
        payload["password"] = password
    response = httpx.post(
        f"{settings.supabase_url}/auth/v1/admin/users",
        json=payload,
        headers=_headers(use_service_role=True),
        timeout=10,
    )
    if response.status_code not in (200, 201):
        raise SupabaseAuthError(response.json().get("msg", "Failed to create Supabase Auth user"))
    return response.json()


def admin_send_password_reset(email: str) -> None:
    response = httpx.post(
        f"{settings.supabase_url}/auth/v1/recover",
        json={"email": email},
        headers=_headers(),
        timeout=10,
    )
    if response.status_code != 200:
        raise SupabaseAuthError(response.json().get("msg", "Failed to send password reset email"))
