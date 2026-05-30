"""End-to-end API tests against the in-memory backend (no keys required)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert "integrations" in r.json()


def test_dashboard_seeded(client):
    data = client.get("/api/dashboard").json()
    assert data["cards"]["hot_accounts"] >= 1
    assert data["leaderboard"][0]["name"] == "Cursor"
    assert data["leaderboard"][0]["score"] == 94


def test_signals_have_account_names(client):
    data = client.get("/api/signals").json()
    assert data["count"] >= 1
    assert data["signals"][0]["account_name"]


def test_research_creates_scored_account(client):
    r = client.post("/api/accounts/research", json={"company": "Snowflake"}).json()
    assert r["account"]["overall_score"] >= 0
    assert isinstance(r["signals"], list)
    # the account should now be retrievable
    aid = r["account"]["id"]
    detail = client.get(f"/api/accounts/{aid}").json()
    assert detail["account"]["name"] == "Snowflake"


def test_outreach_and_sequence(client):
    acct = client.post("/api/accounts/research", json={"company": "Notion"}).json()["account"]
    draft = client.post("/api/outreach/draft", json={"account_id": acct["id"]}).json()
    assert draft["channel"] == "email"
    assert draft["body"]
    seq = client.post("/api/sequences/generate", json={"account_id": acct["id"]}).json()
    assert len(seq["steps"]) >= 3


def test_call_lifecycle_and_scorecard(client):
    acct = client.post("/api/accounts/research", json={"company": "Figma"}).json()["account"]
    call = client.post("/api/calls", json={"account_id": acct["id"]}).json()
    assert call["livekit"]["room"].startswith("revenueos-call-")
    cid = call["call"]["id"]
    end = client.post(f"/api/calls/{cid}/end", json={"disposition": "meeting_booked"}).json()
    assert 0 <= end["scorecard"]["overall_score"] <= 100


def test_prospecting(client):
    r = client.post("/api/prospecting/search", json={"query": "AI infra startups hiring sales",
                                                     "limit": 2}).json()
    assert r["count"] >= 1


def test_integration_status(client):
    data = client.get("/api/settings/integrations").json()
    keys = {i["key"] for i in data["integrations"]}
    assert {"brightdata", "cognee", "trigger", "speechmatics", "livekit"} <= keys
