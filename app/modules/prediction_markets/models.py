from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base, TimestampMixin


MONEY_PRECISION = Numeric(18, 4)
SHARE_PRECISION = Numeric(18, 6)
PROBABILITY_PRECISION = Numeric(10, 6)


class MarketStatus(str, Enum):
    draft = "draft"
    pending_approval = "pending_approval"
    open = "open"
    paused = "paused"
    resolved = "resolved"
    cancelled = "cancelled"


class MarketOutcome(str, Enum):
    yes = "yes"
    no = "no"
    cancelled = "cancelled"


class TradeSide(str, Enum):
    yes = "yes"
    no = "no"


class TradeAction(str, Enum):
    buy = "buy"
    sell = "sell"


class LedgerType(str, Enum):
    faucet = "faucet"
    trade_buy = "trade_buy"
    trade_sell = "trade_sell"
    resolution_payout = "resolution_payout"
    manual_adjustment = "manual_adjustment"


class Market(Base, TimestampMixin):
    __tablename__ = "markets"
    __table_args__ = (UniqueConstraint("slug", name="uq_markets_slug"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    terms: Mapped[str] = mapped_column(Text, nullable=False)
    resolution_criteria: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[MarketStatus] = mapped_column(
        SqlEnum(MarketStatus, name="market_status"),
        nullable=False,
        default=MarketStatus.draft,
        server_default=MarketStatus.draft.value,
    )
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    close_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resolve_by: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    outcome: Mapped[MarketOutcome | None] = mapped_column(
        SqlEnum(MarketOutcome, name="market_outcome"),
        nullable=True,
    )
    resolved_source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    resolved_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reserve_yes: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)
    reserve_no: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)
    base_liquidity: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)
    fee_bps: Mapped[int] = mapped_column(Integer, nullable=False, default=200, server_default="200")
    traded_volume: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )
    raw_probability_yes: Mapped[Decimal] = mapped_column(
        PROBABILITY_PRECISION,
        nullable=False,
        default=Decimal("0.5"),
        server_default="0.5",
    )
    display_probability_yes: Mapped[Decimal] = mapped_column(
        PROBABILITY_PRECISION,
        nullable=False,
        default=Decimal("0.5"),
        server_default="0.5",
    )
    smoothing_alpha: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        default=Decimal("12"),
        server_default="12",
    )
    smoothing_beta: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        default=Decimal("12"),
        server_default="12",
    )
    smoothing_scale: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        default=Decimal("250"),
        server_default="250",
    )
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))


class Trade(Base, TimestampMixin):
    __tablename__ = "trades"
    __table_args__ = (UniqueConstraint("user_id", "client_order_id", name="uq_trades_user_client_order_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    market_id: Mapped[int] = mapped_column(ForeignKey("markets.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    client_order_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    side: Mapped[TradeSide] = mapped_column(SqlEnum(TradeSide, name="trade_side"), nullable=False)
    action: Mapped[TradeAction] = mapped_column(SqlEnum(TradeAction, name="trade_action"), nullable=False)
    cash_amount: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)
    fee_amount: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)
    shares_delta: Mapped[Decimal] = mapped_column(SHARE_PRECISION, nullable=False)
    avg_price: Mapped[Decimal] = mapped_column(PROBABILITY_PRECISION, nullable=False)
    probability_before: Mapped[Decimal] = mapped_column(PROBABILITY_PRECISION, nullable=False)
    probability_after: Mapped[Decimal] = mapped_column(PROBABILITY_PRECISION, nullable=False)
    display_probability_after: Mapped[Decimal] = mapped_column(PROBABILITY_PRECISION, nullable=False)


class Position(Base, TimestampMixin):
    __tablename__ = "positions"
    __table_args__ = (UniqueConstraint("user_id", "market_id", name="uq_positions_user_market"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    market_id: Mapped[int] = mapped_column(ForeignKey("markets.id"), nullable=False)
    yes_shares: Mapped[Decimal] = mapped_column(
        SHARE_PRECISION,
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )
    no_shares: Mapped[Decimal] = mapped_column(
        SHARE_PRECISION,
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )
    cost_basis_yes: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )
    cost_basis_no: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )
    realized_pnl: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )
    resolved_payout_claimed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )


class LedgerEntry(Base, TimestampMixin):
    __tablename__ = "ledger_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    market_id: Mapped[int | None] = mapped_column(ForeignKey("markets.id"), nullable=True, index=True)
    trade_id: Mapped[int | None] = mapped_column(ForeignKey("trades.id"), nullable=True, index=True)
    entry_type: Mapped[LedgerType] = mapped_column(
        SqlEnum(LedgerType, name="ledger_type"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))


class FaucetClaim(Base, TimestampMixin):
    __tablename__ = "faucet_claims"
    __table_args__ = (UniqueConstraint("user_id", "claim_week", name="uq_faucet_claims_user_week"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    claim_week: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)


class UserMarketStats(Base, TimestampMixin):
    __tablename__ = "user_market_stats"
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_market_stats_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    resolved_markets: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    correct_resolutions: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    current_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    best_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    total_volume: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )
    total_pnl: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )
    last_resolved_market_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MarketShareArtifact(Base, TimestampMixin):
    __tablename__ = "market_share_artifacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    market_id: Mapped[int] = mapped_column(ForeignKey("markets.id"), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    artifact_type: Mapped[str] = mapped_column(String(60), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subtitle: Mapped[str] = mapped_column(Text, nullable=False)
    payload_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
