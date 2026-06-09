from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import re

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.modules.prediction_markets.models import (
    FaucetClaim,
    LedgerEntry,
    LedgerType,
    Market,
    MarketOutcome,
    MarketShareArtifact,
    MarketStatus,
    Position,
    Trade,
    TradeAction,
    TradeSide,
    UserMarketStats,
)
from app.modules.prediction_markets.schemas import (
    MarketCreate,
    MarketResolve,
    MarketUpdate,
    TradeCreate,
    TradeQuoteRequest,
)
from app.modules.users.models import User


ZERO = Decimal("0")
ONE = Decimal("1")
MONEY_STEP = Decimal("0.0001")
SHARE_STEP = Decimal("0.000001")
PROB_STEP = Decimal("0.000001")


@dataclass
class TradeQuote:
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
    new_reserve_yes: Decimal
    new_reserve_no: Decimal


def now_utc() -> datetime:
    return datetime.now(UTC)


def _q_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_STEP, rounding=ROUND_HALF_UP)


def _q_share(value: Decimal) -> Decimal:
    return value.quantize(SHARE_STEP, rounding=ROUND_HALF_UP)


def _q_prob(value: Decimal) -> Decimal:
    return value.quantize(PROB_STEP, rounding=ROUND_HALF_UP)


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:160] or "market"


def _ensure_unique_slug(db: Session, base_slug: str, current_market_id: int | None = None) -> str:
    slug = base_slug
    suffix = 2
    while True:
        existing_id = db.scalar(select(Market.id).where(Market.slug == slug))
        if not existing_id or existing_id == current_market_id:
            return slug
        slug = f"{base_slug[:150]}-{suffix}"
        suffix += 1


def _market_raw_probability(market: Market) -> Decimal:
    total = market.reserve_yes + market.reserve_no
    if total <= ZERO:
        return Decimal("0.5")
    return _q_prob(market.reserve_no / total)


def _market_display_probability(market: Market) -> Decimal:
    evidence = market.traded_volume / market.smoothing_scale if market.smoothing_scale > ZERO else ZERO
    numerator = market.smoothing_alpha + (_market_raw_probability(market) * evidence)
    denominator = market.smoothing_alpha + market.smoothing_beta + evidence
    if denominator <= ZERO:
        return Decimal("0.5")
    return _q_prob(numerator / denominator)


def _refresh_probabilities(market: Market) -> None:
    market.raw_probability_yes = _market_raw_probability(market)
    market.display_probability_yes = _market_display_probability(market)


def _get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise ValueError("User not found")
    return user


def get_user(db: Session, user_id: int) -> User:
    return _get_user(db, user_id)


def _get_market_by_slug_or_id(db: Session, market_slug_or_id: str | int) -> Market | None:
    if isinstance(market_slug_or_id, int) or str(market_slug_or_id).isdigit():
        return db.get(Market, int(market_slug_or_id))
    return db.scalar(select(Market).where(Market.slug == str(market_slug_or_id)))


def _require_admin(user: User) -> None:
    if not user.is_admin:
        raise PermissionError("Admin access required")


def _ensure_market_tradable(market: Market) -> None:
    if market.status != MarketStatus.open:
        raise ValueError("Market is not open for trading")
    if market.close_at <= now_utc():
        raise ValueError("Market is closed")


def _normalize_quantity_type(action: TradeAction, quantity_type: str | None) -> str:
    if quantity_type:
        return quantity_type
    return "cash" if action == TradeAction.buy else "shares"


def _load_market_for_update(db: Session, market_id: int) -> Market | None:
    return db.scalar(select(Market).where(Market.id == market_id).with_for_update())


def _load_user_for_update(db: Session, user_id: int) -> User | None:
    return db.scalar(select(User).where(User.id == user_id).with_for_update())


def _position_for_update_locked(db: Session, user_id: int, market_id: int) -> Position:
    position = db.scalar(
        select(Position)
        .where(Position.user_id == user_id, Position.market_id == market_id)
        .with_for_update()
    )
    if position:
        return position
    position = Position(user_id=user_id, market_id=market_id)
    db.add(position)
    db.flush()
    return position


def _stats_for_update_locked(db: Session, user_id: int) -> UserMarketStats:
    stats = db.scalar(select(UserMarketStats).where(UserMarketStats.user_id == user_id).with_for_update())
    if stats:
        return stats
    stats = UserMarketStats(user_id=user_id)
    db.add(stats)
    db.flush()
    return stats


