import logging
import os
import traceback
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.db.session import engine, Base
from app.models.models import User, Parking, Slot, FloorPlanElement, Vehicle, Incident
from app.api.v1 import auth, parkings, reservations, anpr, vehicles, staff, users, reviews, incidents, payments, finances
from app.core.security import get_password_hash, hash_pin
from app.core.realtime import realtime

security_logger = logging.getLogger("smartpark.security")
is_prod = (settings.ENVIRONMENT == "production")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=None if is_prod else f"{settings.API_V1_STR}/openapi.json",
    docs_url=None if is_prod else "/docs",
    redoc_url=None if is_prod else "/redoc",
)

# Exception handler para validación de inputs (Pilar 5: validación estricta y logs)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    from fastapi.encoders import jsonable_encoder
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "unknown")
    security_logger.warning(f"[VALIDATION_ERROR] {request.method} {request.url.path} from IP={client_ip}: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())},
    )


# Exception handler global para errores no controlados (Pilar 8: sin información interna en producción)
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "unknown")
    security_logger.error(f"[UNHANDLED_EXCEPTION] {request.method} {request.url.path} IP={client_ip}: {exc}\n{traceback.format_exc()}")
    if is_prod:
        return JSONResponse(
            status_code=500,
            content={"detail": "Ha ocurrido un error interno en el servidor. Por favor intenta de nuevo más tarde."},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": exc.__class__.__name__},
    )

# Middleware de seguridad y blindaje perimetral (Pilares 1, 7 y 10)
class SecurityHardeningMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "unknown")
        path = request.url.path

        # Rate limit global defensivo por IP en API (Pilar 1)
        if path.startswith("/api/"):
            from app.core.cache import rate_limit_hit
            is_testing = (os.getenv("TESTING") == "1")
            global_limit = 10000 if is_testing else 180
            allowed, count = await rate_limit_hit(f"ratelimit:global:{client_ip}", limit=global_limit, window=60)
            if not allowed:
                security_logger.warning(f"[SECURITY_ALERT] [RATE_LIMIT_EXCEEDED] IP={client_ip} Path={path} Count={count}")
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Demasiadas peticiones desde tu dirección IP. Espera un momento antes de continuar."},
                )

        response = await call_next(request)

        # Registro de alertas de seguridad (401, 403, 429) para detección temprana de ataques (Pilar 10)
        if response.status_code in (401, 403, 429):
            user_agent = request.headers.get("user-agent", "unknown")
            security_logger.warning(
                f"[SECURITY_ALERT] Status={response.status_code} Method={request.method} "
                f"Path={path} IP={client_ip} UserAgent={user_agent[:120]}"
            )

        # Cabeceras de seguridad HTTP Enterprise (HSTS, CSP, no-sniff, clickjacking)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.culqi.com https://www.paypal.com https://*.paypalobjects.com https://*.paypal.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https://api.culqi.com https://*.paypal.com https://*.paypalobjects.com wss: ws: https:; "
            "frame-src 'self' https://checkout.culqi.com https://*.paypal.com; "
            "manifest-src 'self'; "
            "object-src 'none'; "
            "base-uri 'self';"
        )

        return response

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SecurityHardeningMiddleware)

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

