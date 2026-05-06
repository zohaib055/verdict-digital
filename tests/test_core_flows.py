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

    trade_response = client.post(
        f"/api/v1/prediction/markets/{market['id']}/trade",
        headers=_auth_header(trader_token),
        json={
            "user_id": user_id,
            "side": "yes",
            "action": "buy",
            "amount": "25",
            "quantity_type": "cash",
            "client_order_id": "test-order-001",
        },
    )
    assert trade_response.status_code == 201, trade_response.text
    trade = trade_response.json()
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
