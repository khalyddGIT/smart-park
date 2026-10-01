import pytest
from datetime import datetime, timedelta, timezone
from pydantic import ValidationError

from app.schemas.schemas import (
    validate_license_plate_format,
    validate_license_plate_for_vehicle_type,
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
    ReservationCheckIn,
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

    # Tipos adicionales soportados con formato 3-3 (válido universal MTC)
    for vtype in ["suv", "mototaxi", "bike", "camioneta", "moto", "camion"]:
        v_test = VehicleCreate(license_plate="XYZ-789", vehicle_type=vtype)
        assert v_test.vehicle_type == vtype


def test_validate_plate_auto_sedan():
    """Pruebas de validación de placas para Auto / Sedán / Hatchback (Cat. M1)."""
    # Placas válidas MTC: 3 caracteres alfanuméricos + guión + 3 dígitos/alfanuméricos
    valid_auto_plates = ["ABC-123", "abc-123", "A1B-234", "XYZ-999", "B0A-111", "  F4G-567  "]
    for plate in valid_auto_plates:
        cleaned = validate_license_plate_for_vehicle_type(plate, "auto")
        assert cleaned == plate.strip().upper()
        assert len(cleaned) == 7
        assert cleaned[3] == '-'

    # Placas inválidas para Auto:
    # 1. Caso de la captura del usuario: GGG-GGGGG (3 letras y 5 letras, total 8 letras)
    with pytest.raises(ValueError) as exc:
        validate_license_plate_for_vehicle_type("GGG-GGGGG", "auto")
    assert "demasiados caracteres" in str(exc.value) or "6 caracteres" in str(exc.value)

    # 2. Placa de moto en auto (1234-5A o AB-1234) debe ser rechazada
    with pytest.raises(ValueError, match="inválido para AUTO"):
        validate_license_plate_for_vehicle_type("1234-5A", "auto")

    with pytest.raises(ValueError, match="inválido para AUTO"):
        validate_license_plate_for_vehicle_type("AB-1234", "auto")

    # 3. Sin guión o longitudes incorrectas
    with pytest.raises(ValueError, match="obligatoriamente un guión"):
        validate_license_plate_for_vehicle_type("ABC123", "auto")

    with pytest.raises(ValueError):
        validate_license_plate_for_vehicle_type("ABCDE-123", "auto")

    with pytest.raises(ValueError):
        validate_license_plate_for_vehicle_type("ABC-1234", "auto")


def test_validate_plate_camioneta_suv():
    """Pruebas de validación de placas para Camioneta / SUV / 4x4 (Cat. M1 / N1)."""
    valid_suv_plates = ["AFB-789", "A7C-456", "T3C-012", "SU1-234"]
    for plate in valid_suv_plates:
        assert validate_license_plate_for_vehicle_type(plate, "camioneta") == plate
        assert validate_license_plate_for_vehicle_type(plate, "suv") == plate

    # Rechaza placas menores o con longitud incorrecta
    with pytest.raises(ValueError):
        validate_license_plate_for_vehicle_type("1234-5A", "camioneta")

    with pytest.raises(ValueError):
        validate_license_plate_for_vehicle_type("GGG-GGGGG", "suv")


def test_validate_plate_moto_lineal():
    """Pruebas de validación de placas para Moto Lineal / Scooter (Cat. L1 / L3)."""
    # Formatos oficiales MTC: 4-2 (1234-5A, 1234-AB), 2-4 (AB-1234) o 3-3 (ABC-123)
    valid_moto_plates = [
        "1234-5A",
        "1234-ab",
        "AB-1234",
        "1234-5B",
        "A1-2345",
        "ABC-123",
        "6789-0X"
    ]
    for plate in valid_moto_plates:
        res = validate_license_plate_for_vehicle_type(plate, "moto")
        assert res == plate.strip().upper()

    # Inválidas para moto
    with pytest.raises(ValueError):
        validate_license_plate_for_vehicle_type("GGG-GGGGG", "moto")

    with pytest.raises(ValueError):
        validate_license_plate_for_vehicle_type("123456", "moto")

    with pytest.raises(ValueError):
        validate_license_plate_for_vehicle_type("12-12", "moto")


def test_validate_plate_mototaxi_torito():
    """Pruebas de validación de placas para Mototaxi / Trimóvil / Torito (Cat. L5)."""
    valid_mototaxi_plates = [
        "1234-5A",
        "5678-9C",
        "AB-1234",
        "1234-AB",
        "ABC-123"
    ]
    for plate in valid_mototaxi_plates:
        assert validate_license_plate_for_vehicle_type(plate, "mototaxi") == plate.upper()
        assert validate_license_plate_for_vehicle_type(plate, "torito") == plate.upper()
        assert validate_license_plate_for_vehicle_type(plate, "trimovil") == plate.upper()

    # Inválidas para mototaxi
    with pytest.raises(ValueError):
        validate_license_plate_for_vehicle_type("GGG-GGGGG", "mototaxi")

    with pytest.raises(ValueError):
        validate_license_plate_for_vehicle_type("1234-5678", "mototaxi")


def test_validate_plate_camion_pesado():
    """Pruebas de validación de placas para Camión / Furgón / Utilitario / Pesado (Cat. N)."""
    valid_truck_plates = ["ABC-123", "T7B-890", "W1A-456"]
    for plate in valid_truck_plates:
        assert validate_license_plate_for_vehicle_type(plate, "camion") == plate
        assert validate_license_plate_for_vehicle_type(plate, "truck") == plate

    with pytest.raises(ValueError):
        validate_license_plate_for_vehicle_type("1234-5A", "camion")

    with pytest.raises(ValueError):
        validate_license_plate_for_vehicle_type("GGG-GGGGG", "truck")


def test_validate_plate_taxi():
    """Pruebas de validación de placas para Servicio de Taxi (Cat. M1 Público)."""
    valid_taxi_plates = ["A1A-123", "BC1-234", "BCA-123"]
    for plate in valid_taxi_plates:
        assert validate_license_plate_for_vehicle_type(plate, "taxi") == plate

    with pytest.raises(ValueError):
        validate_license_plate_for_vehicle_type("1234-5A", "taxi")


def test_vehicle_create_each_category_schema():
    """VehicleCreate valida estrictamente la combinación de placa y tipo de vehículo."""
    # 1. Creación exitosa para cada tipo con su placa correspondiente
    v_auto = VehicleCreate(license_plate="ABC-123", vehicle_type="auto")
    assert v_auto.license_plate == "ABC-123"

    v_suv = VehicleCreate(license_plate="B4C-789", vehicle_type="suv")
    assert v_suv.license_plate == "B4C-789"

    v_camioneta = VehicleCreate(license_plate="T3C-012", vehicle_type="camioneta")
    assert v_camioneta.license_plate == "T3C-012"

    v_moto = VehicleCreate(license_plate="1234-5A", vehicle_type="moto")
    assert v_moto.license_plate == "1234-5A"

    v_mototaxi = VehicleCreate(license_plate="AB-1234", vehicle_type="mototaxi")
    assert v_mototaxi.license_plate == "AB-1234"

    v_truck = VehicleCreate(license_plate="T7B-890", vehicle_type="truck")
    assert v_truck.license_plate == "T7B-890"

    # 2. Rechazo de placa de moto asignada a un auto
    with pytest.raises(ValidationError) as exc1:
        VehicleCreate(license_plate="1234-5A", vehicle_type="auto")
    assert "inválido para AUTO" in str(exc1.value)

    # 3. Rechazo de placa de moto asignada a una camioneta
    with pytest.raises(ValidationError) as exc2:
        VehicleCreate(license_plate="AB-1234", vehicle_type="camioneta")
    assert "inválido para CAMIONETA" in str(exc2.value)

    # 4. Rechazo de placa deformada GGG-GGGGG en cualquier tipo
    with pytest.raises(ValidationError):
        VehicleCreate(license_plate="GGG-GGGGG", vehicle_type="auto")

    with pytest.raises(ValidationError):
        VehicleCreate(license_plate="GGG-GGGGG", vehicle_type="moto")

    with pytest.raises(ValidationError):
        VehicleCreate(license_plate="GGG-GGGGG", vehicle_type="mototaxi")


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
    """VehicleUpdate valida la placa según el tipo si se envía."""
    # Válido con nueva placa con guión para auto
    vu = VehicleUpdate(license_plate="abc-999", vehicle_type="auto")
    assert vu.license_plate == "ABC-999"

    # Válido con placa de moto al actualizar moto
    vu_moto = VehicleUpdate(license_plate="1234-5A", vehicle_type="moto")
    assert vu_moto.license_plate == "1234-5A"

    # Inválido: asignar placa de moto a auto en update
    with pytest.raises(ValidationError):
        VehicleUpdate(license_plate="1234-5A", vehicle_type="auto")

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


# ==============================================================================
# 8. PRUEBAS DE AUTENTICACIÓN Y ESQUEMA DE LOGIN
# ==============================================================================

def test_user_login_schema():
    """UserLogin debe aceptar email o nombre de usuario/completo con password, y rechazar identificador o password vacíos."""
    from app.schemas.schemas import UserLogin
    
    # Válido: email y password
    login_email = UserLogin(email="conductor@smartpark.com", password="password123")
    assert login_email.email == "conductor@smartpark.com"
    assert login_email.password == "password123"

    # Válido: nombre de usuario o nombre completo
    login_name = UserLogin(email="Juan Perez", password="password123")
    assert login_name.email == "Juan Perez"

    login_username = UserLogin(username="carlosq", password="password123")
    assert login_username.username == "carlosq"

    # Identificador vacío -> Rechazado
    with pytest.raises(ValidationError):
        UserLogin(email="", password="password123")

    with pytest.raises(ValidationError):
        UserLogin(password="password123")

    # Password vacío -> Rechazado
    with pytest.raises(ValidationError):
        UserLogin(email="conductor@smartpark.com", password="")


# ==============================================================================
# 9. PRUEBAS DE CREACIÓN Y ACTUALIZACIÓN DE USUARIOS (UserCreate, UserUpdate)
# ==============================================================================

def test_user_create_phone_valid():
    """UserCreate debe aceptar teléfonos peruanos válidos de 9 dígitos y normalizarlos."""
    from app.schemas.schemas import UserCreate

    # 9 dígitos directos
    u1 = UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="987654321", password="password123")
    assert u1.phone == "987654321"

    # Con prefijo +51 y espacios
    u2 = UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="+51 987 654 321", password="password123")
    assert u2.phone == "987654321"

    # Con prefijo 51 sin más
    u3 = UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="51987654321", password="password123")
    assert u3.phone == "987654321"

    # Teléfono opcional (None o vacío)
    u4 = UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone=None, password="password123")
    assert u4.phone is None

    u5 = UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="", password="password123")
    assert u5.phone is None