def create_market(db: Session, payload: MarketCreate) -> Market:
    if payload.created_by_user_id is not None:
        creator = _get_user(db, payload.created_by_user_id)
        _require_admin(creator)

    slug = _ensure_unique_slug(db, _slugify(payload.title))
    market = Market(
        slug=slug,
        title=payload.title,
        question=payload.question,
        description=payload.description,
        category=payload.category,
        terms=payload.terms,
        resolution_criteria=payload.resolution_criteria,
        status=payload.status,
        is_public=payload.is_public,
        close_at=payload.close_at,
        resolve_by=payload.resolve_by,
        created_by_user_id=payload.created_by_user_id,
        reserve_yes=_q_money(payload.base_liquidity),
        reserve_no=_q_money(payload.base_liquidity),
        base_liquidity=_q_money(payload.base_liquidity),
        fee_bps=payload.fee_bps,
        traded_volume=ZERO,
        raw_probability_yes=Decimal("0.5"),
        display_probability_yes=Decimal("0.5"),
        smoothing_alpha=_q_money(payload.smoothing_alpha),
        smoothing_beta=_q_money(payload.smoothing_beta),
        smoothing_scale=_q_money(payload.smoothing_scale),
        metadata_json={
            "display_probability_policy": {
                "alpha": str(payload.smoothing_alpha),
                "beta": str(payload.smoothing_beta),
                "scale": str(payload.smoothing_scale),
                "description": "Displayed probability uses a Beta prior centered near 50% and converges toward raw price as traded volume rises.",
            },
            **(payload.metadata_json or {}),
        },
    )
    _refresh_probabilities(market)
    db.add(market)
    db.commit()
    db.refresh(market)
    return market


def update_market(db: Session, market_id: int, payload: MarketUpdate) -> Market:
    market = db.get(Market, market_id)
    if not market:
        raise ValueError("Market not found")
    updates = payload.model_dump(exclude_unset=True)
    if "title" in updates and updates["title"]:
        updates["slug"] = _ensure_unique_slug(db, _slugify(updates["title"]), current_market_id=market.id)
    for field, value in updates.items():
        setattr(market, field, value)
    db.commit()
    db.refresh(market)
    return market


def list_markets(
    db: Session,
    include_private: bool = False,
    status: MarketStatus | None = None,
    category: str | None = None,
    limit: int = 50,
) -> list[Market]:
    stmt: Select[tuple[Market]] = select(Market)
    if not include_private:
        stmt = stmt.where(Market.is_public.is_(True))
    if status:
        stmt = stmt.where(Market.status == status)
    if category:
        stmt = stmt.where(Market.category == category)
    stmt = stmt.order_by(Market.created_at.desc(), Market.id.desc()).limit(limit)
    return list(db.scalars(stmt).all())


def get_market(db: Session, market_slug_or_id: str | int, include_private: bool = False) -> Market | None:
    market = _get_market_by_slug_or_id(db, market_slug_or_id)
    if not market:
        return None
    if not include_private and not market.is_public:
        return None
    return market


def approve_market(db: Session, market_id: int, approver_user_id: int) -> Market:
    market = db.get(Market, market_id)
    if not market:
        raise ValueError("Market not found")
    approver = _get_user(db, approver_user_id)
    _require_admin(approver)
    market.status = MarketStatus.open
    market.approved_by_user_id = approver_user_id
    db.commit()
    db.refresh(market)
    return market


def pause_market(db: Session, market_id: int, admin_user_id: int) -> Market:
    market = db.get(Market, market_id)
    if not market:
        raise ValueError("Market not found")
    admin = _get_user(db, admin_user_id)
    _require_admin(admin)
    market.status = MarketStatus.paused
    db.commit()
    db.refresh(market)
    return market


def resume_market(db: Session, market_id: int, admin_user_id: int) -> Market:
    market = db.get(Market, market_id)
    if not market:
        raise ValueError("Market not found")
    admin = _get_user(db, admin_user_id)
    _require_admin(admin)
    market.status = MarketStatus.open
    db.commit()
    db.refresh(market)
    return market


def _position_for_update(db: Session, user_id: int, market_id: int) -> Position:
    position = db.scalar(
        select(Position).where(Position.user_id == user_id, Position.market_id == market_id)
    )
    if position:
        return position
    position = Position(user_id=user_id, market_id=market_id)
    db.add(position)
    db.flush()
    return position


def _stats_for_update(db: Session, user_id: int) -> UserMarketStats:
    stats = db.scalar(select(UserMarketStats).where(UserMarketStats.user_id == user_id))
    if stats:
        return stats
    stats = UserMarketStats(user_id=user_id)
    db.add(stats)
    db.flush()
    return stats


