from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID, new_uuid


class User(Base):
    __tablename__ = "users"

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Nullable: password custody moved to Supabase Auth (see app/core/supabase_auth.py). Login
    # verifies against Supabase, not this column; it's kept only so existing rows aren't dropped.
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Links this app-level RBAC row to its Supabase Auth account (auth.users.id).
    auth_user_id: Mapped[GUID | None] = mapped_column(GUID, unique=True, nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    roles: Mapped[list["Role"]] = relationship(secondary="user_roles", back_populates="users")


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    users: Mapped[list["User"]] = relationship(secondary="user_roles", back_populates="roles")
    permissions: Mapped[list["Permission"]] = relationship(secondary="role_permissions", back_populates="roles")


class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = (UniqueConstraint("module", "action", name="uq_permissions_module_action"),)

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=new_uuid)
    module: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(10), nullable=False)  # "read" | "write"

    roles: Mapped[list["Role"]] = relationship(secondary="role_permissions", back_populates="permissions")


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id: Mapped[GUID] = mapped_column(GUID, ForeignKey("users.id"), primary_key=True)
    role_id: Mapped[GUID] = mapped_column(GUID, ForeignKey("roles.id"), primary_key=True)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[GUID] = mapped_column(GUID, ForeignKey("roles.id"), primary_key=True)
    permission_id: Mapped[GUID] = mapped_column(GUID, ForeignKey("permissions.id"), primary_key=True)
