from pydantic import BaseModel, EmailStr, Field, field_validator, field_serializer
from typing import Optional, List, Any
from datetime import datetime, timezone
import re

# Validadores peruanos (placas de autos/motos estrictamente con guión '-', alfanuméricas)
DNI_RE = re.compile(r'^[0-9]{8}$')
PHONE_RE = re.compile(r'^(\+51\s?)?9[0-9]{8}$')
PLATE_RE = re.compile(r'^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}$', re.IGNORECASE)

def _clean_phone(v: str) -> str:
    if v is None: return v
    v = v.strip().replace(' ', '').replace('-', '')
    if v.startswith('+51'): v = v[3:]
    if v.startswith('51'): v = v[2:] if len(v)==11 and v.startswith('51') else v
    return v

def validate_license_plate_format(v: Any) -> str:
    if not v or not isinstance(v, str):
        raise ValueError("La placa es obligatoria.")
    v_clean = v.strip().upper().replace(' ', '')
    if '-' not in v_clean:
        raise ValueError("La placa debe incluir obligatoriamente un guión (-), ej: ABC-123 o 1234-5A.")
    if not PLATE_RE.match(v_clean):
        raise ValueError("Formato de placa inválido. Debe contener entre 2 y 4 caracteres alfanuméricos, un guión (-) y entre 2 y 4 caracteres alfanuméricos (ej: ABC-123 o 1234-5A).")
    return v_clean

# ==========================================
# 1. SCHEMAS DE USUARIOS & ROLES
# ==========================================
class UserBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = "user"

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v is None or v == '': return v
        return _clean_phone(v)

class UserCreate(UserBase):
    password: str = Field(min_length=8)

    @field_validator('phone')
    @classmethod
    def validate_phone_create(cls, v):
        if v is None or v == '': return v
        raw = _clean_phone(v)
        if not re.match(r'^[0-9]{7,15}$', raw):
            raise ValueError('Teléfono Perú: 9 dígitos empezando en 9, ej 966123456 o +51 966123456')
class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    avatar_url: Optional[str] = None
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
    year: Optional[str] = "2023"
    notes: Optional[str] = None
    image_url: Optional[str] = None

    @field_validator('license_plate')
    @classmethod
    def validate_plate(cls, v):
        return validate_license_plate_format(v)

    @field_validator('vehicle_type')
    @classmethod
    def validate_vehicle_type(cls, v):
        if v is not None:
            v_clean = v.strip().lower()
            valid_types = {'auto', 'car', 'moto', 'motorcycle', 'suv', 'camioneta', 'truck', 'camion', 'van', 'bicicleta', 'bike', 'mototaxi', 'otro'}
            if v_clean not in valid_types:
                raise ValueError(f"Tipo de vehículo inválido: {v}. Tipos permitidos: {', '.join(sorted(valid_types))}")
            return v_clean
        return v

class VehicleCreate(VehicleBase):
    user_id: Optional[int] = 1

class VehicleUpdate(BaseModel):
    license_plate: Optional[str] = None
    vehicle_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    year: Optional[str] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None

    @field_validator('license_plate')
    @classmethod
    def validate_plate(cls, v):
        if v is None or v == '':
            return v
        return validate_license_plate_format(v)

    @field_validator('vehicle_type')
    @classmethod
    def validate_vehicle_type(cls, v):
        if v is not None and v != '':
            v_clean = v.strip().lower()
            valid_types = {'auto', 'car', 'moto', 'motorcycle', 'suv', 'camioneta', 'truck', 'camion', 'van', 'bicicleta', 'bike', 'mototaxi', 'otro'}
            if v_clean not in valid_types:
                raise ValueError(f"Tipo de vehículo inválido: {v}. Tipos permitidos: {', '.join(sorted(valid_types))}")
            return v_clean
        return v

