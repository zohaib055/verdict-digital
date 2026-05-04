"""add trade idempotency support

Revision ID: 0004_trade_idempotency
Revises: 0003_prediction_market_core
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa


revision = "0004_trade_idempotency"
down_revision = "0003_prediction_market_core"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("trades", sa.Column("client_order_id", sa.String(length=120), nullable=True))
    op.create_unique_constraint(
        "uq_trades_user_client_order_id",
        "trades",
        ["user_id", "client_order_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_trades_user_client_order_id", "trades", type_="unique")
    op.drop_column("trades", "client_order_id")
