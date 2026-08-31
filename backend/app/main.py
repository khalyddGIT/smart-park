import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.db.session import engine, Base
from app.models.models import User, Parking, Slot, FloorPlanElement, Vehicle, Incident
from app.api.v1 import auth, parkings, reservations, anpr, vehicles, staff, users, reviews, incidents, payments, finances
from app.core.security import get_password_hash, hash_pin
from app.core.realtime import realtime
from fastapi import WebSocket, WebSocketDisconnect

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configuración CORS por entorno: en producción solo orígenes explícitos.
# El frontend se sirve same-origin desde esta misma app, por lo que no requiere CORS.
if settings.ENVIRONMENT == "production":
    CORS_ORIGINS = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()
    ] or ["https://smart-park-web-production.up.railway.app"]
else:
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://smart-park-web-production.up.railway.app",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicialización de tablas y datos semilla al arrancar el servidor
@app.on_event("startup")
async def startup_db():
    # Listener Redis Pub/Sub para fan-out de eventos WS entre réplicas (no-op sin REDIS_URL)
    from app.core.cache import _ensure_listener
    _ensure_listener()
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Migración ligera multi-dialecto: columnas añadidas tras el primer despliegue.
            # En PostgreSQL usamos ADD COLUMN IF NOT EXISTS; en SQLite verificamos PRAGMA
            # porque no soporta IF NOT EXISTS en ADD COLUMN (antes fallaba en silencio).
            from sqlalchemy import text as _text
            lite_adds = [
                ("estacionamientos", "description", "TEXT"),
                ("estacionamientos", "phone", "VARCHAR(30)"),
                ("estacionamientos", "email", "VARCHAR(150)"),
                ("estacionamientos", "reference", "VARCHAR(255)"),
                ("estacionamientos", "level", "VARCHAR(100)"),
                ("estacionamientos", "camera_url", "TEXT"),
                ("estacionamientos", "camera_enabled", "BOOLEAN DEFAULT FALSE"),
                ("estacionamientos", "camera_calibration", "TEXT"),
                ("usuarios", "avatar_url", "TEXT"),
            ]
            if str(engine.url).startswith("sqlite"):
                for tbl, col, decl in lite_adds:
                    try:
                        rows = (await conn.execute(_text(f"PRAGMA table_info({tbl})"))).all()
                        if col not in {r[1] for r in rows}:
                            await conn.execute(_text(f"ALTER TABLE {tbl} ADD COLUMN {col} {decl}"))
                    except Exception:
                        pass
            else:
                for tbl, col, decl in lite_adds:
                    try:
                        await conn.execute(_text(
                            f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS {col} {decl}"
                        ))
                    except Exception:
                        pass
                # Fix: security_pin VARCHAR(20) -> VARCHAR(255) para hash (Postgres truncaba)
                try:
                    await conn.execute(_text("ALTER TABLE personal ALTER COLUMN security_pin TYPE VARCHAR(255)"))
                except Exception:
                    pass
    except Exception as e:
        import logging
        logging.warning(f"[smart-park] startup_db: no se pudo inicializar DB remota, continuando en modo degradado: {e}")
        return
    try:
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            from sqlalchemy.future import select
            res = await session.execute(select(Parking))
            # Garantizar que existan cocheras iniciales en PostgreSQL para reservas persistentes
            if not res.scalars().first():
                p1 = Parking(
                    name="Smart Park Plaza Mayor - Planta Baja",
                    address="Portal Unión 42, Centro Histórico",
                    city="Ayacucho",
                    latitude=-13.1604,
                    longitude=-74.2259,
                    hourly_rate=5.00,
                    tolerance_minutes=15,
                    total_capacity=20,
                    image_url="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800"
                )
                p2 = Parking(
                    name="Smart Park Jr. Bellido Colonial",
                    address="Jr. Bellido 240, Centro Histórico",
                    city="Ayacucho",
                    latitude=-13.1631,
                    longitude=-74.2236,
                    hourly_rate=4.50,
                    tolerance_minutes=10,
                    total_capacity=15,
                    image_url="https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800"
                )
                p3 = Parking(
                    name="Smart Park Mercado Mariscal Cáceres",
                    address="Av. Mariscal Cáceres 450",
                    city="Ayacucho",
                    latitude=-13.1565,
                    longitude=-74.2215,
                    hourly_rate=3.50,
                    tolerance_minutes=15,
                    total_capacity=25,
                    image_url="https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800"
                )
                session.add_all([p1, p2, p3])
                await session.commit()
                await session.refresh(p1)

                # Generar conjunto completo de cajones para la sede 1
                slots = [
                    Slot(parking_id=p1.id, code="A-01", slot_type="auto", status="free", pos_x=60, pos_y=60, width=60, height=100),
                    Slot(parking_id=p1.id, code="A-02", slot_type="auto", status="free", pos_x=140, pos_y=60, width=60, height=100),
                    Slot(parking_id=p1.id, code="A-03", slot_type="auto", status="free", pos_x=220, pos_y=60, width=60, height=100),
                    Slot(parking_id=p1.id, code="A-04", slot_type="auto", status="free", pos_x=300, pos_y=60, width=60, height=100),
                    Slot(parking_id=p1.id, code="A-05", slot_type="auto", status="free", pos_x=380, pos_y=60, width=60, height=100),
                    Slot(parking_id=p1.id, code="A-06", slot_type="auto", status="free", pos_x=460, pos_y=60, width=60, height=100),
                    Slot(parking_id=p1.id, code="A-07", slot_type="moto", status="free", pos_x=540, pos_y=60, width=50, height=60),
                    Slot(parking_id=p1.id, code="A-08", slot_type="moto", status="free", pos_x=600, pos_y=60, width=50, height=60),
                    Slot(parking_id=p1.id, code="B-01", slot_type="auto", status="free", pos_x=60, pos_y=450, width=60, height=100),
                    Slot(parking_id=p1.id, code="B-02", slot_type="auto", status="free", pos_x=140, pos_y=450, width=60, height=100),
                    Slot(parking_id=p1.id, code="B-03", slot_type="auto", status="free", pos_x=220, pos_y=450, width=60, height=100),
                    Slot(parking_id=p1.id, code="B-04", slot_type="auto", status="free", pos_x=300, pos_y=450, width=60, height=100),
                ]
                elems = [
                    FloorPlanElement(parking_id=p1.id, element_type="road", pos_x=60, pos_y=220, width=800, height=140, z_index=1),
                    FloorPlanElement(parking_id=p1.id, element_type="crosswalk", pos_x=400, pos_y=220, width=80, height=140, z_index=2),
                    FloorPlanElement(parking_id=p1.id, element_type="gate", pos_x=40, pos_y=240, width=50, height=90, z_index=3),
                ]
                session.add_all(slots + elems)
                
            # Garantizar la persistencia y credenciales exactas de las 4 cuentas principales del sistema en PostgreSQL
            from app.models.models import Staff
            system_accounts = [
                {
                    "email": "superadmin@smartpark.com",
                    "full_name": "Super Administrador",
                    "password": os.getenv("SUPERADMIN_PASSWORD") or "SmartParkSuperAdmin2026!",
                    "pin": os.getenv("SUPERADMIN_PIN") or "7391",
                    "role": "platform",
                    "phone": "+51 999999999"
                },
                {
                    "email": "adminlocal@smartpark.com",
                    "full_name": "Administrador Local",
                    "password": os.getenv("ADMINLOCAL_PASSWORD") or "SmartParkLocal2026!",
                    "pin": os.getenv("ADMINLOCAL_PIN") or "4826",
                    "role": "local",
                    "phone": "+51 988888888"
                },
                {
                    "email": "usuario@smartpark.com",
                    "full_name": "Usuario Conductor Demo",
                    "password": "password123",
                    "pin": "1234",
                    "role": "user",
                    "phone": "+51 987654321"
                },
                {
                    "email": "operador.garita@smartpark.pe",
                    "full_name": "Operador de Garita",
                    "password": "Operador2026!",
                    "pin": "2580",
                    "role": "local",
                    "phone": "+51 977777777"
                }
            ]

            for acc in system_accounts:
                res_u = await session.execute(select(User).where(User.email == acc["email"]))
                existing_u = res_u.scalars().first()
                if existing_u:
                    existing_u.full_name = acc["full_name"]
                    existing_u.hashed_password = get_password_hash(acc["password"])
                    existing_u.security_pin = hash_pin(acc["pin"])
                    existing_u.role = acc["role"]
                    existing_u.is_active = True
                else:
                    new_u = User(
                        full_name=acc["full_name"],
                        email=acc["email"],
                        phone=acc["phone"],
                        hashed_password=get_password_hash(acc["password"]),
                        security_pin=hash_pin(acc["pin"]),
                        role=acc["role"],
                        is_active=True
                    )
                    session.add(new_u)
            await session.commit()

            # Garantizar registro en la tabla Staff (personal) para operador.garita@smartpark.pe
            res_p1 = await session.execute(select(Parking))
            first_p = res_p1.scalars().first()
            if first_p:
                res_staff = await session.execute(select(Staff).where(Staff.email == "operador.garita@smartpark.pe"))
                staff_entry = res_staff.scalars().first()
                if staff_entry:
                    staff_entry.parking_id = first_p.id
                    staff_entry.security_pin = hash_pin("2580")
                    staff_entry.status = "active"
                else:
                    new_staff = Staff(
                        parking_id=first_p.id,
                        full_name="Operador de Garita",
                        dni="76543210",
                        position="Operador Garita",
                        shift="Rotativo",
                        status="active",
                        email="operador.garita@smartpark.pe",
                        security_pin=hash_pin("2580")
                    )
                    session.add(new_staff)
                await session.commit()
    except Exception as e:
        import logging
        logging.warning(f"[smart-park] seed skip: {e}")

    # Worker de auto-escaneo de cámaras en segundo plano (server-side 24/7):
    # escanea sedes con camera_enabled+camera_url aunque nadie tenga la app abierta.
    try:
        from app.core.camera_worker import start_autoscan
        start_autoscan()
    except Exception as e:
        import logging
        logging.warning(f"[smart-park] auto-escaneo no iniciado: {e}")

    # Worker de auto-cancelación por tolerancia vencida (reservas scheduled)
    try:
        from app.core.reservation_worker import start_reservation_worker
        start_reservation_worker()
    except Exception as e:
        import logging
        logging.warning(f"[smart-park] reservation-worker no iniciado: {e}")

