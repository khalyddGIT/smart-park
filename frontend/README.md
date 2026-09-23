# 🎨 Smart Park — Frontend SPA & PWA Architecture

> **Cliente Web Progresivo (PWA) de Smart Park construido con React 19, Vite 8, Tailwind CSS v4, Motor CAD Fabric.js 7 y Mapas Cartográficos Nativos.**

---

## 🏗️ Stack Tecnológico Frontend

| Tecnología | Versión | Propósito en la Plataforma |
| :--- | :--- | :--- |
| **React** | 19.x | Núcleo de componentes reactivos y concurrencia. |
| **Vite** | 8.x | Servidor de desarrollo con HMR ultra-rápido y empaquetado de producción con Rolldown. |
| **Tailwind CSS** | v4 | Sistema de diseño atómico, soporte de modo oscuro y diseño responsive sin saturación de badges (*anti-slop*). |
| **Mapbox GL & Leaflet** | Nativo NPM | Motores de mapas satelitales y de calles empaquetados directamente en el bundle (sin dependencias CDN externas). |
| **Fabric.js** | 7.x | Motor de dibujo vectorial y manipulación de geometría de lotes en el Estudio CAD 2D. |
| **Recharts** | 3.x | Gráficos ejecutivos y cuadros de mando en tiempo real para Business Intelligence. |
| **Lucide React** | Última | Iconografía semántica y consistente en toda la plataforma. |
| **Axios** | 1.x | Cliente HTTP con interceptores de autenticación JWT y manejo centralizado de errores. |
| **Oxlint** | 0.x | Analizador estático de alta velocidad con verificación estricta de *Rules of Hooks*. |

---

## 📂 Estructura de Directorios

```
frontend/src/
├── assets/                  # Logotipos, recursos estáticos e iconografía vectorial
├── components/              # 33+ componentes divididos por dominio y rol
│   ├── map/                 # MapContainer3D.jsx, MapRoutes.js (Mapbox/Leaflet empaquetados)
│   ├── ui/                  # Componentes base reutilizables (botones, modales, confirm-dialog)
│   ├── PlatformGlobalDashboard.jsx     # Panel ejecutivo para Superadmin (KPIs de red)
│   ├── PlatformFinancesModule.jsx      # Dispersión financiera y vouchers de payout
│   ├── AffiliatedParkingsModule.jsx    # Solicitudes de afiliación y gestión de sedes
│   ├── UserRolesModule.jsx             # Directorio de cuentas, asignación de roles y PIN
│   ├── PlatformSettingsModule.jsx      # Ajustes maestros, pasarelas y broadcast
│   ├── AuditLogsModule.jsx             # Visor de auditoría forense inmutable
│   ├── AnalyticsGlobalModule.jsx       # Analítica predictiva y patrones de aforo
│   ├── LocalEstablishmentManager.jsx   # Gestión de sede local (4 pestañas, CRUD tarifarios y abonos)
│   ├── InteractiveFloorPlanDrawingStudio.jsx # Estudio CAD para diseño de cochera 1:1
│   ├── ANPRMonitor.jsx                 # Control de garita, cámara IP y apertura de barrera
│   ├── PersonalGaritaModule.jsx        # Operación táctica de recepción y cobro físico
│   ├── ReservationsModule.jsx          # Padrón de estancias y validación QR para garita
│   ├── StaffModule.jsx                 # Nómina de personal de cochera y turnos
│   ├── CustomerInteractivePlanBooking.jsx # Reserva táctil sobre el plano CAD para conductores
│   ├── MoreReservationsModal.jsx       # Abonos flexibles (3 sem, 1 mes, fraccionado) y fecha adelantada
│   ├── DigitalAccessPassModal.jsx      # Pase digital QR dinámico y pago de sobreestadía
│   ├── VehiclesModule.jsx              # Padrón de vehículos con auto-formato de placas
│   └── VerifyReservationPage.jsx       # Página pública de escaneo y validación de QR
├── context/
│   ├── AuthContext.jsx                 # Estado global de sesión, token JWT y perfil RBAC
│   └── EstablishmentContext.jsx        # Estado global de sedes, planos CAD y tarifas
├── services/                # Servicios de comunicación con la API REST de FastAPI
├── utils/
│   └── roleRoutes.js                   # Mapeo y protección de rutas y pestañas por rol
├── App.jsx                  # Orquestador principal, navegación por pestañas y modales
└── main.jsx                 # Punto de entrada, registro de Service Worker PWA v3
```

