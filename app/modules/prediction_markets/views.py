from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.settings import settings
from app.modules.auth.dependencies import ensure_user_access, get_optional_current_user, require_admin_user, require_current_user
from app.modules.prediction_markets import services
from app.modules.prediction_markets.models import MarketStatus
from app.modules.prediction_markets.schemas import (
    ActivityFeedOut,
    FaucetClaimOut,
    LeaderboardEntry,
    MarketApprove,
    MarketCreate,
    MarketListItem,
    MarketOut,
    MarketResolve,
    MarketUpdate,
    PortfolioOut,
    PublicProfileOut,
    ShareArtifactOut,
    TradeCreate,
    TradeQuoteOut,
    TradeQuoteRequest,
    TradeOut,
    LedgerEntryOut,
    UserAnalyticsOut,
    UserTradeHistoryItem,
)
from app.modules.users.models import User


router = APIRouter()


def _translate_error(exc: Exception) -> HTTPException:
    if isinstance(exc, PermissionError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected server error")


@router.post("/admin/markets", response_model=MarketOut, status_code=status.HTTP_201_CREATED)
def create_market(
    payload: MarketCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_user),
):
    try:
        return services.create_market(
            db,
            payload.model_copy(update={"created_by_user_id": admin_user.id}),
        )
    except Exception as exc:
        raise _translate_error(exc)


@router.put("/admin/markets/{market_id}", response_model=MarketOut)
def update_market(
    market_id: int,
    payload: MarketUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_user),
):
    try:
        return services.update_market(db, market_id, payload)
    except Exception as exc:
        raise _translate_error(exc)


@router.post("/admin/markets/{market_id}/approve", response_model=MarketOut)
def approve_market(
    market_id: int,
    payload: MarketApprove | None = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_user),
):
    try:
        return services.approve_market(db, market_id, admin_user.id)
    except Exception as exc:
        raise _translate_error(exc)


@router.post("/admin/markets/{market_id}/pause", response_model=MarketOut)
def pause_market(
    market_id: int,
    payload: MarketApprove | None = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_user),
):
    try:
        return services.pause_market(db, market_id, admin_user.id)
    except Exception as exc:
        raise _translate_error(exc)


@router.post("/admin/markets/{market_id}/resume", response_model=MarketOut)
def resume_market(
    market_id: int,
    payload: MarketApprove | None = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_user),
):
    try:
        return services.resume_market(db, market_id, admin_user.id)
    except Exception as exc:
        raise _translate_error(exc)


@router.post("/admin/markets/{market_id}/resolve", response_model=MarketOut)
def resolve_market(
    market_id: int,
    payload: MarketResolve,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_user),
):
    try:
        return services.resolve_market(
            db,
            market_id,
            payload.model_copy(update={"resolved_by_user_id": admin_user.id}),
        )
    except Exception as exc:
        raise _translate_error(exc)


