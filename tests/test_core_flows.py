from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.users.models import User


def _signup(client: TestClient, email: str, username: str, password: str = "Password123!") -> dict:
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "username": username,
            "full_name": username.replace("_", " ").title(),
            "password": password,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def _login(client: TestClient, email: str, password: str = "Password123!") -> dict:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _promote_to_admin(db: Session, email: str) -> None:
    user = db.query(User).filter(User.email == email).one()
    user.is_admin = True
    db.commit()


def _market_payload(title: str = "Will the test market resolve yes") -> dict:
    close_at = datetime.now(UTC) + timedelta(days=30)
    return {
        "title": title,
        "question": f"{title} before the close date?",
        "description": "A deterministic market created by the backend test suite.",
        "category": "tests",
        "terms": "This market is only used for automated backend test coverage.",
        "resolution_criteria": "Resolve based on the deterministic condition described in the test.",
        "close_at": close_at.isoformat(),
        "is_public": True,
        "base_liquidity": "1000",
        "fee_bps": 200,
        "status": "draft",
        "metadata_json": {"test": True},
    }


def _create_and_approve_market(client: TestClient, admin_token: str) -> dict:
    create_response = client.post(
        "/api/v1/prediction/admin/markets",
        headers=_auth_header(admin_token),
        json=_market_payload(),
    )
    assert create_response.status_code == 201, create_response.text
    market = create_response.json()
    assert market["status"] == "draft"

    approve_response = client.post(
        f"/api/v1/prediction/admin/markets/{market['id']}/approve",
        headers=_auth_header(admin_token),
        json={"approved_by_user_id": market["created_by_user_id"]},
    )
    assert approve_response.status_code == 200, approve_response.text
    approved = approve_response.json()
    assert approved["status"] == "open"
    return approved


def _buy_yes_trade(
    client: TestClient,
    market_id: int,
    trader_token: str,
    user_id: int | None = None,
    *,
    amount: str = "25",
    client_order_id: str = "test-order-001",
) -> dict:
    payload = {
        "side": "yes",
        "action": "buy",
        "amount": amount,
        "quantity_type": "cash",
        "client_order_id": client_order_id,
    }
    if user_id is not None:
        payload["user_id"] = user_id
    trade_response = client.post(
        f"/api/v1/prediction/markets/{market_id}/trade",
        headers=_auth_header(trader_token),
        json=payload,
    )
    assert trade_response.status_code == 201, trade_response.text
    return trade_response.json()


def test_signup_login_and_me(client: TestClient) -> None:
    signup = _signup(client, "trader@example.com", "trader")
    assert signup["token_type"] == "bearer"
    assert signup["access_token"]
    assert signup["user"]["email"] == "trader@example.com"
    assert signup["user"]["is_admin"] is False

    login = _login(client, "trader@example.com")
    assert login["access_token"]
    assert login["user"]["id"] == signup["user"]["id"]

    me_response = client.get("/api/v1/auth/me", headers=_auth_header(login["access_token"]))
    assert me_response.status_code == 200, me_response.text
    assert me_response.json()["user"]["email"] == "trader@example.com"


def test_admin_can_create_and_approve_market(client: TestClient, db_session: Session) -> None:
    _signup(client, "admin@example.com", "admin_user")
    _promote_to_admin(db_session, "admin@example.com")
    admin_token = _login(client, "admin@example.com")["access_token"]

    approved = _create_and_approve_market(client, admin_token)
    assert approved["approved_by_user_id"] == approved["created_by_user_id"]
    assert Decimal(approved["reserve_yes"]) == Decimal("1000.0000")
    assert Decimal(approved["reserve_no"]) == Decimal("1000.0000")

    list_response = client.get("/api/v1/prediction/markets?status=open")
    assert list_response.status_code == 200, list_response.text
    assert [market["id"] for market in list_response.json()] == [approved["id"]]


