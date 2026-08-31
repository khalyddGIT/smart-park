# Smart-Park — Plataforma Multi-Estacionamiento: Marketplace & Gestión Inteligente de Estacionamientos

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styles-Tailwind%20CSS%20v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet%201.9-199900.svg?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Recharts](https://img.shields.io/badge/BI%20Analytics-Recharts-22c55e.svg)](https://recharts.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015%20%7C%20SQLite-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
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
  - Herramienta de dibujo arquitectónico 1:1 en lienzo interactivo (muros, plazas para autos, motos, techadas, garitas y accesos peatonales).
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
| **Tiempo Real** | Simulación en cliente (WebSocket en Roadmap) | Estados de garita, notificaciones y telemetría |
| **Base de Datos** | PostgreSQL 15 (Railway) / SQLite (dev) | Persistencia relacional de usuarios, sedes y reservas |

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
```
*API disponible en: `http://127.0.0.1:8000/docs` (Swagger UI). Sin `DATABASE_URL` el backend usa SQLite local automáticamente.*

### 3. Iniciar el Frontend (React + Vite):
```bash
# En una nueva terminal:
cd frontend
npm install
npm run dev
```

### Alternativa: Docker Compose (entorno completo local)
```bash
docker compose up --build
```

### 4. Despliegue en Producción (Railway.app)
El proyecto se despliega como **un solo contenedor Docker multi-stage** (`Dockerfile` compila el frontend Vite y lo sirve desde FastAPI) configurado vía `railway.json`:

| Variable obligatoria | Valor | Descripción |
| :--- | :--- | :--- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Referencia al plugin PostgreSQL de Railway |
| `SECRET_KEY` | *(cadena aleatoria segura)* | Firma de tokens JWT |
| `ENVIRONMENT` | `production` | Activa validaciones estrictas de arranque |

> 🔒 En producción la aplicación **no arranca** si falta `DATABASE_URL` o `SECRET_KEY` (fail-fast), y el CORS queda restringido a los orígenes definidos en `CORS_ORIGINS`.

```bash
railway up   # despliegue directo con la CLI
```
*Guía completa paso a paso: [docs/RAILWAY_DEPLOY.md](docs/RAILWAY_DEPLOY.md)*

---

## 🌍 Producción y Usuarios Semilla

- **App:** https://smart-park-web-production.up.railway.app
- **Healthcheck:** `/health` · **Swagger:** `/docs`

Cuentas creadas automáticamente en el primer arranque (semilla idempotente):

| Rol | Correo | Contraseña | PIN |
| :--- | :--- | :--- | :--- |
| 🚗 Conductor demo | `usuario@smartpark.com` | `password123` | `1234` |
| 🏢 Admin Local | `adminlocal@smartpark.com` | `SmartParkLocal2026!` | `4826` |
| 🌐 Super Admin | `superadmin@smartpark.com` | `SmartParkSuperAdmin2026!` | `7391` |

> ⚠️ Rotar estas credenciales antes de un uso real en producción.

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
│   │   ├── core/              # config.py (settings + fail-fast), security.py (JWT/bcrypt), broker
│   │   ├── db/                # Sesión asíncrona SQLAlchemy (PostgreSQL / SQLite dev)
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