def _record_ledger(
    db: Session,
    user: User,
    entry_type: LedgerType,
    amount: Decimal,
    market_id: int | None = None,
    trade_id: int | None = None,
    metadata_json: dict | None = None,
) -> LedgerEntry:
    entry = LedgerEntry(
        user_id=user.id,
        market_id=market_id,
        trade_id=trade_id,
        entry_type=entry_type,
        amount=_q_money(amount),
        balance_after=_q_money(user.balance),
        metadata_json=metadata_json or {},
    )
    db.add(entry)
    return entry


def _constant_product_trade_buy(
    reserve_yes: Decimal,
    reserve_no: Decimal,
    side: TradeSide,
    amount_net: Decimal,
) -> tuple[Decimal, Decimal, Decimal]:
    invariant = reserve_yes * reserve_no
    if side == TradeSide.yes:
        new_reserve_no = reserve_no + amount_net
        new_reserve_yes = invariant / new_reserve_no
        shares_out = reserve_yes - new_reserve_yes
    else:
        new_reserve_yes = reserve_yes + amount_net
        new_reserve_no = invariant / new_reserve_yes
        shares_out = reserve_no - new_reserve_no
    return _q_money(new_reserve_yes), _q_money(new_reserve_no), _q_share(shares_out)


def _constant_product_trade_sell(
    reserve_yes: Decimal,
    reserve_no: Decimal,
    side: TradeSide,
    shares_in: Decimal,
) -> tuple[Decimal, Decimal, Decimal]:
    invariant = reserve_yes * reserve_no
    if side == TradeSide.yes:
        new_reserve_yes = reserve_yes + shares_in
        new_reserve_no = invariant / new_reserve_yes
        payout_gross = reserve_no - new_reserve_no
    else:
        new_reserve_no = reserve_no + shares_in
        new_reserve_yes = invariant / new_reserve_no
        payout_gross = reserve_yes - new_reserve_yes
    return _q_money(new_reserve_yes), _q_money(new_reserve_no), _q_money(payout_gross)


def _price_impact_bps(probability_before: Decimal, probability_after: Decimal) -> Decimal:
    return _q_prob(abs(probability_after - probability_before) * Decimal("10000"))


def _quoted_market_copy(market: Market, reserve_yes: Decimal, reserve_no: Decimal, traded_volume: Decimal) -> Market:
    return Market(
        slug=market.slug,
        title=market.title,
        question=market.question,
        description=market.description,
        category=market.category,
        terms=market.terms,
        resolution_criteria=market.resolution_criteria,
        status=market.status,
        is_public=market.is_public,
        close_at=market.close_at,
        resolve_by=market.resolve_by,
        reserve_yes=reserve_yes,
        reserve_no=reserve_no,
        base_liquidity=market.base_liquidity,
        fee_bps=market.fee_bps,
        traded_volume=traded_volume,
        raw_probability_yes=market.raw_probability_yes,
        display_probability_yes=market.display_probability_yes,
        smoothing_alpha=market.smoothing_alpha,
        smoothing_beta=market.smoothing_beta,
        smoothing_scale=market.smoothing_scale,
        metadata_json=market.metadata_json,
    )


