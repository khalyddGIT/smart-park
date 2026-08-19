import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio

async def test_get_parkings_list(client: AsyncClient):
    response = await client.get("/api/v1/parkings")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

async def test_get_vehicles_list(client: AsyncClient):
    response = await client.get("/api/v1/vehicles")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

async def test_get_reservations_list(client: AsyncClient):
    response = await client.get("/api/v1/reservations")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

async def test_get_reviews_list(client: AsyncClient):
    response = await client.get("/api/v1/reviews?parking_id=1")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

async def test_get_staff_list(client: AsyncClient):
    response = await client.get("/api/v1/staff?parking_id=1")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

async def test_simulate_anpr_scan_entry(client: AsyncClient):
    response = await client.post("/api/v1/anpr/simulate-scan", json={
        "parking_id": 1,
        "license_plate": "ABC-123",
        "gate_type": "entry"
    })
    assert response.status_code in [200, 201]
    data = response.json()
    assert "gate_action" in data
    assert "message" in data

async def test_simulate_anpr_scan_exit(client: AsyncClient):
    response = await client.post("/api/v1/anpr/simulate-scan", json={
        "parking_id": 1,
        "license_plate": "XYZ-999",
        "gate_type": "exit"
    })
    assert response.status_code in [200, 201]
    data = response.json()
    assert "gate_action" in data
