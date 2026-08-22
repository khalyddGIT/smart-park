import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.db.session import engine, Base
from app.models.models import User, Parking, Slot, FloorPlanElement, Vehicle
from app.api.v1 import auth, parkings, reservations, anpr, vehicles, staff, users, reviews
from app.core.security import get_password_hash

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configuración CORS para Frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicialización de tablas y datos semilla - resiliente en Vercel Serverless (no tumbar lambda si DB no conecta)
@app.on_event("startup")
async def startup_db():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        import logging
        logging.warning(f"[smart-park] startup_db: no se pudo inicializar DB remota, continuando en modo degradado: {e}")
        return
    try:
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            from sqlalchemy.future import select
            res = await session.execute(select(Parking))
            if not res.scalars().first():
                p1 = Parking(
                    name="Smart Park Central San Isidro",
                    address="Av. Javier Prado Este 456",
                    city="San Isidro",
                    latitude=-12.089,
                    longitude=-77.032,
                    hourly_rate=8.50,
                    tolerance_minutes=15,
                    total_capacity=20,
                    image_url="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800"
                )
                p2 = Parking(
                    name="Smart Park Miraflores Kennedy",
                    address="Calle Shell 230",
                    city="Miraflores",
                    latitude=-12.121,
                    longitude=-77.029,
                    hourly_rate=10.00,
                    tolerance_minutes=10,
                    total_capacity=15,
                    image_url="https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800"
                )
                session.add_all([p1, p2])
                await session.commit()
                await session.refresh(p1)
                slots = [
                    Slot(parking_id=p1.id, code="A-01", slot_type="auto", status="free", pos_x=50, pos_y=50, width=60, height=100),
                    Slot(parking_id=p1.id, code="A-02", slot_type="auto", status="occupied", pos_x=130, pos_y=50, width=60, height=100),
                    Slot(parking_id=p1.id, code="A-03", slot_type="pmr", status="free", pos_x=210, pos_y=50, width=60, height=100),
                    Slot(parking_id=p1.id, code="A-04", slot_type="moto", status="free", pos_x=290, pos_y=50, width=50, height=60),
                ]
                elems = [
                    FloorPlanElement(parking_id=p1.id, element_type="crosswalk", pos_x=50, pos_y=180, width=300, height=60, z_index=2),
                    FloorPlanElement(parking_id=p1.id, element_type="wall", pos_x=20, pos_y=20, width=10, height=300, z_index=1),
                ]
                session.add_all(slots + elems)
                demo_user = User(
                    full_name="Usuario Conductor Demo",
                    email="usuario@smartpark.com",
                    phone="+51 987654321",
                    hashed_password=get_password_hash("password123"),
                    security_pin="1234",
                    role="user"
                )
                session.add(demo_user)
                await session.commit()
                await session.refresh(demo_user)
                v1 = Vehicle(user_id=demo_user.id, license_plate="ABC-123", vehicle_type="suv", brand="Toyota", model="RAV4", color="Gris")
                v2 = Vehicle(user_id=demo_user.id, license_plate="XYZ-987", vehicle_type="auto", brand="Honda", model="Civic", color="Negro")
                session.add_all([v1, v2])
                await session.commit()

            # Seed superadmin
            res_admin = await session.execute(select(User).where(User.email == "superadmin@smartpark.com"))
            if not res_admin.scalars().first():
                super_admin = User(
                    full_name="Super Administrador",
                    email="superadmin@smartpark.com",
                    phone="+51 999999999",
                    hashed_password=get_password_hash("SmartParkSuperAdmin2026!"),
                    security_pin="7391",
                    role="platform",
                    is_active=True
                )
                session.add(super_admin)
                await session.commit()

            # Seed adminlocal
            res_local = await session.execute(select(User).where(User.email == "adminlocal@smartpark.com"))
            if not res_local.scalars().first():
                local_admin = User(
                    full_name="Administrador Local",
                    email="adminlocal@smartpark.com",
                    phone="+51 988888888",
                    hashed_password=get_password_hash("SmartParkLocal2026!"),
                    security_pin="4826",
                    role="local",
                    is_active=True
                )
                session.add(local_admin)
                await session.commit()
    except Exception as e:
        import logging
        logging.warning(f"[smart-park] seed skip: {e}")

# Conectar todos los routers v1
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(parkings.router, prefix=settings.API_V1_STR)
app.include_router(reservations.router, prefix=settings.API_V1_STR)
app.include_router(anpr.router, prefix=settings.API_V1_STR)
app.include_router(vehicles.router, prefix=settings.API_V1_STR)
app.include_router(staff.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(reviews.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    if STATIC_DIR and os.path.isdir(STATIC_DIR):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
    return {"message": "Bienvenido a la API RESTful de Smart Park", "status": "online", "docs": "/docs"}

# Servir frontend compilado (deploy unificado en Railway) con fallback SPA
STATIC_DIR = os.getenv("STATIC_DIR", "")
if STATIC_DIR and os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        file_path = os.path.normpath(os.path.join(STATIC_DIR, full_path))
        if file_path.startswith(STATIC_DIR) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

