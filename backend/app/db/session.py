from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

Base = declarative_base()

# SQLite fallback por conveniencia en desarrollo si PostgreSQL no está levantado localmente
DATABASE_URL = settings.ASYNC_DATABASE_URL
if "sqlite" in DATABASE_URL:
    engine = create_async_engine(DATABASE_URL, echo=False)
else:
    # Supabase pooler 6543 pgbouncer transaction mode no soporta prepared statements
    # asyncpg requiere statement_cache_size=0 (ver error DuplicatePreparedStatementError)
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
