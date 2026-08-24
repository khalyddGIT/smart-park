# Smart Park - Documentación de Avance Integral

**Fecha:** 2026-08-22
**Proyecto:** `khalyddGIT/smart-park`
**Plataforma de producción:** Railway (`smart-park-web-production.up.railway.app`)
**Stack:** `React 19 + Vite 8 + Tailwind v4 + Leaflet + Fabric.js` | `FastAPI + SQLAlchemy async` | `PostgreSQL Railway`

---

## 1. Resumen Ejecutivo

Sesión dedicada a **migrar producción de Vercel a Railway**, recuperar el despliegue caído, endurecer la configuración de producción y depurar el repositorio de artefactos legacy. Resultado final: sistema **Online**, **persistente** (Postgres con volumen), con arranque fail-fast, CORS restringido y repositorio limpio y documentado.

---

## 2. Diagnóstico Inicial

| Herramienta | Versión / ID | Hallazgo |
| :--- | :--- | :--- |
| Railway CLI | `5.41.2` · proyecto `ffc0eef7` · servicio `smart-park-web` | Servicio en estado `Failed`; Postgres `Online` |
| Logs de deploy | `railway logs --deployment` | Crash al arrancar uvicorn |

---

## 3. Problemas Detectados y Fixes

### 3.1 P0 — Contenedor en `Failed`: `ModuleNotFoundError: No module named 'aiosqlite'`
**Causa:** el servicio no tenía la variable `DATABASE_URL`, por lo que `config.py` hacía fallback silencioso a SQLite; el driver `aiosqlite` no estaba en `requirements.txt`.
**Fix:** variables en Railway (`DATABASE_URL=${{Postgres.DATABASE_URL}}`, `SECRET_KEY`) + `aiosqlite>=0.19.0` en [backend/requirements.txt](backend/requirements.txt). Redesploy con `railway up`.

### 3.2 P0 — `SECRET_KEY` con default hardcodeado
**Causa:** cualquiera con acceso al código podía firmar JWTs válidos si la variable no estaba definida.
**Fix:** default eliminado en `backend/app/core/config.py`; en producción su ausencia detiene el arranque.

### 3.3 P1 — Fallback silencioso a SQLite efímero
**Causa:** sin `DATABASE_URL`, la app arrancaba "bien" pero con datos no persistentes (pérdida silenciosa).
**Fix:** **fail-fast**: con `ENVIRONMENT=production`, falta de `SECRET_KEY` o `DATABASE_URL` ⇒ `RuntimeError` y contenedor detenido. Validado en los 3 escenarios (prod sin vars / prod completo / desarrollo).

### 3.4 P1 — CORS abierto (`allow_origins=["*"]` con credenciales)
**Fix:** CORS por entorno en `backend/app/main.py`: producción = solo orígenes explícitos (default: dominio Railway; extensible vía variable `CORS_ORIGINS`). Verificado con cabecera `Origin` ajena → respuesta sin `Access-Control-Allow-Origin`.

---

## 4. Cambios por Archivo

| Archivo | Cambio |
| :--- | :--- |
| `backend/requirements.txt` | + `aiosqlite` |
| `backend/app/core/config.py` | `ENVIRONMENT`, `SECRET_KEY` sin default, bloque fail-fast |
| `backend/app/main.py` | CORS por entorno, import `WebSocket` sin usar eliminado |
| `.gitignore` | + `public/`, `.agents/`, `skills-lock.json`, `supabase/.temp/`; dedup `*.log` |

## 5. Depuración del Repositorio (eliminación de legacy)

Eliminado por estar fuera de la arquitectura actual (Docker/Railway unificado):

| Elemento eliminado | Motivo |
| :--- | :--- |
| `api/index.py`, `vercel.json`, `.vercelignore`, root `requirements.txt` | Era del deploy en Vercel (hoy Docker multi-stage) |
| `index.html`, `css/`, `js/`, `modules/`, `img/` (raíz) | Prototipo estático pre-React, sustituido por `frontend/` |
| `server/ws-server.js`, `package.json`, `package-lock.json` (raíz) | WS demo simulado nunca desplegado; script de build orientado a Vercel |
| `public/` (bundle versionado) | Artefacto de build no debe versionarse |
| `supabase/.temp/`, cachés y logs locales | Estado local del CLI / temporales |

Se conservan: `supabase/migrations/` (SQL versionado), `Sistema de Estacionamiento/` (documentación de diseño), `docker-compose.yml` (entorno local válido).

## 6. Verificación Final (producción)

```
GET  /health                 -> {"status":"ok","service":"smart-park"}
GET  /api/v1/parkings        -> 200, 2 sedes sembradas (persistencia OK tras redeploy)
POST /api/v1/auth/login      -> 200 token JWT (conductor demo)
CORS origen permitido        -> Access-Control-Allow-Origin presente
CORS origen desconocido      -> cabecera ausente (bloqueado)
Railway status               -> smart-park-web ● Online · Postgres ● Online
```

Commits: `9da1932` (fix railway CMD) → `0bf5d72` (endurecimiento config) → cleanup + docs.

## 7. Estado Pendiente (no bloqueante)

- Push del commit a GitHub (`origin/master` quedó 1 commit atrás).
- Backups automáticos del Postgres de Railway + prueba de restore.
- Eliminar 2 volúmenes Postgres huérfanos *detached* en el proyecto.
- Migraciones con Alembic (antes de modificar modelos existentes; `create_all` no altera tablas ya creadas).
- Dominio propio `smartpark.com.pe` (descartado por costo ~S/75–125/año; Railway provee subdominio gratuito).

## 8. Cómo Reproducir / Comandos

```bash
# Estado del servicio
railway status

# Variables del servicio
railway variables --service smart-park-web --kv

# Despliegue directo desde local
railway up --service smart-park-web

# Logs del deployment activo
railway logs --deployment

# Verificación externa
curl https://smart-park-web-production.up.railway.app/health
```
