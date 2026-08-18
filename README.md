# Smart-Park — Plataforma Enterprise de Gestión de Estacionamientos Inteligentes

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styles-Tailwind%20CSS%20v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015%20%7C%20SQLite-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/DevOps-Docker%20%26%20Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![WebSockets](https://img.shields.io/badge/RealTime-WebSockets-010101.svg?logo=socketdotio&logoColor=white)](https://developer.mozilla.org/es/docs/Web/API/WebSockets_API)
[![Fabric.js](https://img.shields.io/badge/CAD%20Engine-Fabric.js%207-blue.svg)](https://fabricjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Plataforma Enterprise de Gestión de Estacionamientos, Topografía CAD 1:1, Gemelo Digital Tridimensional Isométrico, Reconocimiento Óptico de Placas ANPR/OCR (ISO 18000), Pasarela de Liquidación Criptográfica y Telemetría IoT.**

---

## Tabla de Contenidos

- [Visión General y Propósito del Proyecto](#visión-general-y-propósito-del-proyecto)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Repositorio](#estructura-del-repositorio)
- [Módulos y Funcionalidades del Sistema](#módulos-y-funcionalidades-del-sistema)
  - [Endpoints de API RESTful (8 Routers CRUD)](#endpoints-de-api-restful-8-routers-crud)
- [Estudio CAD Arquitectónico & Gemelo Digital 3D](#estudio-cad-arquitectónico--gemelo-digital-3d)
- [Control de Accesos ANPR / OCR con Cámara Web en Vivo](#control-de-accesos-anpr--ocr-con-cámara-web-en-vivo)
- [Roles de Usuario y Matriz de Acceso RBAC](#roles-de-usuario-y-matriz-de-acceso-rbac)
- [Guía de Instalación y Puesta en Marcha](#guía-de-instalación-y-puesta-en-marcha)
  - [Opción 1: Ejecución Completa con Microservicios en Vivo](#opción-1-ejecución-completa-con-microservicios-en-vivo)
  - [Opción 2: Despliegue con Docker Compose](#opción-2-despliegue-con-docker-compose)
- [Variables de Entorno](#variables-de-entorno)
- [Modelo de Datos y Esquema Relacional](#modelo-de-datos-y-esquema-relacional)
- [Resiliencia y Modo Edge Desconectado](#resiliencia-y-modo-edge-desconectado)
- [Licencia](#licencia)

---

## Visión General y Propósito del Proyecto

**Smart-Park** es un ecosistema de software e IoT diseñado para modernizar integralmente la operación de playas de estacionamiento y garajes urbanos. Resuelve la congestión vehicular, optimiza los tiempos de búsqueda mediante reserva directa sobre planos interactivos y automatiza el control de ingresos y egresos con reconocimiento de matrícula en tiempo real.

### Capacidades Principales:
1. **Para Conductores:** Búsqueda geolocalizada de aparcamientos, selección de plaza sobre plano arquitectónico (estándar, con cubierta tensada o accesibilidad PMR bajo Norma A.120), checkout con billeteras interoperables (Yape, Plin) o tarjeta bancaria tokenizada PCI-DSS, y emisión de boletas electrónicas con código QR.
2. **Para Operadores de Garita:** Cámara ANPR en vivo con flujo WebRTC/getUserMedia, escaneo OCR de matrícula, telemetría de barrera electromecánica (apertura/cierre, servomotor, fotocélula de seguridad) e interfaz de contingencia por PIN.
3. **Para Administradores y Topógrafos:** Editor CAD 1:1 con cálculo paramétrico de aforo, gemelo digital 3D con sensores ultrasónicos cenitales, gestión de flota vehicular, cuadrillas de personal por turno, red de establecimientos afiliados y auditoría de reseñas.
4. **Para la Plataforma Central:** Monitoreo global de ingresos por comisión, telemetría de eventos AMQP RabbitMQ con tolerancia a caídas de red y liquidaciones fiscales consolidadas.

---

## Arquitectura del Sistema

El sistema implementa un patrón desacoplado y reactivo entre microservicios, asegurando alta disponibilidad e independencia entre nodos:

```mermaid
graph TD
    subgraph "Capa de Presentación"
        UI_Web["Frontend SPA (React 19 + Vite)"]
        UI_Driver["Portal Conductor (PWA / Responsive)"]
        UI_CAD["Estudio CAD 2D & Gemelo Digital 3D"]
    end

    subgraph "Capa de Comunicación en Tiempo Real"
        WS_Gateway["WebSocket Gateway (Node.js / ws - Puerto 8080)"]
    end

    subgraph "Capa de Servicios y Negocio"
        API_Gateway["Backend RESTful (FastAPI / Python 3.11+ - Puerto 8000)"]
        Auth_Service["Autenticación JWT + Keypad Criptográfico PIN"]
        ANPR_Engine["Motor ANPR OCR & Telemetría de Barrera"]
        Billing_Engine["Pasarela de Cobro & Billeteras Interoperables"]
        CAD_Sync["Motor de Sincronización Topográfica CAD/BIM"]
    end

    subgraph "Capa de Persistencia & Eventos"
        DB[(PostgreSQL 15 / SQLite aiosqlite)]
        LocalStorage["Buffer Local Seguro IndexedDB (Modo Edge)"]
    end

    UI_Web <-->|HTTP/REST| API_Gateway
    UI_Driver <-->|HTTP/REST| API_Gateway
    UI_CAD <-->|JSON CAD Sync| API_Gateway
    UI_Web <-->|WSS Eventos Bidireccionales| WS_Gateway
    
    API_Gateway --> Auth_Service
    API_Gateway --> ANPR_Engine
    API_Gateway --> Billing_Engine
    API_Gateway --> CAD_Sync
    
    Auth_Service --> DB
    ANPR_Engine --> DB
    Billing_Engine --> DB
    CAD_Sync --> DB
    
    UI_Web -.->|Resiliencia de Red| LocalStorage
```

---

## Stack Tecnológico

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Frontend Framework** | React | 19.x (Hooks avanzados, Context API) |
| **Bundler & DevServer** | Vite | 6.x |
| **Estilos & Diseño** | Tailwind CSS / Vanilla CSS | Tailwind v4 con tokens corporativos |
| **Iconografía** | Lucide React | Iconos vectoriales puros SVG (cero emojis) |
| **Lienzo CAD 2D** | Fabric.js / HTML5 Canvas | v7.x con acotación métrica y presets |
| **Render 3D Isométrico** | CSS 3D Transforms / WebGL | Iluminación diurna/nocturna, shaders LED cenitales |
| **Captura de Video** | WebRTC / MediaDevices API | `navigator.mediaDevices.getUserMedia` |
| **Backend Framework** | FastAPI (Python) | 0.110+ con ASGI Uvicorn |
| **ORM & Persistencia** | SQLAlchemy / aiosqlite | PostgreSQL 15+ / SQLite Asíncrono |
| **Validación de Esquemas** | Pydantic v2 | Tipado estricto para modelos de dominio |
| **WebSocket Gateway** | Node.js / ws | Puerto 8080 (difusión de eventos de plazas en <15ms) |
| **Seguridad & Auth** | JWT (PyJWT) + Bcrypt | Tokens de sesión y códigos PIN con hashing |

---

## Estructura del Repositorio

```text
smart-park/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth.py              # Autenticación JWT y verificación de PIN
│   │   │       ├── parkings.py          # CRUD de Estacionamientos, Plazas y CAD Sync
│   │   │       ├── vehicles.py          # CRUD de Vehículos (Placas, Tipo, PMR)
│   │   │       ├── staff.py             # CRUD de Personal y Control de Turnos
│   │   │       ├── users.py             # CRUD de Usuarios y Asignación de Roles
│   │   │       ├── reservations.py      # CRUD de Reservas de Estacionamiento
│   │   │       ├── reviews.py           # CRUD de Reseñas y Respuestas de Administración
│   │   │       ├── anpr.py              # Telemetría de Barrera y Lectura OCR
│   │   │       ├── payments.py          # Checkout y Billeteras Digitales
│   │   │       └── analytics.py         # Métricas BI y Reportes Consolidados
│   │   ├── core/
│   │   │   ├── config.py                # Variables de entorno y ajustes
│   │   │   └── database.py              # Sesión asíncrona SQLAlchemy
│   │   ├── models/
│   │   │   └── models.py                # Modelos ORM (User, Vehicle, Parking, Slot, etc.)
│   │   ├── schemas/
│   │   │   └── schemas.py               # Esquemas Pydantic v2
│   │   └── main.py                      # Punto de entrada FastAPI con CORS y Routers
│   ├── requirements.txt                 # Dependencias Python
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Barra superior con SVG y selector de roles
│   │   │   ├── Sidebar.jsx              # Navegación lateral por dominios de negocio
│   │   │   ├── ANPRMonitor.jsx          # Monitor de Acceso con Cámara Web y OCR
│   │   │   ├── VehiclesModule.jsx       # Gestión y CRUD de Flota Vehicular
│   │   │   ├── AffiliatedParkingsModule.jsx # Red de Establecimientos Afiliados
│   │   │   ├── UserRolesModule.jsx      # Control de Usuarios, Roles RBAC y PIN
│   │   │   ├── StaffModule.jsx          # Cuadrilla Operativa y Exportación de Turnos
│   │   │   ├── ReviewsModule.jsx        # Calificaciones y Respuestas de Garita
│   │   │   ├── PaymentsModule.jsx       # Pasarela de Liquidación y Comprobantes
│   │   │   ├── AnalyticsGlobalModule.jsx # Business Intelligence con Gráficos SVG
│   │   │   ├── HistoryModule.jsx        # Bitácora de Estancias y Exportación CSV
│   │   │   ├── ResiliencySimModule.jsx  # Monitor de Alta Disponibilidad (ISO 22301)
│   │   │   ├── FloorPlanEditor.jsx      # Selector de Entorno CAD / 3D / Satelital
│   │   │   ├── InteractiveFloorPlanDrawingStudio.jsx # Lienzo CAD 2D Paramétrico
│   │   │   ├── DigitalTwin3DView.jsx    # Gemelo Digital 3D con Telemetría Cenital
│   │   │   ├── TerrainMetricCADView.jsx # Topografía Satelital a Escala 1:1
│   │   │   ├── CustomerInteractivePlanBooking.jsx # Reserva de Cajón sobre Plano
│   │   │   └── KeypadModal.jsx          # Teclado Criptográfico para PIN Administrativo
│   │   ├── context/
│   │   │   └── AuthContext.jsx          # Contexto global de sesión y rol
│   │   ├── App.jsx                      # Orquestador de Vistas y Pases QR
│   │   └── main.jsx                     # Punto de montaje React 19
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── server/
│   └── ws-server.js                     # Servidor de WebSocket Gateway
├── docker-compose.yml                   # Orquestación de contenedores
└── README.md                            # Documentación técnica maestra
```

---

## Módulos y Funcionalidades del Sistema

### Endpoints de API RESTful (8 Routers CRUD)

El backend de FastAPI expone una API OpenAPI RESTful documentada en `http://127.0.0.1:8000/docs`:

| Recurso | Método | Endpoint | Descripción |
| :--- | :--- | :--- | :--- |
| **Vehículos** | `GET` | `/api/v1/vehicles/` | Listado de vehículos registrados |
| | `POST` | `/api/v1/vehicles/` | Alta de nuevo vehículo con verificación ANPR |
| | `PUT` | `/api/v1/vehicles/{id}` | Actualización de datos de vehículo |
| | `DELETE` | `/api/v1/vehicles/{id}` | Baja de vehículo en el registro |
| **Estacionamientos** | `GET` | `/api/v1/parkings/` | Listado de playas de estacionamiento |
| | `POST` | `/api/v1/parkings/` | Alta de nuevo establecimiento afiliado |
| | `PUT` | `/api/v1/parkings/{id}` | Modificación de tarifas, comisión y aforo |
| | `DELETE` | `/api/v1/parkings/{id}` | Desafiliación de estacionamiento |
| | `POST` | `/api/v1/parkings/{id}/floor-plan/sync` | Sincronización masiva de elementos CAD |
| **Personal (Staff)** | `GET` | `/api/v1/staff/` | Nómina de operadores y supervisores |
| | `POST` | `/api/v1/staff/` | Contratación / Alta de miembro de personal |
| | `PUT` | `/api/v1/staff/{id}` | Actualización de turno, rol y estado operativo |
| | `DELETE` | `/api/v1/staff/{id}` | Baja de miembro de personal |
| **Usuarios & Roles** | `GET` | `/api/v1/users/` | Padrón de usuarios y cuentas de acceso |
| | `POST` | `/api/v1/users/` | Registro de nuevo usuario en plataforma |
| | `PUT` | `/api/v1/users/{id}` | Modificación de datos de perfil |
| | `PUT` | `/api/v1/users/{id}/role` | Asignación de rol RBAC (Conductor, Local, Admin) |
| | `PUT` | `/api/v1/users/{id}/pin` | Actualización de PIN criptográfico |
| | `DELETE` | `/api/v1/users/{id}` | Eliminación de cuenta |
| **Reservas** | `GET` | `/api/v1/reservations/` | Consulta de reservas por usuario o garita |
| | `POST` | `/api/v1/reservations/` | Creación de reserva con cajón bloqueado |
| | `PUT` | `/api/v1/reservations/{id}/cancel` | Cancelación de reserva y liberación de plaza |
| | `PUT` | `/api/v1/reservations/{id}/extend` | Prórroga de tiempo de estancia |
| **Reseñas** | `GET` | `/api/v1/reviews/` | Calificaciones y comentarios de usuarios |
| | `POST` | `/api/v1/reviews/` | Publicación de calificación (1-5 estrellas) |
| | `PUT` | `/api/v1/reviews/{id}/reply` | Respuesta administrativa oficial de garita |
| | `DELETE` | `/api/v1/reviews/{id}` | Moderación de reseña |
| **Control ANPR** | `POST` | `/api/v1/anpr/read-plate` | Inferencia OCR y validación de lista blanca |
| | `POST` | `/api/v1/anpr/barrier-toggle` | Disparo de apertura/cierre de barrera |
| **Pagos** | `POST` | `/api/v1/payments/checkout` | Liquidación con tarjeta o QR interoperable |

---

## Control de Accesos ANPR / OCR con Cámara Web en Vivo

El componente `ANPRMonitor.jsx` implementa acceso directo al hardware óptico local mediante la API de medios de HTML5:

1. **Activación de Cámara en Vivo:** Permite seleccionar la cámara web del dispositivo (`navigator.mediaDevices.getUserMedia`) con resolución HD y 30 FPS.
2. **Escaneo Óptico Continuo:** Dibuja una mira de telemetría de grado militar sobre el video en vivo, capturando frames periódicos para reconocimiento de caracteres (OCR).
3. **Validación Instantánea:** Si la placa detectada coincide con una reserva activa o vehículo en lista blanca, envía un comando al servomotor de la barrera levadiza.
4. **Telemetría de Hardware:** Muestra el ángulo angular del brazo (0° cerrado a 85° abierto), fotocélula infrarroja de paso y estado de conexión MQTT/WebSocket.

---

## Guía de Instalación y Puesta en Marcha

### Opción 1: Ejecución Completa con Microservicios en Vivo

#### 1. Clonar el Repositorio:
```bash
git clone https://github.com/khalyddGIT/smart-park.git
cd smart-park
```

#### 2. Iniciar el Backend RESTful (FastAPI):
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # En Windows PowerShell
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API y documentación interactiva Swagger disponible en `http://127.0.0.1:8000/docs`.*

#### 3. Iniciar el WebSocket Gateway (Node.js):
```bash
cd server
npm install
node ws-server.js
```
*Servidor de eventos en tiempo real escuchando en `ws://localhost:8080`.*

#### 4. Iniciar el Frontend SPA (React 19 + Vite):
```bash
cd frontend
npm install
npm run dev
```
*Aplicación web disponible en `http://localhost:5173`.*

---

### Opción 2: Despliegue con Docker Compose

Para desplegar la infraestructura completa en un entorno contenerizado:

```bash
docker compose up -d --build
```

Servicios levantados:
- `smartpark-frontend`: `http://localhost:5173`
- `smartpark-backend`: `http://localhost:8000`
- `smartpark-ws`: `ws://localhost:8080`

---

## Variables de Entorno

Crear un archivo `.env` en la raíz de `backend/`:

```env
PROJECT_NAME="Smart-Park Enterprise"
API_V1_STR="/api/v1"
SECRET_KEY="clave-criptografica-super-segura-pci-dss"
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL="sqlite+aiosqlite:///./smartpark.db"
# Para producción con PostgreSQL:
# DATABASE_URL="postgresql+asyncpg://smartpark_user:password@localhost:5432/smartpark_db"
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000","http://127.0.0.1:5173"]
```

---

## Licencia

Este proyecto está bajo la Licencia **MIT** — puedes consultar el archivo [LICENSE](LICENSE) para más información.