@router.get("/markets", response_model=list[MarketListItem])
def list_markets(
    status: MarketStatus | None = Query(default=None),
    category: str | None = Query(default=None),
    include_private: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return services.list_markets(
        db,
        include_private=include_private,
        status=status,
        category=category,
        limit=limit,
    )


@router.get("/markets/{market_slug}", response_model=MarketOut)
def get_market(market_slug: str, include_private: bool = False, db: Session = Depends(get_db)):
    market = services.get_market(db, market_slug, include_private=include_private)
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    return market


@router.get("/markets/{market_id}/activity", response_model=ActivityFeedOut)
def market_activity(market_id: int, db: Session = Depends(get_db)):
    return {"trades": services.list_market_activity(db, market_id)}


@router.post("/markets/{market_id}/quote", response_model=TradeQuoteOut)
def quote_trade(
    market_id: int,
    payload: TradeQuoteRequest,
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    try:
        effective_user_id = current_user.id if current_user else user_id
        quote = services.preview_trade(db, market_id, payload, user_id=effective_user_id)
        return {
            "side": payload.side,
            "action": payload.action,
            "quantity_type": quote.quantity_type,
            "amount_in": quote.amount_in,
            "fee_amount": quote.fee_amount,
            "shares_out": quote.shares_out,
            "cash_out": quote.cash_out,
            "average_price": quote.average_price,
            "probability_before": quote.probability_before,
            "probability_after": quote.probability_after,
            "display_probability_after": quote.display_probability_after,
            "price_impact_bps": quote.price_impact_bps,
            "balance_required": quote.amount_in if payload.action.value == "buy" else Decimal("0"),
        }
    except Exception as exc:
        raise _translate_error(exc)


@router.post("/markets/{market_id}/trade", response_model=TradeOut, status_code=status.HTTP_201_CREATED)
def create_trade(
    market_id: int,
    payload: TradeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    try:
        return services.execute_trade(db, market_id, payload, user_id=current_user.id)
    except Exception as exc:
        raise _translate_error(exc)


@router.post("/users/{user_id}/faucet/claim", response_model=FaucetClaimOut)
def claim_faucet(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    ensure_user_access(user_id, current_user)
    try:
        claim = services.claim_weekly_faucet(db, user_id, Decimal(str(settings.WEEKLY_FAUCET_AMOUNT)))
    except Exception as exc:
        raise _translate_error(exc)
    user = services.get_user(db, user_id)
    return {
        "user_id": user_id,
        "claim_week": claim.claim_week,
        "amount": claim.amount,
        "balance_after": user.balance,
    }


@router.get("/users/{user_id}/portfolio", response_model=PortfolioOut)
def get_portfolio(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    ensure_user_access(user_id, current_user)
    try:
        return services.get_portfolio(db, user_id)
    except Exception as exc:
        raise _translate_error(exc)


@router.get("/users/{user_id}/analytics", response_model=UserAnalyticsOut)
def get_user_analytics(
    user_id: int,
    recent_trades_limit: int = Query(default=10, ge=1, le=100),
    recent_transactions_limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    ensure_user_access(user_id, current_user)
    try:
        return services.get_user_analytics(
            db,
            user_id,
            recent_trades_limit=recent_trades_limit,
            recent_transactions_limit=recent_transactions_limit,
        )
    except Exception as exc:
        raise _translate_error(exc)


@router.get("/users/{user_id}/trades", response_model=list[UserTradeHistoryItem])
def get_user_trade_history(
    user_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    ensure_user_access(user_id, current_user)
    try:
        return services.list_user_trades(db, user_id, limit=limit)
    except Exception as exc:
        raise _translate_error(exc)


@router.get("/users/{user_id}/transactions", response_model=list[LedgerEntryOut])
def get_user_transactions(
    user_id: int,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    ensure_user_access(user_id, current_user)
    try:
        return services.list_user_transactions(db, user_id, limit=limit)
    except Exception as exc:
        raise _translate_error(exc)


@router.get("/profiles/{user_id}", response_model=PublicProfileOut)
def get_public_profile(user_id: int, db: Session = Depends(get_db)):
    try:
        return services.get_public_profile(db, user_id)
    except Exception as exc:
        raise _translate_error(exc)


@router.get("/leaderboards/{scope}", response_model=list[LeaderboardEntry])
def get_leaderboard(
    scope: str,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    normalized_scope = scope.lower()
    if normalized_scope not in {"weekly", "lifetime"}:
        raise HTTPException(status_code=400, detail="Scope must be weekly or lifetime")
    return services.leaderboard(db, scope=normalized_scope, limit=limit)


@router.post("/markets/{market_id}/share/{artifact_type}", response_model=ShareArtifactOut)
def create_market_share_artifact(
    market_id: int,
    artifact_type: str,
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    try:
        effective_user_id = current_user.id if current_user else user_id
        return services.generate_market_share_artifact(db, market_id, artifact_type, user_id=effective_user_id)
    except Exception as exc:
        raise _translate_error(exc)


@router.get("/profiles/{user_id}/share", response_model=ShareArtifactOut)
def create_profile_share_artifact(user_id: int, db: Session = Depends(get_db)):
    try:
        return services.generate_profile_share_artifact(db, user_id)
    except Exception as exc:
        raise _translate_error(exc)
