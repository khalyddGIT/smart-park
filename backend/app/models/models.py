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
    __tablename__ = "users"

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
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    license_plate = Column(String(20), index=True, nullable=False)
    vehicle_type = Column(String(20), default=VehicleTypeEnum.AUTO.value)
    brand = Column(String(50), nullable=True)
    model = Column(String(50), nullable=True)
    color = Column(String(30), nullable=True)

    owner = relationship("User", back_populates="vehicles")

class Parking(Base):
    __tablename__ = "parkings"

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
    image_url = Column(String(255), nullable=True)

    slots = relationship("Slot", back_populates="parking", cascade="all, delete-orphan")
    elements = relationship("FloorPlanElement", back_populates="parking", cascade="all, delete-orphan")

class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)
    parking_id = Column(Integer, ForeignKey("parkings.id"), nullable=False)
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
    __tablename__ = "floor_plan_elements"

    id = Column(Integer, primary_key=True, index=True)
    parking_id = Column(Integer, ForeignKey("parkings.id"), nullable=False)
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
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parking_id = Column(Integer, ForeignKey("parkings.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=False)
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
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    parking_id = Column(Integer, ForeignKey("parkings.id"), nullable=False)
    full_name = Column(String(150), nullable=False)
    dni = Column(String(20), nullable=False)
    position = Column(String(50), nullable=False)
    shift = Column(String(30), default="Mañana")
    status = Column(String(20), default="active")
