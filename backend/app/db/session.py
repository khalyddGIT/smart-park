from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings

Base = declarative_base()

# Solo PostgreSQL (asyncpg). SQLite fue eliminado al 100% de todo el sistema.
DATABASE_URL = settings.ASYNC_DATABASE_URL
if not (DATABASE_URL.startswith("postgresql") or DATABASE_URL.startswith("postgres")):
    raise RuntimeError("[smart-park] Motor no válido. Smart Park opera única y exclusivamente sobre PostgreSQL (DATABASE_URL).")

is_pgbouncer = "pgbouncer=true" in DATABASE_URL or ":6543" in DATABASE_URL
connect_args = {"statement_cache_size": 0, "prepared_statement_cache_size": 0} if is_pgbouncer else {}

if settings.TESTING:
    # En la suite de tests sobre PostgreSQL usamos NullPool para aislar cada ciclo de test
    engine = create_async_engine(DATABASE_URL, echo=False, future=True, poolclass=NullPool, connect_args=connect_args)
else:
    # PostgreSQL en producción (Railway) o local
    engine = create_async_engine(DATABASE_URL, echo=False, future=True, connect_args=connect_args, pool_pre_ping=True)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