def build_trade_quote(
    market: Market,
    payload: TradeCreate | TradeQuoteRequest,
    position: Position | None = None,
) -> TradeQuote:
    quantity_type = _normalize_quantity_type(payload.action, payload.quantity_type)
    fee_rate = Decimal(market.fee_bps) / Decimal("10000")
    probability_before = market.raw_probability_yes

    if payload.action == TradeAction.buy:
        if quantity_type != "cash":
            raise ValueError("Buy orders currently accept cash quantity only")
        amount_in = _q_money(payload.amount)
        fee_amount = _q_money(amount_in * fee_rate)
        amount_net = amount_in - fee_amount
        if amount_net <= ZERO:
            raise ValueError("Trade amount too small after fees")
        new_yes, new_no, shares_out = _constant_product_trade_buy(
            market.reserve_yes,
            market.reserve_no,
            payload.side,
            amount_net,
        )
        if shares_out <= ZERO:
            raise ValueError("Trade amount too small")
        quoted_market = _quoted_market_copy(
            market,
            reserve_yes=new_yes,
            reserve_no=new_no,
            traded_volume=_q_money(market.traded_volume + amount_in),
        )
        probability_after = _market_raw_probability(quoted_market)
        display_probability_after = _market_display_probability(quoted_market)
        return TradeQuote(
            quantity_type=quantity_type,
            amount_in=amount_in,
            fee_amount=fee_amount,
            shares_out=shares_out,
            cash_out=ZERO,
            average_price=_q_prob(amount_in / shares_out),
            probability_before=probability_before,
            probability_after=probability_after,
            display_probability_after=display_probability_after,
            price_impact_bps=_price_impact_bps(probability_before, probability_after),
            new_reserve_yes=new_yes,
            new_reserve_no=new_no,
        )

    if quantity_type != "shares":
        raise ValueError("Sell orders currently accept share quantity only")
    shares_in = _q_share(payload.amount)
    if shares_in <= ZERO:
        raise ValueError("Trade amount too small")
    if position is None:
        raise ValueError("Position is required for sell quotes")
    if payload.side == TradeSide.yes and position.yes_shares < shares_in:
        raise ValueError("Not enough YES shares to sell")
    if payload.side == TradeSide.no and position.no_shares < shares_in:
        raise ValueError("Not enough NO shares to sell")
    new_yes, new_no, payout_gross = _constant_product_trade_sell(
        market.reserve_yes,
        market.reserve_no,
        payload.side,
        shares_in,
    )
    fee_amount = _q_money(payout_gross * fee_rate)
    cash_out = payout_gross - fee_amount
    if cash_out <= ZERO:
        raise ValueError("Trade amount too small after fees")
    quoted_market = _quoted_market_copy(
        market,
        reserve_yes=new_yes,
        reserve_no=new_no,
        traded_volume=_q_money(market.traded_volume + shares_in),
    )
    probability_after = _market_raw_probability(quoted_market)
    display_probability_after = _market_display_probability(quoted_market)
    return TradeQuote(
        quantity_type=quantity_type,
        amount_in=shares_in,
        fee_amount=fee_amount,
        shares_out=shares_in,
        cash_out=cash_out,
        average_price=_q_prob(cash_out / shares_in),
        probability_before=probability_before,
        probability_after=probability_after,
        display_probability_after=display_probability_after,
        price_impact_bps=_price_impact_bps(probability_before, probability_after),
        new_reserve_yes=new_yes,
        new_reserve_no=new_no,
    )


def _enforce_trade_limits(payload: TradeCreate, quote: TradeQuote) -> None:
    if payload.min_shares_out is not None and quote.shares_out < _q_share(payload.min_shares_out):
        raise ValueError("Trade rejected by min_shares_out slippage guard")
    if payload.min_cash_out is not None and quote.cash_out < _q_money(payload.min_cash_out):
        raise ValueError("Trade rejected by min_cash_out slippage guard")
    if (
        payload.max_probability_yes_after is not None
        and quote.probability_after > _q_prob(payload.max_probability_yes_after)
    ):
        raise ValueError("Trade rejected by max_probability_yes_after guard")
    if (
        payload.min_probability_yes_after is not None
        and quote.probability_after < _q_prob(payload.min_probability_yes_after)
    ):
        raise ValueError("Trade rejected by min_probability_yes_after guard")


def preview_trade(db: Session, market_id: int, payload: TradeQuoteRequest, user_id: int | None = None) -> TradeQuote:
    market = db.get(Market, market_id)
    if not market:
        raise ValueError("Market not found")
    _ensure_market_tradable(market)
    position = None
    if user_id is not None:
        position = db.scalar(select(Position).where(Position.user_id == user_id, Position.market_id == market_id))
    return build_trade_quote(market, payload, position=position)


