import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient

pytestmark = pytest.mark.anyio

async def test_reservation_creation_and_lifecycle(client: AsyncClient):
    # 1. Obtener un estacionamiento y sus slots libres
    p_res = await client.get("/api/v1/parkings")
    parking_id = p_res.json()[0]["id"]
    
    slots_res = await client.get(f"/api/v1/parkings/{parking_id}/slots")
    slots = slots_res.json()
    free_slot = next((s for s in slots if s["status"] == "free"), None)
    
    if not free_slot:
        # Crear un slot libre para la prueba
        new_slot_res = await client.post(f"/api/v1/parkings/{parking_id}/slots", json={
            "code": "RSV-TEST",
            "floor_level": "Piso 1",
            "slot_type": "auto",
            "status": "free",
            "pos_x": 10,
            "pos_y": 10,
            "width": 60,
            "height": 100,
            "rotation": 0
        })
        free_slot = new_slot_res.json()

    slot_id = free_slot["id"]
    start_time = datetime.now(timezone.utc)
    end_time = start_time + timedelta(hours=2)

    # 2. Crear Reserva
    rsv_payload = {
        "parking_id": parking_id,
        "slot_id": slot_id,
        "license_plate": "ABC-999",
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }
    rsv_res = await client.post("/api/v1/reservations", json=rsv_payload)
    assert rsv_res.status_code == 201
    rsv_data = rsv_res.json()
    assert rsv_data["license_plate"] == "ABC-999"
    assert rsv_data["status"] == "scheduled"
    assert "qr_code" in rsv_data
    assert rsv_data["total_cost"] > 0
    reservation_id = rsv_data["id"]

    # 3. Verificar que no se puede reservar el mismo slot (ya está ocupado/reservado)
    conflict_res = await client.post("/api/v1/reservations", json=rsv_payload)
    assert conflict_res.status_code == 400

    # 4. Extender Reserva por 1 hora
    extend_res = await client.put(f"/api/v1/reservations/{reservation_id}/extend?hours=1.0")
    assert extend_res.status_code == 200
    assert extend_res.json()["total_cost"] > rsv_data["total_cost"]

    # 5. Cancelar Reserva
    cancel_res = await client.put(f"/api/v1/reservations/{reservation_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"
