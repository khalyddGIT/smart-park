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
            # Migración ligera PostgreSQL: columnas añadidas tras el primer despliegue.
            # (Se eliminó la rama SQLite: la app solo usa PostgreSQL en local y prod.)
            from sqlalchemy import text as _text
            lite_adds = [
                ("estacionamientos", "description", "TEXT"),
                ("estacionamientos", "phone", "VARCHAR(30)"),
                ("estacionamientos", "email", "VARCHAR(150)"),
                ("estacionamientos", "reference", "VARCHAR(255)"),
                ("estacionamientos", "level", "VARCHAR(100)"),
                ("estacionamientos", "camera_url", "TEXT"),
                ("estacionamientos", "owner", "VARCHAR(150)"),
                ("estacionamientos", "ruc", "VARCHAR(20)"),
                ("estacionamientos", "whatsapp", "VARCHAR(30)"),
                ("estacionamientos", "schedule", "VARCHAR(120)"),
                ("estacionamientos", "socials", "TEXT"),
                ("estacionamientos", "maps_url", "TEXT"),
                ("estacionamientos", "camera_enabled", "BOOLEAN DEFAULT FALSE"),
                ("estacionamientos", "camera_calibration", "TEXT"),
                ("estacionamientos", "rate_auto", "FLOAT DEFAULT 5.0"),
                ("estacionamientos", "rate_suv", "FLOAT DEFAULT 7.0"),
                ("estacionamientos", "rate_mototaxi", "FLOAT DEFAULT 3.5"),
                ("estacionamientos", "rate_moto", "FLOAT DEFAULT 2.5"),
                ("estacionamientos", "billing_unit", "VARCHAR(20) DEFAULT 'hour'"),
                ("estacionamientos", "rate_minute_auto", "FLOAT DEFAULT 0.08"),
                ("estacionamientos", "rate_minute_suv", "FLOAT DEFAULT 0.12"),
                ("estacionamientos", "rate_minute_mototaxi", "FLOAT DEFAULT 0.06"),
                ("estacionamientos", "rate_minute_moto", "FLOAT DEFAULT 0.04"),
                ("estacionamientos", "night_shift_enabled", "BOOLEAN DEFAULT FALSE"),
                ("estacionamientos", "night_shift_start", "VARCHAR(10) DEFAULT '20:00'"),
                ("estacionamientos", "night_shift_end", "VARCHAR(10) DEFAULT '06:00'"),
                ("estacionamientos", "night_shift_surcharge", "FLOAT DEFAULT 0.0"),
                ("estacionamientos", "require_reservation_prepay", "BOOLEAN DEFAULT FALSE"),
                ("estacionamientos", "reservation_fee", "FLOAT DEFAULT 0.0"),
                ("estacionamientos", "min_stay_hours", "INTEGER DEFAULT 1"),
                ("estacionamientos", "max_stay_hours", "INTEGER DEFAULT 24"),
                ("estacionamientos", "min_stay_minutes", "INTEGER DEFAULT 15"),
                ("estacionamientos", "max_stay_minutes", "INTEGER DEFAULT 1440"),
                ("estacionamientos", "allow_open_stay", "BOOLEAN DEFAULT TRUE"),
                ("usuarios", "avatar_url", "TEXT"),
                ("vehiculos", "image_url", "TEXT"),
                ("vehiculos", "year", "VARCHAR(10) DEFAULT '2023'"),
                ("vehiculos", "notes", "TEXT"),
                ("reservas", "tolerance_minutes", "INTEGER DEFAULT 15"),
                ("reservas", "vehicle_type", "VARCHAR(20) DEFAULT 'auto'"),
                ("reservas", "estimated_hours", "INTEGER DEFAULT 1"),
                ("reservas", "estimated_minutes", "INTEGER DEFAULT 60"),
                ("reservas", "billing_unit", "VARCHAR(20) DEFAULT 'hour'"),
                ("reservas", "is_night_shift", "BOOLEAN DEFAULT FALSE"),
                ("reservas", "prepaid", "BOOLEAN DEFAULT FALSE"),
                ("reservas", "is_open_stay", "BOOLEAN DEFAULT FALSE"),
            ]
            if str(engine.url).startswith("sqlite") and settings.TESTING:
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
        # Fail-fast: la BD es crítica. Arrancar "degradado" sin Postgres era
        # lo que dejaba la app vacía y parecía pérdida de datos.
        logging.error(f"[smart-park] startup_db: PostgreSQL no disponible, abortando arranque: {e}")
        raise RuntimeError(f"[smart-park] No se pudo conectar a PostgreSQL: {e}")
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
                    image_url="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800",
                    owner="Inversiones Plaza Mayor Huamanga",
                    ruc="20608945123",
                    phone="+51 966 123 456",
                    whatsapp="51966123456",
                    email="contacto@plazamayorpark.pe",
                    schedule="Lunes a Domingo: 24 Horas (Abierto 24/7)",
                    reference="Frente a la Catedral de Huamanga",
                    level="Nivel 1 - Superficie",
                    description="Estacionamiento céntrico con garita inteligente ANPR y acceso asfaltado a pocos metros de la Plaza Mayor de Huamanga.",
                    maps_url="https://maps.google.com/?q=-13.1604,-74.2259",
                    rate_auto=5.00,
                    rate_suv=7.00,
                    rate_mototaxi=3.50,
                    rate_moto=2.50
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
                    image_url="https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800",
                    owner="Cocheras Coloniales Ayacucho",
                    ruc="20609874123",
                    phone="+51 966 456 789",
                    whatsapp="51966456789",
                    email="bellido@smartpark.pe",
                    schedule="Lunes a Sábado: 06:00 - 23:00",
                    reference="A 2 cuadras de la Plaza Mayor",
                    level="Playa Abierta",
                    description="Cochera colonial céntrica y segura con cámaras de vigilancia.",
                    maps_url="https://maps.google.com/?q=-13.1631,-74.2236",
                    rate_auto=4.50,
                    rate_suv=6.50,
                    rate_mototaxi=3.00,
                    rate_moto=2.00
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
                    image_url="https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800",
                    owner="Consorcio Comercial Cáceres",
                    ruc="20607788991",
                    phone="+51 966 789 012",
                    whatsapp="51966789012",
                    email="mercado@smartpark.pe",
                    schedule="Lunes a Domingo: 05:00 - 22:00",
                    reference="Frente al pabellón comercial",
                    level="Nivel 1 - Superficie",
                    description="Amplio estacionamiento techado para autos, camionetas y mototaxis junto al mercado.",
                    maps_url="https://maps.google.com/?q=-13.1565,-74.2215",
                    rate_auto=3.50,
                    rate_suv=5.00,
                    rate_mototaxi=2.50,
                    rate_moto=1.50
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

    # Worker de respaldos automáticos diarios (PostgreSQL / volumen persistente /data/backups)
    try:
        from app.core.backup_worker import start_backup_worker
        start_backup_worker()
    except Exception as e:
        import logging
        logging.warning(f"[smart-park] backup-worker no iniciado: {e}")

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
from app.api.v1 import backups as backups_router
app.include_router(backups_router.router, prefix=settings.API_V1_STR)

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

# Archivos subidos: en Railway el filesystem es efímero, así que UPLOADS_DIR
# debe apuntar al Volume persistente (/data/uploads). En local/docker usa
# backend/uploads. Se configura por variable de entorno.
UPLOADS_DIR = os.getenv(
    "UPLOADS_DIR",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads")),
)
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

STATIC_DIR = os.getenv("STATIC_DIR", "")

def _safe_db_label() -> str:
    try:
        from app.db.session import engine as _engine
        url = str(_engine.url)
        if url.startswith("sqlite"):
            return "sqlite (solo tests)"
        host = _engine.url.host or "local"
        db = _engine.url.database or ""
        return f"postgresql://{host}/{db}"
    except Exception:
        return "unknown"

@app.get("/health")
def healthcheck():
    from app.services.backup_service import BACKUPS_DIR
    return {
        "status": "ok",
        "service": "smart-park",
        "environment": settings.ENVIRONMENT,
        "db": _safe_db_label(),
        "uploads_dir": UPLOADS_DIR,
        "backups_dir": BACKUPS_DIR,
    }

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