# Conectar todos los routers v1
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(parkings.router, prefix=settings.API_V1_STR)
app.include_router(reservations.router, prefix=settings.API_V1_STR)
app.include_router(anpr.router, prefix=settings.API_V1_STR)
app.include_router(vehicles.router, prefix=settings.API_V1_STR)
app.include_router(staff.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(reviews.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(payments.router, prefix=settings.API_V1_STR)
app.include_router(finances.router, prefix=settings.API_V1_STR)
from app.api.v1 import diagnostics as diagnostics_router
app.include_router(diagnostics_router.router, prefix=settings.API_V1_STR)
from app.api.v1 import audit as audit_router
app.include_router(audit_router.router, prefix=settings.API_V1_STR)
from app.api.v1 import affiliations as affiliations_router
app.include_router(affiliations_router.router, prefix=settings.API_V1_STR)
from app.api.v1 import platform as platform_router
app.include_router(platform_router.router, prefix=settings.API_V1_STR)
from app.api.v1 import settings as platform_settings_router
app.include_router(platform_settings_router.router, prefix=settings.API_V1_STR)

# Canal WebSocket en tiempo real (mismo origen, sin servicio extra)
@app.websocket("/api/v1/ws")
async def realtime_ws(ws: WebSocket):
    await realtime.connect(ws)
    try:
        while True:
            # Mantener la conexión viva; el cliente puede enviar ping
            await ws.receive_text()
            await ws.send_text('{"event":"pong"}')
    except WebSocketDisconnect:
        await realtime.disconnect(ws)
    except Exception:
        await realtime.disconnect(ws)

STATIC_DIR = os.getenv("STATIC_DIR", "")

@app.get("/health")
def healthcheck():
    return {"status": "ok", "service": "smart-park"}

@app.get("/")
def root():
    if STATIC_DIR and os.path.isdir(STATIC_DIR):
        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
    return {"message": "Bienvenido a la API RESTful de Smart Park", "status": "online", "docs": "/docs"}

# Servir frontend compilado (deploy unificado en Railway) con fallback SPA
if STATIC_DIR and os.path.isdir(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        file_path = os.path.normpath(os.path.join(STATIC_DIR, full_path))
        if file_path.startswith(STATIC_DIR) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

