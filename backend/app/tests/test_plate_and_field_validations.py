import pytest
from datetime import datetime, timedelta, timezone
from pydantic import ValidationError

from app.schemas.schemas import (
    validate_license_plate_format,
    ReservationCreate,
    ReservationUpdate,
    VehicleCreate,
    VehicleBase,
    VehicleUpdate,
    ANPRScanRequest,
    StaffCreate,
    StaffBase,
    ParkingBase,
    ReviewCreate,
    IncidentCreate,
)


# ==============================================================================
# 1. PRUEBAS DE LA FUNCIÓN PURA: validate_license_plate_format
# ==============================================================================

def test_validate_license_plate_valid():
    """Placas válidas de autos y motos con guión deben ser aceptadas y normalizadas a mayúsculas."""
    assert validate_license_plate_format("ABC-123") == "ABC-123"
    assert validate_license_plate_format("abc-123") == "ABC-123"
    assert validate_license_plate_format("a1b-234") == "A1B-234"
    assert validate_license_plate_format("1234-5A") == "1234-5A"
    assert validate_license_plate_format("AB-1234") == "AB-1234"
    assert validate_license_plate_format("1234-AB") == "1234-AB"
    assert validate_license_plate_format("  ABC-123  ") == "ABC-123"
    assert validate_license_plate_format("ABC - 123") == "ABC-123"


def test_validate_license_plate_missing_hyphen():
    """Placas sin guión DEBEN ser estrictamente rechazadas."""
    invalid_no_hyphen = [
        "ABC123",
        "abc123",
        "123456",
        "AB1234",
        "XYZ999",
        "A1B234",
    ]
    for plate in invalid_no_hyphen:
        with pytest.raises(ValueError, match="obligatoriamente un guión"):
            validate_license_plate_format(plate)


def test_validate_license_plate_invalid_format():
    """Placas con caracteres o longitudes inválidas deben ser rechazadas."""
    invalid_formats = [
        "",
        "   ",
        "-",
        "---",
        "A-1",           # Demasiado corto (mínimo 2 caracteres antes y después)
        "ABCDE-12345",   # Demasiado largo (máximo 4 caracteres antes y después)
        "AB!-123",       # Carácter especial inválido
        "ABC-12#",       # Carácter especial inválido
        None,
        123456,
    ]
    for plate in invalid_formats:
        with pytest.raises(ValueError):
            validate_license_plate_format(plate)


# ==============================================================================
# 2. PRUEBAS DE ReservationCreate
# ==============================================================================

def test_reservation_create_valid():
    """Una reserva con placa con guión y campos correctos debe instanciarse exitosamente."""
    now = datetime.now(timezone.utc)
    res = ReservationCreate(
        parking_id=1,
        slot_id=5,
        license_plate="ABC-123",
        start_time=now,
        end_time=now + timedelta(hours=2),
        tolerance_minutes=20,
    )
    assert res.license_plate == "ABC-123"
    assert res.tolerance_minutes == 20
    assert res.parking_id == 1
    assert res.slot_id == 5


def test_reservation_create_rejects_plate_without_hyphen():
    """ReservationCreate debe rechazar placas sin guión."""
    now = datetime.now(timezone.utc)
    with pytest.raises(ValidationError) as exc_info:
        ReservationCreate(
            parking_id=1,
            slot_id=5,
            license_plate="ABC123",
            start_time=now,
            end_time=now + timedelta(hours=1),
        )
    assert "guión" in str(exc_info.value)


def test_reservation_create_tolerance_boundaries():
    """tolerance_minutes debe estar entre 5 y 120 minutos."""
    now = datetime.now(timezone.utc)
    
    # Menor a 5 minutos -> Rechazado
    with pytest.raises(ValidationError):
        ReservationCreate(
            parking_id=1,
            slot_id=1,
            license_plate="ABC-123",
            start_time=now,
            end_time=now + timedelta(hours=1),
            tolerance_minutes=4,
        )

    # Mayor a 120 minutos -> Rechazado
    with pytest.raises(ValidationError):
        ReservationCreate(
            parking_id=1,
            slot_id=1,
            license_plate="ABC-123",
            start_time=now,
            end_time=now + timedelta(hours=1),
            tolerance_minutes=121,
        )

    # Válido: 5 minutos
    r_min = ReservationCreate(
        parking_id=1,
        slot_id=1,
        license_plate="ABC-123",
        start_time=now,
        end_time=now + timedelta(hours=1),
        tolerance_minutes=5,
    )
    assert r_min.tolerance_minutes == 5

    # Válido: 120 minutos
    r_max = ReservationCreate(
        parking_id=1,
        slot_id=1,
        license_plate="ABC-123",
        start_time=now,
        end_time=now + timedelta(hours=1),
        tolerance_minutes=120,
    )
    assert r_max.tolerance_minutes == 120


def test_reservation_create_ids_greater_than_zero():
    """parking_id y slot_id deben ser > 0."""
    now = datetime.now(timezone.utc)
    with pytest.raises(ValidationError):
        ReservationCreate(
            parking_id=0,
            slot_id=1,
            license_plate="ABC-123",
            start_time=now,
            end_time=now + timedelta(hours=1),
        )

    with pytest.raises(ValidationError):
        ReservationCreate(
            parking_id=1,
            slot_id=-5,
            license_plate="ABC-123",
            start_time=now,
            end_time=now + timedelta(hours=1),
        )


def test_reservation_create_end_time_must_be_after_start_time():
    """end_time no puede ser menor o igual a start_time."""
    now = datetime.now(timezone.utc)
    with pytest.raises(ValidationError) as exc_info:
        ReservationCreate(
            parking_id=1,
            slot_id=1,
            license_plate="ABC-123",
            start_time=now,
            end_time=now - timedelta(minutes=10),
        )
    assert "posterior" in str(exc_info.value)


