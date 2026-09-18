"""Link users to Supabase Auth accounts; retire local password storage

Revision ID: f2a1c9d8b6e0
Revises: e1b76fe14f8e
Create Date: 2026-09-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import app.db.base  # GUID custom type used by generated columns below


# revision identifiers, used by Alembic.
revision: str = 'f2a1c9d8b6e0'
down_revision: Union[str, None] = 'e1b76fe14f8e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('auth_user_id', app.db.base.GUID(length=36), nullable=True))
    op.create_unique_constraint('uq_users_auth_user_id', 'users', ['auth_user_id'])
    op.create_index(op.f('ix_users_auth_user_id'), 'users', ['auth_user_id'], unique=False)
    op.alter_column('users', 'hashed_password', existing_type=sa.String(length=255), nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'hashed_password', existing_type=sa.String(length=255), nullable=False)
    op.drop_index(op.f('ix_users_auth_user_id'), table_name='users')
    op.drop_constraint('uq_users_auth_user_id', 'users', type_='unique')
    op.drop_column('users', 'auth_user_id')
