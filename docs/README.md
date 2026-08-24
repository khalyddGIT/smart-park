# 📚 Smart-Park — Centro de Documentación

> Índice centralizado de toda la documentación del proyecto. La documentación vive exclusivamente en GitHub: **ningún archivo de esta carpeta se incluye en la imagen Docker** (el `Dockerfile` solo copia `frontend/` y `backend/app`), por lo que no consume recursos del hosting.

## Informes y guías generales

| Documento | Contenido |
| :--- | :--- |
| [DOCUMENTACION_CODIGO_FUENTE_Y_DESPLIEGUE.md](DOCUMENTACION_CODIGO_FUENTE_Y_DESPLIEGUE.md) | Informe técnico integral: arquitectura del código fuente, incidente de despliegue, diagnóstico con CLIs, solución CI/CD y checklist de verificación |
| [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) | Guía paso a paso del despliegue en producción (Railway) |
| [PROYECTO.md](PROYECTO.md) | Especificación funcional maestra (agnóstica al stack) |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Esquema relacional completo de la base de datos |
| [DOCUMENTACION_VISTAS.md](DOCUMENTACION_VISTAS.md) | Documentación de vistas de la aplicación |

## Reportes de avance

| Documento | Fecha |
| :--- | :--- |
| [DOCUMENTACION_AVANCE_2026-08-20.md](DOCUMENTACION_AVANCE_2026-08-20.md) | 20 de agosto de 2026 |
| [DOCUMENTACION_AVANCE_2026-08-22.md](DOCUMENTACION_AVANCE_2026-08-22.md) | 22 de agosto de 2026 |
| [DOCUMENTACION_AVANCE_2026-08-23.md](DOCUMENTACION_AVANCE_2026-08-23.md) | 23 de agosto de 2026 |

## Diseño del sistema (`sistema-de-estacionamiento/`)

Documentación de diseño heredada de la fase de especificación, organizada en subcarpetas:

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
│   └── 12-estudio-cad-gemelo-digital-formas.md
├── architecture/c4-models.md
├── api-specs/              # openapi-spec.json · websocket-events.md
├── database/               # schema.sql · seed_data.sql
└── guide/                  # deployment-guide.md · user-guide-cad-studio.md
```

## Convenciones

- Los cambios que solo tocan esta carpeta deben marcarse con `[skip ci]` en el mensaje del commit para no disparar builds innecesarios en Railway.
- El `README.md` principal permanece en la raíz del repositorio (convención de renderizado de GitHub).
