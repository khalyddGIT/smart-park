"""Tests del monitoreo por camara: POST /parkings/{id}/camera/scan y camera/snapshot."""
import io
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import create_access_token

TEST_EMAIL = "camadmin.monitor@smartpark.pe"
TEST_PARKING_NAME = "SEDE MONITOR CAMARA TEST"


def make_synthetic_frame() -> bytes:
    """Frame cenital sintetico 1100x700 (escala CAD 1:1): asfalto claro y dos
    vehiculos oscuros con proporcion realista (bw/bh ~1.75, bh>28).
    Usa cv2/np (dependencias obligatorias del modulo vision)."""
    import cv2
    import numpy as np
    img = np.full((700, 1100, 3), 190, dtype=np.uint8)
    img[:, :, 2] = 192
    cv2.rectangle(img, (85, 240), (225, 320), (28, 25, 25), -1)   # auto dentro de A-01
    cv2.rectangle(img, (255, 230), (395, 310), (40, 35, 35), -1)  # auto dentro de A-02
    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    assert ok
    return buf.tobytes()


@pytest.fixture(scope="module")
def setup_data():
    """Crea tablas, usuario local, sede de prueba y 4 cajones fijos."""

    async def _setup():
        from sqlalchemy.future import select
        from app.db.session import engine, AsyncSessionLocal, Base
        from app.models.models import User, Parking, Slot
        from app.core.security import get_password_hash

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with AsyncSessionLocal() as session:
            res = await session.execute(select(User).where(User.email == TEST_EMAIL))
            user = res.scalars().first()
            if not user:
                user = User(
                    full_name="Admin Monitor Camara",
                    email=TEST_EMAIL,
                    hashed_password=get_password_hash("MonitorTest2026!"),
                    role="local",
                    is_active=True,
                )
                session.add(user)
                await session.flush()

            res = await session.execute(select(Parking).where(Parking.name == TEST_PARKING_NAME))
            parking = res.scalars().first()
            if not parking:
                parking = Parking(
                    name=TEST_PARKING_NAME,
                    address="Av Monitoreo 101",
                    city="Ayacucho",
                    latitude=-13.16,
                    longitude=-74.22,
                    total_capacity=4,
                )
                session.add(parking)
                await session.flush()
            # Estado base determinista aunque una corrida previa muriera a mitad:
            # sin calibracion ni camara configurada (los tests que las usan las
            # establecen explicitamente y este fixture re-normaliza en cada sesion).
            parking.camera_calibration = None
            parking.camera_url = None
            parking.camera_enabled = False

            # Cajones deterministas (limpia previos de corridas anteriores)
            for old in (await session.execute(select(Slot).where(Slot.parking_id == parking.id))).scalars().all():
                await session.delete(old)
            await session.flush()
            specs = [
                ("A-01", 100, 200),
                ("A-02", 250, 200),
                ("B-01", 500, 350),
                ("B-02", 650, 350),
            ]
            for code, x, y in specs:
                session.add(Slot(parking_id=parking.id, code=code, status="free",
                                 pos_x=x, pos_y=y, width=110, height=160))
            await session.commit()
            return {"user_id": user.id, "parking_id": parking.id}

    import asyncio
    return asyncio.run(_setup())


def _auth_headers(setup_data):
    return {"Authorization": f"Bearer {create_access_token(str(setup_data['user_id']))}"}


# === TESTS ===
@pytest.mark.asyncio
async def test_scan_with_upload_updates_slots_and_annotates(setup_data):
    pid = setup_data["parking_id"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            f"/api/v1/parkings/{pid}/camera/scan",
            headers=_auth_headers(setup_data),
            files={"file": ("frame.jpg", make_synthetic_frame(), "image/jpeg")},
        )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["source"] == "upload"
    assert d["summary"]["total"] == 4
    assert d["summary"]["occupied"] == 2
    assert d["summary"]["free"] == 2
    assert d["cars_in_slots"] == 2
    assert d["vehicles_detected"] >= 1
    assert d["slots"]["A-01"] is True
    assert d["slots"]["A-02"] is True
    assert d["slots"]["B-01"] is False
    assert d["slots"]["B-02"] is False
    assert isinstance(d["annotated_image"], str) and d["annotated_image"].startswith("data:image/jpeg;base64,")
    # La IA actualiza tambien la BD de plazas
    from sqlalchemy.future import select
    from app.db.session import AsyncSessionLocal
    from app.models.models import Slot
    async with AsyncSessionLocal() as session:
        rows = (await session.execute(select(Slot).where(Slot.parking_id == pid))).scalars().all()
        by_code = {s.code: s.status for s in rows}
        assert by_code["A-01"] == "occupied" and by_code["B-01"] == "free"


