# Smart-Park — Plataforma Multi-Estacionamiento: Marketplace & Gestión Inteligente de Estacionamientos

[![CI - Tests & Build](https://github.com/khalyddGIT/smart-park/actions/workflows/ci.yml/badge.svg)](https://github.com/khalyddGIT/smart-park/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styles-Tailwind%20CSS%20v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet%201.9-199900.svg?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Recharts](https://img.shields.io/badge/BI%20Analytics-Recharts-22c55e.svg)](https://recharts.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Railway](https://img.shields.io/badge/Deploy-Railway%20Docker-purple.svg?logo=railway&logoColor=white)](https://railway.app/)
[![Fabric.js](https://img.shields.io/badge/CAD%20Engine-Fabric.js%207-blue.svg)](https://fabricjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Ecosistema Multi-Tenant SaaS & Marketplace para la digitalización, búsqueda, reserva, telemetría de garitas con IA (LPR/ANPR), diseño topográfico CAD 1:1 y dispersión financiera de comisiones para playas de estacionamiento.**

---

## 📑 Tabla de Contenidos

1. [Modelo de Negocio: Marketplace Multi-Tenant](#-modelo-de-negocio-marketplace-multi-tenant)
2. [Arquitectura del Sistema & Flujo de Tres Actores](#-arquitectura-del-sistema--flujo-de-tres-actores)
3. [Estructura de Roles y Matriz de Acceso RBAC](#-estructura-de-roles-y-matriz-de-acceso-rbac)
4. [Módulos Principales del Sistema](#-módulos-principales-del-sistema)
   - [Centro de Control del Super Admin (Dueño de la Plataforma)](#1-centro-de-control-del-super-admin-dueño-de-la-plataforma)
   - [Software de Gestión para el Admin de Cochera (Afiliado)](#2-software-de-gestión-para-el-admin-de-cochera-afiliado)
   - [Portal del Conductor (Cliente Final)](#3-portal-del-conductor-cliente-final)
5. [Estrategias de Monetización del Ecosistema](#-estrategias-de-monetización-del-ecosistema)
6. [Stack Tecnológico](#-stack-tecnológico)
7. [Instalación y Despliegue Local](#-instalación-y-despliegue-local)
8. [Estructura del Proyecto](#-estructura-del-proyecto)

---

## 🌐 Modelo de Negocio: Marketplace Multi-Tenant

**Smart-Park** opera bajo un modelo de plataforma de tres vías (*Three-Sided Marketplace & SaaS*):

```
                       ┌─────────────────────────────────────────┐
                       │       🌐 SUPER ADMIN (EL DUEÑO)         │
                       │ • Dueño de la plataforma SaaS           │
                       │ • Define comisiones (ej. 10% - 12%)     │
                       │ • Aprueba o rechaza nuevas cocheras     │
                       │ • Liquida ganancias y emite pagos       │
                       └────────────────────┬────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
  ┌───────────────────────────────────┐           ┌───────────────────────────────────┐
  │   🏢 ADMIN COCHERA (EL AFILIADO)  │           │      🚗 CONDUCTOR (EL CLIENTE)     │
  │ • Dueño del negocio de cochera    │           │ • Busca cochera en el mapa        │
  │ • Se afilia desde el portal       │  Servicio │ • Elige su plaza en plano CAD     │
  │ • Diseña su plano CAD interactivo │ ────────► │ • Paga con Yape, Plin o Tarjeta   │
  │ • Opera su garita con cámara LPR  │           │ • Entra con Pase QR o Placa       │
  │ • Recibe sus pagos quincenales    │           │ • Califica el servicio            │
  └───────────────────────────────────┘           └───────────────────────────────────┘
```

1. **El Super Admin (Dueño de la Plataforma)**: Propietario del software. Establece comisiones comerciales (10%-12%), valida y aprueba solicitudes de afiliación de nuevos estacionamientos, gestiona la dispersión de fondos a las cuentas bancarias de las cocheras y supervisa la calidad de la red.
2. **El Administrador de Cochera (Afiliado / Merchant)**: Dueño de una playa de estacionamiento que utiliza el SaaS para digitalizar su negocio, diseñar su distribución en CAD, automatizar su garita con reconocimiento de placas LPR y cobrar mediante reservas en línea.
3. **El Conductor (Consumidor / Driver)**: Usuario que busca cocheras disponibles en tiempo real sobre el mapa de Ayacucho, reserva su cajón específico en el plano interactivo y paga digitalmente.

---

## 🛡️ Estructura de Roles y Matriz de Acceso RBAC

| Módulo / Funcionalidad | 🚗 Conductor (`user`) | 🏢 Admin Cochera (`local`) | 🌐 Super Admin (`platform`) |
| :--- | :---: | :---: | :---: |
| **Mapa Interactivo & Cinta Continua** | ✅ Consulta & Navegación | ✅ Vista General | ✅ Vista General |
| **Reserva Visual en Plano CAD** | ✅ Selección & Checkout | ❌ | ❌ |
| **Pase Digital QR / Token ANPR** | ✅ Generación & Descarga | ❌ | ❌ |
| **Abonos Flexibles (3 sem, 1 mes, fraccionado)** | ✅ Contratación en Línea | ❌ | ❌ |
| **Estudio CAD 2D & Editor de Plazas** | ❌ | ✅ Control Total de su Sede | ❌ (Solo admins de sede) |
| **Padrón Dinámico de Tarifarios (CRUD)** | ❌ | ✅ Añadir, Editar & Eliminar | ❌ (Gestionado por sede) |
| **Switch Maestro de Abonos (`subscription_enabled`)**| ❌ | ✅ Activar / Desactivar | ❌ (Configuración por sede) |
| **Garita ANPR / Reconocimiento LPR** | ❌ | ✅ Operación de Barrera & Cámara | ❌ (Operación local de sede) |
| **Check-In / Check-Out & Padrón de Reservas** | ❌ | ✅ Registro & Cobro en Garita | ❌ (Operación local de sede) |
| **Gestión de Personal & Turnos** | ❌ | ✅ Operadores de su Sede | ❌ (Administración local) |
| **Panel Global & KPIs de Red** | ❌ | ❌ (Solo métricas de sede) | ✅ Consolidado Ejecutivo |
| **Finanzas & Liquidaciones Payout** | ❌ | ❌ (Solo ve su caja) | ✅ Dispersión de Fondos & Vouchers |
| **Ajustes Maestros & Comunicados Push** | ❌ | ❌ | ✅ Configuración Global |
| **Aprobación de Nuevas Cocheras** | ❌ (Solo solicita) | ❌ | ✅ Bandeja de Afiliaciones |
| **Padrón Global de Usuarios & Roles** | ❌ | ❌ | ✅ Asignación de Roles & PIN |
| **Auditoría Forense & Logs del Sistema** | ❌ | ❌ | ✅ Trazabilidad Inmutable |
| **Simulador de Resiliencia de Red** | ❌ | ❌ | ✅ Pruebas de Contingencia |
| **Escribir Reseñas** | ✅ Exclusivo Conductores | ❌ | ❌ |
| **Responder a Reseñas** | ❌ | ✅ Réplica Oficial | ✅ Moderación / Eliminación |
| **Reportar Incidencias** | ✅ Reporte de Usuario | ✅ Registro de Infracción | ✅ Registro & Supervisión |
| **Resolver Incidencias** | ❌ (Solo informativo) | ✅ Resolución Local | ✅ Resolución Global |

---

## 📦 Módulos Principales del Sistema

### 1. Centro de Control del Super Admin (Dueño de la Plataforma)
* **`PlatformGlobalDashboard.jsx` (Panel Global Ejecutivo)**:
  - KPIs consolidados en tiempo real: Recaudación bruta de la red, comisión líquida retenida (10%-12%), volumen de estancias y ocupación en vivo de todas las sedes.
  - Gráficos ejecutivos con **Recharts** (curva semanal de ingresos vs comisiones y distribución de métodos de pago).
  - Monitor en vivo de estado operativo de cocheras y live feed de eventos de la red.
* **`PlatformFinancesModule.jsx` (Finanzas & Liquidaciones Payout)**:
  - Padrón bancario de cocheras con RUC, Razón Social, Banco (BCP, BBVA, Interbank), Número de Cuenta y CCI.
  - Botón **"Liquidar Fondos"** que dispersa el saldo neto a la cochera y genera un **Voucher / Comprobante Oficial descargable e imprimible**.
  - Exportación contable completa a **CSV / Excel** para declaraciones SUNAT.
* **`AffiliatedParkingsModule.jsx` (Gestión de Sedes & Solicitudes de Afiliación)**:
  - Bandeja de revisión de solicitudes de afiliación enviadas por dueños de cocheras desde el login.
  - Aprobación con 1 clic: crea automáticamente el estacionamiento y genera las credenciales del Administrador Local.
* **`UserRolesModule.jsx` (Directorio de Usuarios & Permisos RBAC)**:
  - Directorio global de cuentas con cambio dinámico de rol (`user`, `local`, `platform`) y gestión de PIN de seguridad.
* **`PlatformSettingsModule.jsx` (Ajustes Maestros & Broadcast)**:
  - Configuración del % de comisión estándar y tiempo de gracia en garita (tolerancia de 15 min).
  - Conmutador de pasarelas de pago (Culqi, PayPal, Tarjetas, Yape/Plin) y selector Producción / Sandbox.
  - Interruptor de **Modo Mantenimiento** con mensaje de contingencia y Centro de Comunicados Masivos Push.
* **`AuditLogsModule.jsx` & `ResiliencySimModule.jsx`**:
  - Bitácora inmutable de auditoría forense y simulador de degradación y resiliencia ante contingencias de red.
* **`AnalyticsGlobalModule.jsx`**:
  - Analítica avanzada de ocupación histórica, demanda por franja horaria y rendimiento comercial de la red.

---

### 2. Software de Gestión para el Admin de Cochera (Afiliado)
* **`LocalEstablishmentManager.jsx` (Gestión de Sede en 4 Pestañas)**:
  - **Pestaña 1 (Datos de Sede)**: Nombre comercial, RUC, dirección, georreferenciación GPS en mapa interactivo Leaflet y galería fotográfica.
  - **Pestaña 2 (Tarifas & Turno Noche)**:
    - **Switch Maestro de Abonos (`subscription_enabled`)**: Activa o desactiva la disponibilidad de abonos mensuales y fraccionados.
    - **Padrón Dinámico de Tarifarios (CRUD)**: Agregar nuevas tarifas con cálculo automático por minuto y abono de 3 semanas, edición rápida inline o modal y eliminación con confirmación.
    - Tarifas nocturnas con recargo configurable y horario de turno noche.
  - **Pestaña 3 (Aforo & Distribución)**: Capacidad total de plazas, niveles de cochera y tolerancias de llegada.
  - **Pestaña 4 (Cámaras & Garita)**: Calibración y configuración del flujo de cámara IP para ANPR.
* **`InteractiveFloorPlanDrawingStudio.jsx` (Estudio CAD 1:1)**:
  - Herramienta de dibujo arquitectónico en lienzo interactivo (muros, plazas para autos, motos, techadas, garitas y accesos peatonales).
  - Soporte de geometrías de lote: Rectangular, en 'L', en 'U', diagonal 45° y lienzo libre.
  - Conmutador de estado de plazas en vivo (*Libre / Ocupado / Reservado*).
* **`ANPRMonitor.jsx` & `PersonalGaritaModule.jsx` (Control de Garita LPR & Barrera)**:
  - Video en vivo y procesamiento OCR para lectura automática de matrículas vehiculares peruanas.
  - Apertura y cierre remoto de barrera vehicular con verificación de reserva y doble token.
* **`ReservationsModule.jsx` (Operaciones de Garita)**:
  - Escáner y validador de códigos QR de conductores.
  - Registro de Check-In (Entrada) y Check-Out (Salida) con liquidación estricta de tiempo excedido (*overtime*).
* **`StaffModule.jsx`**: Control de nómina de operadores de garita, asignación de turnos y generación de credenciales/PIN.
* **`ReviewsModule.jsx`**: Recepción y réplica oficial a calificaciones de clientes.

---

### 3. Portal del Conductor (Cliente Final)
* **`AyacuchoMap.jsx` (Mapa Interactivo & Marquee)**:
  - Mapa interactivo empaquetado nativamente con **Leaflet** y **Mapbox GL JS** (cero dependencias de CDNs externos).
  - **Cinta Continua Infinita (*Infinite Marquee*)**: Desplazamiento horizontal continuo de sedes con radar animado en vivo y pausa en hover.
* **`CustomerInteractivePlanBooking.jsx` (Reserva Visual en Plano CAD)**:
  - Selección táctil/clic del cajón deseado sobre el gemelo digital de la cochera ($1100 \times 700\text{px}$).
  - Interfaz limpia (*anti-slop, zero badges*), con foco en la legibilidad y rapidez de reserva.
  - Checkout integrado con Culqi (Visa, Mastercard, Yape, Plin) o PayPal.
* **`MoreReservationsModal.jsx` (Abonos Flexibles & Fecha Adelantada)**:
  - Selección ergonómica de planes de abono:
    - **3 Semanas (21 días)**: Prorrateado exacto al 70% del valor mensual.
    - **1 Mes (30 días)**: Abono estándar completo.
    - **2 Semanas (14 días)** y **1 Semana (7 días)**.
    - **Tarifario Fraccionado**: Selector de días personalizados con chips rápidos (5d, 10d, 15d, 25d, 45d) y tarificación prorrateada diaria `(monthly / 30) * días`.
  - Reserva por fecha adelantada para conductores que programan viajes futuros.
  - Bloqueo y aviso inmediato si la sede tiene los abonos deshabilitados.
* **`DigitalAccessPassModal.jsx` (Pase QR Dinámico)**:
  - Pase Digital con código QR, token ANPR y countdown de vigencia.
  - Botón de **"Pagar Sobreestadía Online"** en caso de exceder el tiempo contratado, liquidando el saldo exacto en línea o en garita.
* **`VehiclesModule.jsx` & `PaymentsModule.jsx`**: Gestión de vehículos (placas peruanas estándar y alfanuméricas modernas) y métodos de pago.
* **`ReviewsModule.jsx` & `IncidentsModule.jsx`**: Calificación de cocheras y reporte de incidencias con fotografías.

---

## 💰 Estrategias de Monetización del Ecosistema

1. **Comisión por Transacción (10% - 12%)**: Retención automática sobre cada reserva o estancia pagada por la aplicación.
2. **Suscripción Mensual SaaS para Cocheras**: Planes Básico (S/ 49/mes), Pro con LPR (S/ 149/mes) y Enterprise (S/ 299/mes).
3. **Tarifa de Servicio / Conveniencia (S/ 0.80 por reserva)**: Pequeño recargo pagado por el conductor por garantizar su plaza en zonas de alta congestión.
4. **Pases Mensuales B2C y Abonos Flexibles (3 semanas / 1 mes / fraccionado)**: Diseñados para trabajadores recurrentes del centro histórico de Huamanga.
5. **Venta de Hardware IoT (Kits LPR)**: Venta e instalación de cámaras IP de garita y controladoras de barrera.
6. **Publicidad Geolocalizada B2B**: Comercios cercanos (restaurantes, hoteles, lavaderos) que se promocionan en el mapa.
7. **Convenios Corporativos**: Facturación consolidada mensual para flotas de empresas e instituciones.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + Vite 8 | Renderizado reactivo ultrarrápido y modular |
| **Estilos & Diseño** | TailwindCSS v4 + Glassmorphism | Sistema de diseño claro (`#F8FAFC`, slate, emerald), anti-slop y sin saturación de badges |
| **Mapas & Geolocalización** | Leaflet 1.9 + Mapbox GL JS (Empaquetados vía NPM) | Motor de mapas de alta resolución, independiente de CDNs y sin bloqueos de red |
| **Estudio CAD** | Fabric.js 7 | Renderizado y manipulación de planos topográficos en 2D |
| **Business Intelligence** | Recharts 3 | Gráficos ejecutivos interactivos de recaudación y aforo |
| **Backend RESTful** | FastAPI (Python 3.11/3.13) + Uvicorn | API REST asíncrona de alto rendimiento con Pydantic v2 |
| **Tiempo Real (WebSockets)** | FastAPI WebSockets + Realtime Service (`core/realtime.py`) | Estados de plazas en vivo, alertas de garita y broadcast masivo |
| **Base de Datos** | PostgreSQL 15/16 (Única BD en local y Railway) | Persistencia relacional, migraciones automáticas DDL y bloqueos pesimistas para concurrencia |
| **Pruebas Automatizadas** | Pytest + Playwright + Oxlint | Pruebas unitarias, de integración, E2E y auditoría estricta de React Hooks |

---

## 🚀 Instalación y Despliegue

### Requisitos Previos:
- **Node.js**: v18+ o v20+
- **Python**: v3.11+
- **Git**

### 1. Clonar el Repositorio:
```bash
git clone https://github.com/khalyddGIT/smart-park.git
cd smart-park
```

### 2. Iniciar el Backend (FastAPI):
```bash
cd backend
python -m venv venv
# En Windows:
.\venv\Scripts\activate
# En Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
*API disponible en: `http://127.0.0.1:8000/docs` (Swagger UI). Requiere Postgres local: `docker compose up -d postgres` (puerto host `5434`) y `DATABASE_URL` en `backend/.env` (plantilla: `backend/.env.example`). **PostgreSQL exclusivo**: todo el sistema, desarrollo y suite de tests operan de forma centralizada sobre PostgreSQL.*

### 3. Iniciar el Frontend (React + Vite):
```bash
# En una nueva terminal:
cd frontend
npm install
npm run dev
```

> 📖 **Guía Completa Paso a Paso**: Consulta [docs/GUIA_EJECUCION_LOCAL.md](docs/GUIA_EJECUCION_LOCAL.md) para el manual detallado con credenciales semilla de los 4 roles, comandos de Windows PowerShell / Linux y resolución de problemas.

### Alternativa: Docker Compose (entorno completo local)
```bash
docker compose up --build
```
Postgres 16 con healthcheck y volumen persistente `postgres_data` (host `5434`, red interna `5432`); el backend espera a que la BD esté sana y las fotos persisten en el volumen `backend_uploads`.

### 4. Despliegue en Producción (Railway.app)
El proyecto se despliega como **un solo contenedor Docker multi-stage** (`Dockerfile` compila el frontend Vite y lo sirve desde FastAPI) configurado vía `railway.json`:

| Variable obligatoria | Valor | Descripción |
| :--- | :--- | :--- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Referencia al plugin PostgreSQL de Railway (única BD) |
| `SECRET_KEY` | *(cadena aleatoria segura)* | Firma de tokens JWT |
| `ENVIRONMENT` | `production` | Activa validaciones estrictas de arranque |
| `UPLOADS_DIR` | `/data/uploads` | Persistencia de fotos (requiere Volume montado en `/data`) |

> 🔒 En producción la aplicación **no arranca** si falta `DATABASE_URL` o `SECRET_KEY` (fail-fast), y el CORS queda restringido a los orígenes definidos en `CORS_ORIGINS`.

```bash
railway up   # despliegue directo con la CLI
```
*Guía completa paso a paso: [docs/RAILWAY_DEPLOY.md](docs/RAILWAY_DEPLOY.md)*

---

## 🌍 Entornos y Verificación de Servicios

- **Healthcheck del Sistema:** `/health` (Monitorea el estado del servicio y conectividad con PostgreSQL)
- **Documentación de API:** `/docs` (Swagger UI interactivo) y `/redoc`
- **Seguridad & RBAC:** Autenticación por JSON Web Tokens (JWT) y autorización basada en roles (`user`, `local`, `platform`). Las credenciales y accesos se gestionan de forma segura a través de variables de entorno o mediante el panel administrativo de la plataforma.

---

## 🗄️ Esquema de Base de Datos Relacional (Tablas en Español)

| Tabla en BD | Modelo SQLAlchemy | Propósito |
| :--- | :--- | :--- |
| `usuarios` | `User` / `Usuario` | Cuentas de usuario, roles RBAC (`user`, `local`, `platform`) y PINs |
| `vehiculos` | `Vehicle` / `Vehiculo` | Padrón de vehículos y placas asociadas por usuario |
| `estacionamientos` | `Parking` / `Estacionamiento` | Sedes de cocheras, coordenadas GPS, tarifas y aforo |
| `plazas` | `Slot` / `Plaza` | Cajones de estacionamiento en el plano 2D (libres/ocupadas) |
| `elementos_plano` | `FloorPlanElement` / `ElementoPlano` | Paredes, accesos, garitas y paso peatonal en lienzo CAD |
| `reservas` | `Reservation` / `Reserva` | Histórico y pases activos QR / ANPR con costos |
| `personal` | `Staff` / `Personal` | Nómina de operadores de garita y turnos asignados por Admin Local |
| `resenas` | `Review` / `Resena` | Calificaciones y réplicas oficiales de la comunidad |

---

## 📁 Estructura del Proyecto

```
smart-park/
├── backend/                    # API FastAPI (Python 3.11)
│   ├── app/
│   │   ├── api/v1/            # Endpoints REST (auth, parkings, reservations, vehicles,
│   │   │                      #   staff, users, reviews, anpr)
│   │   ├── core/              # config.py (settings solo-Postgres + fail-fast), security.py (JWT/bcrypt), broker
│   │   ├── db/                # Sesión asíncrona SQLAlchemy (exclusivamente PostgreSQL)
│   │   ├── models/            # Modelos relacionales en español
│   │   ├── schemas/           # Esquemas Pydantic de validación
│   │   ├── tests/             # Tests de API
│   │   └── main.py            # Entrypoint: CORS por entorno, seeds idempotentes, SPA fallback
│   └── requirements.txt
├── frontend/                   # SPA React 19 + Vite 8 + Tailwind v4
│   ├── src/
│   │   ├── components/        # Dashboards RBAC, Estudio CAD, ANPR, Mapa Leaflet, Módulos
│   │   ├── context/           # AuthContext & EstablishmentContext
│   │   └── services/          # Cliente Axios hacia la API
│   └── package.json
├── docs/                       # Toda la documentación del proyecto (índice: docs/README.md)
│   ├── sistema-de-estacionamiento/  # Diseño: requerimientos, casos de uso, arquitectura C4,
│   │                                #   esquema BD, especificación API y roadmap
│   └── *.md                    # Guías e informes (deploy Railway, BD, avances, vistas)
├── Dockerfile                  # Build multi-stage: compila frontend y sirve desde FastAPI
├── docker-compose.yml          # Entorno local completo (Postgres + backend + frontend)
├── railway.json                # Configuración de despliegue Railway (builder DOCKERFILE)
└── README.md
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Desarrollado con tecnología de vanguardia para la transformación digital del estacionamiento urbano.
