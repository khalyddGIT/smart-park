from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Vehicle
from app.schemas.schemas import VehicleCreate, VehicleUpdate, VehicleResponse
from app.core.security import get_current_user
from app.models.models import User

router = APIRouter(prefix="/vehicles", tags=["Vehículos & Matrículas ANPR"])

@router.get("", response_model=List[VehicleResponse])
async def list_vehicles(
    plate: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Solo vehículos del usuario autenticado - aislamiento por usuario
    stmt = select(Vehicle).where(Vehicle.user_id == current_user.id)
    if plate:
        stmt = stmt.where(Vehicle.license_plate.ilike(f"%{plate}%"))
    
    result = await db.execute(stmt)
    vehicles = result.scalars().all()
    return [VehicleResponse.model_validate(v) for v in vehicles]

@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(vehicle_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalars().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return VehicleResponse.model_validate(vehicle)

@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(vehicle_in: VehicleCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Normalizar placa
    plate = vehicle_in.license_plate.strip().upper()
    
    # Verificar duplicidad de placa global (placa única en sistema)
    res = await db.execute(select(Vehicle).where(Vehicle.license_plate == plate))
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Esta placa ya se encuentra registrada")
    
    db_vehicle = Vehicle(
        user_id=current_user.id,
        license_plate=plate,
        vehicle_type=vehicle_in.vehicle_type,
        brand=vehicle_in.brand,
        model=vehicle_in.model,
        color=vehicle_in.color
    )
    db.add(db_vehicle)
    await db.commit()
    await db.refresh(db_vehicle)
    return VehicleResponse.model_validate(db_vehicle)

@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(vehicle_id: int, vehicle_in: VehicleUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalars().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    if vehicle.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado para este vehículo")
    
    update_data = vehicle_in.model_dump(exclude_unset=True)
    if "license_plate" in update_data and update_data["license_plate"]:
        update_data["license_plate"] = update_data["license_plate"].strip().upper()
        
    for key, value in update_data.items():
        setattr(vehicle, key, value)
    
    await db.commit()
    await db.refresh(vehicle)
    return VehicleResponse.model_validate(vehicle)

@router.delete("/{vehicle_id}", status_code=status.HTTP_200_OK)
async def delete_vehicle(vehicle_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalars().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    if vehicle.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado para este vehículo")
    
    await db.delete(vehicle)
    await db.commit()
    return {"status": "success", "message": f"Vehículo con ID {vehicle_id} eliminado exitosamente"}
