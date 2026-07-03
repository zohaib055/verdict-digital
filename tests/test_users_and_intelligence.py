from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.political_intelligence import services as intelligence_services
from app.modules.users.models import User


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create_admin(client: TestClient, db_session: Session) -> str:
    signup_response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "crud-admin@example.com",
            "username": "crud_admin",
            "full_name": "Crud Admin",
            "password": "Password123!",
        },
    )
    assert signup_response.status_code == 200, signup_response.text
    user = db_session.query(User).filter(User.email == "crud-admin@example.com").one()
    user.is_admin = True
    db_session.commit()
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "crud-admin@example.com", "password": "Password123!"},
    )
    assert login_response.status_code == 200, login_response.text
    return login_response.json()["access_token"]


def test_users_crud_endpoints(client: TestClient, db_session: Session) -> None:
    admin_token = _create_admin(client, db_session)

    create_response = client.post(
        "/api/v1/users/",
        headers=_auth_header(admin_token),
        json={
            "email": "crud@example.com",
            "username": "crud_user",
            "full_name": "Crud User",
            "password": "Password123!",
            "is_active": True,
            "is_admin": False,
        },
    )
    assert create_response.status_code == 201, create_response.text
    user = create_response.json()
    assert user["email"] == "crud@example.com"

    list_response = client.get("/api/v1/users/", headers=_auth_header(admin_token))
    assert list_response.status_code == 200, list_response.text
    assert user["id"] in {item["id"] for item in list_response.json()}

    update_response = client.put(
        f"/api/v1/users/{user['id']}",
        headers=_auth_header(admin_token),
        json={"full_name": "Updated Crud User", "is_active": False},
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["full_name"] == "Updated Crud User"
    assert update_response.json()["is_active"] is False

    get_response = client.get(f"/api/v1/users/{user['id']}", headers=_auth_header(admin_token))
    assert get_response.status_code == 200, get_response.text
    assert get_response.json()["username"] == "crud_user"

    delete_response = client.delete(f"/api/v1/users/{user['id']}", headers=_auth_header(admin_token))
    assert delete_response.status_code == 204, delete_response.text

    missing_response = client.get(f"/api/v1/users/{user['id']}", headers=_auth_header(admin_token))
    assert missing_response.status_code == 404


def test_political_intelligence_scheduler_run_generates_clusters_and_suggestions(
    client: TestClient,
    monkeypatch,
) -> None:
    monkeypatch.setattr(intelligence_services, "_gather_candidates", intelligence_services._seed_candidates)

    job_response = client.post(
        "/api/v1/political-intelligence/scheduler/jobs",
        json={"name": "test-political-scraper", "interval_minutes": 30, "is_active": True},
    )
    assert job_response.status_code == 200, job_response.text
    job = job_response.json()

    run_response = client.post(f"/api/v1/political-intelligence/scheduler/jobs/{job['id']}/run")
    assert run_response.status_code == 200, run_response.text
    run = run_response.json()
    assert run["status"] == "completed"
    assert run["events_discovered"] == 2
    assert run["clusters_generated"] == 2
    assert run["suggestions_generated"] == 2

    clusters_response = client.get("/api/v1/political-intelligence/clusters")
    assert clusters_response.status_code == 200, clusters_response.text
    assert {cluster["topic"] for cluster in clusters_response.json()} == {"elections", "policy"}

    suggestions_response = client.get("/api/v1/political-intelligence/market-suggestions")
    assert suggestions_response.status_code == 200, suggestions_response.text
    suggestions = suggestions_response.json()
    assert len(suggestions) == 2
    assert {suggestion["metadata_json"]["generated_by"] for suggestion in suggestions} == {"heuristic-v1"}

    runs_response = client.get("/api/v1/political-intelligence/scheduler/runs")
    assert runs_response.status_code == 200, runs_response.text
    assert runs_response.json()[0]["id"] == run["id"]