def execute_trade(db: Session, market_id: int, payload: TradeCreate) -> Trade:
    if payload.client_order_id:
        existing = db.scalar(
            select(Trade).where(
                Trade.user_id == payload.user_id,
                Trade.client_order_id == payload.client_order_id,
            )
        )
        if existing:
            return existing

    user = _load_user_for_update(db, payload.user_id)
    if not user:
        raise ValueError("User not found")
    market = _load_market_for_update(db, market_id)
    if not market:
        raise ValueError("Market not found")
    _ensure_market_tradable(market)

    position = _position_for_update_locked(db, user.id, market.id)
    stats = _stats_for_update_locked(db, user.id)
    quote = build_trade_quote(market, payload, position=position)
    _enforce_trade_limits(payload, quote)

    if payload.action == TradeAction.buy:
        if user.balance < quote.amount_in:
            raise ValueError("Insufficient balance")
        user.balance = _q_money(user.balance - quote.amount_in)
        if payload.side == TradeSide.yes:
            position.yes_shares = _q_share(position.yes_shares + quote.shares_out)
            position.cost_basis_yes = _q_money(position.cost_basis_yes + quote.amount_in)
        else:
            position.no_shares = _q_share(position.no_shares + quote.shares_out)
            position.cost_basis_no = _q_money(position.cost_basis_no + quote.amount_in)
        ledger_type = LedgerType.trade_buy
        ledger_amount = -quote.amount_in
        cash_amount = quote.amount_in
        traded_amount = quote.amount_in
    else:
        user.balance = _q_money(user.balance + quote.cash_out)
        if payload.side == TradeSide.yes:
            avg_cost = position.cost_basis_yes / position.yes_shares if position.yes_shares > ZERO else ZERO
            released_cost = _q_money(avg_cost * quote.shares_out)
            position.yes_shares = _q_share(position.yes_shares - quote.shares_out)
            position.cost_basis_yes = _q_money(position.cost_basis_yes - released_cost)
            position.realized_pnl = _q_money(position.realized_pnl + quote.cash_out - released_cost)
        else:
            avg_cost = position.cost_basis_no / position.no_shares if position.no_shares > ZERO else ZERO
            released_cost = _q_money(avg_cost * quote.shares_out)
            position.no_shares = _q_share(position.no_shares - quote.shares_out)
            position.cost_basis_no = _q_money(position.cost_basis_no - released_cost)
            position.realized_pnl = _q_money(position.realized_pnl + quote.cash_out - released_cost)
        ledger_type = LedgerType.trade_sell
        ledger_amount = quote.cash_out
        cash_amount = quote.cash_out
        traded_amount = quote.shares_out

    market.reserve_yes = quote.new_reserve_yes
    market.reserve_no = quote.new_reserve_no
    market.traded_volume = _q_money(market.traded_volume + traded_amount)
    _refresh_probabilities(market)
    stats.total_volume = _q_money(stats.total_volume + traded_amount)

    trade = Trade(
        market_id=market.id,
        user_id=user.id,
        client_order_id=payload.client_order_id,
        side=payload.side,
        action=payload.action,
        cash_amount=cash_amount,
        fee_amount=quote.fee_amount,
        shares_delta=quote.shares_out,
        avg_price=quote.average_price,
        probability_before=quote.probability_before,
        probability_after=market.raw_probability_yes,
        display_probability_after=market.display_probability_yes,
    )
    db.add(trade)
    db.flush()
    _record_ledger(
        db,
        user=user,
        entry_type=ledger_type,
        amount=ledger_amount,
        market_id=market.id,
        trade_id=trade.id,
        metadata_json={
            "side": payload.side.value,
            "action": payload.action.value,
            "quantity_type": quote.quantity_type,
            "price_impact_bps": str(quote.price_impact_bps),
        },
    )
    db.commit()
    db.refresh(trade)
    return trade


def list_market_activity(db: Session, market_id: int, limit: int = 20) -> list[Trade]:
    stmt: Select[tuple[Trade]] = (
        select(Trade).where(Trade.market_id == market_id).order_by(Trade.created_at.desc()).limit(limit)
    )
    return list(db.scalars(stmt).all())


def _recalculate_user_scores(user: User, stats: UserMarketStats) -> None:
    if stats.resolved_markets > 0:
        accuracy = (Decimal(stats.correct_resolutions) / Decimal(stats.resolved_markets)) * Decimal("100")
    else:
        accuracy = Decimal("50")
    user.accuracy_score = _q_money(accuracy)
    pnl_component = max(Decimal("-20"), min(Decimal("20"), stats.total_pnl / Decimal("50")))
    reputation = max(Decimal("1"), min(Decimal("100"), accuracy * Decimal("0.7") + Decimal("30") + pnl_component))
    user.reputation_score = _q_money(reputation)


