import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio

async def test_vehicles_crud(client: AsyncClient):
    # 1. Crear vehículo
    v_res = await client.post("/api/v1/vehicles", json={
        "license_plate": "TEST-777",
        "vehicle_type": "suv",
        "brand": "Hyundai",
        "model": "Tucson",
        "color": "Rojo",
        "user_id": 1
    })
    assert v_res.status_code == 201
    v_data = v_res.json()
    vehicle_id = v_data["id"]
    assert v_data["license_plate"] == "TEST-777"

    # 2. Listar vehículos
    list_res = await client.get("/api/v1/vehicles")
    assert list_res.status_code == 200
    vehicles = list_res.json()
    assert any(v["id"] == vehicle_id for v in vehicles)

    # 3. Eliminar vehículo
    del_res = await client.delete(f"/api/v1/vehicles/{vehicle_id}")
    assert del_res.status_code == 200

async def test_staff_crud(client: AsyncClient):
    p_res = await client.get("/api/v1/parkings")
    parking_id = p_res.json()[0]["id"]

    # 1. Registrar miembro del personal
    staff_res = await client.post("/api/v1/staff", json={
        "parking_id": parking_id,
        "full_name": "Carlos Mendoza",
        "dni": "72345678",
        "position": "Operador de Garita",
        "shift": "Mañana",
        "status": "active"
    })
    assert staff_res.status_code == 201
    s_data = staff_res.json()
    staff_id = s_data["id"]

    # 2. Consultar personal del parqueo
    list_res = await client.get(f"/api/v1/staff?parking_id={parking_id}")
    assert list_res.status_code == 200
    assert any(s["id"] == staff_id for s in list_res.json())

    # 3. Actualizar turno
    up_res = await client.put(f"/api/v1/staff/{staff_id}", json={"shift": "Noche"})
    assert up_res.status_code == 200
    assert up_res.json()["shift"] == "Noche"

async def test_reviews_crud_and_reply(client: AsyncClient):
    p_res = await client.get("/api/v1/parkings")
    parking_id = p_res.json()[0]["id"]

    # 1. Crear reseña
    rev_res = await client.post("/api/v1/reviews", json={
        "parking_id": parking_id,
        "rating": 5,
        "comment": "Excelente servicio, la barrera ANPR abrió al instante."
    })
    assert rev_res.status_code == 201
    r_data = rev_res.json()
    review_id = r_data["id"]
    assert r_data["rating"] == 5

    # 2. Responder a la reseña
    reply_res = await client.put(f"/api/v1/reviews/{review_id}/reply", json={
        "response": "¡Muchas gracias por tu visita! Nos alegra que disfrutes de Smart Park."
    })
    assert reply_res.status_code == 200
    assert "Muchas gracias" in reply_res.json()["response"]

    # 3. Listar reseñas filtradas
    list_res = await client.get(f"/api/v1/reviews?parking_id={parking_id}&min_rating=4")
    assert list_res.status_code == 200
    assert any(r["id"] == review_id for r in list_res.json())