def test_user_create_phone_rejects_extra_digits():
    """UserCreate DEBE rechazar teléfonos con números de más (10 o más dígitos)."""
    from app.schemas.schemas import UserCreate

    # 10 dígitos (un número de más)
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="9876543210", password="password123")
    assert "más de 9 dígitos" in str(exc_info.value) or "demasiados dígitos" in str(exc_info.value)

    # 11 dígitos
    with pytest.raises(ValidationError):
        UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="98765432100", password="password123")

    # 15 dígitos
    with pytest.raises(ValidationError):
        UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="987654321012345", password="password123")

    # +51 con 10 dígitos después del código
    with pytest.raises(ValidationError):
        UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="+51 9876543210", password="password123")


def test_user_create_phone_rejects_too_few_digits():
    """UserCreate DEBE rechazar teléfonos con menos de 9 dígitos."""
    from app.schemas.schemas import UserCreate

    # 8 dígitos (le falta un número)
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="98765432", password="password123")
    assert "exactamente 9 dígitos" in str(exc_info.value)

    # 5 dígitos
    with pytest.raises(ValidationError):
        UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="98765", password="password123")


def test_user_create_phone_rejects_not_starting_with_9():
    """UserCreate DEBE rechazar números celulares que no inicien con 9 en Perú."""
    from app.schemas.schemas import UserCreate

    with pytest.raises(ValidationError) as exc_info:
        UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="887654321", password="password123")
    assert "empezar con el dígito 9" in str(exc_info.value)

    with pytest.raises(ValidationError):
        UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="123456789", password="password123")