def resolve_market(db: Session, market_id: int, payload: MarketResolve) -> Market:
    market = db.get(Market, market_id)
    if not market:
        raise ValueError("Market not found")
    admin = _get_user(db, payload.resolved_by_user_id)
    _require_admin(admin)
    if market.status not in {MarketStatus.open, MarketStatus.paused}:
        raise ValueError("Only open or paused markets can be resolved")

    market.status = MarketStatus.resolved if payload.outcome != MarketOutcome.cancelled else MarketStatus.cancelled
    market.outcome = payload.outcome
    market.resolved_at = now_utc()
    market.resolved_by_user_id = payload.resolved_by_user_id
    market.resolved_source_url = payload.resolved_source_url
    market.resolved_explanation = payload.resolved_explanation

    positions = list(db.scalars(select(Position).where(Position.market_id == market_id)).all())
    for position in positions:
        if position.resolved_payout_claimed:
            continue
        user = _get_user(db, position.user_id)
        stats = _stats_for_update(db, user.id)

        loser_shares = ZERO
        if payload.outcome == MarketOutcome.yes:
            payout = _q_money(position.yes_shares)
            loser_shares = position.no_shares
        elif payload.outcome == MarketOutcome.no:
            payout = _q_money(position.no_shares)
            loser_shares = position.yes_shares
        else:
            payout = _q_money(position.cost_basis_yes + position.cost_basis_no)

        remaining_cost = _q_money(position.cost_basis_yes + position.cost_basis_no)
        pnl = _q_money(payout - remaining_cost)
        user.balance = _q_money(user.balance + payout)
        position.realized_pnl = _q_money(position.realized_pnl + pnl)
        position.yes_shares = ZERO
        position.no_shares = ZERO
        position.cost_basis_yes = ZERO
        position.cost_basis_no = ZERO
        position.resolved_payout_claimed = True

        stats.resolved_markets += 1
        if payload.outcome == MarketOutcome.cancelled:
            pass
        elif payout > ZERO and loser_shares <= ZERO:
            stats.correct_resolutions += 1
            stats.current_streak += 1
            stats.best_streak = max(stats.best_streak, stats.current_streak)
        else:
            stats.current_streak = 0
        stats.total_pnl = _q_money(stats.total_pnl + pnl)
        stats.last_resolved_market_at = market.resolved_at
        _recalculate_user_scores(user, stats)
        _record_ledger(
            db,
            user=user,
            entry_type=LedgerType.resolution_payout,
            amount=payout,
            market_id=market.id,
            metadata_json={"outcome": payload.outcome.value},
        )

    artifact = MarketShareArtifact(
        market_id=market.id,
        artifact_type="resolution_outcome",
        title=f"{market.title} resolved {payload.outcome.value.upper()}",
        subtitle=payload.resolved_explanation,
        payload_json={
            "market_slug": market.slug,
            "outcome": payload.outcome.value,
            "source_url": payload.resolved_source_url,
        },
    )
    db.add(artifact)
    db.commit()
    db.refresh(market)
    return market


def week_start(reference: datetime | None = None) -> datetime:
    current = reference or now_utc()
    start = current - timedelta(days=current.weekday())
    return datetime(start.year, start.month, start.day, tzinfo=UTC)


def claim_weekly_faucet(db: Session, user_id: int, faucet_amount: Decimal) -> FaucetClaim:
    user = _get_user(db, user_id)
    claim_for_week = week_start()
    existing = db.scalar(
        select(FaucetClaim).where(
            FaucetClaim.user_id == user_id,
            FaucetClaim.claim_week == claim_for_week,
        )
    )
    if existing:
        raise ValueError("Weekly faucet already claimed")

    amount = _q_money(faucet_amount)
    claim = FaucetClaim(user_id=user.id, claim_week=claim_for_week, amount=amount)
    user.balance = _q_money(user.balance + amount)
    db.add(claim)
    _record_ledger(db, user=user, entry_type=LedgerType.faucet, amount=amount)
    db.commit()
    db.refresh(claim)
    return claim


def get_portfolio(db: Session, user_id: int) -> dict:
    user = _get_user(db, user_id)
    positions = list(db.scalars(select(Position).where(Position.user_id == user_id)).all())
    items: list[dict] = []
    total_realized = ZERO
    total_unrealized = ZERO
    for position in positions:
        market = db.get(Market, position.market_id)
        if not market:
            continue
        yes_value = _q_money(position.yes_shares * market.display_probability_yes)
        no_value = _q_money(position.no_shares * (ONE - market.display_probability_yes))
        current_value = _q_money(yes_value + no_value)
        cost_basis = _q_money(position.cost_basis_yes + position.cost_basis_no)
        unrealized = _q_money(current_value - cost_basis)
        total_realized = _q_money(total_realized + position.realized_pnl)
        total_unrealized = _q_money(total_unrealized + unrealized)
        if position.yes_shares <= ZERO and position.no_shares <= ZERO and position.resolved_payout_claimed:
            continue
        items.append(
            {
                "market_id": market.id,
                "market_slug": market.slug,
                "market_title": market.title,
                "yes_shares": position.yes_shares,
                "no_shares": position.no_shares,
                "realized_pnl": position.realized_pnl,
                "unrealized_pnl": unrealized,
                "market_display_probability_yes": market.display_probability_yes,
                "market_status": market.status,
                "market_outcome": market.outcome,
            }
        )
    return {
        "user_id": user.id,
        "username": user.username,
        "balance": user.balance,
        "total_realized_pnl": total_realized,
        "total_unrealized_pnl": total_unrealized,
        "positions": items,
    }


