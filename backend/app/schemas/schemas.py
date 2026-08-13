from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Schemas de Usuario
class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: Optional[str] = "user"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class PinVerify(BaseModel):
    pin: str

# Schemas de Vehículos
class VehicleCreate(BaseModel):
    license_plate: str
    vehicle_type: str = "auto"
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None

class VehicleResponse(VehicleCreate):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# Schemas de Estacionamientos y Cajones
class SlotBase(BaseModel):
    code: str
    floor_level: Optional[str] = "Piso 1"
    slot_type: Optional[str] = "auto"
    status: Optional[str] = "free"
    pos_x: int = 0
    pos_y: int = 0
    width: int = 60
    height: int = 100
    rotation: int = 0

class SlotResponse(SlotBase):
    id: int
    parking_id: int
    class Config:
        from_attributes = True

class FloorPlanElementBase(BaseModel):
    element_type: str
    pos_x: int
    pos_y: int
    width: int
    height: int
    rotation: int = 0
    z_index: int = 1
    properties_json: Optional[str] = None

class FloorPlanElementResponse(FloorPlanElementBase):
    id: int
    parking_id: int
    class Config:
        from_attributes = True

class ParkingResponse(BaseModel):
    id: int
    name: str
    address: str
    city: str
    latitude: float
    longitude: float
    hourly_rate: float
    tolerance_minutes: int
    status: str
    total_capacity: int
    available_slots: Optional[int] = 0
    image_url: Optional[str] = None
    class Config:
        from_attributes = True

# Schemas de Reservas
class ReservationCreate(BaseModel):
    parking_id: int
    slot_id: int
    license_plate: str
    start_time: datetime
    end_time: datetime

class ReservationResponse(BaseModel):
    id: int
    code: str
    user_id: int
    parking_id: int
    slot_id: int
    license_plate: str
    start_time: datetime
    end_time: datetime
    total_cost: float
    status: str
    qr_code: str
    class Config:
        from_attributes = True

class ANPRScanRequest(BaseModel):
    parking_id: int
    license_plate: str
    gate_type: str = "entry" # entry o exit