---

## 🛡️ Enrutamiento y Control de Acceso por Roles (RBAC)

El archivo `src/utils/roleRoutes.js` define estrictamente qué pestañas y componentes puede ver y ejecutar cada usuario:

### 1. Conductor (`user`):
* `explore`: Mapa satelital interactivo en Ayacucho y cinta continua (*Infinite Marquee*).
* `reservations`: Padrón limpio de reservas del usuario (programadas, activas, pasadas) con opción de pago de sobreestadía.
* `vehicles`: Gestión de vehículos con validación de placas peruanas estándar y alfanuméricas.
* `payments`: Pasarelas Culqi, PayPal y billeteras digitales.
* `history`: Historial de estancias y descarga de boletas electrónicas.
* `profile`: Perfil personal y seguridad.

### 2. Administrador de Cochera (`local`):
* `manager`: Gestión integral de la sede ([`LocalEstablishmentManager.jsx`](components/LocalEstablishmentManager.jsx)):
  - Pestaña 1: Información general y geolocalización.
  - Pestaña 2: **Switch maestro de abonos** y **CRUD de tarifarios dinámicos**.
  - Pestaña 3: Aforo y niveles de lote.
  - Pestaña 4: Calibración de cámaras y garita.
* `cad-studio`: Editor arquitectónico de distribución de cajones 1:1.
* `garita`: Módulo de operación de garita para recepción y salida de vehículos.
* `anpr`: Monitor LPR en tiempo real con apertura remota de barrera.
* `reservations`: Padrón operativo de reservas de la sede con check-in/check-out.
* `staff`: Nómina de operadores de garita y asignación de turnos.
* `incidents`: Atención de incidencias reportadas.
* `reviews`: Respuestas oficiales a calificaciones de clientes.

### 3. Superadministrador de Plataforma (`platform`):
* `dashboard`: Visión ejecutiva y consolidada de todas las playas de estacionamiento afiliadas.
* `analytics`: Analítica global de ingresos, comisiones y demanda de plazas.
* `finances`: Dispersión de fondos a cuentas bancarias de las cocheras y generación de vouchers oficiales.
* `affiliated`: Bandeja de postulación y aprobación de nuevas cocheras en 1 clic.
* `roles`: Directorio de usuarios y elevación/revocación de roles.
* `settings`: Parámetros maestros de la plataforma, comisiones y comunicados masivos.
* `audit`: Bitácora inmutable de eventos de seguridad.
* `resiliency`: Simulador de contingencia y resiliencia de red.

---

## 📱 Progressive Web App (PWA v3)

* **Service Worker (`public/sw.js`):** Versión `smartpark-pwa-v3` configurada con activación inmediata mediante `skipWaiting()` y `clients.claim()`.
* **Soporte Offline:** Caché de activos estáticos para garantizar la carga instantánea de la interfaz aún con baja cobertura móvil.
* **Instalación Nativa:** Compatible con Android (Chrome) e iOS (Safari "Añadir a pantalla de inicio").

---

## 🧪 Calidad de Código y Pruebas Automatizadas

```bash
# 1. Auditoría de React Hooks (0 errores garantizados):
npx oxlint -D rules-of-hooks

# 2. Compilación de Producción:
npm run build

# 3. Pruebas End-to-End con Playwright:
npx playwright test
```
