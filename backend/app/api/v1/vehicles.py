import os
import uuid
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Vehicle
from app.schemas.schemas import VehicleCreate, VehicleUpdate, VehicleResponse
from app.core.security import get_current_user
from app.models.models import User

router = APIRouter(prefix="/vehicles", tags=["Vehículos & Matrículas ANPR"])

@router.get("/lookup-image")
async def lookup_vehicle_image(
    brand: str,
    model: str,
    year: Optional[str] = "2023",
    vehicle_type: Optional[str] = "auto"
):
    """
    Consulta confiable de imagen oficial de vehículo sin problemas de CORS ni HTTPS mixed-content.
    """
    search_term = urllib.parse.quote(f"{brand} {model} {year or ''}".strip())
    api_url = f"https://www.carimagery.com/api.asmx/GetImageUrl?searchTerm={search_term}"

    try:
        req = urllib.request.Request(
            api_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        with urllib.request.urlopen(req, timeout=4) as response:
            xml_data = response.read().decode("utf-8", errors="ignore")
            root = ET.fromstring(xml_data)
            url = root.text
            if url and url.startswith("http") and "error" not in url.lower():
                # Forzar HTTPS si viene como http://www.regcheck.org.uk para evitar bloqueo de contenido mixto
                if url.startswith("http://"):
                    url = "https://" + url[7:]
                return {"image_url": url, "source": "carimagery"}
    except Exception:
        pass

    vt = (vehicle_type or "auto").lower()
    fallbacks = {
        "suv": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
        "camioneta": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
        "moto": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80",
        "mototaxi": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80",
        "truck": "https://images.unsplash.com/photo-1586191582056-a6c382f6e975?auto=format&fit=crop&w=800&q=80",
        "auto": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80"
    }
    return {"image_url": fallbacks.get(vt, fallbacks["auto"]), "source": "fallback"}

@router.post("/upload-image")
async def upload_vehicle_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Sube una foto de vehículo tomada por cámara o subida desde archivo.
    Guarda en el servidor y retorna la URL pública.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo seleccionado debe ser una imagen")
    
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="La imagen no debe superar los 10MB")
    
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
        ext = "jpg"
    
    filename = f"veh_{uuid.uuid4().hex[:12]}.{ext}"
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "vehicles"))
    os.makedirs(uploads_dir, exist_ok=True)
    file_path = os.path.join(uploads_dir, filename)
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    return {"image_url": f"/uploads/vehicles/{filename}"}

@router.get("", response_model=List[VehicleResponse])
async def list_vehicles(
    plate: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Platform ve todos los vehículos (auditoría global); resto solo los propios
    if current_user.role == "platform":
        stmt = select(Vehicle)
    else:
        stmt = select(Vehicle).where(Vehicle.user_id == current_user.id)
    if plate:
        stmt = stmt.where(Vehicle.license_plate.ilike(f"%{plate}%"))
    
    result = await db.execute(stmt)
    vehicles = result.scalars().all()
    return [VehicleResponse.model_validate(v) for v in vehicles]

@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(vehicle_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalars().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    if vehicle.user_id != current_user.id and current_user.role != "platform":
        raise HTTPException(status_code=403, detail="No autorizado para este vehículo")
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
        color=vehicle_in.color,
        year=vehicle_in.year or "2023",
        notes=vehicle_in.notes or "",
        image_url=vehicle_in.image_url
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
