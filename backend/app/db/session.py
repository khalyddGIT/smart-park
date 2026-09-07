from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

Base = declarative_base()

# Solo PostgreSQL en local y producción (asyncpg). SQLite quedó eliminado
# como BD de la app: solo se permite en la suite de tests (TESTING=1),
# donde conftest.py apunta a una BD sqlite aislada y temporal.
DATABASE_URL = settings.ASYNC_DATABASE_URL
if DATABASE_URL.startswith("sqlite"):
    if not settings.TESTING:
        raise RuntimeError("[smart-park] SQLite deshabilitado fuera de tests: configura PostgreSQL (DATABASE_URL).")
    engine = create_async_engine(DATABASE_URL, echo=False)
else:
    # PostgreSQL en producción (Railway) o local
    is_pgbouncer = "pgbouncer=true" in DATABASE_URL or ":6543" in DATABASE_URL
    connect_args = {"statement_cache_size": 0, "prepared_statement_cache_size": 0} if is_pgbouncer else {}
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
