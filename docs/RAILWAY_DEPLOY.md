# 🚀 Guía de Despliegue en Railway — Smart-Park

Guía oficial para desplegar la plataforma **Smart-Park** en producción con [Railway](https://railway.app).

> **Objetivo de despliegue:** Railway con contenedor único, PostgreSQL gestionado y volumen persistente. Esta guía no confirma por sí sola que los cambios locales ya estén publicados.

---

## 🏗️ Arquitectura de Despliegue Unificado

Un solo contenedor Docker multi-stage ([Dockerfile](Dockerfile)) que empaqueta:
1. **Frontend (React 19 + Vite)**: compilado estáticamente y servido por FastAPI con fallback SPA.
2. **Backend (FastAPI + SQLAlchemy async)**: API REST en Python 3.11.
3. **Base de Datos PostgreSQL**: plugin gestionado de Railway con volumen persistente.

```
GitHub / railway up ──► railway.json ──► Dockerfile (multi-stage)
                                             │
                              ┌──────────────┴──────────────┐
                              ▼                             ▼
                   Stage 1: npm build Vite        Stage 2: Python 3.11 + uvicorn
                              └──────────────┬──────────────┘
                                             ▼
                          Contenedor único :8000 ◄──► Postgres Railway
```

---

## 📋 Pasos para Desplegar

### Paso 1: Conectar el Repositorio
1. Ingresa a [railway.app](https://railway.app) → **"New Project"** → **"Deploy from GitHub repo"** → selecciona `khalyddGIT/smart-park`.
2. Railway detecta [railway.json](railway.json) automáticamente (builder `DOCKERFILE`).

### Paso 2: Agregar PostgreSQL
1. **"+ New"** → **"Database"** → **"Add PostgreSQL"**.

### Paso 3: Variables del Servicio Web

| Variable | Valor | Obligatoria | Descripción |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | ✅ | Referencia al plugin PostgreSQL (única BD del sistema) |
| `SECRET_KEY` | *(cadena aleatoria segura)* | ✅ | Firma de tokens JWT |
| `ENVIRONMENT` | `production` | ✅ | Activa fail-fast y CORS estricto |
| `UPLOADS_DIR` | `/data/uploads` | ✅ | Persistencia de fotos (requiere Volume en `/data`, ver Paso 3b) |
| `CORS_ORIGINS` | `https://tudominio.com,...` | ➖ | Orígenes adicionales permitidos (separados por coma) |

Con la CLI:
```bash
railway variables --service smart-park-web \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set "SECRET_KEY=$(openssl rand -hex 32)" \
  --set "ENVIRONMENT=production" \
  --set "UPLOADS_DIR=/data/uploads"
```

> 🔒 **Fail-fast:** si falta `DATABASE_URL` o `SECRET_KEY` con `ENVIRONMENT=production`, el contenedor se detiene con error explícito en lugar de arrancar inseguro o con datos efímeros. El sistema opera exclusivamente con PostgreSQL: sin Postgres la app no arranca. El puerto lo asigna Railway automáticamente (no definir `PORT`).

### Paso 3b: Volume para Fotos (Persistencia de Uploads)

El filesystem del contenedor es **efímero**: sin Volume, las fotos de vehículos/placas se borran en cada deploy.

1. En el servicio web → pestaña **Volumes** → **"+ New Volume"** → *Mount Path:* `/data`.
2. Verifica que `UPLOADS_DIR=/data/uploads` esté definida (Paso 3). El `Dockerfile` ya crea esa ruta.
3. En local/docker la persistencia equivalente es el volumen `backend_uploads` de `docker-compose.yml`.

### Paso 4: Despliegue Automático
- Healthcheck: `GET /health/ready` (incluye conectividad PostgreSQL; timeout 120s).
- Dominio: genera HTTPS automático (`*.up.railway.app`) o conecta un dominio propio en *Settings → Networking*.

---

## 🟢 Verificación Post-Despliegue

| Recurso | URL |
| :--- | :--- |
| Aplicación SPA | `https://tu-app.up.railway.app/` |
| Healthcheck | `https://tu-app.up.railway.app/health/ready` (valida PostgreSQL sin exponer credenciales ni rutas) |
| Swagger Docs | Deshabilitado cuando `ENVIRONMENT=production`; disponible en `/docs` sólo en desarrollo |
| API ejemplo | `https://tu-app.up.railway.app/api/v1/parkings` |

> Verifica que `/health/ready` reporte `status: ready`; nunca debe exponer la cadena de conexión ni credenciales.

---

## 🛠️ Mantenimiento

- **Backups:** activar backups diarios del plugin Postgres (*Settings → Backups*) y probar un restore.
- **Migraciones:** el contenedor ejecuta `alembic upgrade head` antes de iniciar Uvicorn. Revisa y prueba cada nueva revisión contra una copia de la base antes de desplegarla.
- **Logs:** `railway logs --deployment` o desde el dashboard.