# ==============================================================================
# 3. PRUEBAS DE VEHÍCULOS (VehicleBase, VehicleCreate, VehicleUpdate)
# ==============================================================================

def test_vehicle_create_valid():
    """Creación de vehículo con placa con guión y tipo válido."""
    v = VehicleCreate(
        license_plate="xyz-789",
        vehicle_type="auto",
        brand="Toyota",
        model="Yaris",
    )
    assert v.license_plate == "XYZ-789"
    assert v.vehicle_type == "auto"


def test_vehicle_create_rejects_plate_without_hyphen():
    """VehicleCreate debe rechazar placas sin guión."""
    with pytest.raises(ValidationError) as exc_info:
        VehicleCreate(
            license_plate="XYZ789",
            vehicle_type="auto",
        )
    assert "guión" in str(exc_info.value)


def test_vehicle_create_invalid_vehicle_type():
    """VehicleCreate debe rechazar tipos de vehículo no reconocidos."""
    with pytest.raises(ValidationError):
        VehicleCreate(
            license_plate="XYZ-789",
            vehicle_type="cohete_espacial",
        )


def test_vehicle_update_valid_and_invalid():
    """VehicleUpdate valida la placa solo si se envía."""
    # Válido con nueva placa con guión
    vu = VehicleUpdate(license_plate="abc-999")
    assert vu.license_plate == "ABC-999"

    # Inválido si la placa no tiene guión
    with pytest.raises(ValidationError):
        VehicleUpdate(license_plate="ABC999")


# ==============================================================================
# 4. PRUEBAS DE ANPRScanRequest
# ==============================================================================

def test_anpr_scan_valid():
    """Escaneo ANPR con placa con guión y compuerta válida."""
    scan = ANPRScanRequest(parking_id=1, license_plate="per-101", gate_type="entry")
    assert scan.license_plate == "PER-101"
    assert scan.gate_type == "entry"


def test_anpr_scan_rejects_plate_without_hyphen():
    """ANPRScanRequest debe rechazar placas sin guión."""
    with pytest.raises(ValidationError):
        ANPRScanRequest(parking_id=1, license_plate="PER101", gate_type="entry")


def test_anpr_scan_invalid_gate_type():
    """ANPRScanRequest debe rechazar tipos de compuerta distintos a entry o exit."""
    with pytest.raises(ValidationError):
        ANPRScanRequest(parking_id=1, license_plate="PER-101", gate_type="ventana")


# ==============================================================================
# 5. PRUEBAS DE StaffBase & StaffCreate (DNI & Nombres)
# ==============================================================================

def test_staff_create_valid():
    """Personal con DNI de 8 dígitos y nombre completo válido."""
    s = StaffCreate(
        full_name="Carlos Operador",
        dni="76543210",
        position="Operador Garita",
        parking_id=1,
    )
    assert s.dni == "76543210"
    assert s.full_name == "Carlos Operador"


def test_staff_create_invalid_dni():
    """StaffCreate debe rechazar DNIs que no tengan exactamente 8 dígitos numéricos."""
    with pytest.raises(ValidationError):
        StaffCreate(full_name="Juan Perez", dni="12345", position="Operador", parking_id=1)

    with pytest.raises(ValidationError):
        StaffCreate(full_name="Juan Perez", dni="765432109", position="Operador", parking_id=1)

    with pytest.raises(ValidationError):
        StaffCreate(full_name="Juan Perez", dni="ABCD5678", position="Operador", parking_id=1)


def test_staff_create_invalid_name():
    """StaffCreate debe rechazar nombres vacíos o de un solo carácter."""
    with pytest.raises(ValidationError):
        StaffCreate(full_name="A", dni="76543210", position="Operador", parking_id=1)


# ==============================================================================
# 6. PRUEBAS DE ParkingBase, ReviewCreate, IncidentCreate
# ==============================================================================

def test_parking_base_constraints():
    """hourly_rate > 0 y tolerance_minutes entre 5 y 120."""
    with pytest.raises(ValidationError):
        ParkingBase(name="Sede", address="Av 1", city="Lima", hourly_rate=-2.0)

    with pytest.raises(ValidationError):
        ParkingBase(name="Sede", address="Av 1", city="Lima", tolerance_minutes=2)


def test_review_create_rating_boundaries():
    """Review rating debe estar entre 1 y 5, y comentario no vacío."""
    rc = ReviewCreate(parking_id=1, rating=5, comment="Excelente servicio")
    assert rc.rating == 5

    with pytest.raises(ValidationError):
        ReviewCreate(parking_id=1, rating=0, comment="Malo")

    with pytest.raises(ValidationError):
        ReviewCreate(parking_id=1, rating=6, comment="Increíble")

    with pytest.raises(ValidationError):
        ReviewCreate(parking_id=1, rating=4, comment="Ok")  # menos de 3 caracteres


def test_incident_create_boundaries():
    """IncidentCreate description debe tener al menos 5 caracteres y parking_id > 0."""
    with pytest.raises(ValidationError):
        IncidentCreate(parking_id=0, category="general", description="Falla de barrera")

    with pytest.raises(ValidationError):
        IncidentCreate(parking_id=1, category="general", description="Ups")


# ==============================================================================
# 7. PRUEBAS DEL ENDPOINT PÚBLICO DE VERIFICACIÓN QR (/verify/{code})
# ==============================================================================

@pytest.mark.asyncio
async def test_verify_reservation_not_found():
    """El endpoint /verify/{code} debe retornar 404 si el código no existe."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/reservations/verify/CODIGO-INEXISTENTE-999")
        assert res.status_code == 404
        assert "no encontrada" in res.json()["detail"].lower()
