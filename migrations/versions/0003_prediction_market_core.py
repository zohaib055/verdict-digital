"""create prediction market core tables

Revision ID: 0003_prediction_market_core
Revises: 0002_political_intel
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0003_prediction_market_core"
down_revision = "0002_political_intel"
branch_labels = None
depends_on = None


market_status = postgresql.ENUM(
    "draft",
    "pending_approval",
    "open",
    "paused",
    "resolved",
    "cancelled",
    name="market_status",
    create_type=False,
)
market_outcome = postgresql.ENUM("yes", "no", "cancelled", name="market_outcome", create_type=False)
trade_side = postgresql.ENUM("yes", "no", name="trade_side", create_type=False)
trade_action = postgresql.ENUM("buy", "sell", name="trade_action", create_type=False)
ledger_type = postgresql.ENUM(
    "faucet",
    "trade_buy",
    "trade_sell",
    "resolution_payout",
    "manual_adjustment",
    name="ledger_type",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    market_status.create(bind, checkfirst=True)
    market_outcome.create(bind, checkfirst=True)
    trade_side.create(bind, checkfirst=True)
    trade_action.create(bind, checkfirst=True)
    ledger_type.create(bind, checkfirst=True)

    op.add_column("users", sa.Column("username", sa.String(length=80), nullable=True))
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column(
        "users",
        sa.Column("balance", sa.Numeric(18, 4), nullable=False, server_default="1000"),
    )
    op.add_column(
        "users",
        sa.Column("reputation_score", sa.Numeric(10, 4), nullable=False, server_default="50"),
    )
    op.add_column(
        "users",
        sa.Column("accuracy_score", sa.Numeric(10, 4), nullable=False, server_default="50"),
    )
    op.execute("UPDATE users SET username = split_part(email, '@', 1) || '-' || id WHERE username IS NULL")
    op.alter_column("users", "username", nullable=False)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "markets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(length=180), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("terms", sa.Text(), nullable=False),
        sa.Column("resolution_criteria", sa.Text(), nullable=False),
        sa.Column("status", market_status, nullable=False, server_default="draft"),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("close_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolve_by", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("outcome", market_outcome, nullable=True),
        sa.Column("resolved_source_url", sa.Text(), nullable=True),
        sa.Column("resolved_explanation", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolved_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reserve_yes", sa.Numeric(18, 4), nullable=False),
        sa.Column("reserve_no", sa.Numeric(18, 4), nullable=False),
        sa.Column("base_liquidity", sa.Numeric(18, 4), nullable=False),
        sa.Column("fee_bps", sa.Integer(), nullable=False, server_default="200"),
        sa.Column("traded_volume", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("raw_probability_yes", sa.Numeric(10, 6), nullable=False, server_default="0.5"),
        sa.Column("display_probability_yes", sa.Numeric(10, 6), nullable=False, server_default="0.5"),
        sa.Column("smoothing_alpha", sa.Numeric(18, 4), nullable=False, server_default="12"),
        sa.Column("smoothing_beta", sa.Numeric(18, 4), nullable=False, server_default="12"),
        sa.Column("smoothing_scale", sa.Numeric(18, 4), nullable=False, server_default="250"),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("slug", name="uq_markets_slug"),
    )
    op.create_index("ix_markets_slug", "markets", ["slug"], unique=False)
    op.create_index("ix_markets_category", "markets", ["category"], unique=False)

    op.create_table(
        "trades",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("market_id", sa.Integer(), sa.ForeignKey("markets.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("side", trade_side, nullable=False),
        sa.Column("action", trade_action, nullable=False),
        sa.Column("cash_amount", sa.Numeric(18, 4), nullable=False),
        sa.Column("fee_amount", sa.Numeric(18, 4), nullable=False),
        sa.Column("shares_delta", sa.Numeric(18, 6), nullable=False),
        sa.Column("avg_price", sa.Numeric(10, 6), nullable=False),
        sa.Column("probability_before", sa.Numeric(10, 6), nullable=False),
        sa.Column("probability_after", sa.Numeric(10, 6), nullable=False),
        sa.Column("display_probability_after", sa.Numeric(10, 6), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_trades_market_id", "trades", ["market_id"])
    op.create_index("ix_trades_user_id", "trades", ["user_id"])

    op.create_table(
        "positions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("market_id", sa.Integer(), sa.ForeignKey("markets.id"), nullable=False),
        sa.Column("yes_shares", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("no_shares", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("cost_basis_yes", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("cost_basis_no", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("realized_pnl", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("resolved_payout_claimed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "market_id", name="uq_positions_user_market"),
    )

    op.create_table(
        "ledger_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("market_id", sa.Integer(), sa.ForeignKey("markets.id"), nullable=True),
        sa.Column("trade_id", sa.Integer(), sa.ForeignKey("trades.id"), nullable=True),
        sa.Column("entry_type", ledger_type, nullable=False),
        sa.Column("amount", sa.Numeric(18, 4), nullable=False),
        sa.Column("balance_after", sa.Numeric(18, 4), nullable=False),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ledger_entries_user_id", "ledger_entries", ["user_id"])
    op.create_index("ix_ledger_entries_market_id", "ledger_entries", ["market_id"])
    op.create_index("ix_ledger_entries_trade_id", "ledger_entries", ["trade_id"])

    op.create_table(
        "faucet_claims",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("claim_week", sa.DateTime(timezone=True), nullable=False),
        sa.Column("amount", sa.Numeric(18, 4), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "claim_week", name="uq_faucet_claims_user_week"),
    )

    op.create_table(
        "user_market_stats",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("resolved_markets", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("correct_resolutions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("best_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_volume", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("total_pnl", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("last_resolved_market_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", name="uq_user_market_stats_user"),
    )

    op.create_table(
        "market_share_artifacts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("market_id", sa.Integer(), sa.ForeignKey("markets.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("artifact_type", sa.String(length=60), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("subtitle", sa.Text(), nullable=False),
        sa.Column(
            "payload_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_market_share_artifacts_market_id", "market_share_artifacts", ["market_id"])
    op.create_index("ix_market_share_artifacts_user_id", "market_share_artifacts", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_market_share_artifacts_user_id", table_name="market_share_artifacts")
    op.drop_index("ix_market_share_artifacts_market_id", table_name="market_share_artifacts")
    op.drop_table("market_share_artifacts")

    op.drop_table("user_market_stats")
    op.drop_table("faucet_claims")

    op.drop_index("ix_ledger_entries_trade_id", table_name="ledger_entries")
    op.drop_index("ix_ledger_entries_market_id", table_name="ledger_entries")
    op.drop_index("ix_ledger_entries_user_id", table_name="ledger_entries")
    op.drop_table("ledger_entries")

    op.drop_table("positions")

    op.drop_index("ix_trades_user_id", table_name="trades")
    op.drop_index("ix_trades_market_id", table_name="trades")
    op.drop_table("trades")

    op.drop_index("ix_markets_category", table_name="markets")
    op.drop_index("ix_markets_slug", table_name="markets")
    op.drop_table("markets")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_column("users", "accuracy_score")
    op.drop_column("users", "reputation_score")
    op.drop_column("users", "balance")
    op.drop_column("users", "is_admin")
    op.drop_column("users", "username")

    bind = op.get_bind()
    ledger_type.drop(bind, checkfirst=True)
    trade_action.drop(bind, checkfirst=True)
    trade_side.drop(bind, checkfirst=True)
    market_outcome.drop(bind, checkfirst=True)
    market_status.drop(bind, checkfirst=True)
