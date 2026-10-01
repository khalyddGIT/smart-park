import logging
import os
import hmac
import uuid
import traceback
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from jose import jwt, JWTError
from sqlalchemy import text
from sqlalchemy.future import select
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.db.session import engine, AsyncSessionLocal
from app.models.models import User
from app.api.v1 import auth, parkings, reservations, anpr, vehicles, staff, users, reviews, incidents, payments, finances
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

        # Las credenciales por cookie se adjuntan automáticamente por el navegador;
        # por eso toda mutación autenticada debe presentar el token double-submit.
        csrf_exempt = {
            "/api/v1/auth/login",
            "/api/v1/auth/login-pin",
            "/api/v1/auth/register",
            "/api/v1/auth/google",
            "/api/v1/auth/refresh",
        }
        cookie_authenticated = bool(request.cookies.get("access_token"))
        browser_request = bool(request.headers.get("origin") or request.headers.get("referer"))
        if (
            path.startswith("/api/")
            and request.method.upper() in {"POST", "PUT", "PATCH", "DELETE"}
            and path not in csrf_exempt
            and cookie_authenticated
            and (is_prod or browser_request)
        ):
            csrf_cookie = request.cookies.get("csrf_token", "")
            csrf_header = request.headers.get("x-csrf-token", "")
            if not csrf_cookie or not csrf_header or not hmac.compare_digest(csrf_cookie, csrf_header):
                return JSONResponse(status_code=403, content={"detail": "Validación CSRF requerida"})

        # Rate limit global defensivo por IP en API (Opciones 1 y 3 combinadas)
        if path.startswith("/api/"):
            from app.core.cache import rate_limit_hit
            is_testing = (os.getenv("TESTING") == "1")
            global_limit = 10000 if is_testing else int(os.getenv("GLOBAL_RATE_LIMIT", "1500"))

            # Opción 3: Lecturas GET de navegación (mapa, cocheras) usan límite amplio (1500 req/min)
            # Escrituras (POST/PUT/DELETE) mantienen control específico (300 req/min)
            is_write = request.method.upper() in {"POST", "PUT", "PATCH", "DELETE"}
            active_limit = (global_limit if is_testing else min(global_limit, int(os.getenv("WRITE_RATE_LIMIT", "300")))) if is_write else global_limit
            key_suffix = "write" if is_write else "read"

            allowed, count = await rate_limit_hit(f"ratelimit:global:{key_suffix}:{client_ip}", limit=active_limit, window=60)
            if not allowed:
                security_logger.warning(
                    f"[SECURITY_ALERT] [RATE_LIMIT_EXCEEDED] IP={client_ip} Method={request.method} "
                    f"Path={path} Count={count} Limit={active_limit}"
                )
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Demasiadas peticiones desde tu dirección IP. Espera un momento antes de continuar."},
                )

        response = await call_next(request)
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        response.headers["X-Request-ID"] = request_id

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
        if is_prod:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' blob: https://checkout.culqi.com https://www.paypal.com https://*.paypalobjects.com https://*.paypal.com https://accounts.google.com; "
            "worker-src 'self' blob:; "
            "child-src 'self' blob:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https://api.culqi.com https://*.paypal.com https://*.paypalobjects.com https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://tile.openstreetmap.org https://server.arcgisonline.com wss: ws: https:; "
            "frame-src 'self' https://checkout.culqi.com https://*.paypal.com https://accounts.google.com; "
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

allowed_hosts = ["localhost", "127.0.0.1", "testserver"]
allowed_hosts.extend(
    host.strip() for host in os.getenv("ALLOWED_HOSTS", "").split(",") if host.strip()
)
if railway_public_domain:
    allowed_hosts.append(railway_public_domain)
railway_private_domain = os.getenv("RAILWAY_PRIVATE_DOMAIN")
if railway_private_domain:
    allowed_hosts.append(railway_private_domain)
# Host reservado que Railway usa en los probes internos de salud.
allowed_hosts.extend(["healthcheck.railway.app", "*.railway.internal"])
allowed_hosts.append("smart-park-web-production.up.railway.app")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(dict.fromkeys(allowed_hosts)))

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Las migraciones se ejecutan con Alembic antes de iniciar Uvicorn. El runtime
# sólo comprueba conectividad: nunca modifica el esquema ni crea/borra datos.
@app.on_event("startup")
async def startup_db():
    # Listener Redis Pub/Sub para fan-out de eventos WS entre réplicas (no-op sin REDIS_URL)
    from app.core.cache import _ensure_listener
    _ensure_listener()
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        import logging
        # Fail-fast: la BD es crítica. Arrancar "degradado" sin Postgres era
        # lo que dejaba la app vacía y parecía pérdida de datos.
        logging.error(f"[smart-park] startup_db: PostgreSQL no disponible, abortando arranque: {e}")
        raise RuntimeError(f"[smart-park] No se pudo conectar a PostgreSQL: {e}")
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
    origin = ws.headers.get("origin", "")
    if origin not in CORS_ORIGINS:
        await ws.close(code=1008, reason="Origen no permitido")
        return

    token = ws.cookies.get("access_token", "")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub", ""))
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
            if not result.scalars().first():
                raise ValueError("Usuario inactivo")
    except (JWTError, TypeError, ValueError):
        await ws.close(code=1008, reason="Autenticación requerida")
        return

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

@app.get("/health/live")
def liveness():
    return {"status": "ok", "service": "smart-park"}


@app.get("/health/ready")
async def readiness():
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable", "database": "error"})
    return {
        "status": "ready",
        "service": "smart-park",
        "environment": settings.ENVIRONMENT,
        "version": settings.VERSION,
        "commit": os.getenv("RAILWAY_GIT_COMMIT_SHA", "local")[:12],
    }


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