@pytest.mark.asyncio
async def test_scan_without_image_or_camera_returns_400(setup_data):
    pid = setup_data["parking_id"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(f"/api/v1/parkings/{pid}/camera/scan", headers=_auth_headers(setup_data))
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_scan_requires_local_or_platform_role(setup_data):
    """Un conductor (role=user) no puede escanear la camara."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Sin token -> 401 (no autenticado)
        r = await ac.post(f"/api/v1/parkings/{setup_data['parking_id']}/camera/scan")
        assert r.status_code == 401

    # Con token de conductor demo (si existe) -> 403
    import asyncio as _aio
    from sqlalchemy.future import select
    from app.db.session import AsyncSessionLocal
    from app.models.models import User

    async def _uid():
        async with AsyncSessionLocal() as s:
            res = await s.execute(select(User).where(User.email == "usuario@smartpark.com"))
            u = res.scalars().first()
            return u.id if u else None

    driver_id = await _uid()
    if not driver_id:
        pytest.skip("Usuario conductor demo no existe en esta BD")
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {create_access_token(str(driver_id))}"}
        r = await ac.post(
            f"/api/v1/parkings/{setup_data['parking_id']}/camera/scan",
            headers=headers,
            files={"file": ("frame.jpg", make_synthetic_frame(), "image/jpeg")},
        )
        assert r.status_code == 403


@pytest.mark.asyncio
async def test_snapshot_without_camera_returns_400(setup_data):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get(
            f"/api/v1/parkings/{setup_data['parking_id']}/camera/snapshot",
            headers=_auth_headers(setup_data),
        )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_endpoints_require_auth(setup_data):
    pid = setup_data["parking_id"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r1 = await ac.post(f"/api/v1/parkings/{pid}/camera/scan")
        r2 = await ac.get(f"/api/v1/parkings/{pid}/camera/snapshot")
    assert r1.status_code == 401
    assert r2.status_code == 401


@pytest.mark.asyncio
async def test_events_flow_with_camera_calibration(setup_data):
    """A1+A4: flujo de eventos y calibracion de zonas camara-CAD."""
    from sqlalchemy.future import select
    from app.db.session import AsyncSessionLocal
    from app.models.models import Parking, Slot
    from app.core import camera_events as ce
    pid = setup_data["parking_id"]
    headers = _auth_headers(setup_data)
    transport = ASGITransport(app=app)
    ce.clear_events(pid)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Guardar calibracion via API de configuracion (solo mitad sup-izq visible)
        r_cfg = await ac.put(
            f"/api/v1/parkings/{pid}/camera/config",
            headers=headers,
            json={"camera_enabled": True, "camera_calibration": {"x": 0, "y": 0, "w": 0.5, "h": 0.5}},
        )
        assert r_cfg.status_code == 200

        # Resetear estados a libre antes del primer escaneo calibrado
        async with AsyncSessionLocal() as s:
            for sl in (await s.execute(select(Slot).where(Slot.parking_id == pid))).scalars().all():
                sl.status = "free"
            await s.commit()

        r1 = await ac.post(
            f"/api/v1/parkings/{pid}/camera/scan",
            headers=headers,
            files={"file": ("f.jpg", make_calibrated_frame(), "image/jpeg")},
        )
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        # Solo A-01 cae dentro de la zona calibrada con un auto
        assert d1["slots"]["A-01"] is True
        assert all(d1["slots"][c] is False for c in ("A-02", "B-01", "B-02"))
        assert len(d1["events"]) == 1
        assert d1["events"][0]["type"] == "entered" and d1["events"][0]["slot"] == "A-01"

        # Segundo escaneo identico: ningun cambio -> sin eventos nuevos
        r2 = await ac.post(
            f"/api/v1/parkings/{pid}/camera/scan",
            headers=headers,
            files={"file": ("f.jpg", make_calibrated_frame(), "image/jpeg")},
        )
        assert r2.json()["events"] == []

        # Bitacora acumulada consultable por endpoint
        g = await ac.get(f"/api/v1/parkings/{pid}/camera/events", headers=headers)
        evs = g.json()["events"]
        assert any(e["slot"] == "A-01" and e["type"] == "entered" for e in evs)
        assert evs[0]["ts"] >= evs[-1]["ts"]  # orden descendente

        # Dejar estado neutro para otras pruebas
        r_off = await ac.put(
            f"/api/v1/parkings/{pid}/camera/config",
            headers=headers,
            json={"camera_enabled": False, "camera_calibration": None},
        )
        assert r_off.status_code == 200


@pytest.mark.asyncio
async def test_multi_camera_crud_and_scan(setup_data):
    """A5: crear/editar/escaneo/listar/eliminar dispositivos de cámara."""
    from sqlalchemy.future import select
    from app.db.session import AsyncSessionLocal
    from app.models.models import Slot, CameraDevice
    from app.core import camera_events as ce
    pid = setup_data["parking_id"]
    headers = _auth_headers(setup_data)
    transport = ASGITransport(app=app)
    ce.clear_events(pid)

    # Resetear a libre y asegurar geometría conocida de cajones,
    # y limpiar dispositivos de cámara residuales de corridas anteriores.
    async with AsyncSessionLocal() as s:
        for cd in (await s.execute(select(CameraDevice).where(CameraDevice.parking_id == pid))).scalars().all():
            await s.delete(cd)
        for sl in (await s.execute(select(Slot).where(Slot.parking_id == pid))).scalars().all():
            sl.status = "free"
            sl.pos_y = 200
            if sl.code.startswith("B"):
                sl.pos_y = 350
        await s.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Crear dos dispositivos
        c1 = (await ac.post(f"/api/v1/parkings/{pid}/cameras", headers=headers,
                            json={"name": "Entrada", "url": "http://x/video", "enabled": True})).json()
        c2 = (await ac.post(f"/api/v1/parkings/{pid}/cameras", headers=headers,
                            json={"name": "Playon", "url": "http://y/video", "enabled": True})).json()
        assert c1["id"] and c2["id"]
        cid = c1["id"]

        # Editar (nombre + calibracion)
        up = (await ac.put(f"/api/v1/parkings/{pid}/cameras/{cid}", headers=headers,
                           json={"name": "Entrada Norte", "calibration": {"x": 0, "y": 0, "w": 0.5, "h": 0.5}})).json()
        assert up["name"] == "Entrada Norte"
        assert up["calibration"] is not None

        # Listar (2)
        lst = (await ac.get(f"/api/v1/parkings/{pid}/cameras", headers=headers)).json()
        assert len(lst) == 2

        # Snapshot sin conexión real -> 502 (URL inválida para el proxy)
        sn = await ac.get(f"/api/v1/parkings/{pid}/cameras/{cid}/snapshot", headers=headers)
        assert sn.status_code == 502

        # Escanear dispositivo con frame real: como el endpoint usa cam.url para
        # bajar el frame, y la URL es fake, esperamos 502 (red real). El escaneo
        # real del pipeline ya está cubierto por test_scan_with_upload.
        sc = await ac.post(f"/api/v1/parkings/{pid}/cameras/{cid}/scan", headers=headers)
        assert sc.status_code == 502

        # Eliminar ambos
        d1 = (await ac.delete(f"/api/v1/parkings/{pid}/cameras/{cid}", headers=headers)).json()
        assert d1["status"] == "success"
        d2 = (await ac.delete(f"/api/v1/parkings/{pid}/cameras/{c2['id']}", headers=headers)).json()
        assert d2["status"] == "success"
        lst2 = (await ac.get(f"/api/v1/parkings/{pid}/cameras", headers=headers)).json()
        assert lst2 == []


def make_calibrated_frame() -> bytes:
    """Frame donde la zona calibrada {x:0,y:0,w:0.5,h:0.5} representa el lienzo CAD.
    El cajon A-01 CAD(100,200,110x160) proyecta a pixeles img (50,100,55x80)."""
    import cv2
    import numpy as np
    img = np.full((700, 1100, 3), 190, dtype=np.uint8)
    img[:, :, 2] = 192
    cv2.rectangle(img, (50, 100), (105, 180), (28, 25, 25), -1)  # auto dentro de A-01 proyectado
    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    assert ok
    return buf.tobytes()
