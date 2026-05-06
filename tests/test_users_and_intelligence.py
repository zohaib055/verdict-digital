from __future__ import annotations

from fastapi.testclient import TestClient

from app.modules.political_intelligence import services as intelligence_services


def test_users_crud_endpoints(client: TestClient) -> None:
    create_response = client.post(
        "/api/v1/users/",
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

    list_response = client.get("/api/v1/users/")
    assert list_response.status_code == 200, list_response.text
    assert [item["id"] for item in list_response.json()] == [user["id"]]

    update_response = client.put(
        f"/api/v1/users/{user['id']}",
        json={"full_name": "Updated Crud User", "is_active": False},
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["full_name"] == "Updated Crud User"
    assert update_response.json()["is_active"] is False

    get_response = client.get(f"/api/v1/users/{user['id']}")
    assert get_response.status_code == 200, get_response.text
    assert get_response.json()["username"] == "crud_user"

    delete_response = client.delete(f"/api/v1/users/{user['id']}")
    assert delete_response.status_code == 204, delete_response.text

    missing_response = client.get(f"/api/v1/users/{user['id']}")
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
