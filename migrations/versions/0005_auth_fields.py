"""add authentication fields to users

Revision ID: 0005_auth_fields
Revises: 0004_trade_idempotency
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa


revision = "0005_auth_fields"
down_revision = "0004_trade_idempotency"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=False, server_default="!"))
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "password_hash")
