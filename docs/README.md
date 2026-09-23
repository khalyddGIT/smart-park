# 📚 Smart-Park — Centro de Documentación

> Índice centralizado de toda la documentación del proyecto. La documentación vive exclusivamente en GitHub: **ningún archivo de esta carpeta se incluye en la imagen Docker** (el `Dockerfile` solo copia `frontend/` y `backend/app`), por lo que no consume recursos del hosting.

## Informes y guías generales

| Documento | Contenido |
| :--- | :--- |
| [CAPITULO_4_1_Y_4_2_PRUEBAS_Y_VALIDACION.md](CAPITULO_4_1_Y_4_2_PRUEBAS_Y_VALIDACION.md) | **Capítulo 4 de Cierre de Proyecto**: 4.1 Pruebas integrales (Pytest, Playwright, Oxlint, ANPR) y 4.2 Validación de requerimientos y usabilidad (SUS) |
| [GUIA_EJECUCION_LOCAL.md](GUIA_EJECUCION_LOCAL.md) | Guía definitiva paso a paso de ejecución y pruebas locales (PostgreSQL, FastAPI, React Vite, credenciales por rol y troubleshooting) |
| [DOCUMENTACION_CODIGO_FUENTE_Y_DESPLIEGUE.md](DOCUMENTACION_CODIGO_FUENTE_Y_DESPLIEGUE.md) | Informe técnico integral: arquitectura del código fuente, rutas por rol, API REST y despliegue continuo en Railway |
| [DOCUMENTACION_SEGURIDAD_Y_BLINDAJE.md](DOCUMENTACION_SEGURIDAD_Y_BLINDAJE.md) | Blindaje de seguridad empresarial, tokens JWT, hashing Argon2/Bcrypt, rate limiting y escudos contra sabotaje de reservas |
| [DOCUMENTACION_BACKUPS_PRODUCCION.md](DOCUMENTACION_BACKUPS_PRODUCCION.md) | Estrategia de respaldos automatizados, volúmenes persistentes y recuperación ante desastres en Railway |
| [DOCUMENTACION_YOLO_INTEGRACION.md](DOCUMENTACION_YOLO_INTEGRACION.md) | Documentación técnica de integración de la red neuronal YOLOv8, control de concurrencia y clasificador híbrido OpenCV |
| [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) | Guía paso a paso del despliegue en producción (Railway) |
| [PROYECTO.md](PROYECTO.md) | Especificación funcional maestra del sistema, catálogo de requerimientos y matriz RBAC |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Esquema relacional completo de la base de datos PostgreSQL, diccionarios de datos y auto-migraciones DDL |
| [DOCUMENTACION_VISTAS.md](DOCUMENTACION_VISTAS.md) | Documentación gráfica de vistas por rol: Conductor, Administrador Local y Superadmin |

## Reportes de avance

| Documento | Fecha |
| :--- | :--- |
| [DOCUMENTACION_AVANCE_2026-08-20.md](DOCUMENTACION_AVANCE_2026-08-20.md) | 20 de agosto de 2026 |
| [DOCUMENTACION_AVANCE_2026-08-22.md](DOCUMENTACION_AVANCE_2026-08-22.md) | 22 de agosto de 2026 |
| [DOCUMENTACION_AVANCE_2026-08-23.md](DOCUMENTACION_AVANCE_2026-08-23.md) | 23 de agosto de 2026 |
| [DOCUMENTACION_AVANCE_2026-08-26.md](DOCUMENTACION_AVANCE_2026-08-26.md) | 26 de agosto de 2026 |
| [DOCUMENTACION_AVANCE_2026-08-29.md](DOCUMENTACION_AVANCE_2026-08-29.md) | 29 de agosto de 2026 |
| [DOCUMENTACION_AVANCE_2026-08-31.md](DOCUMENTACION_AVANCE_2026-08-31.md) | 31 de agosto de 2026 |

## Diseño del sistema (`sistema-de-estacionamiento/`)

Documentación de diseño y especificación técnica modular:

```
sistema-de-estacionamiento/
├── README.md               # Índice de la documentación de diseño
├── docs/
│   ├── 01-problema.md
│   ├── 02-requerimientos.md
│   ├── 03-casos-de-uso.md
│   ├── 04-stack-y-arquitectura.md
│   ├── 05-modelo-datos.md
│   ├── 06-contrato-de-api.md
│   ├── 07-diseno-de-interfaces.md
│   ├── 08-roadmap.md
│   ├── 09-plan-rediseno-ui-ux-shadcn.md
│   ├── 10-arquitectura-c4-escenario-fallos.md
│   ├── 11-plan-geodiseno-terreno-profesional.md
│   ├── 12-estudio-cad-gemelo-digital-formas.md
│   ├── 13-estrategia-negocio-roles-y-reservas.md
│   ├── 14-reglas-diseno-anti-slop.md
│   └── 15-reglas-de-negocio-reservas-tiempos-y-anti-sabotaje.md
├── architecture/c4-models.md
├── api-specs/              # openapi-spec.json · websocket-events.md
├── database/               # schema.sql · seed_data.sql
└── guide/                  # deployment-guide.md · user-guide-cad-studio.md
```

## Convenciones

- Los cambios que solo tocan esta carpeta deben marcarse con `[skip ci]` en el mensaje del commit para no disparar builds innecesarios en Railway.
- El `README.md` principal permanece en la raíz del repositorio (convención de renderizado de GitHub).
