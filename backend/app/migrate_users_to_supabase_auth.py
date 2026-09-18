"""One-off migration: provision a Supabase Auth account for every existing local `users` row
that doesn't have one yet, then email each of them a Supabase password-reset link so they can set
their own real password (their old bcrypt password cannot be transferred into Supabase Auth).

Run once, after DATABASE_URL/SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are set to the real project:

    python -m app.migrate_users_to_supabase_auth

Safe to re-run: rows that already have `auth_user_id` set are skipped.
"""

from sqlalchemy import select

from app.core import supabase_auth
from app.db.session import SessionLocal
from app.models.rbac import User


def main() -> None:
    db = SessionLocal()
    try:
        users = db.scalars(select(User).where(User.auth_user_id.is_(None))).all()
        if not users:
            print("No users need migrating -- every row already has a Supabase Auth account.")
            return

        for user in users:
            try:
                auth_account = supabase_auth.admin_create_user(user.email, password=None, email_confirm=True)
            except supabase_auth.SupabaseAuthError as exc:
                print(f"  SKIPPED {user.email}: {exc}")
                continue

            user.auth_user_id = auth_account["id"]
            db.commit()

            try:
                supabase_auth.admin_send_password_reset(user.email)
                print(f"  OK {user.email} -> Supabase user {auth_account['id']} (reset email sent)")
            except supabase_auth.SupabaseAuthError as exc:
                print(f"  OK {user.email} -> Supabase user {auth_account['id']} (reset email FAILED: {exc})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
