import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_api_status(client):
    response = await client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
