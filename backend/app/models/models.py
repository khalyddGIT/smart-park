import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base

class RoleEnum(str, enum.Enum):
    USER = "user"
    LOCAL = "local"
    PLATFORM = "platform"

class VehicleTypeEnum(str, enum.Enum):
    AUTO = "auto"
    MOTO = "moto"
    SUV = "suv"
    TRUCK = "truck"
    BIKE = "bike"
    PMR = "pmr"

class SlotStatusEnum(str, enum.Enum):
    FREE = "free"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    DISABLED = "disabled"

class ReservationStatusEnum(str, enum.Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class User(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(30), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    security_pin = Column(String(255), nullable=True, default="1234")
    role = Column(String(20), default=RoleEnum.USER.value, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")
    reservations = relationship("Reservation", back_populates="user")

class Vehicle(Base):
    __tablename__ = "vehiculos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    license_plate = Column(String(20), index=True, nullable=False)
    vehicle_type = Column(String(20), default=VehicleTypeEnum.AUTO.value)
    brand = Column(String(50), nullable=True)
    model = Column(String(50), nullable=True)
    color = Column(String(30), nullable=True)

    owner = relationship("User", back_populates="vehicles")

class Parking(Base):
    __tablename__ = "estacionamientos"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(100), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    hourly_rate = Column(Float, nullable=False, default=8.50)
    tolerance_minutes = Column(Integer, default=15)
    status = Column(String(20), default="active")
    total_capacity = Column(Integer, default=30)
    image_url = Column(Text, nullable=True)
    # Campos visibles en el panel del conductor (antes solo vivían en localStorage del admin)
    description = Column(Text, nullable=True)
    phone = Column(String(30), nullable=True)
    email = Column(String(150), nullable=True)
    reference = Column(String(255), nullable=True)
    level = Column(String(100), nullable=True)
    camera_url = Column(Text, nullable=True)
    camera_enabled = Column(Boolean, default=False)
    # Calibración de la vista de cámara sobre el lienzo CAD: JSON {"x","y","w","h"} normalizado (0..1).
    camera_calibration = Column(Text, nullable=True)

    slots = relationship("Slot", back_populates="parking", cascade="all, delete-orphan")
    elements = relationship("FloorPlanElement", back_populates="parking", cascade="all, delete-orphan")
    cameras = relationship("CameraDevice", back_populates="parking", cascade="all, delete-orphan")

class CameraDevice(Base):
    """Dispositivo de cámara de una sede. Una sede puede tener varias cámaras
    (entrada, playón norte/sur, techo...), cada una con su URL, estado y
    calibración independiente para alinear su vista con el plano CAD."""
    __tablename__ = "cameras_dispositivos"

    id = Column(Integer, primary_key=True, index=True)
    parking_id = Column(Integer, ForeignKey("estacionamientos.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False, default="Cámara 1")
    url = Column(Text, nullable=False)
    enabled = Column(Boolean, default=True)
    calibration = Column(Text, nullable=True)  # JSON {"x","y","w","h"} normalizado
    created_at = Column(DateTime, default=datetime.utcnow)

    parking = relationship("Parking", back_populates="cameras")


class Slot(Base):
    __tablename__ = "plazas"

    id = Column(Integer, primary_key=True, index=True)
    parking_id = Column(Integer, ForeignKey("estacionamientos.id"), nullable=False)
    code = Column(String(20), nullable=False)
    floor_level = Column(String(20), default="Piso 1")
    slot_type = Column(String(20), default=VehicleTypeEnum.AUTO.value)
    status = Column(String(20), default=SlotStatusEnum.FREE.value)
    pos_x = Column(Integer, default=0)
    pos_y = Column(Integer, default=0)
    width = Column(Integer, default=60)
    height = Column(Integer, default=100)
    rotation = Column(Integer, default=0)

    parking = relationship("Parking", back_populates="slots")

class FloorPlanElement(Base):
    __tablename__ = "elementos_plano"

    id = Column(Integer, primary_key=True, index=True)
    parking_id = Column(Integer, ForeignKey("estacionamientos.id"), nullable=False)
    element_type = Column(String(30), nullable=False) # wall, crosswalk, text, gate
    pos_x = Column(Integer, nullable=False)
    pos_y = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    rotation = Column(Integer, default=0)
    z_index = Column(Integer, default=1)
    properties_json = Column(Text, nullable=True)

    parking = relationship("Parking", back_populates="elements")

class Reservation(Base):
    __tablename__ = "reservas"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    parking_id = Column(Integer, ForeignKey("estacionamientos.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("plazas.id"), nullable=False)
    license_plate = Column(String(20), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    actual_entry = Column(DateTime, nullable=True)
    actual_exit = Column(DateTime, nullable=True)
    total_cost = Column(Float, nullable=False)
    status = Column(String(20), default=ReservationStatusEnum.SCHEDULED.value)
    qr_code = Column(String(255), nullable=False)

    user = relationship("User", back_populates="reservations")

class Staff(Base):
    __tablename__ = "personal"

    id = Column(Integer, primary_key=True, index=True)
    parking_id = Column(Integer, ForeignKey("estacionamientos.id"), nullable=False)
    full_name = Column(String(150), nullable=False)
    dni = Column(String(20), nullable=False, unique=True, index=True)
    position = Column(String(50), nullable=False)
    shift = Column(String(30), default="Mañana")
    status = Column(String(20), default="active")
    email = Column(String(150), nullable=True, unique=True, index=True)
    security_pin = Column(String(255), nullable=True, default="1234")
    created_at = Column(DateTime, default=datetime.utcnow)

class Review(Base):
    __tablename__ = "resenas"

    id = Column(Integer, primary_key=True, index=True)
    parking_id = Column(Integer, ForeignKey("estacionamientos.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    user_name = Column(String(150), nullable=False)
    rating = Column(Integer, nullable=False, default=5) # 1 a 5 estrellas
    comment = Column(Text, nullable=False)
    response = Column(Text, nullable=True) # Respuesta del administrador local
    created_at = Column(DateTime, default=datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidencias"

    id = Column(Integer, primary_key=True, index=True)
    parking_id = Column(Integer, ForeignKey("estacionamientos.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    user_name = Column(String(150), nullable=False)
    category = Column(String(50), default="general")
    description = Column(Text, nullable=False)
    photo_url = Column(Text, nullable=True)
    status = Column(String(20), default="reported")
    resolution_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

# Alias en español para los modelos de datos
Usuario = User
Vehiculo = Vehicle
Estacionamiento = Parking
Plaza = Slot
ElementoPlano = FloorPlanElement
Reserva = Reservation
Personal = Staff
Resena = Review
Incidente = Incident
Incidente = Incident
CamaraDispositivo = CameraDevice




class Payment(Base):
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    reservation_id = Column(Integer, ForeignKey("reservas.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(10), default="PEN")
    status = Column(String(20), default="succeeded")
    method = Column(String(30), default="card")
    culqi_charge_id = Column(String(100), nullable=True)
    description = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AffiliationRequest(Base):
    __tablename__ = "solicitudes_afiliacion"

    id = Column(Integer, primary_key=True, index=True)
    parking_name = Column(String(150), nullable=False)
    owner_name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    capacity = Column(Integer, nullable=True)
    rate = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)


class PlatformSettings(Base):
    __tablename__ = "configuracion_plataforma"

    id = Column(Integer, primary_key=True)
    data = Column(Text, nullable=False)  # JSON string


Pago = Payment
SolicitudAfiliacion = AffiliationRequest
ConfigPlataforma = PlatformSettings
