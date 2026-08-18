# 04 → Stack Tecnológico y Arquitectura del Sistema

## Stack Tecnológico

### Backend
- **Lenguaje:** Python 3.11+
- **Framework Web:** FastAPI (Asíncrono, alto rendimiento con ASGI Uvicorn).
- **ORM / Base de Datos:** SQLAlchemy 2.0 (Async Session) + Alembic para migraciones.
- **Validación de Datos & Schemas:** Pydantic v2.
- **Autenticación:** PyJWT (Tokens JWT Bearer) + Passlib (Hashing Bcrypt).
- **WebSockets:** WebSockets nativos FastAPI para eventos ANPR y ocupación en vivo.

### Frontend
- **Framework:** React 18+ (Vite para empaquetado ultra rápido).
- **Estilos & UI:** Tailwind CSS v3 + Lucide React Icons.
- **Gestión de Estado:** React Context API + Custom Hooks.
- **Lienzo Gráfico (Editor de Planos):** HTML5 Canvas API nativa / React Canvas ref.
- **Peticiones HTTP & WS:** Axios / WebSockets Client API.

### Base de Datos & Infraestructura
- **Motor de BD:** PostgreSQL 15+.
- **Contenedores:** Docker & Docker Compose para orquestación del backend, frontend y BD.

---

## Arquitectura del Backend (Python FastAPI)

El backend sigue una **Arquitectura en Capas (Clean / Layered Architecture)**:

```text
app/
├── core/               # Configuración global, variables de entorno, seguridad JWT/PIN
├── db/                 # Conexión async a PostgreSQL, Base de datos, Sesiones
├── models/             # Entidades SQLAlchemy (User, Vehicle, Parking, Slot, Reservation, Payment, Staff, etc.)
├── schemas/            # Schemas Pydantic para validación de entrada/salida de API
├── repositories/       # Capa de acceso a datos (CRUD desacoplado)
├── services/           # Lógica de negocio (Cálculo de tarifas, ANPR, liquidación)
├── api/                # Endpoints FastAPI agrupados por módulos v1
│   ├── v1/
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── parkings.py
│   │   ├── slots.py
│   │   ├── reservations.py
│   │   ├── payments.py
│   │   ├── anpr.py
│   │   ├── staff.py
│   │   └── websockets.py
└── main.py             # Punto de entrada de FastAPI y middleware CORS
```

### Flujo Típico de Solicitud HTTP:
1. **Cliente React** realiza petición HTTP `POST /api/v1/reservations` con Token Bearer JWT.
2. **Middleware Auth FastAPI** intercepta y valida el Token JWT de la cabecera.
3. **Router (`reservations.py`)** recibe y valida la entrada con Pydantic (`ReservationCreate`).
4. **Service (`reservation_service.py`)** verifica disponibilidad del cajón, calcula tarifa y genera código QR.
5. **Repository (`reservation_repo.py`)** persiste en PostgreSQL mediante SQLAlchemy AsyncSession.
6. **WebSocket Manager** emite evento `SLOT_STATUS_CHANGED` a todos los clientes suscritos al local.
7. **Respuesta HTTP 201 Created** retorna el objeto creado al cliente.

---

## Estructura del Frontend (React + Vite + Tailwind CSS)

```text
src/
├── assets/             # Logos, imágenes y estilos globales
├── components/         # Componentes UI reutilizables
│   ├── common/         # Modales, Badges, Botones, Keypad PIN, Navbar, Sidebar
│   ├── editor/         # Componentes del Editor Canva 2D (Herramientas, Propiedades, Canvas)
│   └── map/            # Componentes de Mapa y Ficha de Estacionamiento
├── context/            # Contextos React (AuthContext, RoleContext, NotificationContext)
├── hooks/              # Custom Hooks (useAuth, useWebsocket, useCanvasEditor)
├── pages/              # Páginas por rol
│   ├── auth/           # Login, Register, PIN Modal
│   ├── user/           # Search, ParkingDetail, MyReservations, Profile, Payments
│   ├── local/          # LocalDashboard, FloorPlanEditor, GaritaControl, ANPRMonitor, StaffManagement
│   └── platform/       # GlobalDashboard, AffiliatedParkings, RoleManagement
├── services/           # Clientes API (axiosInstance, authService, parkingService)
├── utils/              # Formateadores de fecha, moneda, calculador de tarifa
├── App.jsx             # Enrutador principal y layout por rol
└── main.jsx            # Renderizado React DOM
```

---

## API — Convenciones y Estándares

- **Estilo de Arquitectura:** RESTful JSON API.
- **Prefijo de Endpoints:** `/api/v1`
- **Respuestas Estándar:**
  ```json
  {
    "success": true,
    "message": "Operación realizada con éxito",
    "data": { ... }
  }
  ```
- **Manejo de Errores:** Códigos HTTP estándar (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity, 500 Internal Error) acompañados de objeto JSON `{"detail": "Mensaje de error"}`.

---

## Base de Datos (PostgreSQL)

- Conexión mediante `postgresql+asyncpg://user:password@localhost:5432/smartpark`.
- Integridad referencial con llaves foráneas y eliminación en cascada controlada.
- Índices en columnas de alta búsqueda: `users.email`, `vehicles.license_plate`, `parkings.city`, `reservations.qr_code`.