# 10 → Arquitectura C4, Decisiones y Escenario de Fallos

Este documento complementa la documentación técnica de **Smart Park** alineándose con el estándar C4 (Nivel 2 Contenedores), la Matriz de Decisiones Arquitectónicas (ADRs) y la Simulación Narrada de Escenarios de Fallo con Recuperación Asíncrona.

---

## 1. Diagrama C4 de Contenedores

El diagrama de contenedores muestra las aplicaciones, microservicios, brokers de eventos y bases de datos que conforman la plataforma **Smart Park**.

```mermaid
graph TB
    subgraph Actores_y_Usuarios ["👥 Actores del Sistema"]
        user(("📱 Conductor (user)"))
        local_staff(("👮 Trabajador / Garita"))
        local_admin(("🏢 Admin Local (local)"))
        platform_admin(("🌐 Admin Plataforma"))
    end

    subgraph Cliente_Web ["💻 Aplicación Cliente"]
        webapp["Smart-Park Web App<br/>(React + Vite + Tailwind CSS)"]
    end

    subgraph Plataforma_Central ["☁️ Plataforma Central Smart Park"]
        api_business["API & Servicios de Negocio<br/>(Python FastAPI + SQLAlchemy)"]
        notification_svc["Servicio de Notificaciones<br/>(Python Async + Twilio/SMS)"]
        db_central[(Base de Datos Central<br/>PostgreSQL 15)]
        cache_redis[(Caché de Disponibilidad<br/>Redis 7)]
        broker_rabbitmq[[Broker de Mensajes<br/>RabbitMQ AMQP]]
    end

    subgraph Estacionamiento_Afiliado ["🏢 Estacionamiento Afiliado (Edge)"]
        local_agent["Agente Sistema Local<br/>(Python FastAPI Edge)"]
        vision_svc["Servicio Visión Artificial<br/>(OpenCV + YOLO ANPR)"]
        db_local[(Base de Datos Local<br/>PostgreSQL/SQLite)]
        cameras["Cámaras IP / Tótems Garita"]
    end

    %% Conexiones de Actores
    user -->|HTTPS/REST| webapp
    local_staff -->|HTTPS/REST| webapp
    local_admin -->|HTTPS/REST| webapp
    platform_admin -->|HTTPS/REST| webapp

    %% Conexiones WebApp -> Backend
    webapp -->|HTTPS / REST Síncrono| api_business

    %% Conexiones Backend Central
    api_business -->|SQL / TCP Síncrono| db_central
    api_business -->|TCP Síncrono| cache_redis
    api_business -->|AMQP Asíncrono| broker_rabbitmq

    %% Conexiones Broker -> Notificaciones
    broker_rabbitmq -->|AMQP Eventos| notification_svc

    %% Conexiones Sistema Local Edge
    local_agent -->|API REST / HTTPS Síncrono| api_business
    local_agent -->|SQL / TCP Síncrono| db_local
    local_agent -->|Local Socket| cameras
    vision_svc -->|RTSP Stream| cameras
    vision_svc -->|AMQP Evento PlacaDetectada| broker_rabbitmq
    local_agent -->|AMQP / Sync Status| broker_rabbitmq
```

### 1.1. Resumen de Contenedores y Responsabilidades

| Contenedor / Componente | Responsabilidad Principal | Tecnología |
|---|---|---|
| **Aplicación Web Cliente** | Interfaz unificada responsiva (4 roles). | React + Vite + Tailwind CSS |
| **API & Servicios de Negocio** | Gestión de usuarios, reservas, pagos, tarifas, reseñas y reportes. | Python FastAPI + SQLAlchemy |
| **Servicio de Visión Artificial** | Reconocimiento de placas ANPR/LPR y bounding boxes. | Python + OpenCV + YOLO |
| **Servicio de Notificaciones** | Procesamiento asíncrono de alertas SMS/Push. | Python / FastAPI Async |
| **Agente Sistema Local (Edge)** | Autonomía operativa de garita ante desconexiones. | Python + FastAPI Edge |
| **Base de Datos Central** | Persistencia principal de toda la red. | PostgreSQL 15 |
| **Base de Datos Local (Edge)** | Almacenamiento temporal autónomo en cada parqueo. | PostgreSQL / SQLite |
| **Broker de Mensajes** | Desacoplamiento de eventos de negocio. | RabbitMQ (AMQP) |
| **Caché en Memoria** | Consultas ultra rápidas de plazas disponibles (< 3ms). | Redis 7 |

