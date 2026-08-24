# 🚀 Guía de Despliegue en Railway — Smart-Park

Guía oficial para desplegar la plataforma **Smart-Park** en producción con [Railway](https://railway.app).

> ✅ **Estado actual:** desplegado y verificado en `https://smart-park-web-production.up.railway.app`

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
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | ✅ | Referencia al plugin PostgreSQL |
| `SECRET_KEY` | *(cadena aleatoria segura)* | ✅ | Firma de tokens JWT |
| `ENVIRONMENT` | `production` | ✅ | Activa fail-fast y CORS estricto |
| `CORS_ORIGINS` | `https://tudominio.com,...` | ➖ | Orígenes adicionales permitidos (separados por coma) |

Con la CLI:
```bash
railway variables --service smart-park-web \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set "SECRET_KEY=$(openssl rand -hex 32)" \
  --set "ENVIRONMENT=production"
```

> 🔒 **Fail-fast:** si falta `DATABASE_URL` o `SECRET_KEY` con `ENVIRONMENT=production`, el contenedor se detiene con error explícito en lugar de arrancar inseguro o con datos efímeros. El puerto lo asigna Railway automáticamente (no definir `PORT`).

### Paso 4: Despliegue Automático
- Healthcheck: `GET /health` (timeout 120s, reinicio automático ante fallos).
- Dominio: genera HTTPS automático (`*.up.railway.app`) o conecta un dominio propio en *Settings → Networking*.

---

## 🟢 Verificación Post-Despliegue

| Recurso | URL |
| :--- | :--- |
| Aplicación SPA | `https://tu-app.up.railway.app/` |
| Healthcheck | `https://tu-app.up.railway.app/health` |
| Swagger Docs | `https://tu-app.up.railway.app/docs` |
| API ejemplo | `https://tu-app.up.railway.app/api/v1/parkings` |

---

## 🛠️ Mantenimiento

- **Backups:** activar backups diarios del plugin Postgres (*Settings → Backups*) y probar un restore.
- **Migraciones:** actualmente el esquema se crea con `create_all` idempotente al arranque; planificar adopción de Alembic antes de modificar modelos existentes.
- **Logs:** `railway logs --deployment` o desde el dashboard.
