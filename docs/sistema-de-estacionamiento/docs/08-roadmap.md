# 08 → Roadmap y Plan de Implementación

## Plan de Fases de Desarrollo

```mermaid
gantt
    title Plan de Desarrollo Smart Park
    dateFormat  YYYY-MM-DD
    section Fase 1: Arquitectura y BD
    Diseño de BD & Models SQLAlchemy      :active, f1_1, 2026-08-15, 3d
    Endpoints FastAPI (Auth, User, PIN)   :f1_2, after f1_1, 4d
    section Fase 2: Frontend & Core UI
    Setup React + Vite + Tailwind CSS      :f2_1, 2026-08-20, 3d
    Autenticación, Switcher Roles & Layout :f2_2, after f2_1, 4d
    section Fase 3: Editor Canva & Plano 2D
    Lienzo Canvas 2D & Herramientas       :f3_1, 2026-08-27, 5d
    Crosswalks & Pasos Peatonales          :f3_2, after f3_1, 3d
    Reservas sobre Plano 2D                :f3_3, after f3_2, 4d
    section Fase 4: ANPR, Garita & WS
    Simulador ANPR & Control Barrera       :f4_1, 2026-09-08, 4d
    WebSockets & Estado en Vivo            :f4_2, after f4_1, 4d
    section Fase 5: Pruebas & Docker
    Docker Compose & Pruebas E2E           :f5_1, 2026-09-16, 5d
```

---

## Hitos Entregables

1. **Hito 1 — Documentación Integral (100% Completado):**
   - Especificación completa de requerimientos (RF01-RF192), modelos de datos, arquitectura, contratos de API y prototipos UI en la carpeta `/Sistema de Estacionamiento`.

2. **Hito 2 — Backend FastAPI + PostgreSQL:**
   - Estructura limpia modular, endpoints REST v1, WebSockets nativos y persistencia con SQLAlchemy Async.

3. **Hito 3 — Frontend React + Tailwind CSS + Editor Canva:**
   - Interfaz responsive multi-perfil, soporte para PIN Keypad virtual, mapa interactivo y editor gráfico de planos 2D con pasos peatonales (*crosswalks*).

4. **Hito 4 — Módulo ANPR, Garita & WebSockets:**
   - Simulación de lectura de matrículas, apertura automática de talanquera y sincronización instantánea de ocupación de cajones.

5. **Hito 5 — Empaquetamiento Docker & Docker Compose:**
   - Despliegue con un solo comando (`docker-compose up --build`) para desarrollo y producción.