import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient

pytestmark = pytest.mark.anyio

async def test_anpr_scan_with_matched_reservation(client: AsyncClient):
    # 1. Obtener parqueo y slot
    p_res = await client.get("/api/v1/parkings")
    parking_id = p_res.json()[0]["id"]

    slot_res = await client.post(f"/api/v1/parkings/{parking_id}/slots", json={
        "code": "ANPR-01",
        "floor_level": "Piso 1",
        "slot_type": "auto",
        "status": "free",
        "pos_x": 0,
        "pos_y": 0,
        "width": 60,
        "height": 100,
        "rotation": 0
    })
    slot_id = slot_res.json()["id"]

    plate = "ANPR-789"
    start_time = datetime.now(timezone.utc)
    end_time = start_time + timedelta(hours=2)

    # 2. Crear reserva
    await client.post("/api/v1/reservations", json={
        "parking_id": parking_id,
        "slot_id": slot_id,
        "license_plate": plate,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    })

    # 3. Simular escaneo de entrada
    entry_scan = await client.post("/api/v1/anpr/simulate-scan", json={
        "parking_id": parking_id,
        "license_plate": plate,
        "gate_type": "entry"
    })
    assert entry_scan.status_code == 200
    entry_data = entry_scan.json()
    assert entry_data["matched"] is True
    assert entry_data["gate_action"] == "OPEN_BARRIER"

    # 4. Simular escaneo de salida
    exit_scan = await client.post("/api/v1/anpr/simulate-scan", json={
        "parking_id": parking_id,
        "license_plate": plate,
        "gate_type": "exit"
    })
    assert exit_scan.status_code == 200
    exit_data = exit_scan.json()
    assert exit_data["matched"] is True
    assert exit_data["gate_action"] == "OPEN_BARRIER"

async def test_anpr_scan_unmatched_vehicle(client: AsyncClient):
    p_res = await client.get("/api/v1/parkings")
    parking_id = p_res.json()[0]["id"]

    scan_res = await client.post("/api/v1/anpr/simulate-scan", json={
        "parking_id": parking_id,
        "license_plate": "UNREG-999",
        "gate_type": "entry"
    })
    assert scan_res.status_code == 200
    data = scan_res.json()
    assert data["matched"] is False
    assert data["gate_action"] == "MANUAL_TICKET_REQUIRED"
