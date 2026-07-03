from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.modules.prediction_markets.models import MarketOutcome, MarketStatus, TradeAction, TradeSide


class QuantityType(str):
    cash = "cash"
    shares = "shares"


class MarketBase(BaseModel):
    title: str = Field(min_length=8, max_length=255)
    question: str = Field(min_length=12, max_length=500)
    description: str | None = None
    category: str = Field(min_length=2, max_length=120)
    terms: str = Field(min_length=20)
    resolution_criteria: str = Field(min_length=20)
    close_at: datetime
    resolve_by: datetime | None = None
    is_public: bool = True
    base_liquidity: Decimal = Field(default=Decimal("1000"), ge=Decimal("100"))
    fee_bps: int = Field(default=200, ge=0, le=1000)
    smoothing_alpha: Decimal = Field(default=Decimal("12"), ge=Decimal("1"))
    smoothing_beta: Decimal = Field(default=Decimal("12"), ge=Decimal("1"))
    smoothing_scale: Decimal = Field(default=Decimal("250"), ge=Decimal("1"))
    metadata_json: dict = Field(default_factory=dict)


class MarketCreate(MarketBase):
    created_by_user_id: int | None = None
    status: MarketStatus = MarketStatus.draft


class MarketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=8, max_length=255)
    question: str | None = Field(default=None, min_length=12, max_length=500)
    description: str | None = None
    category: str | None = Field(default=None, min_length=2, max_length=120)
    terms: str | None = Field(default=None, min_length=20)
    resolution_criteria: str | None = Field(default=None, min_length=20)
    close_at: datetime | None = None
    resolve_by: datetime | None = None
    is_public: bool | None = None
    status: MarketStatus | None = None
    fee_bps: int | None = Field(default=None, ge=0, le=1000)
    metadata_json: dict | None = None


class MarketApprove(BaseModel):
    approved_by_user_id: int


class MarketResolve(BaseModel):
    resolved_by_user_id: int
    outcome: MarketOutcome
    resolved_source_url: str = Field(min_length=5, max_length=1000)
    resolved_explanation: str = Field(min_length=10)


class MarketOut(BaseModel):
    id: int
    slug: str
    title: str
    question: str
    description: str | None
    category: str
    terms: str
    resolution_criteria: str
    status: MarketStatus
    is_public: bool
    close_at: datetime
    resolve_by: datetime | None
    resolved_at: datetime | None
    outcome: MarketOutcome | None
    resolved_source_url: str | None
    resolved_explanation: str | None
    created_by_user_id: int | None
    approved_by_user_id: int | None
    resolved_by_user_id: int | None
    traded_volume: Decimal
    raw_probability_yes: Decimal
    display_probability_yes: Decimal
    reserve_yes: Decimal
    reserve_no: Decimal
    metadata_json: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MarketListItem(BaseModel):
    id: int
    slug: str
    title: str
    question: str
    category: str
    status: MarketStatus
    is_public: bool
    close_at: datetime
    traded_volume: Decimal
    raw_probability_yes: Decimal
    display_probability_yes: Decimal

    model_config = {"from_attributes": True}


class TradeCreate(BaseModel):
    side: TradeSide
    action: TradeAction
    amount: Decimal = Field(gt=Decimal("0"))
    quantity_type: str | None = Field(default=None, pattern="^(cash|shares)$")
    min_shares_out: Decimal | None = Field(default=None, gt=Decimal("0"))
    min_cash_out: Decimal | None = Field(default=None, gt=Decimal("0"))
    max_probability_yes_after: Decimal | None = Field(default=None, ge=Decimal("0"), le=Decimal("1"))
    min_probability_yes_after: Decimal | None = Field(default=None, ge=Decimal("0"), le=Decimal("1"))
    client_order_id: str | None = Field(default=None, min_length=6, max_length=120)


