# 06 → Contrato de API REST APIv1 (FastAPI)

## Autenticación & Seguridad (`/api/v1/auth`)

### 1. `POST /api/v1/auth/register`
- **Descripción:** Registra un nuevo usuario.
- **Request Body:**
  ```json
  {
    "full_name": "Carlos Mendoza",
    "email": "carlos@example.com",
    "phone": "+51 987654321",
    "password": "Password123!",
    "role": "user"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": 1,
    "full_name": "Carlos Mendoza",
    "email": "carlos@example.com",
    "role": "user",
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer"
  }
  ```

### 2. `POST /api/v1/auth/login`
- **Descripción:** Inicio de sesión y generación de JWT.
- **Request Body:**
  ```json
  {
    "email": "carlos@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "full_name": "Carlos Mendoza",
      "email": "carlos@example.com",
      "role": "user"
    }
  }
  ```

### 3. `POST /api/v1/auth/verify-pin`
- **Descripción:** Valida el PIN de seguridad de 4-6 dígitos para operaciones admin.
- **Request Body:**
  ```json
  {
    "pin": "1234"
  }
  ```
- **Response (200 OK):** `{"valid": true, "message": "PIN verificado correctamente"}`

---

## Estacionamientos & Planos (`/api/v1/parkings`)

### 1. `GET /api/v1/parkings`
- **Descripción:** Lista los estacionamientos con filtros de búsqueda y geolocalización.
- **Query Params:** `query` (texto), `city` (distrito/ciudad), `vehicle_type`, `max_distance`, `sort_by` (`price`, `distance`).
- **Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "name": "Smart Park Central San Isidro",
      "address": "Av. Javier Prado Este 456",
      "city": "San Isidro",
      "latitude": -12.089,
      "longitude": -77.032,
      "hourly_rate": 8.50,
      "tolerance_minutes": 15,
      "available_slots": 18,
      "total_slots": 30
    }
  ]
  ```

### 2. `GET /api/v1/parkings/{id}/floor-plan`
- **Descripción:** Obtiene la estructura completa del plano 2D (cajones y elementos decorativos/pasos peatonales).
- **Response (200 OK):**
  ```json
  {
    "parking_id": 1,
    "slots": [
      { "id": 101, "code": "A-01", "slot_type": "auto", "status": "free", "pos_x": 100, "pos_y": 50, "width": 60, "height": 100, "rotation": 0 }
    ],
    "elements": [
      { "id": 1, "element_type": "crosswalk", "pos_x": 300, "pos_y": 200, "width": 120, "height": 60, "rotation": 0, "z_index": 2 }
    ]
  }
  ```

### 3. `PUT /api/v1/parkings/{id}/floor-plan`
- **Descripción:** Guarda o actualiza masivamente la estructura del plano desde el Editor Canva (`local` / `platform`).

---

## Reservas & Pases QR (`/api/v1/reservations`)

### 1. `POST /api/v1/reservations`
- **Descripción:** Crea una nueva reserva sobre un cajón específico.
- **Request Body:**
  ```json
  {
    "parking_id": 1,
    "slot_id": 101,
    "license_plate": "ABC-123",
    "start_time": "2026-08-13T16:00:00Z",
    "end_time": "2026-08-13T18:00:00Z"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": 55,
    "code": "RSV-9912",
    "parking_name": "Smart Park Central San Isidro",
    "slot_code": "A-01",
    "license_plate": "ABC-123",
    "total_cost": 17.00,
    "status": "scheduled",
    "qr_code": "SMARTPARK-RSV-9912-TOKEN"
  }
  ```

---

## Módulo ANPR / Control Garita (`/api/v1/anpr`)

### 1. `POST /api/v1/anpr/simulate-scan`
- **Descripción:** Simula la captura de placa por cámara de garita para prueba de barrera.
- **Request Body:**
  ```json
  {
    "parking_id": 1,
    "license_plate": "ABC-123",
    "gate_type": "entry"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "matched": true,
    "reservation_id": 55,
    "gate_action": "OPEN_BARRIER",
    "message": "Reserva válida encontrada. Abriendo barrera de entrada."
  }
  ```

---

## WebSockets / Eventos en Vivo (`/ws/parkings/{parking_id}`)

- **Protocolo:** WebSocket WSS/WS.
- **Mensaje de Evento Emitido:**
  ```json
  {
    "event": "SLOT_STATUS_UPDATED",
    "slot_id": 101,
    "code": "A-01",
    "new_status": "occupied"
  }
  ```