railway_public_domain = os.getenv("RAILWAY_PUBLIC_DOMAIN")
if railway_public_domain and f"https://{railway_public_domain}" not in CORS_ORIGINS:
    CORS_ORIGINS.append(f"https://{railway_public_domain}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.up\.railway\.app",
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
            # Migración ligera PostgreSQL nativa (columnas dinámicas)
            from sqlalchemy import text as _text
            pg_adds = [
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
                ("estacionamientos", "rate_monthly_auto", "FLOAT DEFAULT 180.0"),
                ("estacionamientos", "rate_monthly_suv", "FLOAT DEFAULT 240.0"),
                ("estacionamientos", "rate_monthly_mototaxi", "FLOAT DEFAULT 120.0"),
                ("estacionamientos", "rate_monthly_moto", "FLOAT DEFAULT 90.0"),
                ("estacionamientos", "rate_monthly", "FLOAT DEFAULT 180.0"),
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
                ("vehiculos", "soat_expiry", "VARCHAR(20)"),
                ("vehiculos", "notes", "TEXT"),
                ("reservas", "tolerance_minutes", "INTEGER DEFAULT 15"),
                ("reservas", "vehicle_type", "VARCHAR(20) DEFAULT 'auto'"),
                ("reservas", "estimated_hours", "INTEGER DEFAULT 1"),
                ("reservas", "estimated_minutes", "INTEGER DEFAULT 60"),
                ("reservas", "billing_unit", "VARCHAR(20) DEFAULT 'hour'"),
                ("reservas", "is_night_shift", "BOOLEAN DEFAULT FALSE"),
                ("reservas", "prepaid", "BOOLEAN DEFAULT FALSE"),
                ("reservas", "is_open_stay", "BOOLEAN DEFAULT FALSE"),
                ("reservas", "payment_method", "VARCHAR(50) DEFAULT 'efectivo'"),
                ("reservas", "amount_paid", "FLOAT DEFAULT 0.0"),
                ("reservas", "reservation_type", "VARCHAR(30) DEFAULT 'standard'"),
                ("reservas", "subscription_months", "INTEGER DEFAULT 1"),
                ("reservas", "is_subscription", "BOOLEAN DEFAULT FALSE"),
                ("resenas", "is_hidden", "BOOLEAN DEFAULT FALSE"),
                ("incidencias", "is_hidden", "BOOLEAN DEFAULT FALSE"),
            ]
            for tbl, col, decl in pg_adds:
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
            # Purga preventiva definitiva de sedes demo iniciales residuales ('Plaza Mayor', 'Bellido Colonial', 'Mercado Mariscal')
            # para garantizar que únicamente existan las sedes reales registradas por los usuarios.
            from sqlalchemy import text
            await session.execute(text("""
                DELETE FROM pagos WHERE reservation_id IN (SELECT id FROM reservas WHERE parking_id IN (SELECT id FROM estacionamientos WHERE name ILIKE '%Plaza Mayor%' OR name ILIKE '%Bellido Colonial%' OR name ILIKE '%Mercado Mariscal%' OR email IN ('contacto@plazamayorpark.pe', 'bellido@smartpark.pe', 'mercado@smartpark.pe')));
                DELETE FROM reservas WHERE parking_id IN (SELECT id FROM estacionamientos WHERE name ILIKE '%Plaza Mayor%' OR name ILIKE '%Bellido Colonial%' OR name ILIKE '%Mercado Mariscal%' OR email IN ('contacto@plazamayorpark.pe', 'bellido@smartpark.pe', 'mercado@smartpark.pe'));
                DELETE FROM personal WHERE parking_id IN (SELECT id FROM estacionamientos WHERE name ILIKE '%Plaza Mayor%' OR name ILIKE '%Bellido Colonial%' OR name ILIKE '%Mercado Mariscal%' OR email IN ('contacto@plazamayorpark.pe', 'bellido@smartpark.pe', 'mercado@smartpark.pe'));
                DELETE FROM incidencias WHERE parking_id IN (SELECT id FROM estacionamientos WHERE name ILIKE '%Plaza Mayor%' OR name ILIKE '%Bellido Colonial%' OR name ILIKE '%Mercado Mariscal%' OR email IN ('contacto@plazamayorpark.pe', 'bellido@smartpark.pe', 'mercado@smartpark.pe'));
                DELETE FROM resenas WHERE parking_id IN (SELECT id FROM estacionamientos WHERE name ILIKE '%Plaza Mayor%' OR name ILIKE '%Bellido Colonial%' OR name ILIKE '%Mercado Mariscal%' OR email IN ('contacto@plazamayorpark.pe', 'bellido@smartpark.pe', 'mercado@smartpark.pe'));
                DELETE FROM cameras_dispositivos WHERE parking_id IN (SELECT id FROM estacionamientos WHERE name ILIKE '%Plaza Mayor%' OR name ILIKE '%Bellido Colonial%' OR name ILIKE '%Mercado Mariscal%' OR email IN ('contacto@plazamayorpark.pe', 'bellido@smartpark.pe', 'mercado@smartpark.pe'));
                DELETE FROM elementos_plano WHERE parking_id IN (SELECT id FROM estacionamientos WHERE name ILIKE '%Plaza Mayor%' OR name ILIKE '%Bellido Colonial%' OR name ILIKE '%Mercado Mariscal%' OR email IN ('contacto@plazamayorpark.pe', 'bellido@smartpark.pe', 'mercado@smartpark.pe'));
                DELETE FROM plazas WHERE parking_id IN (SELECT id FROM estacionamientos WHERE name ILIKE '%Plaza Mayor%' OR name ILIKE '%Bellido Colonial%' OR name ILIKE '%Mercado Mariscal%' OR email IN ('contacto@plazamayorpark.pe', 'bellido@smartpark.pe', 'mercado@smartpark.pe'));
                DELETE FROM estacionamientos WHERE name ILIKE '%Plaza Mayor%' OR name ILIKE '%Bellido Colonial%' OR name ILIKE '%Mercado Mariscal%' OR email IN ('contacto@plazamayorpark.pe', 'bellido@smartpark.pe', 'mercado@smartpark.pe');
            """))
            await session.commit()

            try:
                from app.core.cache import cache_delete
                await cache_delete("parkings:all")
            except Exception:
                pass

            from app.models.models import Staff
            system_accounts = [
                {
                    "email": "superadmin@smartpark.com",
                    "full_name": "Super Administrador",
                    "password": os.getenv("SUPERADMIN_PASSWORD") or "SmartParkSuperAdmin2026!",
                    "pin": os.getenv("SUPERADMIN_PIN") or "7391",
                    "role": "platform",
                    "phone": "+51 999999999",
                    "force_update_password": bool(os.getenv("SUPERADMIN_PASSWORD"))
                },
                {
                    "email": "adminlocal@smartpark.com",
                    "full_name": "Administrador Local",
                    "password": os.getenv("ADMINLOCAL_PASSWORD") or "SmartParkLocal2026!",
                    "pin": os.getenv("ADMINLOCAL_PIN") or "4826",
                    "role": "local",
                    "phone": "+51 988888888",
                    "force_update_password": bool(os.getenv("ADMINLOCAL_PASSWORD"))
                },
                {
                    "email": "usuario@smartpark.com",
                    "full_name": "Usuario Conductor Demo",
                    "password": os.getenv("DEMO_USER_PASSWORD") or "password123",
                    "pin": os.getenv("DEMO_USER_PIN") or "1234",
                    "role": "user",
                    "phone": "+51 987654321",
                    "force_update_password": bool(os.getenv("DEMO_USER_PASSWORD"))
                },
                {
                    "email": "operador.garita@smartpark.pe",
                    "full_name": "Operador de Garita",
                    "password": os.getenv("OPERATOR_PASSWORD") or "Operador2026!",
                    "pin": os.getenv("OPERATOR_PIN") or "2580",
                    "role": "local",
                    "phone": "+51 977777777",
                    "force_update_password": bool(os.getenv("OPERATOR_PASSWORD"))
                }
            ]

            for acc in system_accounts:
                res_u = await session.execute(select(User).where(User.email == acc["email"]))
                existing_u = res_u.scalars().first()
                if existing_u:
                    existing_u.full_name = acc["full_name"]
                    existing_u.role = acc["role"]
                    existing_u.is_active = True
                    if acc.get("force_update_password"):
                        existing_u.hashed_password = get_password_hash(acc["password"])
                        existing_u.security_pin = hash_pin(acc["pin"])
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
                        security_pin=hash_pin(os.getenv("OPERATOR_PIN") or "2580")
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
        host = _engine.url.host or "local"
        db = _engine.url.database or ""
        return f"postgresql://{host}/{db}"
    except Exception:
        return "unknown"

@app.get("/health")
def healthcheck():
    if is_prod:
        return {
            "status": "ok",
            "service": "smart-park",
            "environment": settings.ENVIRONMENT,
        }
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
    return {
        "message": "Bienvenido a la API RESTful de Smart Park",
        "status": "online",
        "docs": None if is_prod else "/docs",
    }

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

