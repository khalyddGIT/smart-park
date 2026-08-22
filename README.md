# Smart-Park — Plataforma Enterprise & Marketplace Multi-Tenant de Gestión de Estacionamientos

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styles-Tailwind%20CSS%20v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet%201.9-199900.svg?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Recharts](https://img.shields.io/badge/BI%20Analytics-Recharts-22c55e.svg)](https://recharts.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015%20%7C%20SQLite-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![WebSockets](https://img.shields.io/badge/RealTime-WebSockets-010101.svg?logo=socketdotio&logoColor=white)](https://developer.mozilla.org/es/docs/Web/API/WebSockets_API)
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
| **Estudio CAD 2D & Editor de Plazas** | ❌ | ✅ Control Total de su Sede | ✅ Supervisión Global |
| **Garita ANPR / Reconocimiento LPR** | ❌ | ✅ Operación de Barrera | ✅ Telemetría de Red |
| **Check-In / Check-Out de Vehículos** | ❌ | ✅ Registro & Cobro | ✅ Auditoría Global |
| **Gestión de Personal & Turnos** | ❌ | ✅ Operadores de su Sede | ✅ Directorio Completo |
| **Finanzas & Liquidaciones Bancarias** | ❌ | ❌ (Solo ve su caja) | ✅ Dispersión de Fondos & Comprobantes |
| **Ajustes Maestros & Comunicados Push** | ❌ | ❌ | ✅ Configuración Global |
| **Aprobación de Nuevas Cocheras** | ❌ (Solo solicita) | ❌ | ✅ Bandeja de Afiliaciones |
| **Escribir Reseñas** | ✅ Exclusivo Conductores | ❌ | ❌ |
| **Responder a Reseñas** | ❌ | ✅ Réplica Oficial | ✅ Moderación / Eliminación |
| **Reportar Incidencias** | ✅ Reporte de Usuario | ✅ Registro de Infracción | ✅ Registro & Supervisión |
| **Resolver Incidencias** | ❌ (Solo informativo) | ✅ Resolución Local | ✅ Resolución Global |
| **Padrón de Usuarios & Roles** | ❌ | ❌ | ✅ Asignación de Roles & PIN |

---

## 📦 Módulos Principales del Sistema

### 1. Centro de Control del Super Admin (Dueño de la Plataforma)
* **`PlatformGlobalDashboard.jsx` (Panel Global Ejecutivo)**:
  - KPIs en tiempo real: Recaudación bruta de la red, comisión líquida retenida (12%), volumen de estancias y ocupación en vivo.
  - Gráficos de Inteligencia de Negocios con **Recharts** (curva semanal de ingresos vs comisiones y donut chart de métodos de pago).
  - Monitor en vivo de cocheras con estado de cámaras de garita (*LPR Online 🟢*) y barra de capacidad.
  - Live Feed de eventos de la red (entradas por garita, cobros Yape/Plin y alertas).
* **`PlatformFinancesModule.jsx` (Finanzas & Liquidaciones Payout)**:
  - Registro de cocheras con RUC, Razón Social, Banco (BCP, BBVA, Interbank), Número de Cuenta y CCI.
  - Botón **"Liquidar Fondos"** que dispersa el saldo neto a la cochera y genera un **Voucher / Comprobante Oficial descargable e imprimible**.
  - Exportación contable completa a **CSV / Excel** para declaraciones SUNAT.
* **`PlatformSettingsModule.jsx` (Ajustes Maestros & Broadcast)**:
  - Configuración del % de comisión estándar y tiempo de gracia en garita (tolerancia de 15 min).
  - Conmutador de pasarelas de pago (Yape, Plin, Tarjetas Visa/MC, Smart Wallet) y selector Producción / Sandbox.
  - Interruptor de **Modo Mantenimiento** con mensaje de contingencia.
  - **Centro de Comunicados Masivos**: Disparo de notificaciones push a Conductores, Cocheras o toda la red.
* **`AffiliatedParkingsModule.jsx` (Gestión de Sedes & Solicitudes de Afiliación)**:
  - Bandeja de revisión de solicitudes de afiliación enviadas por dueños de cocheras desde el login.
  - Aprobación con 1 clic: crea la cochera en el mapa y genera la cuenta de Admin Local.

---

### 2. Software de Gestión para el Admin de Cochera (Afiliado)
* **`LocalEstablishmentManager.jsx` & `InteractiveFloorPlanDrawingStudio.jsx` (Estudio CAD)**:
  - Herramienta de dibujo arquitectónico 1:1 en lienzo interactivo (muros, plazas para autos, motos, discapacitados PMR, techadas, garitas y accesos peatonales).
  - Conmutador de estado de plazas en vivo (*Libre / Ocupado / Reservado*).
  - Configuración de tarifa horaria y aforo.
* **`ANPRMonitor.jsx` (Control de Garita LPR & Barrera)**:
  - Video en vivo / simulador de cámara OCR para lectura automática de matrículas vehiculares.
  - Apertura y cierre remoto de barrera con verificación de confianza OCR.
* **`ReservationsModule.jsx` (Operaciones de Garita)**:
  - Escáner y validador de códigos QR de conductores.
  - Registro de Check-In (Entrada) y Check-Out (Salida) con liquidación de tiempo excedido.
* **`StaffModule.jsx`**: Control de turnos (mañana, tarde, noche) y operadores de caja.
* **`ReviewsModule.jsx`**: Recepción y respuesta formal a comentarios de clientes.

---

### 3. Portal del Conductor (Cliente Final)
* **`AyacuchoMap.jsx` (Mapa Interactivo & Marquee)**:
  - Mapa interactivo con **Leaflet**, capas conmutables (*Calles de Alta Resolución / Satélite HD*) y geolocalización GPS.
  - **Cinta Continua Infinita (*Infinite Marquee*)**: Desplazamiento continuo de sedes fuera del mapa con radar animado en vivo y pausa automática al posar el cursor (*hover*).
  - Marcadores interactivos con popup directo para ver plano y reservar.
* **`CustomerInteractivePlanBooking.jsx` (Reserva Visual en Plano)**:
  - Selección táctil/clic del cajón deseado sobre el plano de la cochera.
  - Checkout integrado con Yape, Plin, Tarjeta o Monedero Virtual.
* **`DigitalAccessPassModal.jsx` (Pase QR)**:
  - Generación instantánea de Pase Digital dinámico con código QR, token ANPR y countdown de vigencia.
* **`LoyaltyClubModule.jsx` (Smart Club)**:
  - Acumulación de 10 puntos por Sol gastado y canje de horas de estacionamiento gratis.
* **`VehiclesModule.jsx` & `PaymentsModule.jsx`**: Gestión de placas vehiculares y tarjetas/billeteras.
* **`ReviewsModule.jsx` & `IncidentsModule.jsx`**: Calificación de cocheras y reporte de incidencias con fotografías.

---

## 💰 Estrategias de Monetización del Ecosistema

1. **Comisión por Transacción (10% - 12%)**: Retención automática sobre cada reserva o estancia pagada por la aplicación.
2. **Suscripción Mensual SaaS para Cocheras**: Planes Básico (S/ 49/mes), Pro con LPR (S/ 149/mes) y Enterprise (S/ 299/mes).
3. **Tarifa de Servicio / Conveniencia (S/ 0.80 por reserva)**: Pequeño recargo pagado por el conductor por garantizar su plaza en zonas de alta congestión.
4. **Pases Mensuales B2C (S/ 180 - S/ 250 / mes)**: Abonos para trabajadores del centro histórico de Huamanga.
5. **Venta de Hardware IoT (Kits LPR)**: Venta e instalación de cámaras IP de garita y controladoras de barrera.
6. **Publicidad Geolocalizada B2B**: Comercios cercanos (restaurantes, hoteles, lavaderos) que se promocionan en el mapa.
7. **Convenios Corporativos**: Facturación consolidada mensual para flotas de empresas e instituciones.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + Vite 8 | Renderizado reactivo ultrarrápido y modular |
| **Estilos & Diseño** | TailwindCSS v4 + Glassmorphism | Sistema de diseño claro (`#F8FAFC`, slate, emerald) |
| **Mapas & Geolocalización** | Leaflet 1.9 + CartoDB / Esri Satellite | Motor de mapas interactivo sin costos de API |
| **Estudio CAD** | Fabric.js 7 | Renderizado y manipulación de planos topográficos en 2D |
| **Business Intelligence** | Recharts 3 | Gráficos ejecutivos interactivos de recaudación y aforo |
| **Backend RESTful** | FastAPI (Python 3.11+) + Uvicorn | API REST asíncrona de alto rendimiento |
| **Tiempo Real** | Node.js WebSockets (Puerto 8080) | Transmisión bidireccional de estados de garita y sensores |
| **Base de Datos** | SQLite (aiosqlite) / PostgreSQL 15 | Persistencia relacional de usuarios, sedes y reservas |

---

## 🚀 Instalación y Despliegue Local

### Requisitos Previos:
- **Node.js**: v18+ o v20+
- **Python**: v3.10+ o v3.11+
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
```
*API disponible en: `http://127.0.0.1:8000/docs` (Swagger UI).*

### 3. Iniciar el Servidor de WebSockets:
```bash
# En una nueva terminal en la raíz del proyecto:
npm run ws
```
*Servidor WebSocket escuchando en `ws://localhost:8080`.*

### 4. Iniciar el Frontend (React + Vite):
```bash
# En una nueva terminal:
cd frontend
npm install
npm run dev
```
### 5. Despliegue en Producción (Railway.app):
El proyecto cuenta con configuración unificada mediante `railway.json` y `Dockerfile` multi-stage:
```bash
# Para desplegar en Railway con la CLI:
railway up
```
*Consulta la guía completa en [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) para vincular PostgreSQL.*

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
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Endpoints REST (Users, Establishments, Reservations, Reviews, Incidents, Staff, Payments)
│   │   ├── core/            # Configuración, JWT, Security & Hash
│   │   ├── db/              # Sesión asíncrona SQLAlchemy & SQLite/PostgreSQL
│   │   ├── models/          # Modelos relacionales en español (usuarios, estacionamientos, plazas, etc.)
│   │   ├── schemas/         # Esquemas Pydantic para validación de datos
│   │   └── main.py          # Entrypoint de FastAPI con CORS y Routers
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React (CAD, ANPR, Mapas, Dashboard, RBAC)
│   │   ├── context/         # AuthContext & EstablishmentContext
│   │   └── services/        # Cliente Axios sincronizado con Backend API
│   └── package.json
├── server/
│   └── ws-server.js         # Gateway de WebSockets para Telemetría LPR
├── Dockerfile               # Multi-Stage Docker Build para Producción
├── railway.json             # Configuración oficial de Despliegue en Railway
├── RAILWAY_DEPLOY.md        # Guía de Despliegue en la Nube
└── README.md
│   │   ├── core/            # Configuración, JWT, Hash de contraseñas
│   │   ├── db/              # Sesión asíncrona y Base de Datos SQLite
│   │   ├── models/          # Modelos relacionales SQLAlchemy
│   │   ├── schemas/         # Esquemas Pydantic para validación
│   │   └── main.py          # Entrypoint de FastAPI con CORS y Routers
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PlatformGlobalDashboard.jsx    # Panel Ejecutivo del Super Admin
│   │   │   ├── PlatformFinancesModule.jsx     # Finanzas, Comisiones & Liquidaciones
│   │   │   ├── PlatformSettingsModule.jsx     # Ajustes Maestros & Broadcast Push
│   │   │   ├── AffiliatedParkingsModule.jsx   # Sedes & Bandeja de Afiliaciones
│   │   │   ├── AyacuchoMap.jsx                # Mapa Interactivo Leaflet + Marquee
│   │   │   ├── LocalEstablishmentManager.jsx  # Gestor de Cochera del Afiliado
│   │   │   ├── InteractiveFloorPlanDrawingStudio.jsx # Estudio CAD 2D
│   │   │   ├── ANPRMonitor.jsx                # Monitor de Garita LPR con IA
│   │   │   ├── CustomerInteractivePlanBooking.jsx # Reserva Visual del Conductor
│   │   │   ├── DigitalAccessPassModal.jsx     # Pase QR Dinámico
│   │   │   ├── ReservationsModule.jsx         # Padrón & Operaciones de Garita
│   │   │   ├── IncidentsModule.jsx            # Módulo de Incidencias con RBAC
│   │   │   ├── ReviewsModule.jsx              # Muro de Reseñas & Calificaciones
│   │   │   ├── UserRolesModule.jsx            # Padrón Maestro de Usuarios & PIN
│   │   │   ├── StaffModule.jsx                # Gestión de Personal & Turnos
│   │   │   ├── AnalyticsGlobalModule.jsx      # Analítica de Red
│   │   │   ├── LoyaltyClubModule.jsx          # Smart Club & Puntos
│   │   │   ├── VehiclesModule.jsx             # Vehículos del Conductor
│   │   │   ├── PaymentsModule.jsx             # Pasarelas & Smart Wallet
│   │   │   ├── LoginAuthScreen.jsx            # Login & Solicitud de Afiliación
│   │   │   ├── Navbar.jsx                     # Barra Superior con Selector RBAC
│   │   │   └── Sidebar.jsx                    # Menú Lateral Compacto (185px)
│   │   ├── context/
│   │   │   ├── AuthContext.jsx                # Estado de Sesión & Autenticación
│   │   │   └── EstablishmentContext.jsx       # Estado Global de Cocheras, Planos y Afiliaciones
│   │   ├── App.jsx                            # Enrutador por Roles
│   │   └── index.css                          # Tokens de Diseño & Animaciones
│   └── package.json
├── server/
│   └── ws-server.js         # Gateway de WebSockets para Telemetría LPR
├── public/                  # Bundle estático sincronizado
└── README.md
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles. Desarrollado con tecnología de vanguardia para la transformación digital del estacionamiento urbano.