class VehicleResponse(VehicleBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

    # Lectura tolerante: registros legacy en BD con placas inválidas (sin guion)
    # no deben tumbar TODO el listado GET /vehicles con 500. Se devuelven tal cual;
    # la validación estricta sigue activa en Create/Update para no permitir nuevas.
    @field_validator('license_plate', mode='before')
    @classmethod
    def validate_plate_read(cls, v):
        try:
            return validate_license_plate_format(v)
        except ValueError:
            return v.strip().upper() if isinstance(v, str) else v

# ==========================================
# 3. SCHEMAS DE ESTACIONAMIENTOS
# ==========================================
class ParkingBase(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    address: str = Field(min_length=2, max_length=255)
    city: str = Field(min_length=2, max_length=100)
    latitude: float = -12.089
    longitude: float = -77.032
    hourly_rate: float = Field(default=8.50, gt=0)
    tolerance_minutes: int = Field(default=15, ge=5, le=120)
    status: Optional[str] = "active"
    total_capacity: int = Field(default=30, gt=0)
    image_url: Optional[str] = None
    owner: Optional[str] = None
    ruc: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    schedule: Optional[str] = None
    reference: Optional[str] = None
    level: Optional[str] = None
    maps_url: Optional[str] = None
    socials: Optional[str] = None
    camera_url: Optional[str] = None
    camera_enabled: Optional[bool] = False
    camera_calibration: Optional[str] = None

    # Tarifas diferenciadas por tipo de vehículo (configurables por Admin Local)
    rate_auto: Optional[float] = Field(default=5.00, ge=0)
    rate_suv: Optional[float] = Field(default=7.00, ge=0)
    rate_mototaxi: Optional[float] = Field(default=3.50, ge=0)
    rate_moto: Optional[float] = Field(default=2.50, ge=0)

    # Unidad de facturación: 'hour' o 'minute'
    billing_unit: Optional[str] = "hour"
    rate_minute_auto: Optional[float] = Field(default=0.08, ge=0)
    rate_minute_suv: Optional[float] = Field(default=0.12, ge=0)
    rate_minute_mototaxi: Optional[float] = Field(default=0.06, ge=0)
    rate_minute_moto: Optional[float] = Field(default=0.04, ge=0)
    min_stay_minutes: Optional[int] = Field(default=15, ge=1, le=1440)
    max_stay_minutes: Optional[int] = Field(default=1440, ge=1, le=10080)

    # Configuración de Turno Noche (horario y recargo nocturno)
    night_shift_enabled: Optional[bool] = False
    night_shift_start: Optional[str] = "20:00"
    night_shift_end: Optional[str] = "06:00"
    night_shift_surcharge: Optional[float] = Field(default=0.0, ge=0)

    # Políticas de cobro de reserva y estadía estimada
    require_reservation_prepay: Optional[bool] = False
    reservation_fee: Optional[float] = Field(default=0.0, ge=0)
    min_stay_hours: Optional[int] = Field(default=1, ge=1, le=24)
    max_stay_hours: Optional[int] = Field(default=24, ge=1, le=168)
    allow_open_stay: Optional[bool] = True


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
    owner: Optional[str] = None
    ruc: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    schedule: Optional[str] = None
    reference: Optional[str] = None
    level: Optional[str] = None
    maps_url: Optional[str] = None
    socials: Optional[str] = None
    camera_url: Optional[str] = None
    camera_enabled: Optional[bool] = None
    camera_calibration: Optional[str] = None
    rate_auto: Optional[float] = None
    rate_suv: Optional[float] = None
    rate_mototaxi: Optional[float] = None
    rate_moto: Optional[float] = None
    billing_unit: Optional[str] = None
    rate_minute_auto: Optional[float] = None
    rate_minute_suv: Optional[float] = None
    rate_minute_mototaxi: Optional[float] = None
    rate_minute_moto: Optional[float] = None
    min_stay_minutes: Optional[int] = None
    max_stay_minutes: Optional[int] = None
    night_shift_enabled: Optional[bool] = None
    night_shift_start: Optional[str] = None
    night_shift_end: Optional[str] = None
    night_shift_surcharge: Optional[float] = None
    require_reservation_prepay: Optional[bool] = None
    reservation_fee: Optional[float] = None
    min_stay_hours: Optional[int] = None
    max_stay_hours: Optional[int] = None
    allow_open_stay: Optional[bool] = None

class ParkingResponse(ParkingBase):
    id: int
    available_slots: Optional[int] = 0
    class Config:
        from_attributes = True

# ==========================================
# 3b. DISPOSITIVOS DE CÁMARA POR SEDE (multi-cámara)
# ==========================================
class CameraDeviceBase(BaseModel):
    name: Optional[str] = None
    url: str
    enabled: Optional[bool] = True
    calibration: Optional[str] = None


class CameraDeviceCreate(CameraDeviceBase):
    pass


class CameraDeviceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    enabled: Optional[bool] = None
    calibration: Optional[Any] = None  # string JSON o dict {"x","y","w","h"}


class CameraDeviceResponse(CameraDeviceBase):
    id: int
    parking_id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ==========================================
# 4. SCHEMAS DE CAJONES (SLOTS) & PLANO CAD
# ==========================================
class SlotBase(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    floor_level: Optional[str] = "Piso 1"
    slot_type: Optional[str] = "auto"
    status: Optional[str] = "free"
    pos_x: int = 0
    pos_y: int = 0
    width: int = 60
    height: int = 100
    rotation: int = 0

class SlotCreate(SlotBase):
    parking_id: int = Field(gt=0)

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
    parking_id: int = Field(gt=0)

class FloorPlanElementResponse(FloorPlanElementBase):
    id: int
    parking_id: int
    class Config:
        from_attributes = True

class FloorPlanSyncRequest(BaseModel):
    parking_id: Optional[int] = None
    slots: List[SlotBase]
    elements: List[FloorPlanElementBase]

# ==========================================
# 5. SCHEMAS DE PERSONAL / STAFF
# ==========================================
class StaffBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    dni: str
    position: str = Field(min_length=2, max_length=50)
    shift: Optional[str] = "Mañana"
    status: Optional[str] = "active"
    email: Optional[str] = None
    security_pin: Optional[str] = "1234"
    system_role: Optional[str] = "local"

    @field_validator('dni')
    @classmethod
    def validate_dni(cls, v):
        import logging
        logging.getLogger("uvicorn.error").info(f"VALIDATE_DNI called with {v!r}")
        if not DNI_RE.match(v.strip()):
            raise ValueError('DNI Perú: 8 dígitos numéricos, ej 44556677')
        return v.strip()

    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('El nombre completo debe tener al menos 2 caracteres.')
        return v.strip()

class StaffCreate(StaffBase):
    parking_id: int = Field(gt=0)
    password: Optional[str] = None

class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    dni: Optional[str] = None
    position: Optional[str] = None
    shift: Optional[str] = None
    status: Optional[str] = None
    email: Optional[str] = None
    security_pin: Optional[str] = None
    password: Optional[str] = None
    system_role: Optional[str] = None

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
    has_account: Optional[bool] = False
    system_role: Optional[str] = "local"
    class Config:
        from_attributes = True

# ==========================================
# 6. SCHEMAS DE RESERVAS
# ==========================================
class ReservationCreate(BaseModel):
    parking_id: int = Field(gt=0, description="ID del estacionamiento debe ser mayor a 0")
    slot_id: int = Field(gt=0, description="ID del cajón debe ser mayor a 0")
    license_plate: str
    start_time: datetime
    end_time: datetime
    payment_method: Optional[str] = None
    pay_now: Optional[bool] = False
    tolerance_minutes: Optional[int] = Field(default=15, ge=5, le=120, description="Tolerancia entre 5 y 120 minutos")
    vehicle_type: Optional[str] = "auto"
    estimated_hours: Optional[int] = Field(default=1, ge=1, le=168)
    billing_unit: Optional[str] = "hour"
    estimated_minutes: Optional[int] = Field(default=60, ge=1, le=10080)
    is_open_stay: Optional[bool] = False

    @field_validator('license_plate')
    @classmethod
    def validate_plate(cls, v):
        return validate_license_plate_format(v)

    @field_validator('end_time')
    @classmethod
    def validate_end_time(cls, v, info):
        start_time = info.data.get('start_time')
        if start_time and v <= start_time:
            raise ValueError("La fecha y hora de fin debe ser posterior a la fecha y hora de inicio.")
        return v

class ReservationUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None
    actual_entry: Optional[datetime] = None
    actual_exit: Optional[datetime] = None

    @field_validator('end_time')
    @classmethod
    def validate_end_time(cls, v, info):
        start_time = info.data.get('start_time')
        if start_time and v and v <= start_time:
            raise ValueError("La fecha y hora de fin debe ser posterior a la fecha y hora de inicio.")
        return v

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
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    parking_name: Optional[str] = None
    slot_code: Optional[str] = None
    tolerance_minutes: Optional[int] = 15
    vehicle_type: Optional[str] = "auto"
    estimated_hours: Optional[int] = 1
    billing_unit: Optional[str] = "hour"
    estimated_minutes: Optional[int] = 60
    is_night_shift: Optional[bool] = False
    prepaid: Optional[bool] = False
    is_open_stay: Optional[bool] = False
    payment_method: Optional[str] = "efectivo"
    amount_paid: Optional[float] = 0.0

    class Config:
        from_attributes = True

    @field_serializer("start_time", "end_time", "actual_entry", "actual_exit", when_used="always")
    def serialize_utc_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

class ReservationCheckOut(BaseModel):
    payment_method: Optional[str] = "efectivo"
    amount_paid: Optional[float] = None

# ==========================================
# 7. SCHEMAS DE RESEÑAS & CALIFICACIONES
# ==========================================
class ReviewCreate(BaseModel):
    parking_id: int = Field(gt=0)
    rating: int = Field(default=5, ge=1, le=5)
    comment: str = Field(min_length=3, max_length=1000)

class ReviewReply(BaseModel):
    response: str = Field(min_length=2, max_length=1000)

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
    parking_id: int = Field(gt=0)
    category: str = Field(default="general", min_length=2, max_length=50)
    description: str = Field(min_length=5, max_length=2000)
    photo_url: Optional[str] = None

class IncidentResolve(BaseModel):
    resolution_note: str = Field(min_length=3, max_length=1000)

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
    parking_id: int = Field(gt=0)
    license_plate: str
    gate_type: str = "entry" # entry o exit

    @field_validator('license_plate')
    @classmethod
    def validate_plate(cls, v):
        return validate_license_plate_format(v)

    @field_validator('gate_type')
    @classmethod
    def validate_gate_type(cls, v):
        if v not in ('entry', 'exit'):
            raise ValueError("gate_type debe ser 'entry' o 'exit'")
        return v
