# Modelos de Arquitectura C4 - Smart-Park

## 1. Nivel 1: Diagrama de Contexto del Sistema

```mermaid
C4Context
    title Diagrama de Contexto del Sistema Smart-Park

    Person(driver, "Conductor / Usuario", "Busca estacionamientos, visualiza planos 2D/3D y reserva plazas con pase QR.")
    Person(admin, "Admin Local / Operador", "Diseña el plano del lote en CAD, monitorea la garita ANPR y supervisa aforos.")
    Person(superadmin, "Super Administrador", "Audita la red global de estacionamientos afiliados y liquidaciones.")

    System(smartpark, "Plataforma Smart-Park", "Gestión integral de estacionamientos inteligentes, planos interactivos CAD, ANPR y reservas en tiempo real.")

    System_Ext(anpr_camera, "Cámaras ANPR Garita", "Reconocimiento óptico de placas vehiculares en accesos.")
    System_Ext(barrier_hardware, "Barrera Levadiza IoT", "Apertura y cierre automatizado mediante microcontroladores.")
    System_Ext(payment_gateway, "Pasarela de Pagos (Yape/Plin/Culqi)", "Procesamiento de pagos y liquidaciones instantáneas.")

    Rel(driver, smartpark, "Consulta planos, selecciona cajón y reserva", "HTTPS / WSS")
    Rel(admin, smartpark, "Dibuja planos CAD y controla accesos", "HTTPS / WSS")
    Rel(superadmin, smartpark, "Supervisa métricas globales", "HTTPS")
    Rel(smartpark, anpr_camera, "Recibe capturas de placas", "RTSP / Webhook")
    Rel(smartpark, barrier_hardware, "Envía comando de apertura", "MQTT / WebSocket")
    Rel(smartpark, payment_gateway, "Procesa transacciones", "REST API")
```

---

## 2. Nivel 2: Diagrama de Contenedores

```mermaid
C4Container
    title Diagrama de Contenedores de Smart-Park

    Person(user, "Usuario / Conductor / Admin", "Interacciona mediante navegador o dispositivo móvil.")

    Container(frontend, "Frontend SPA", "React 19, Vite, TailwindCSS, Radix UI", "Provee la interfaz de usuario, el Estudio CAD interactivo y el Gemelo Digital 3D.")
    Container(backend, "API Backend", "FastAPI (Python 3.11), SQLAlchemy, Pydantic", "Lógica de negocio, autenticación JWT, cálculo de tarifas y CRUD de planos.")
    Container(ws_gateway, "WebSocket Gateway", "Node.js (ws) / FastAPI WS", "Distribución de eventos en tiempo real (ANPR, estado de cajones y barreras).")
    ContainerDb(database, "Base de Datos Primaria", "PostgreSQL / SQLite", "Almacena usuarios, vehículos, planos arquitectónicos, reservas y transacciones.")

    Rel(user, frontend, "Usa la aplicación", "HTTPS")
    Rel(frontend, backend, "Consume servicios REST", "JSON/HTTPS")
    Rel(frontend, ws_gateway, "Sincroniza eventos en vivo", "WSS")
    Rel(backend, database, "Lee y escribe datos", "SQLAlchemy / TCP")
    Rel(ws_gateway, backend, "Valida estados y sesiones", "HTTP / IPC")
```

---

## 3. Nivel 3: Diagrama de Componentes (Módulo de Diseño de Planos CAD)

```mermaid
graph TD
    subgraph Frontend [Frontend SPA Component Architecture]
        FPE[FloorPlanEditor.jsx] --> Studio[InteractiveFloorPlanDrawingStudio.jsx]
        FPE --> DT3D[DigitalTwin3DView.jsx]
        FPE --> TM[TerrainMetricCADView.jsx]
        
        Studio --> Toolbar[Herramientas de Dibujo & Presets de Terreno]
        Studio --> Canvas[Lienzo Virtual & Agarres Figma]
        Studio --> PropsPanel[Panel de Propiedades & Ángulos]
        
        CustBooking[CustomerInteractivePlanBooking.jsx] --> PlanRenderer[Renderizador de Linderos & Siluetas]
        CustBooking --> DT3D
    end

    subgraph StateManagement [Sincronización de Estado Maestro]
        MasterState[(masterPlanElements en App.jsx)]
        Studio -.->|onSavePlan| MasterState
        MasterState -.->|planElements| CustBooking
    end
```
