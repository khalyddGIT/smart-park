# 🅿️ Sistema de Estacionamiento Inteligente (Smart-Park)

> **Plataforma Enterprise de Gestión de Estacionamientos, Estudio CAD Arquitectónico, Gemelo Digital 3D, Cámaras ANPR y Reservas en Tiempo Real.**

---

## 📂 Estructura Modular del Proyecto

La carpeta `Sistema de Estacionamiento` organiza de manera modular y profesional todas las especificaciones, modelos de arquitectura, esquemas de base de datos, contratos de API y guías operativas:

```
Sistema de Estacionamiento/
│
├── 📚 docs/                                  # Especificaciones de Requerimientos y Casos de Uso
│   ├── 01-problema.md                        # Diagnóstico y planteamiento del problema en Ayacucho
│   ├── 02-requerimientos.md                  # Requerimientos funcionales (RF01-RF192) y no funcionales
│   ├── 03-casos-de-uso.md                    # Casos de uso de conductores, administradores y garita
│   ├── 04-stack-y-arquitectura.md            # Tecnologías, librerías y patrones de diseño
│   ├── 05-modelo-datos.md                    # Diccionario de datos y relaciones de entidades
│   ├── 06-contrato-de-api.md                 # Definición de endpoints REST y códigos de respuesta
│   ├── 07-diseno-de-interfaces.md            # Sistema de diseño, paleta de colores y componentes
│   ├── 08-roadmap.md                         # Fases de desarrollo e hitos del proyecto
│   ├── 09-plan-rediseno-ui-ux-shadcn.md      # Guía de modernización UI con Radix y Tailwind
│   ├── 10-arquitectura-c4-escenario-fallos.  # Resiliencia offline, degradación y redundancia
│   ├── 11-plan-geodiseno-terreno-profesional.# Cálculo de aforo métrico 1:1 y auditoría PMR
│   └── 12-estudio-cad-gemelo-digital-formas. # Estudio CAD, formas reales de lote (L, U, 45°) y sombra
│
├── 🏛️ architecture/                          # Modelos y Diagramas de Arquitectura C4
│   └── c4-models.md                          # Diagramas Contexto, Contenedores y Componentes
│
├── 🗄️ database/                              # Base de Datos Relacional y Migraciones
│   ├── schema.sql                            # DDL completo (PostgreSQL / SQLite)
│   └── seed_data.sql                         # Datos iniciales para Ayacucho - Huamanga
│
├── 📡 api-specs/                             # Contratos de Integración y Protocolos
│   ├── openapi-spec.json                     # Especificación OpenAPI 3.0 / Swagger
│   └── websocket-events.md                   # Esquemas de eventos WebSocket (ANPR, aforo, barrera)
│
├── 🚀 guide/                                 # Manuales de Usuario y Despliegue
│   ├── user-guide-cad-studio.md              # Manual de diseño de planos y reservas con pase QR
│   └── deployment-guide.md                   # Guía de puesta en marcha local y Docker
│
└── 📖 README.md                              # Índice Maestro y Mapa del Sistema (este archivo)
```

---

## 🌟 Módulos y Capacidades Clave

1. **🎨 Estudio CAD de Dibujo Arquitectónico ([`InteractiveFloorPlanDrawingStudio.jsx`](file:///d:/Escritorio/smart%20park/smart-park/frontend/src/components/InteractiveFloorPlanDrawingStudio.jsx)):**
   - Trazado de linderos, muros, calles, pasos de cebra, columnas, garitas y baterías de cajones.
   - Soporte para cualquier geometría de lote: **Rectangular**, **Lote en 'L' (Esquina)**, **Diagonal a 45°**, **Lote en 'U'** y **Lienzo Libre**.
   - Edificios colindantes y áreas verdes/jardines.
   - Plazas con estructura de sombra ⛱️ y plazas accesibles ♿ PMR.
   - Agarres interactivos para redimensionar y dial para rotar en 360°.
   - Exportación e importación en formato `.json`.

2. **🌟 Gemelo Digital 3D ([`DigitalTwin3DView.jsx`](file:///d:/Escritorio/smart%20park/smart-park/frontend/src/components/DigitalTwin3DView.jsx)):**
   - Perspectiva isométrica realista con muros extruidos en 3D, cubiertas tensadas de sombra y sensores ultrasónicos cenitales con LED en tiempo real.
   - Simulación de garita ANPR con apertura automatizada de barrera vehicular.

3. **🗺️ Reserva Fiel para el Conductor ([`CustomerInteractivePlanBooking.jsx`](file:///d:/Escritorio/smart%20park/smart-park/frontend/src/components/CustomerInteractivePlanBooking.jsx)):**
   - El cliente visualiza la forma exacta diseñada por el administrador (en 2D o en 3D).
   - Selección interactiva de plazas libres y generación instantánea del pase digital QR.

---

## ⚡ Ejecución Rápida

| Servicio | Comando | Puerto / URL |
| :--- | :--- | :--- |
| **Frontend (React 19 + Vite)** | `cd frontend && npm run dev` | `http://localhost:3000` |
| **Backend (FastAPI)** | `cd backend && python -m uvicorn app.main:app --port 8000` | `http://127.0.0.1:8000/docs` |
| **WebSocket Gateway** | `node server/ws-server.js` | `ws://localhost:8080` |
