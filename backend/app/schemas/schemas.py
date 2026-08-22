from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# ==========================================
# 1. SCHEMAS DE USUARIOS & ROLES
# ==========================================
class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: Optional[str] = "user"

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserRoleUpdate(BaseModel):
    role: str

class UserPinUpdate(BaseModel):
    pin: str

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

# ==========================================
# 2. SCHEMAS DE VEHÍCULOS
# ==========================================
class VehicleBase(BaseModel):
    license_plate: str
    vehicle_type: str = "auto"
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None

class VehicleCreate(VehicleBase):
    user_id: Optional[int] = 1

class VehicleUpdate(BaseModel):
    license_plate: Optional[str] = None
    vehicle_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None

class VehicleResponse(VehicleBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# ==========================================
# 3. SCHEMAS DE ESTACIONAMIENTOS
# ==========================================
class ParkingBase(BaseModel):
    name: str
    address: str
    city: str
    latitude: float = -12.089
    longitude: float = -77.032
    hourly_rate: float = 8.50
    tolerance_minutes: int = 15
    status: Optional[str] = "active"
    total_capacity: int = 30
    image_url: Optional[str] = None

class ParkingCreate(ParkingBase):
    pass

class ParkingUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    hourly_rate: Optional[float] = None
    tolerance_minutes: Optional[int] = None
    status: Optional[str] = None
    total_capacity: Optional[int] = None
    image_url: Optional[str] = None

class ParkingResponse(ParkingBase):
    id: int
    available_slots: Optional[int] = 0
    class Config:
        from_attributes = True

# ==========================================
# 4. SCHEMAS DE CAJONES (SLOTS) & PLANO CAD
# ==========================================
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

class SlotCreate(SlotBase):
    parking_id: int

class SlotUpdate(BaseModel):
    code: Optional[str] = None
    floor_level: Optional[str] = None
    slot_type: Optional[str] = None
    status: Optional[str] = None
    pos_x: Optional[int] = None
    pos_y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    rotation: Optional[int] = None

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

class FloorPlanElementCreate(FloorPlanElementBase):
    parking_id: int

class FloorPlanElementResponse(FloorPlanElementBase):
    id: int
    parking_id: int
    class Config:
        from_attributes = True

class FloorPlanSyncRequest(BaseModel):
    parking_id: int
    slots: List[SlotBase]
    elements: List[FloorPlanElementBase]

# ==========================================
# 5. SCHEMAS DE PERSONAL / STAFF
# ==========================================
class StaffBase(BaseModel):
    full_name: str
    dni: str
    position: str
    shift: Optional[str] = "Mañana"
    status: Optional[str] = "active"
    email: Optional[str] = None
    security_pin: Optional[str] = "1234"

class StaffCreate(StaffBase):
    parking_id: int
    password: Optional[str] = None

class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    dni: Optional[str] = None
    position: Optional[str] = None
    shift: Optional[str] = None
    status: Optional[str] = None
    email: Optional[str] = None
    security_pin: Optional[str] = None

class StaffResponse(BaseModel):
    # Sin security_pin: el PIN nunca debe salir de la API (se almacena hasheado)
    full_name: str
    dni: str
    position: str
    shift: Optional[str] = "Mañana"
    status: Optional[str] = "active"
    email: Optional[str] = None
    id: int
    parking_id: int
    created_at: datetime
    class Config:
        from_attributes = True

# ==========================================
# 6. SCHEMAS DE RESERVAS
# ==========================================
class ReservationCreate(BaseModel):
    parking_id: int
    slot_id: int
    license_plate: str
    start_time: datetime
    end_time: datetime

class ReservationUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None
    actual_entry: Optional[datetime] = None
    actual_exit: Optional[datetime] = None

class ReservationResponse(BaseModel):
    id: int
    code: str
    user_id: int
    parking_id: int
    slot_id: int
    license_plate: str
    start_time: datetime
    end_time: datetime
    actual_entry: Optional[datetime] = None
    actual_exit: Optional[datetime] = None
    total_cost: float
    status: str
    qr_code: str
    class Config:
        from_attributes = True

# ==========================================
# 7. SCHEMAS DE RESEÑAS & CALIFICACIONES
# ==========================================
class ReviewCreate(BaseModel):
    parking_id: int
    rating: int = 5
    comment: str

class ReviewReply(BaseModel):
    response: str

class ReviewResponse(BaseModel):
    id: int
    parking_id: int
    user_id: int
    user_name: str
    rating: int
    comment: str
    response: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# ==========================================
# 8. SCHEMAS DE INCIDENCIAS & ASISTENCIA
# ==========================================
class IncidentCreate(BaseModel):
    parking_id: int
    category: str = "general"
    description: str = Field(min_length=5)
    photo_url: Optional[str] = None

class IncidentResolve(BaseModel):
    resolution_note: str

class IncidentResponse(BaseModel):
    id: int
    parking_id: int
    user_id: int
    user_name: str
    category: str
    description: str
    photo_url: Optional[str] = None
    status: str
    resolution_note: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ==========================================
# 9. SCHEMAS DE ANPR
# ==========================================
class ANPRScanRequest(BaseModel):
    parking_id: int
    license_plate: str
    gate_type: str = "entry" # entry o exit
