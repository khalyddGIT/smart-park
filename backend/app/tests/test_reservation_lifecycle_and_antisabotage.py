import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select
from app.main import app
from app.db.session import AsyncSessionLocal
from app.models.models import User, Parking, Slot, Reservation
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_reservation_full_lifecycle_and_antisabotage():
    transport = ASGITransport(app=app)
    
    # 1. Preparar usuario conductor y plaza en base de datos
    async with AsyncSessionLocal() as session:
        # Buscar o crear usuario conductor
        res_u = await session.execute(select(User).where(User.email == "conductor_test@smartpark.com"))
        user = res_u.scalars().first()
        if not user:
            user = User(
                email="conductor_test@smartpark.com",
                full_name="Conductor de Pruebas",
                role="user",
                hashed_password="hashed_dummy_password",
                is_active=True
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        
        # Limpiar reservas previas del usuario de prueba para aislar el test
        res_prev = await session.execute(select(Reservation).where(Reservation.user_id == user.id))
        for r in res_prev.scalars().all():
            await session.delete(r)
        
        # Buscar plaza libre
        res_s = await session.execute(select(Slot).where(Slot.parking_id == 1, Slot.status == "free"))
        slot = res_s.scalars().first()
        if not slot:
            slot = Slot(parking_id=1, code="T-99", status="free", slot_type="auto", pos_x=0, pos_y=0, width=50, height=80)
            session.add(slot)
            await session.commit()
            await session.refresh(slot)
        else:
            slot.status = "free"
            await session.commit()
            await session.refresh(slot)

        slot_id = slot.id
        user_id = user.id

    token = create_access_token(subject=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        now = datetime.utcnow()
        start = now + timedelta(minutes=15)
        end = start + timedelta(hours=2)

        payload_1 = {
            "parking_id": 1,
            "slot_id": slot_id,
            "license_plate": "ABC-999",
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "pay_now": False
        }

        # TEST 1: Crear primera reserva exitosa (Fase 1: scheduled)
        res1 = await ac.post("/api/v1/reservations", json=payload_1, headers=headers)
        assert res1.status_code == 201, f"Fallo al crear reserva: {res1.text}"
        data1 = res1.json()
        res_id = data1["id"]
        assert data1["status"] == "scheduled"
        assert data1["license_plate"] == "ABC-999"

        # TEST 2: Regla S-01 (Sabotaje): Intentar segunda reserva concurrente con el mismo usuario
        payload_dup_user = {
            "parking_id": 1,
            "slot_id": slot_id,
            "license_plate": "XYZ-777",
            "start_time": start.isoformat(),
            "end_time": end.isoformat()
        }
        res_dup_user = await ac.post("/api/v1/reservations", json=payload_dup_user, headers=headers)
        assert res_dup_user.status_code == 400
        assert "Ya cuentas con una reserva activa en curso" in res_dup_user.json()["detail"]

        # TEST 3: Regla S-05 (Sabotaje): Intentar reservar la misma placa desde otro usuario
        token_other = create_access_token(subject=1)
        headers_other = {"Authorization": f"Bearer {token_other}"}
        payload_dup_plate = {
            "parking_id": 1,
            "slot_id": slot_id,
            "license_plate": "ABC-999",
            "start_time": start.isoformat(),
            "end_time": end.isoformat()
        }
        res_dup_plate = await ac.post("/api/v1/reservations", json=payload_dup_plate, headers=headers_other)
        assert res_dup_plate.status_code == 400
        assert "ya cuenta con una reserva activa" in res_dup_plate.json()["detail"]

        # TEST 4: Fase 2 - Check-in (Ingreso real a la cochera)
        res_checkin = await ac.put(f"/api/v1/reservations/{res_id}/check-in", headers=headers)
        assert res_checkin.status_code == 200
        data_in = res_checkin.json()
        assert data_in["status"] == "active"
        assert data_in["actual_entry"] is not None

        # TEST 5: Check-out (Salida de la cochera y liberación)
        res_checkout = await ac.put(f"/api/v1/reservations/{res_id}/check-out", headers=headers)
        assert res_checkout.status_code == 200
        data_out = res_checkout.json()
        assert data_out["status"] == "completed"
        assert data_out["actual_exit"] is not None

        # Verificar en base de datos que la plaza quedó LIBRE
        async with AsyncSessionLocal() as session:
            s_check = (await session.execute(select(Slot).where(Slot.id == slot_id))).scalars().first()
            assert s_check.status == "free"
