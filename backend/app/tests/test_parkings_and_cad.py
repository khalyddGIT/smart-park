import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio

async def test_parkings_crud(client: AsyncClient):
    # 1. Crear nuevo parqueo
    new_parking = {
        "name": "Smart Park San Borja Real",
        "address": "Av. Aviación 2450",
        "city": "San Borja",
        "latitude": -12.095,
        "longitude": -77.001,
        "hourly_rate": 7.50,
        "tolerance_minutes": 10,
        "total_capacity": 25,
        "status": "active"
    }
    create_res = await client.post("/api/v1/parkings", json=new_parking)
    assert create_res.status_code == 201
    p_data = create_res.json()
    parking_id = p_data["id"]
    assert p_data["name"] == new_parking["name"]

    # 2. Obtener parqueo por ID
    get_res = await client.get(f"/api/v1/parkings/{parking_id}")
    assert get_res.status_code == 200
    assert get_res.json()["city"] == "San Borja"

    # 3. Filtrar parqueos por ciudad
    list_res = await client.get("/api/v1/parkings?city=San Borja")
    assert list_res.status_code == 200
    parkings = list_res.json()
    assert any(p["id"] == parking_id for p in parkings)

    # 4. Actualizar tarifa
    update_res = await client.put(f"/api/v1/parkings/{parking_id}", json={"hourly_rate": 9.00})
    assert update_res.status_code == 200
    assert update_res.json()["hourly_rate"] == 9.00

async def test_cad_floor_plan_sync_and_persistence(client: AsyncClient):
    # 1. Obtener primer parqueo
    res = await client.get("/api/v1/parkings")
    parking_id = res.json()[0]["id"]

    # 2. Sincronizar plano CAD completo
    cad_payload = {
        "parking_id": parking_id,
        "slots": [
            {"code": "CAD-01", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 100, "pos_y": 100, "width": 60, "height": 100, "rotation": 0},
            {"code": "CAD-02", "floor_level": "Piso 1", "slot_type": "pmr", "status": "free", "pos_x": 180, "pos_y": 100, "width": 60, "height": 100, "rotation": 0},
            {"code": "CAD-03", "floor_level": "Piso 1", "slot_type": "moto", "status": "free", "pos_x": 260, "pos_y": 100, "width": 40, "height": 70, "rotation": 0}
        ],
        "elements": [
            {"element_type": "wall", "pos_x": 50, "pos_y": 50, "width": 10, "height": 400, "rotation": 0, "z_index": 1, "properties_json": "{}"},
            {"element_type": "crosswalk", "pos_x": 100, "pos_y": 250, "width": 200, "height": 50, "rotation": 0, "z_index": 2, "properties_json": "{}"}
        ]
    }

    sync_res = await client.post(f"/api/v1/parkings/{parking_id}/floor-plan/sync", json=cad_payload)
    assert sync_res.status_code == 200
    assert sync_res.json()["slots_count"] == 3
    assert sync_res.json()["elements_count"] == 2

    # 3. Leer plano CAD persistido
    plan_res = await client.get(f"/api/v1/parkings/{parking_id}/floor-plan")
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    assert len(plan_data["slots"]) == 3
    assert len(plan_data["elements"]) == 2
    assert any(s["code"] == "CAD-01" for s in plan_data["slots"])