---

## 2. Tabla de Decisiones Arquitectónicas (ADR)

| Aspecto | Decisión Adoptada | Alternativa Considerada | Justificación | Riesgo y Medida de Control |
|---|---|---|---|---|
| **Estilo Arquitectónico** | Arquitectura distribuida (API Central + Agentes Locales Edge) | Monolito Centralizado | Permite a cada estacionamiento operar de forma autónoma en garita ante caídas de internet | Mayor complejidad operacional. Se automatiza con Docker Compose. |
| **Comunicación Síncrona** | API REST sobre HTTPS | Monolito con llamadas internas directas | Facilita la interoperabilidad entre Web App, Agentes Edge y API Central | Posibles timeouts en red. Se aplican reintentos y corta-circuitos. |
| **Comunicación Asíncrona** | RabbitMQ para eventos (`ReservaCreada`, `PlacaDetectada`) | Llamadas REST síncronas | Evita que el registro de una reserva dependa de que el Servicio de Notificaciones esté activo | Riesgo de duplicados. Se aplica idempotencia mediante UUIDs únicos. |
| **Gestión de Datos** | PostgreSQL Central + BD Local Edge por parqueo | Base de datos única compartida | Garantiza la continuidad operativa del negocio en cada local | Desincronización. Se sincroniza por ráfagas al restablecer conectividad. |
| **Consistencia** | Consistencia fuerte para reservas; consistencia eventual para notificaciones y reportes | Consistencia eventual total | Previene el doble arriendo o *overbooking* de una misma plaza | Mayor costo de bloqueo. Se optimiza en caché Redis con cierres atómicos. |
| **Seguridad** | Tokens JWT + PIN de Seguridad de 4 dígitos | Sesiones por Cookies en Servidor | Autenticación distribuida liviana entre cliente, API y agentes | Extracción de token. Expiración corta y PIN requerido para operaciones admin. |
| **Rendimiento** | Caché Redis para plazas libres | Consulta directa a PostgreSQL | Respuestas instantáneas (< 100ms en UI) para alta concurrencia de búsqueda | Caché desactualizada. Expiración corta (TTL 5s) y purga activa por evento. |

---

## 3. Escenario de Fallo Narrado y Recuperación

```mermaid
sequenceDiagram
    autonumber
    actor Conductor as 📱 Conductor
    participant API as ⚙️ API & Negocio Central
    participant DB as 🗄️ BD Central
    participant Redis as ⚡ Redis Caché
    participant Rabbit as 🐰 RabbitMQ
    participant Notif as 🔔 Servicio Notificaciones (CAÍDO)

    Conductor->>API: 1. POST /api/v1/reservations (Confirmar Reserva)
    API->>DB: 2. Transacción SQL (Crear Reserva RSV-8912)
    DB-->>API: 3. OK (Reserva Registrada)
    API->>Redis: 4. Actualizar estado cajón A-01 -> 'reserved'
    API->>Rabbit: 5. Publicar Evento 'ReservaCreada' (ID: EVT-991)
    API-->>Conductor: 6. HTTP 201 Created ("Reserva Confirmada. Notificación en camino")
    
    note over Notif: 7. SERVICIO DE NOTIFICACIONES FUERA DE LÍNEA
    Rabbit font-bold text-rose-500--xNotif: 8. Intento de entrega AMQP (FALLIDO - Sin ACK)
    note over Rabbit: 9. RabbitMQ conserva el mensaje en cola con persistencia en disco

    note over Notif: 10. SERVICIO DE NOTIFICACIONES SE RECUPERA
    Rabbit->>Notif: 11. Reenvío de Evento EVT-991
    Notif->>Notif: 12. Verificar Idempotencia (EVT-991 no procesado previamente)
    Notif-->>Rabbit: 13. ACK Enviado (Mensaje retirado de cola)
    Notif->>Conductor: 14. Envío de SMS / Notificación Push ("Pase QR RSV-8912 Listo")
```

### 3.1. Síntesis del Comportamiento ante Fallos
* **Continuidad del Negocio:** El conductor reserva su lugar y obtiene su código QR **sin ser bloqueado** por la caída del proveedor de SMS.
* **Garantía de Idempotencia:** Al recuperarse el `Servicio de Notificaciones`, se evalúa el ID único del evento (`EVT-991`) evitando duplicidad de mensajes.
* **Cero Pérdida de Datos:** RabbitMQ persiste el evento en disco hasta recibir el `ACK` del consumidor.