def get_public_profile(db: Session, user_id: int) -> dict:
    user = _get_user(db, user_id)
    stats = _stats_for_update(db, user.id)
    return {
        "user_id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "balance": user.balance,
        "reputation_score": user.reputation_score,
        "accuracy_score": user.accuracy_score,
        "resolved_markets": stats.resolved_markets,
        "correct_resolutions": stats.correct_resolutions,
        "current_streak": stats.current_streak,
        "best_streak": stats.best_streak,
        "total_pnl": stats.total_pnl,
        "total_volume": stats.total_volume,
    }


def list_user_trades(db: Session, user_id: int, limit: int = 50) -> list[dict]:
    _get_user(db, user_id)
    trades = list(
        db.scalars(
            select(Trade).where(Trade.user_id == user_id).order_by(Trade.created_at.desc()).limit(limit)
        ).all()
    )
    items: list[dict] = []
    for trade in trades:
        market = db.get(Market, trade.market_id)
        items.append(
            {
                "trade_id": trade.id,
                "market_id": trade.market_id,
                "market_slug": market.slug if market else "",
                "market_title": market.title if market else "Unknown market",
                "side": trade.side,
                "action": trade.action,
                "cash_amount": trade.cash_amount,
                "fee_amount": trade.fee_amount,
                "shares_delta": trade.shares_delta,
                "avg_price": trade.avg_price,
                "probability_before": trade.probability_before,
                "probability_after": trade.probability_after,
                "display_probability_after": trade.display_probability_after,
                "created_at": trade.created_at,
            }
        )
    return items


def list_user_transactions(db: Session, user_id: int, limit: int = 100) -> list[dict]:
    _get_user(db, user_id)
    entries = list(
        db.scalars(
            select(LedgerEntry)
            .where(LedgerEntry.user_id == user_id)
            .order_by(LedgerEntry.created_at.desc())
            .limit(limit)
        ).all()
    )
    items: list[dict] = []
    for entry in entries:
        market = db.get(Market, entry.market_id) if entry.market_id else None
        items.append(
            {
                "id": entry.id,
                "market_id": entry.market_id,
                "market_slug": market.slug if market else None,
                "market_title": market.title if market else None,
                "trade_id": entry.trade_id,
                "entry_type": entry.entry_type.value,
                "amount": entry.amount,
                "balance_after": entry.balance_after,
                "metadata_json": entry.metadata_json,
                "created_at": entry.created_at,
            }
        )
    return items


def get_user_analytics(
    db: Session,
    user_id: int,
    recent_trades_limit: int = 10,
    recent_transactions_limit: int = 20,
) -> dict:
    user = _get_user(db, user_id)
    stats = _stats_for_update(db, user.id)
    portfolio = get_portfolio(db, user.id)

    trade_rows = list(
        db.scalars(select(Trade).where(Trade.user_id == user.id).order_by(Trade.created_at.desc())).all()
    )
    faucet_claim_count = db.scalar(
        select(func.count(FaucetClaim.id)).where(FaucetClaim.user_id == user.id)
    ) or 0
    faucet_total = db.scalar(
        select(func.coalesce(func.sum(FaucetClaim.amount), 0)).where(FaucetClaim.user_id == user.id)
    ) or ZERO

    total_buy_trades = sum(1 for trade in trade_rows if trade.action == TradeAction.buy)
    total_sell_trades = sum(1 for trade in trade_rows if trade.action == TradeAction.sell)
    total_fees_paid = _q_money(sum((trade.fee_amount for trade in trade_rows), ZERO))
    total_markets_traded = len({trade.market_id for trade in trade_rows})
    last_trade_at = trade_rows[0].created_at if trade_rows else None

    return {
        "summary": {
            "user_id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "balance": user.balance,
            "reputation_score": user.reputation_score,
            "accuracy_score": user.accuracy_score,
            "total_markets_traded": total_markets_traded,
            "total_trades": len(trade_rows),
            "total_buy_trades": total_buy_trades,
            "total_sell_trades": total_sell_trades,
            "total_faucet_claims": faucet_claim_count,
            "net_deposits_from_faucet": _q_money(Decimal(str(faucet_total))),
            "total_fees_paid": total_fees_paid,
            "total_realized_pnl": portfolio["total_realized_pnl"],
            "total_unrealized_pnl": portfolio["total_unrealized_pnl"],
            "total_volume": stats.total_volume,
            "resolved_markets": stats.resolved_markets,
            "correct_resolutions": stats.correct_resolutions,
            "current_streak": stats.current_streak,
            "best_streak": stats.best_streak,
            "last_trade_at": last_trade_at,
        },
        "recent_trades": list_user_trades(db, user.id, limit=recent_trades_limit),
        "recent_transactions": list_user_transactions(
            db,
            user.id,
            limit=recent_transactions_limit,
        ),
    }