def test_user_create_phone_rejects_letters_and_symbols():
    """UserCreate DEBE rechazar teléfonos con caracteres alfabéticos o símbolos."""
    from app.schemas.schemas import UserCreate

    with pytest.raises(ValidationError):
        UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="98765abcd", password="password123")

    with pytest.raises(ValidationError):
        UserCreate(full_name="Carlos Mendoza", email="carlos@example.com", phone="98765-432!", password="password123")


def test_user_update_phone_validation():
    """UserUpdate también debe validar estrictamente el teléfono."""
    from app.schemas.schemas import UserUpdate

    # Válido
    up = UserUpdate(phone="+51 911 222 333")
    assert up.phone == "911222333"

    # Inválido: más de 9 dígitos
    with pytest.raises(ValidationError):
        UserUpdate(phone="91122233344")

    # Inválido: menos de 9 dígitos
    with pytest.raises(ValidationError):
        UserUpdate(phone="911222")


def test_validate_license_plate_extra_characters():
    """validate_license_plate_format DEBE rechazar placas con caracteres de más antes o después del guión."""
    # Más de 4 caracteres antes del guión
    with pytest.raises(ValueError) as exc_info1:
        validate_license_plate_format("ABCDE-123")
    assert "demasiados caracteres" in str(exc_info1.value) or "inválido" in str(exc_info1.value).lower()

    # Más de 4 caracteres después del guión
    with pytest.raises(ValueError) as exc_info2:
        validate_license_plate_format("ABC-12345")
    assert "demasiados caracteres" in str(exc_info2.value) or "inválido" in str(exc_info2.value).lower()

    # Múltiples guiones
    with pytest.raises(ValueError) as exc_info3:
        validate_license_plate_format("AB-12-34")
    assert "único guión" in str(exc_info3.value) or "inválido" in str(exc_info3.value).lower()


