import pytest
import math
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select
from app.main import app
from app.db.session import AsyncSessionLocal
from app.models.models import User, Parking, Slot, Reservation
from app.core.security import create_access_token
from app.core.reservation_worker import check_expired_reservations

@pytest.mark.asyncio
async def test_check_out_calculates_exact_hours_without_grace_period():
    """
    Verifica que al hacer check-out de un vehículo cuya permanencia es de 65 minutos:
    - CON tiempo de gracia de 15 min: 65 - 15 = 50 min => se cobraba 1 hora.
    - SIN tiempo de gracia (NUEVO comportamiento exigido): 65 minutos => ceil(65/60) = 2 horas exactas.
    """
    transport = ASGITransport(app=app)

    async with AsyncSessionLocal() as session:
        # Asegurar usuario conductor
        res_u = await session.execute(select(User).where(User.email == "overtime_test@smartpark.com"))
        user = res_u.scalars().first()
        if not user:
            user = User(
                email="overtime_test@smartpark.com",
                full_name="Usuario Overtime Test",
                role="user",
                hashed_password="hashed_dummy_password",
                is_active=True
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

        # Asegurar parking con tarifa fija S/ 6.00/h
        res_p = await session.execute(select(Parking).where(Parking.id == 1))
        parking = res_p.scalars().first()
        if not parking:
            parking = Parking(id=1, name="Cochera Central Test", address="Jr. Lima 123", rate_auto=6.0, rate_per_hour=6.0)
            session.add(parking)
            await session.commit()
        else:
            parking.rate_auto = 6.0
            parking.rate_per_hour = 6.0
            await session.commit()

        # Asegurar slot
        res_s = await session.execute(select(Slot).where(Slot.parking_id == 1, Slot.code == "OV-01"))
        slot = res_s.scalars().first()
        if not slot:
            slot = Slot(parking_id=1, code="OV-01", status="occupied", slot_type="auto", pos_x=0, pos_y=0, width=50, height=80)
            session.add(slot)
            await session.commit()
            await session.refresh(slot)
        else:
            slot.status = "occupied"
            await session.commit()
            await session.refresh(slot)

        # Crear reserva activa cuyo ingreso fue hace 65 minutos (1h 5m)
        now = datetime.utcnow()
        actual_entry = now - timedelta(minutes=65)
        import uuid
        r_uid = uuid.uuid4().hex[:6]
        res_obj = Reservation(
            user_id=user.id,
            parking_id=parking.id,
            slot_id=slot.id,
            license_plate="GRC-001",
            status="active",
            start_time=actual_entry,
            end_time=actual_entry + timedelta(hours=1),
            actual_entry=actual_entry,
            total_cost=6.0,
            qr_code=f"TEST-TOKEN-NOGRACE-{r_uid}",
            code=f"RSV-NOGRACE-{r_uid}"
        )
        session.add(res_obj)
        await session.commit()
        await session.refresh(res_obj)
        res_id = res_obj.id
        user_id = user.id

    token = create_access_token(subject=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Comprobar que en GET /api/v1/reservations/{id} se detecta overtime dinámico
        res_get = await ac.get(f"/api/v1/reservations/{res_id}", headers=headers)
        assert res_get.status_code == 200
        data_get = res_get.json()
        assert data_get["is_overtime"] is True
        assert data_get["overtime_minutes"] >= 5
        # 65 minutos exactos a S/ 6.00/h => ceil(65/60) = 2 horas => S/ 12.00
        assert data_get["total_cost"] == 12.0

        # 2. Realizar check-out: sin restar 15 minutos de gracia
        res_checkout = await ac.put(f"/api/v1/reservations/{res_id}/check-out", headers=headers)
        assert res_checkout.status_code == 200
        data_out = res_checkout.json()
        assert data_out["status"] == "completed"
        assert data_out["actual_exit"] is not None
        # Cobro final debe ser exactamente 2 horas (S/ 12.00), NO 1 hora como antes con gracia
        assert data_out["total_cost"] == 12.0

@pytest.mark.asyncio
async def test_worker_detects_stay_expiring_soon_and_overtime():
    """
    Verifica que check_expired_reservations del background worker:
    - Detecte estadías activas por vencer (<= 15 min)
    - Detecte estadías activas en overtime y actualice total_cost incrementalmente en la base de datos
    """
    async with AsyncSessionLocal() as session:
        now = datetime.utcnow()
        import uuid
        r_uid = uuid.uuid4().hex[:6]
        res_soon = Reservation(
            user_id=1,
            parking_id=1,
            slot_id=1,
            license_plate="SOON-123",
            status="active",
            start_time=now - timedelta(minutes=50),
            end_time=now + timedelta(minutes=10),
            actual_entry=now - timedelta(minutes=50),
            total_cost=5.0,
            qr_code=f"TEST-SOON-{r_uid}",
            code=f"RSV-SOON-{r_uid}"
        )
        res_over = Reservation(
            user_id=1,
            parking_id=1,
            slot_id=1,
            license_plate="OVER-456",
            status="active",
            start_time=now - timedelta(hours=2),
            end_time=now - timedelta(minutes=45),
            actual_entry=now - timedelta(hours=2),
            total_cost=5.0,
            qr_code=f"TEST-OVER-{r_uid}",
            code=f"RSV-OVER-{r_uid}"
        )
        session.add(res_soon)
        session.add(res_over)
        await session.commit()
        await session.refresh(res_over)
        over_id = res_over.id

    # Ejecutar el ciclo del worker
    await check_expired_reservations()

    # Comprobar en DB que la reserva en overtime incrementó su total_cost
    async with AsyncSessionLocal() as session:
        r_db = (await session.execute(select(Reservation).where(Reservation.id == over_id))).scalars().first()
        # Tiempo transcurrido = 2 horas + 45 min extras = 2h 45m => ceil = 3 horas a S/ 6.00 = S/ 18.00
        assert r_db.total_cost >= 15.0
        # Limpiar
        await session.delete(r_db)
        r_soon_db = (await session.execute(select(Reservation).where(Reservation.code == f"RSV-SOON-{r_uid}"))).scalars().first()
        if r_soon_db:
            await session.delete(r_soon_db)
        await session.commit()

@pytest.mark.asyncio
async def test_active_stay_cannot_be_cancelled_and_reconciles_checkout_amount():
    """
    Verifica los 2 principios de vida real en estacionamientos:
    1. Un conductor o usuario NO puede cancelar una estadía activa (vehículo dentro).
    2. Al hacer check-out de una sobreestadía prepagada, amount_paid se reconcilia al total real.
    """
    transport = ASGITransport(app=app)

    async with AsyncSessionLocal() as session:
        # Asegurar usuario conductor
        res_u = await session.execute(select(User).where(User.email == "overtime_stay_test@smartpark.com"))
        user = res_u.scalars().first()
        if not user:
            user = User(
                email="overtime_stay_test@smartpark.com",
                full_name="Usuario Stay Test",
                role="user",
                hashed_password="hashed_dummy_password",
                is_active=True
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

        # Crear reserva activa cuyo ingreso fue hace 115 minutos (1h 55m)
        now = datetime.utcnow()
        actual_entry = now - timedelta(minutes=115)
        import uuid
        r_uid = uuid.uuid4().hex[:6]
        res_obj = Reservation(
            user_id=user.id,
            parking_id=1,
            slot_id=1,
            license_plate="STAY-999",
            status="active",
            start_time=actual_entry,
            end_time=actual_entry + timedelta(hours=1),
            actual_entry=actual_entry,
            total_cost=6.0,
            amount_paid=6.0,  # Inicialmente prepagado solo por 1 hora
            qr_code=f"TEST-TOKEN-STAY-{r_uid}",
            code=f"RSV-STAY-{r_uid}"
        )
        session.add(res_obj)
        await session.commit()
        await session.refresh(res_obj)
        res_id = res_obj.id
        user_id = user.id

    token = create_access_token(subject=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Intentar cancelar la estadía activa -> DEBE ser rechazado con HTTP 400
        res_cancel = await ac.put(f"/api/v1/reservations/{res_id}/cancel", headers=headers)
        assert res_cancel.status_code == 400
        assert "No es posible cancelar una estadía en curso" in res_cancel.json()["detail"]

        # 2. Realizar check-out: permanencia de 115 min => ceil(115/60) = 2 horas exactas a S/ 6.00 = S/ 12.00
        res_checkout = await ac.put(f"/api/v1/reservations/{res_id}/check-out", headers=headers)
        assert res_checkout.status_code == 200
        data_out = res_checkout.json()
        assert data_out["status"] == "completed"
        assert data_out["total_cost"] == 12.0
        assert data_out["amount_paid"] == 12.0  # Reconciliado al total real sin dejar saldo huérfano