class TradeQuoteRequest(BaseModel):
    side: TradeSide
    action: TradeAction
    amount: Decimal = Field(gt=Decimal("0"))
    quantity_type: str | None = Field(default=None, pattern="^(cash|shares)$")


class TradeQuoteOut(BaseModel):
    side: TradeSide
    action: TradeAction
    quantity_type: str
    amount_in: Decimal
    fee_amount: Decimal
    shares_out: Decimal
    cash_out: Decimal
    average_price: Decimal
    probability_before: Decimal
    probability_after: Decimal
    display_probability_after: Decimal
    price_impact_bps: Decimal
    balance_required: Decimal


class TradeOut(BaseModel):
    id: int
    market_id: int
    user_id: int
    client_order_id: str | None
    side: TradeSide
    action: TradeAction
    cash_amount: Decimal
    fee_amount: Decimal
    shares_delta: Decimal
    avg_price: Decimal
    probability_before: Decimal
    probability_after: Decimal
    display_probability_after: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


class UserTradeHistoryItem(BaseModel):
    trade_id: int
    market_id: int
    market_slug: str
    market_title: str
    side: TradeSide
    action: TradeAction
    cash_amount: Decimal
    fee_amount: Decimal
    shares_delta: Decimal
    avg_price: Decimal
    probability_before: Decimal
    probability_after: Decimal
    display_probability_after: Decimal
    created_at: datetime


class LedgerEntryOut(BaseModel):
    id: int
    market_id: int | None
    market_slug: str | None
    market_title: str | None
    trade_id: int | None
    entry_type: str
    amount: Decimal
    balance_after: Decimal
    metadata_json: dict
    created_at: datetime


class PositionOut(BaseModel):
    market_id: int
    market_slug: str
    market_title: str
    yes_shares: Decimal
    no_shares: Decimal
    realized_pnl: Decimal
    unrealized_pnl: Decimal
    market_display_probability_yes: Decimal
    market_status: MarketStatus
    market_outcome: MarketOutcome | None


class PortfolioOut(BaseModel):
    user_id: int
    username: str
    balance: Decimal
    total_realized_pnl: Decimal
    total_unrealized_pnl: Decimal
    positions: list[PositionOut]


class FaucetClaimOut(BaseModel):
    user_id: int
    claim_week: datetime
    amount: Decimal
    balance_after: Decimal


class LeaderboardEntry(BaseModel):
    user_id: int
    username: str
    full_name: str
    balance: Decimal
    total_pnl: Decimal
    weekly_pnl: Decimal
    accuracy_score: Decimal
    reputation_score: Decimal
    current_streak: int
    best_streak: int


class PublicProfileOut(BaseModel):
    user_id: int
    username: str
    full_name: str
    balance: Decimal
    reputation_score: Decimal
    accuracy_score: Decimal
    resolved_markets: int
    correct_resolutions: int
    current_streak: int
    best_streak: int
    total_pnl: Decimal
    total_volume: Decimal


class UserAnalyticsSummary(BaseModel):
    user_id: int
    username: str
    full_name: str
    balance: Decimal
    reputation_score: Decimal
    accuracy_score: Decimal
    total_markets_traded: int
    total_trades: int
    total_buy_trades: int
    total_sell_trades: int
    total_faucet_claims: int
    net_deposits_from_faucet: Decimal
    total_fees_paid: Decimal
    total_realized_pnl: Decimal
    total_unrealized_pnl: Decimal
    total_volume: Decimal
    resolved_markets: int
    correct_resolutions: int
    current_streak: int
    best_streak: int
    last_trade_at: datetime | None


class UserAnalyticsOut(BaseModel):
    summary: UserAnalyticsSummary
    recent_trades: list[UserTradeHistoryItem]
    recent_transactions: list[LedgerEntryOut]


class ShareArtifactOut(BaseModel):
    artifact_type: str
    title: str
    subtitle: str
    share_url: str
    payload: dict


class ActivityFeedOut(BaseModel):
    trades: list[TradeOut]