def leaderboard(db: Session, scope: str = "lifetime", limit: int = 20) -> list[dict]:
    weekly_start = week_start()
    weekly_pnl_subquery = (
        select(
            LedgerEntry.user_id,
            func.coalesce(func.sum(LedgerEntry.amount), 0).label("weekly_pnl"),
        )
        .where(
            LedgerEntry.created_at >= weekly_start,
            or_(
                LedgerEntry.entry_type == LedgerType.trade_sell,
                LedgerEntry.entry_type == LedgerType.resolution_payout,
            ),
        )
        .group_by(LedgerEntry.user_id)
        .subquery()
    )

    stmt = (
        select(User, UserMarketStats, func.coalesce(weekly_pnl_subquery.c.weekly_pnl, 0))
        .outerjoin(UserMarketStats, UserMarketStats.user_id == User.id)
        .outerjoin(weekly_pnl_subquery, weekly_pnl_subquery.c.user_id == User.id)
        .where(User.is_active.is_(True))
    )

    rows = db.execute(stmt).all()
    items: list[dict] = []
    for user, stats, weekly_pnl in rows:
        stats = stats or UserMarketStats(
            user_id=user.id,
            resolved_markets=0,
            correct_resolutions=0,
            current_streak=0,
            best_streak=0,
            total_volume=ZERO,
            total_pnl=ZERO,
        )
        items.append(
            {
                "user_id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "balance": user.balance,
                "total_pnl": stats.total_pnl,
                "weekly_pnl": _q_money(Decimal(str(weekly_pnl))),
                "accuracy_score": user.accuracy_score,
                "reputation_score": user.reputation_score,
                "current_streak": stats.current_streak,
                "best_streak": stats.best_streak,
            }
        )

    key = "weekly_pnl" if scope == "weekly" else "reputation_score"
    items.sort(key=lambda row: (row[key], row["accuracy_score"], row["total_pnl"]), reverse=True)
    return items[:limit]


def generate_market_share_artifact(
    db: Session,
    market_id: int,
    artifact_type: str,
    user_id: int | None = None,
) -> dict:
    market = db.get(Market, market_id)
    if not market:
        raise ValueError("Market not found")
    share_url = f"{settings.PUBLIC_WEB_BASE_URL.rstrip('/')}/markets/{market.slug}"
    title = market.title
    subtitle = f"{(market.display_probability_yes * Decimal('100')).quantize(Decimal('0.01'))}% YES"
    payload = {
        "market_slug": market.slug,
        "question": market.question,
        "display_probability_yes": str(market.display_probability_yes),
        "raw_probability_yes": str(market.raw_probability_yes),
        "share_url": share_url,
    }

    if artifact_type == "prediction_card" and user_id is not None:
        position = db.scalar(
            select(Position).where(Position.user_id == user_id, Position.market_id == market_id)
        )
        yes_shares = position.yes_shares if position else ZERO
        no_shares = position.no_shares if position else ZERO
        leaning = "YES" if yes_shares >= no_shares else "NO"
        subtitle = f"I give this {subtitle} and I am leaning {leaning}"
        payload["user_position"] = {"yes_shares": str(yes_shares), "no_shares": str(no_shares)}
    elif artifact_type == "resolution_outcome" and market.outcome:
        subtitle = f"Resolved {market.outcome.value.upper()} with source-backed explanation"
        payload["outcome"] = market.outcome.value
        payload["resolved_source_url"] = market.resolved_source_url

    artifact = MarketShareArtifact(
        market_id=market.id,
        user_id=user_id,
        artifact_type=artifact_type,
        title=title,
        subtitle=subtitle,
        payload_json=payload,
    )
    db.add(artifact)
    db.commit()
    return {
        "artifact_type": artifact_type,
        "title": title,
        "subtitle": subtitle,
        "share_url": share_url,
        "payload": payload,
    }


def generate_profile_share_artifact(db: Session, user_id: int, artifact_type: str = "leaderboard_badge") -> dict:
    profile = get_public_profile(db, user_id)
    share_url = f"{settings.PUBLIC_WEB_BASE_URL.rstrip('/')}/profiles/{profile['user_id']}"
    title = f"{profile['username']} profile"
    subtitle = (
        f"Accuracy {Decimal(profile['accuracy_score']).quantize(Decimal('0.01'))}% | "
        f"Rep {Decimal(profile['reputation_score']).quantize(Decimal('0.01'))}"
    )
    payload = {**profile, "share_url": share_url}
    return {
        "artifact_type": artifact_type,
        "title": title,
        "subtitle": subtitle,
        "share_url": share_url,
        "payload": payload,
    }
