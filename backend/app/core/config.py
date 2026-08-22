import os
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

    # Culqi - secreto solo en servidor, nunca en el frontend
    CULQI_SECRET_KEY: str = os.getenv("CULQI_SECRET_KEY", "")

    # Conexión a Base de Datos (Soporta DATABASE_URL de Supabase / PostgreSQL o SQLite en /tmp para Vercel)
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
            # Vercel/Supabase: corregir puerto pooler 5432 -> 6543 para serverless
            # asyncpg no soporta query ?pgbouncer=true (TypeError: unexpected kwarg), solo puerto 6543 indica transaction mode
            if "pooler.supabase.com:5432" in url:
                url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543")
            # Eliminar ?pgbouncer=true si existe (asyncpg no lo acepta)
            if "pgbouncer=true" in url:
                url = url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "").replace("pgbouncer=true", "")
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url

        if self.USE_SQLITE:
            # En Vercel Serverless, solo /tmp tiene permisos de escritura
            if os.getenv("VERCEL") or os.path.exists("/tmp"):
                return "sqlite+aiosqlite:////tmp/smartpark_dev.db"
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
