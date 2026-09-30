import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select
from app.main import app
from app.db.session import AsyncSessionLocal
from app.models.models import User, Parking, Slot, Reservation, Vehicle
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_multi_vehicle_concurrent_reservations():
    """
    Test de Caso de Uso Real:
    Un usuario con múltiples vehículos registrados en su garaje digital
    puede tener reservas concurrentes activas (una por cada vehículo distinto),
    respetando el bloqueo de colisión si intenta reservar dos veces el mismo auto.
    """
    transport = ASGITransport(app=app)

    async with AsyncSessionLocal() as session:
        # 1. Crear o buscar usuario conductor
        res_u = await session.execute(select(User).where(User.email == "conductor_multiautos@smartpark.com"))
        user = res_u.scalars().first()
        if not user:
            user = User(
                email="conductor_multiautos@smartpark.com",
                full_name="Conductor Flota Personal",
                role="user",
                hashed_password="dummy_password_hash",
                is_active=True
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

        user_id = user.id

        # Limpiar reservas previas del usuario
        prev_res = await session.execute(select(Reservation).where(Reservation.user_id == user_id))
        for r in prev_res.scalars().all():
            await session.delete(r)

        # Limpiar vehículos previos del usuario
        prev_veh = await session.execute(select(Vehicle).where(Vehicle.user_id == user_id))
        for v in prev_veh.scalars().all():
            await session.delete(v)
        await session.commit()

        # Registrar 2 vehículos iniciales para el usuario
        v1 = Vehicle(user_id=user_id, license_plate="ABC-101", vehicle_type="auto", brand="Toyota", model="Corolla", color="Plata")
        v2 = Vehicle(user_id=user_id, license_plate="XYZ-202", vehicle_type="camioneta", brand="Hyundai", model="Tucson", color="Negro")
        session.add_all([v1, v2])
        await session.commit()

        # Asegurar plazas libres en parking 1
        s1_res = await session.execute(select(Slot).where(Slot.parking_id == 1, Slot.code == "MV-01"))
        s1 = s1_res.scalars().first()
        if not s1:
            s1 = Slot(parking_id=1, code="MV-01", status="free", slot_type="auto", pos_x=10, pos_y=10, width=50, height=80)
            session.add(s1)
        else:
            s1.status = "free"

        s2_res = await session.execute(select(Slot).where(Slot.parking_id == 1, Slot.code == "MV-02"))
        s2 = s2_res.scalars().first()
        if not s2:
            s2 = Slot(parking_id=1, code="MV-02", status="free", slot_type="camioneta", pos_x=70, pos_y=10, width=50, height=80)
            session.add(s2)
        else:
            s2.status = "free"

        s3_res = await session.execute(select(Slot).where(Slot.parking_id == 1, Slot.code == "MV-03"))
        s3 = s3_res.scalars().first()
        if not s3:
            s3 = Slot(parking_id=1, code="MV-03", status="free", slot_type="moto", pos_x=130, pos_y=10, width=40, height=60)
            session.add(s3)
        else:
            s3.status = "free"

        await session.commit()
        await session.refresh(s1)
        await session.refresh(s2)
        await session.refresh(s3)

        s1_id = s1.id
        s2_id = s2.id
        s3_id = s3.id

    token = create_access_token(subject=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        now = datetime.utcnow()
        start = now + timedelta(minutes=15)
        end = start + timedelta(hours=2)

        # -------------------------------------------------------------
        # CASO 1: Crear primera reserva para el auto 1 (ABC-101)
        # -------------------------------------------------------------
        res1 = await ac.post("/api/v1/reservations", json={
            "parking_id": 1,
            "slot_id": s1_id,
            "license_plate": "ABC-101",
            "vehicle_type": "auto",
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "pay_now": False
        }, headers=headers)
        assert res1.status_code == 201, f"Error creando primera reserva: {res1.text}"
        data1 = res1.json()
        assert data1["license_plate"] == "ABC-101"
        assert data1["status"] == "scheduled"
        res1_id = data1["id"]

        # -------------------------------------------------------------
        # CASO 2: Intentar reservar OTRA plaza con el MISMO auto (ABC-101)
        # Debe ser rechazado porque ese auto ya tiene una reserva activa
        # -------------------------------------------------------------
        res_dup_plate = await ac.post("/api/v1/reservations", json={
            "parking_id": 1,
            "slot_id": s2_id,
            "license_plate": "ABC-101",
            "vehicle_type": "auto",
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "pay_now": False
        }, headers=headers)
        assert res_dup_plate.status_code == 400
        assert "ya cuenta con una reserva activa en curso" in res_dup_plate.json()["detail"]

        # -------------------------------------------------------------
        # CASO 3: Crear segunda reserva con el SEGUNDO auto (XYZ-202)
        # Debe permitirse con éxito (multi-vehículo para el mismo usuario)
        # -------------------------------------------------------------
        res2 = await ac.post("/api/v1/reservations", json={
            "parking_id": 1,
            "slot_id": s2_id,
            "license_plate": "XYZ-202",
            "vehicle_type": "camioneta",
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "pay_now": False
        }, headers=headers)
        assert res2.status_code == 201, f"Error creando segunda reserva: {res2.text}"
        data2 = res2.json()
        assert data2["license_plate"] == "XYZ-202"
        assert data2["status"] == "scheduled"

        # -------------------------------------------------------------
        # CASO 4: Intentar una 3era reserva sin tener un 3er auto registrado
        # El usuario solo tiene 2 autos registrados, por lo que su límite es 2.
        # Debe arrojar error 400 informando el límite de 2 reservas activas simultáneas.
        # -------------------------------------------------------------
        res3_fail = await ac.post("/api/v1/reservations", json={
            "parking_id": 1,
            "slot_id": s3_id,
            "license_plate": "MNO-303",
            "vehicle_type": "moto",
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "pay_now": False
        }, headers=headers)
        assert res3_fail.status_code == 400
        detail_msg = res3_fail.json()["detail"]
        assert "Has alcanzado el límite de 2 reservas activas simultáneas" in detail_msg

        # -------------------------------------------------------------
        # CASO 5: Registrar el 3er auto (MNO-303) en el garaje y reintentar
        # Ahora el usuario cuenta con 3 autos registrados, por lo que puede reservar el 3ro.
        # -------------------------------------------------------------
        res_add_veh = await ac.post("/api/v1/vehicles", json={
            "license_plate": "MNO-303",
            "vehicle_type": "moto",
            "brand": "Honda",
            "model": "CB190R",
            "color": "Rojo"
        }, headers=headers)
        assert res_add_veh.status_code == 201

        res3_success = await ac.post("/api/v1/reservations", json={
            "parking_id": 1,
            "slot_id": s3_id,
            "license_plate": "MNO-303",
            "vehicle_type": "moto",
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "pay_now": False
        }, headers=headers)
        assert res3_success.status_code == 201
        data3 = res3_success.json()
        assert data3["license_plate"] == "MNO-303"
        assert data3["status"] == "scheduled"

        # -------------------------------------------------------------
        # CASO 6: Cancelar la primera reserva (ABC-101) dentro del tiempo
        # Ahora ABC-101 queda libre y puede volverse a reservar
        # -------------------------------------------------------------
        res_cancel = await ac.put(f"/api/v1/reservations/{res1_id}/cancel", headers=headers)
        assert res_cancel.status_code == 200
        assert res_cancel.json()["status"] == "cancelled"

        # Volver a reservar ABC-101 en s1 -> Debe ser aceptado
        res1_renew = await ac.post("/api/v1/reservations", json={
            "parking_id": 1,
            "slot_id": s1_id,
            "license_plate": "ABC-101",
            "vehicle_type": "auto",
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "pay_now": False
        }, headers=headers)
        assert res1_renew.status_code == 201
        assert res1_renew.json()["license_plate"] == "ABC-101"
