import os
from dotenv import load_dotenv
load_dotenv()
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Park API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Entorno: "development" (default local) | "production" (Railway). En producción
    # SECRET_KEY y DATABASE_URL son obligatorias: la app no arranca sin ellas.
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 horas

    # Culqi - secreto solo en servidor, nunca en el frontend (sin default en repo)
    CULQI_SECRET_KEY: str = os.getenv("CULQI_SECRET_KEY", "")

    # PayPal Sandbox / Live - secretos solo en servidor (sin defaults hardcodeados)
    PAYPAL_CLIENT_ID: str = os.getenv("PAYPAL_CLIENT_ID", "")
    PAYPAL_CLIENT_SECRET: str = os.getenv("PAYPAL_CLIENT_SECRET", "")
    PAYPAL_MODE: str = os.getenv("PAYPAL_MODE", "sandbox") # "sandbox" | "live"
    PAYPAL_EXCHANGE_RATE_PEN_TO_USD: float = float(os.getenv("PAYPAL_EXCHANGE_RATE_PEN_TO_USD", "0.27"))

    @property
    def PAYPAL_API_BASE_URL(self) -> str:
        return "https://api-m.paypal.com" if self.PAYPAL_MODE == "live" else "https://api-m.sandbox.paypal.com"

    # Redis opcional: cache de lecturas calientes + Pub/Sub para WebSocket multi-réplica.
    # Sin REDIS_URL el sistema funciona igual que hoy (degradación elegante, fail-open).
    REDIS_URL: str = os.getenv("REDIS_URL", "")

    # Auto-escaneo server-side del monitor de cámaras: el backend escanea las
    # sedes con camera_enabled + camera_url aunque nadie tenga la app abierta.
    CAMERA_AUTOSCAN_ENABLED: bool = os.getenv("CAMERA_AUTOSCAN_ENABLED", "True") == "True"
    CAMERA_AUTOSCAN_INTERVAL: int = int(os.getenv("CAMERA_AUTOSCAN_INTERVAL", "15"))

    # Auto-cancelación de reservas por tolerancia vencida
    RESERVATION_WORKER_ENABLED: bool = os.getenv("RESERVATION_WORKER_ENABLED", "True") == "True"
    RESERVATION_TOLERANCE_CHECK_INTERVAL: int = int(os.getenv("RESERVATION_TOLERANCE_CHECK_INTERVAL", "60"))

    # Conexión a Base de Datos (DATABASE_URL en Railway / PostgreSQL estándar o SQLite local)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    USE_SQLITE: bool = os.getenv("USE_SQLITE", "True" if not os.getenv("DATABASE_URL") else "False") == "True"
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "smartpark_db")
    
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL.strip()
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url

        if self.USE_SQLITE:
            return "sqlite+aiosqlite:///./smartpark_dev.db"
        
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def SYNC_DATABASE_URL(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgresql+asyncpg://"):
                url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
            return url
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()

# Fail-fast: en producción es mejor no arrancar que arrancar inseguro o con datos efímeros
if settings.ENVIRONMENT == "production":
    if not settings.SECRET_KEY:
        raise RuntimeError("[smart-park] SECRET_KEY es obligatoria en producción (variable de entorno)")
    if not settings.DATABASE_URL:
        raise RuntimeError("[smart-park] DATABASE_URL es obligatoria en producción (no se permite fallback a SQLite)")