def test_non_admin_cannot_create_market(client: TestClient) -> None:
    token = _signup(client, "regular@example.com", "regular_user")["access_token"]

    response = client.post(
        "/api/v1/prediction/admin/markets",
        headers=_auth_header(token),
        json=_market_payload("Will regular users be blocked from admin actions"),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"


def test_user_directory_requires_admin(client: TestClient, db_session: Session) -> None:
    _signup(client, "admin@example.com", "admin_user")
    _promote_to_admin(db_session, "admin@example.com")
    admin_token = _login(client, "admin@example.com")["access_token"]
    trader = _signup(client, "directory-trader@example.com", "directory_trader")
    trader_token = trader["access_token"]
    user_id = trader["user"]["id"]

    list_response = client.get("/api/v1/users/", headers=_auth_header(trader_token))
    assert list_response.status_code == 403

    detail_response = client.get(f"/api/v1/users/{user_id}", headers=_auth_header(trader_token))
    assert detail_response.status_code == 403

    admin_list_response = client.get("/api/v1/users/", headers=_auth_header(admin_token))
    assert admin_list_response.status_code == 200, admin_list_response.text
    assert user_id in {user["id"] for user in admin_list_response.json()}


def test_user_can_execute_buy_trade(client: TestClient, db_session: Session) -> None:
    _signup(client, "admin@example.com", "admin_user")
    _promote_to_admin(db_session, "admin@example.com")
    admin_token = _login(client, "admin@example.com")["access_token"]
    market = _create_and_approve_market(client, admin_token)

    trader = _signup(client, "buyer@example.com", "buyer_user")
    trader_token = trader["access_token"]
    user_id = trader["user"]["id"]

    quote_response = client.post(
        f"/api/v1/prediction/markets/{market['id']}/quote",
        headers=_auth_header(trader_token),
        json={"side": "yes", "action": "buy", "amount": "25", "quantity_type": "cash"},
    )
    assert quote_response.status_code == 200, quote_response.text
    quote = quote_response.json()
    assert Decimal(quote["shares_out"]) > Decimal("0")
    assert Decimal(quote["balance_required"]) == Decimal("25.0000")

    trade = _buy_yes_trade(client, market["id"], trader_token)
    assert trade["user_id"] == user_id
    assert trade["market_id"] == market["id"]
    assert trade["side"] == "yes"
    assert trade["action"] == "buy"
    assert Decimal(trade["shares_delta"]) > Decimal("0")

    portfolio_response = client.get(
        f"/api/v1/prediction/users/{user_id}/portfolio",
        headers=_auth_header(trader_token),
    )
    assert portfolio_response.status_code == 200, portfolio_response.text
    portfolio = portfolio_response.json()
    assert Decimal(portfolio["balance"]) == Decimal("975.0000")
    assert len(portfolio["positions"]) == 1
    assert Decimal(portfolio["positions"][0]["yes_shares"]) == Decimal(trade["shares_delta"])


def test_user_can_sell_trade_and_view_activity(client: TestClient, db_session: Session) -> None:
    _signup(client, "admin@example.com", "admin_user")
    _promote_to_admin(db_session, "admin@example.com")
    admin_token = _login(client, "admin@example.com")["access_token"]
    market = _create_and_approve_market(client, admin_token)

    trader = _signup(client, "seller@example.com", "seller_user")
    trader_token = trader["access_token"]
    user_id = trader["user"]["id"]
    buy_trade = _buy_yes_trade(
        client,
        market["id"],
        trader_token,
        user_id,
        amount="100",
        client_order_id="sell-setup-001",
    )

    sell_amount = str((Decimal(buy_trade["shares_delta"]) / Decimal("2")).quantize(Decimal("0.000001")))
    sell_response = client.post(
        f"/api/v1/prediction/markets/{market['id']}/trade",
        headers=_auth_header(trader_token),
        json={
            "user_id": user_id,
            "side": "yes",
            "action": "sell",
            "amount": sell_amount,
            "quantity_type": "shares",
            "client_order_id": "sell-order-001",
        },
    )
    assert sell_response.status_code == 201, sell_response.text
    sell_trade = sell_response.json()
    assert sell_trade["action"] == "sell"
    assert Decimal(sell_trade["cash_amount"]) > Decimal("0")

    activity_response = client.get(f"/api/v1/prediction/markets/{market['id']}/activity")
    assert activity_response.status_code == 200, activity_response.text
    assert sorted(trade["action"] for trade in activity_response.json()["trades"]) == ["buy", "sell"]

    trades_response = client.get(
        f"/api/v1/prediction/users/{user_id}/trades",
        headers=_auth_header(trader_token),
    )
    assert trades_response.status_code == 200, trades_response.text
    assert sorted(trade["action"] for trade in trades_response.json()) == ["buy", "sell"]


def test_market_pause_resume_and_resolve_updates_profile(client: TestClient, db_session: Session) -> None:
    _signup(client, "admin@example.com", "admin_user")
    _promote_to_admin(db_session, "admin@example.com")
    admin_token = _login(client, "admin@example.com")["access_token"]
    market = _create_and_approve_market(client, admin_token)

    trader = _signup(client, "resolver@example.com", "resolver_user")
    trader_token = trader["access_token"]
    user_id = trader["user"]["id"]
    _buy_yes_trade(client, market["id"], trader_token, user_id, amount="50", client_order_id="resolve-buy-001")

    pause_response = client.post(
        f"/api/v1/prediction/admin/markets/{market['id']}/pause",
        headers=_auth_header(admin_token),
        json={"approved_by_user_id": market["created_by_user_id"]},
    )
    assert pause_response.status_code == 200, pause_response.text
    assert pause_response.json()["status"] == "paused"

    resume_response = client.post(
        f"/api/v1/prediction/admin/markets/{market['id']}/resume",
        headers=_auth_header(admin_token),
        json={"approved_by_user_id": market["created_by_user_id"]},
    )
    assert resume_response.status_code == 200, resume_response.text
    assert resume_response.json()["status"] == "open"

    resolve_response = client.post(
        f"/api/v1/prediction/admin/markets/{market['id']}/resolve",
        headers=_auth_header(admin_token),
        json={
            "resolved_by_user_id": 0,
            "outcome": "yes",
            "resolved_source_url": "https://example.com/source",
            "resolved_explanation": "The deterministic test outcome resolved yes.",
        },
    )
    assert resolve_response.status_code == 200, resolve_response.text
    assert resolve_response.json()["status"] == "resolved"
    assert resolve_response.json()["outcome"] == "yes"

    portfolio_response = client.get(
        f"/api/v1/prediction/users/{user_id}/portfolio",
        headers=_auth_header(trader_token),
    )
    assert portfolio_response.status_code == 200, portfolio_response.text
    assert portfolio_response.json()["positions"] == []

    profile_response = client.get(f"/api/v1/prediction/profiles/{user_id}")
    assert profile_response.status_code == 200, profile_response.text
    profile = profile_response.json()
    assert profile["resolved_markets"] == 1
    assert profile["correct_resolutions"] == 1


def test_faucet_analytics_transactions_leaderboard_and_shares(client: TestClient, db_session: Session) -> None:
    _signup(client, "admin@example.com", "admin_user")
    _promote_to_admin(db_session, "admin@example.com")
    admin_token = _login(client, "admin@example.com")["access_token"]
    market = _create_and_approve_market(client, admin_token)

    trader = _signup(client, "analytics@example.com", "analytics_user")
    trader_token = trader["access_token"]
    user_id = trader["user"]["id"]
    _buy_yes_trade(client, market["id"], trader_token, user_id, amount="25", client_order_id="analytics-buy")

    faucet_response = client.post(
        f"/api/v1/prediction/users/{user_id}/faucet/claim",
        headers=_auth_header(trader_token),
    )
    assert faucet_response.status_code == 200, faucet_response.text
    assert Decimal(faucet_response.json()["amount"]) == Decimal("1000.0000")

    duplicate_faucet = client.post(
        f"/api/v1/prediction/users/{user_id}/faucet/claim",
        headers=_auth_header(trader_token),
    )
    assert duplicate_faucet.status_code == 400

    analytics_response = client.get(
        f"/api/v1/prediction/users/{user_id}/analytics",
        headers=_auth_header(trader_token),
    )
    assert analytics_response.status_code == 200, analytics_response.text
    summary = analytics_response.json()["summary"]
    assert summary["total_trades"] == 1
    assert summary["total_buy_trades"] == 1
    assert summary["total_faucet_claims"] == 1

    transactions_response = client.get(
        f"/api/v1/prediction/users/{user_id}/transactions",
        headers=_auth_header(trader_token),
    )
    assert transactions_response.status_code == 200, transactions_response.text
    assert sorted(entry["entry_type"] for entry in transactions_response.json()) == ["faucet", "trade_buy"]

    leaderboard_response = client.get("/api/v1/prediction/leaderboards/lifetime")
    assert leaderboard_response.status_code == 200, leaderboard_response.text
    assert user_id in {entry["user_id"] for entry in leaderboard_response.json()}

    market_share_response = client.post(
        f"/api/v1/prediction/markets/{market['id']}/share/prediction_card",
        headers=_auth_header(trader_token),
    )
    assert market_share_response.status_code == 200, market_share_response.text
    assert market_share_response.json()["artifact_type"] == "prediction_card"

    profile_share_response = client.get(f"/api/v1/prediction/profiles/{user_id}/share")
    assert profile_share_response.status_code == 200, profile_share_response.text
    assert profile_share_response.json()["artifact_type"] == "leaderboard_badge"
