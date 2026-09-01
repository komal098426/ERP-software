"""Seeds default roles/permissions and one demo login per role.

Run with: python -m app.seed

Real party/ledger data is imported separately -- see app/import_magnus_ledger.py.
"""

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.rbac import Permission, Role, RolePermission, User, UserRole

# Mirrors the RBAC matrix in SRD §6: (module, action) grants per role. yarn_ledger (bags/kg
# tracking, dispatch billing) follows the same access pattern as transactions -- Admin/Manager/
# Finance can write it, Viewer can read it, HR has no reason to see it.
ROLE_PERMISSIONS: dict[str, list[tuple[str, str]]] = {
    "Admin": [
        (module, action)
        for module in [
            "dashboard", "parties", "transactions", "yarn_ledger", "reconciliation", "analytics",
            "reports", "employees", "attendance", "hrms", "users", "settings", "gate_passes",
        ]
        for action in ("read", "write")
    ] + [("audit_logs", "read")],
    "Manager": [
        ("dashboard", "read"), ("parties", "read"), ("parties", "write"),
        ("transactions", "read"), ("transactions", "write"),
        ("yarn_ledger", "read"), ("yarn_ledger", "write"),
        ("reconciliation", "read"), ("analytics", "read"), ("reports", "read"),
        ("employees", "read"), ("attendance", "read"),
        ("gate_passes", "read"), ("gate_passes", "write"),
    ],
    "HR": [
        ("dashboard", "read"), ("parties", "read"), ("analytics", "read"),
        ("reports", "read"), ("employees", "read"), ("employees", "write"),
        ("attendance", "read"), ("attendance", "write"), ("hrms", "read"), ("hrms", "write"),
    ],
    "Finance": [
        ("dashboard", "read"), ("parties", "read"), ("parties", "write"),
        ("transactions", "read"), ("transactions", "write"),
        ("yarn_ledger", "read"), ("yarn_ledger", "write"),
        ("reconciliation", "read"), ("reconciliation", "write"),
        ("analytics", "read"), ("reports", "read"), ("reports", "write"),
        ("gate_passes", "read"), ("gate_passes", "write"),
    ],
    "Viewer": [
        ("dashboard", "read"), ("parties", "read"), ("transactions", "read"),
        ("yarn_ledger", "read"),
        ("reconciliation", "read"), ("analytics", "read"), ("reports", "read"),
        ("employees", "read"), ("attendance", "read"),
        ("gate_passes", "read"),
    ],
}

DEFAULT_ADMIN_EMAIL = "admin@erp-dashboard.app"
DEFAULT_ADMIN_PASSWORD = "ChangeMe123!"

# One demo login per role (SRD §6) so every permission tier can be exercised without a Users UI.
# All share DEFAULT_ADMIN_PASSWORD for convenience -- these are seed/demo accounts, not real users.
DEMO_USERS: list[tuple[str, str, str]] = [  # (role_name, email, full_name)
    ("Admin", DEFAULT_ADMIN_EMAIL, "System Administrator"),
    ("Manager", "manager@erp-dashboard.app", "Operations Manager"),
    ("HR", "hr@erp-dashboard.app", "HR Officer"),
    ("Finance", "finance@erp-dashboard.app", "Finance Officer"),
    ("Viewer", "viewer@erp-dashboard.app", "Read-Only Viewer"),
]


def seed_roles_and_permissions(db) -> dict[str, Role]:
    roles: dict[str, Role] = {}
    for role_name, grants in ROLE_PERMISSIONS.items():
        role = db.scalar(select(Role).where(Role.name == role_name))
        if role is None:
            role = Role(name=role_name)
            db.add(role)
            db.flush()

        for module, action in grants:
            permission = db.scalar(
                select(Permission).where(Permission.module == module, Permission.action == action)
            )
            if permission is None:
                permission = Permission(module=module, action=action)
                db.add(permission)
                db.flush()

            existing_grant = db.scalar(
                select(RolePermission).where(
                    RolePermission.role_id == role.id, RolePermission.permission_id == permission.id
                )
            )
            if existing_grant is None:
                db.add(RolePermission(role_id=role.id, permission_id=permission.id))

        roles[role_name] = role

    db.commit()
    return roles


def seed_demo_user(db, role: Role, email: str, full_name: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is not None:
        return user

    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
        must_change_password=True,
    )
    db.add(user)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    db.refresh(user)
    return user


def seed_demo_users(db, roles: dict[str, Role]) -> dict[str, User]:
    return {
        role_name: seed_demo_user(db, roles[role_name], email, full_name)
        for role_name, email, full_name in DEMO_USERS
    }


def main() -> None:
    db = SessionLocal()
    try:
        roles = seed_roles_and_permissions(db)
        seed_demo_users(db, roles)

        print("Seed complete. Demo logins (all share the same password):\n")
        for role_name, email, _ in DEMO_USERS:
            print(f"  {role_name:8s} {email:30s} {DEFAULT_ADMIN_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