def test_reservation_checkin_schema():
    """ReservationCheckIn admite hours_stay, minutes_stay y is_open_stay (Tiempo Libre)."""
    # 1. Tiempo libre (is_open_stay=True)
    c1 = ReservationCheckIn(is_open_stay=True)
    assert c1.is_open_stay is True
    assert c1.hours_stay is None
    assert c1.minutes_stay is None

    # 2. Horas fijas
    c2 = ReservationCheckIn(hours_stay=2.5)
    assert c2.hours_stay == 2.5
    assert c2.is_open_stay is None

    # 3. Minutos fijos
    c3 = ReservationCheckIn(minutes_stay=90)
    assert c3.minutes_stay == 90

    # 4. Por defecto vacío es válido
    c4 = ReservationCheckIn()
    assert c4.hours_stay is None
    assert c4.is_open_stay is None

    # 5. Horas inválidas (cero o negativo)
    with pytest.raises(ValidationError):
        ReservationCheckIn(hours_stay=0)

    with pytest.raises(ValidationError):
        ReservationCheckIn(hours_stay=-2)


def test_parking_response_resilient_reads():
    """ParkingResponse debe serializar sin fallar registros legacy de BD con teléfonos fijos o RUC sin formato estándar."""
    from app.schemas.schemas import ParkingResponse

    # Caso real de producción: teléfono fijo o sin dígito inicial 9
    legacy_data = {
        "id": 1,
        "name": "Estacionamiento Colonial",
        "address": "Jr. 28 de Julio 123",
        "city": "Ayacucho",
        "phone": "463985238",
        "whatsapp": "+51 66 312345",
        "ruc": "10456789012",
        "hourly_rate": 6.0,
        "total_capacity": 40
    }
    resp = ParkingResponse.model_validate(legacy_data)
    assert resp.id == 1
    assert resp.phone == "463985238"
    assert resp.whatsapp == "+51 66 312345"
    assert resp.ruc == "10456789012"


def test_parking_create_strict_validation():
    """ParkingCreate debe validar estrictamente el teléfono en nuevas creaciones."""
    from app.schemas.schemas import ParkingCreate

    # Rechaza teléfono celular que no empiece con 9
    with pytest.raises(ValidationError):
        ParkingCreate(
            name="Nueva Cochera",
            address="Jr. Callao 456",
            city="Ayacucho",
            phone="463985238"
        )

    # Acepta teléfono válido peruano que empiece con 9
    valid_create = ParkingCreate(
        name="Nueva Cochera",
        address="Jr. Callao 456",
        city="Ayacucho",
        phone="987654321"
    )
    assert valid_create.phone == "987654321"


