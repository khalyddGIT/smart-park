from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
from app.models.models import User, Parking, Slot, FloorPlanElement, Vehicle
from app.api.v1 import auth, parkings, reservations, anpr
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

# Inicialización de tablas y datos semilla
@app.on_event("startup")
async def startup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Sembrar datos iniciales si no existen
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        from sqlalchemy.future import select
        res = await session.execute(select(Parking))
        if not res.scalars().first():
            # Crear Parqueos Semilla
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

            # Sembrar Cajones para San Isidro
            slots = [
                Slot(parking_id=p1.id, code="A-01", slot_type="auto", status="free", pos_x=50, pos_y=50, width=60, height=100),
                Slot(parking_id=p1.id, code="A-02", slot_type="auto", status="occupied", pos_x=130, pos_y=50, width=60, height=100),
                Slot(parking_id=p1.id, code="A-03", slot_type="pmr", status="free", pos_x=210, pos_y=50, width=60, height=100),
                Slot(parking_id=p1.id, code="A-04", slot_type="moto", status="free", pos_x=290, pos_y=50, width=50, height=60),
            ]
            
            # Sembrar Pasos Peatonales y Paredes
            elems = [
                FloorPlanElement(parking_id=p1.id, element_type="crosswalk", pos_x=50, pos_y=180, width=300, height=60, z_index=2),
                FloorPlanElement(parking_id=p1.id, element_type="wall", pos_x=20, pos_y=20, width=10, height=300, z_index=1),
            ]

            session.add_all(slots + elems)
            
            # Crear usuario demo
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

# Conectar routers v1
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(parkings.router, prefix=settings.API_V1_STR)
app.include_router(reservations.router, prefix=settings.API_V1_STR)
app.include_router(anpr.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Bienvenido a la API RESTful de Smart Park", "status": "online", "docs": "/docs"}
