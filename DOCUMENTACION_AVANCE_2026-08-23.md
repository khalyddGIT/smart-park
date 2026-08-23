# Smart Park — Documentación de Avance Integral

**Fecha:** 2026-08-23 (sesión extendida 22-23/08)
**Proyecto:** `khalyddGIT/smart-park`
**Producción:** Railway `https://smart-park-web-production.up.railway.app` · Postgres con volumen · Docker multi-stage
**Stack:** `React 19 + Vite 8 + Tailwind v4 + Leaflet + Fabric.js + Recharts + Lucide` | `FastAPI + SQLAlchemy async (PostgreSQL / SQLite dev)` | `culqi-python` (pagos)
**Rama:** `master` · **Commits en sesión:** `9da1932` → `2d2ab61` (23 commits)

---

## 1. Resumen Ejecutivo

Sesión de **2 días** que llevó el sistema de un despliegue caído (`Failed`) con múltiples módulos simulados y 4 vulnerabilidades críticas, a un **sistema productivo, persistente y en tiempo real** con:

- **Infraestructura:** migraciones Vercel → Railway, fail-fast, CORS y persistencia verificada.
- **Seguridad:** 22 hallazgos auditados y 10 críticos/corregidos (takeover de cuentas, escalada a Super Admin, PINs en claro, IDORs, barrera física sin auth, `sk_test` expuesto).
- **Funcionalidad:** 8 flujos de negocio reconectados de mock/localStorage a la API real (reseñas, reservas con cajón real, garita, personal, padrón, incidencias, finanzas, pagos).
- **Tiempo real:** polling + WebSocket (`/api/v1/ws`) con broadcast en cada mutación + refetch al enfocar pestaña — ya no hace falta recargar para ver cambios.
- **Diseño:** sistema base normalizado (botones 3×2, inputs h-10, cards h-full, tokens 4/8px) y 6 módulos refactorizados.
- **Repositorio:** 610 → 115 archivos versionados (solo sistema activo), documentación y `.gitignore` al día.

Producción queda **Online** con 37 endpoints y 15 tests pasando.

---

## 2. Diagnóstico Inicial

| Herramienta | Versión / ID | Hallazgo |
|---|---|---|
| Railway CLI | `5.41.2` · `ffc0eef7` · `smart-park-web` | Servicio `Failed`; Postgres `Online` |
| Logs | `railway logs --deployment` | `ModuleNotFoundError: No module named 'aiosqlite'` al arrancar uvicorn |

---

## 3. Infraestructura y Despliegue (Railway)

### 3.1 P0 — Contenedor en `Failed`
**Causa:** sin `DATABASE_URL` el backend hacía fallback a SQLite pero faltaba el driver `aiosqlite`.
**Fix:** variables `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `SECRET_KEY` aleatoria, `ENVIRONMENT=production` + `aiosqlite>=0.19.0` (`backend/requirements.txt`). `railway up` → `Online`.

### 3.2 Endurecimiento de producción
- `config.py`: `SECRET_KEY` sin default hardcodeado; fail-fast si falta `SECRET_KEY` o `DATABASE_URL` con `ENVIRONMENT=production`.
- `main.py`: CORS por entorno (`CORS_ORIGINS` + default `https://smart-park-web-production.up.railway.app`), import `WebSocket` muerto eliminado.
- `railway.json`: healthcheck `GET /health`.
- Dominio propio `smartpark.com.pe` evaluado: costo S/75-125/año en NIC.pe → se mantiene el subdominio gratuito de Railway (`*.up.railway.app`).

### 3.3 Limpieza del repositorio
Eliminado (era Vercel/prototipo/demo, ya excluido del build por `.dockerignore`):
`api/index.py`, `vercel.json`, `.vercelignore`, `requirements.txt` (raíz), `index.html`/`css`/`js`/`modules`/`img` (prototipo pre-React), `server/ws-server.js`, `package.json`/`package-lock.json` (raíz), `public/` (bundle), `supabase/.temp`, logs y `.npm-cache`. `.agents/` desversionado (tooling local).
Conservado: `backend/`, `frontend/`, `supabase/migrations/`, `Sistema de Estacionamiento/` (docs de diseño), `docker-compose.yml`.

**Resultado:** `git ls-files` 610 → 115.

### 3.4 Documentación actualizada
- `README.md`: sin WebSockets/Culqi falsos, estructura corregida (estaba rota/duplicada), variables obligatorias (`DATABASE_URL`, `SECRET_KEY`, `ENVIRONMENT`, `CORS_ORIGINS`), usuarios semilla y URL real.
- `RAILWAY_DEPLOY.md`: arquitectura contenedor único, tabla de variables con `ENVIRONMENT=production`, healthcheck, verificación y mantenimiento.
- `DOCUMENTACION_AVANCE_2026-08-22.md` y este documento.
- `.gitignore`/`.dockerignore`: `public/`, `.agents/`, `skills-lock.json`, `supabase/.temp/`, dedup `*.log`.

---

## 4. Seguridad — 22 Hallazgos Auditados, 10 Corregidos

### Auditoría estática (solo lectura de `backend/app/**`)
Verificado correcto: JWT con `algorithms=[HS256]` fijo (no `alg:none`), CORS por entorno, sin SQLi (ORM puro), sin secretos versionados.

| # | Severidad | Ubicación | Hallazgo | Fix |
|---|---|---|---|---|
| 1 | 🔴 Crítico | `auth.py:70` | `/auth/google` confiaba en `payload.email` si faltaba `GOOGLE_CLIENT_ID` o `token` | Fail-closed: `503` sin `GOOGLE_CLIENT_ID`, `400` sin token, email solo del token verificado |
| 2 | 🔴 Crítico | `auth.py:94` | Cuentas OAuth con `hashed_password` constante `GOOGLE_OAUTH_ACCOUNT` → login con esa cadena | `secrets.token_urlsafe(32)` aleatorio por usuario |
| 3 | 🔴 Crítico | `users.py` | Router `/users` sin auth — `PUT /users/1/role {"role":"platform"}` | `require_role("platform")` en todo el router; `role` forzado a `"user"` en creación |
| 4 | 🔴 Crítico | `staff.py` + `schemas.py:174` | `/staff` sin auth y `StaffResponse` exponía `security_pin` | `require_role("local","platform")` + `StaffResponse` sin PIN; password aleatoria si no se provee |
| 5 | 🟠 Alto | `models.py:40`, `auth.py:38` | `security_pin` en texto plano (`"1234"`), `verify-pin` compara en claro | `hash_pin`/`verify_pin_hash` con migración perezosa (legacy en claro sigue funcionando y se re-hashea al validar); semillas hasheadas |
| 6 | 🟠 Alto | `anpr.py:11` | `POST /anpr/simulate-scan` sin auth → cualquiera abre barrera | `require_role("local","platform")` |
| 7 | 🟠 Alto | `parkings.py` | CRUD de parkings/cajones/sync público | Escrituras con `require_role("local","platform")`, lectura pública intacta |
| 8 | 🟠 Alto | `reservations.py:39` | `GET /reservations/{id}` IDOR anónimo (filtraba `qr_code`, placa) | `current_user` + `user_id==current_user.id` o `local/platform` |
| 9 | 🟠 Alto | `vehicles.py:28` | `GET /vehicles/{id}` sin `current_user` | Ownership check (`403` si no es dueño ni `platform`) |
| 10 | 🟠 Alto | `reviews.py:54` | `PUT /reviews/{id}/reply` y `DELETE` sin auth | `reply` → `local/platform`; `delete` → autor o `platform` |
| 11-22 | 🟡 Medio/Bajo | varios | Sin rate limiting en login, `password` sin `min_length`, token 24h sin revocación, `create_all` sin migraciones, `secrets` en bundle, `class Config` deprecado, etc. | `UserCreate.password: Field(min_length=8)`, `sk_test` eliminado del bundle, `on_event`/`Config` documentados como deuda; rate limiting y `PyJWT`/`argon2` planificados |

Suite de regresión: `backend/app/tests/test_security.py` (11 tests) — todos `GET /users|/staff` sin token → `401`, conductor no puede usar `/users` → `403`, platform sí → `200`, Google sin `GOOGLE_CLIENT_ID` → `503`.

---

## 5. Funcionalidad — De Simulado a Real

### Auditoría de integración (26 componentes + 3 contexts vs 8 routers reales)
Resultado inicial: **1 Real · 10 Híbridos · 12 Simulados** (ver tabla completa en reporte del agente, commit `47a9aa0`).

### 5.1 Reseñas — bug reportado por el usuario
**Antes:** `INITIAL_REVIEWS` + `localStorage smart_park_reviews_v2` — nunca llamaba a `POST/GET /reviews`; otra cuenta no veía la reseña.
**Fix:** `ReviewsModule.jsx` ahora `GET /reviews` (público) + `POST /reviews` con `parking_id` real + `PUT /reviews/{id}/reply` + `DELETE /reviews/{id}`; lista `Loader2`, vacío honesto, toast y refresh post-mutación. Validado en producción: conductor crea `id=1` → lectura anónima ve `1` reseña.
**Commits:** reconexión + QR verificable (ver 5.6).

### 5.2 Reservas — cajón real + check-in/out vía API
- `CustomerInteractivePlanBooking` cargaba plano falso; `createReservation` enviaba `slot_id:1` fijo y `parking_id` caía a `1` para IDs `EST-*`.
- **Fix:** `GET /parkings/{id}/floor-plan` real; `slotId` real del `floor-plan`; `App.jsx` ahora pasa `slotId` (antes lo ignoraba → `NaN` bloqueaba la reserva y parecía que "me vota"); `updateEstablishmentPlan` envía `{parking_id, slots, elements}`; backend `FloorPlanSyncRequest.parking_id` opcional + sync con upsert por `code` (no borra cajones con reservas históricas, evita `FK 500`).
- Nuevos endpoints `PUT /reservations/{id}/check-in|check-out` (`local|platform`) con validación de transición (`scheduled→active→completed`) y movimiento de cajón `free→reserved→occupied→free`; `extend`/`cancel` ya existían.
- Frontend: `ReservationsModule` con `checkInReservation`/`checkOutReservation` → `PUT .../check-in|check-out`; después de pago en garita (ver 5.4).
- **Datetime 500:** `POST /reservations` fallaba `can't subtract offset-naive and offset-aware` — normalizado a UTC naive con `_naive_utc()` en `reservations.py`.
- Validado: `A-03 id=3 free → reserva id=2 scheduled (slot 3 reserved) → check-in active → check-out completed → slot free`.

### 5.3 Garita ANPR
`fetch('http://127.0.0.1:8000/...')` + fallback `startsWith('ABC')` que abría barrera sin verificar → reemplazado por `api.post('/anpr/simulate-scan', {parking_id, license_plate, gate_type})` fail-closed (sin token o sin coincidencia → `MANUAL_TICKET_REQUIRED`).

### 5.4 Pagos — de `Math.random` a Culqi honesto
`CulqiPaymentModal` generaba `chr_test_*` con `setTimeout`; `sk_test` expuesto en `PlatformSettingsModule` y en el bundle.
**Fix:** `CULQI_SECRET_KEY` solo en `core/config.py` desde `os.getenv` (Railway); frontend solo `pk_test_*`; `POST /payments/charge {amount_cents, currency, token_id, description}` → proxy a `https://api.culqi.com/v2/charges` con `Authorization: Bearer <secret>` (15s timeout); `GET /payments/status` público para badge honesto. Sin `CULQI_SECRET_KEY` → `503` honesto y el modal no marca como pagado ni emite QR. Bundle verificado: 0 ocurrencias de `sk_test`.

**Cambio de modelo de negocio (a pedido del usuario):** al reservar ya no se cobra — un solo botón **"Reservar Cajón — Pagarás al salir (S/ X/h)"** genera el QR gratis. El cobro real ocurre en el **check-out** de garita: el modal Culqi calcula `tarifa × horas reales` desde `actual_entry` y solo entonces hace `check-out`.

### 5.5 Edición de cochera no se veía en el panel del conductor
`LocalEstablishmentManager` editaba `description`, `phone`, etc. pero el modelo `Parking` no tenía esas columnas — solo vivían en localStorage del admin.
**Fix:** columnas `description`, `phone`, `email`, `reference`, `level` añadidas a `estacionamientos` (migración `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` en `main.py` startup); schemas `ParkingBase/Update` extendidos; `updateEstablishment` envía todo al `PUT /parkings/{id}`; el panel del conductor mapea esos campos al cargar `GET /parkings`.

### 5.6 QR verificable
Antes: payload decorativo con emojis, no verificable.
**Ahora:** QR = `https://.../verify/RSV-XXXX` (URL firmable) + endpoint público `GET /reservations/verify/{code}` (sin auth) que devuelve `{code, parking_name, slot_code, plate, status, start_time, end_time, total_cost}` + página `VerifyReservationPage.jsx` en `/verify/:code` (lectura directa de `window.location.pathname`, sin `react-router`) con estados `Válido` (scheduled/active) vs no válido. Validado: `verify/RSV-A3854A → cancelled`.

### 5.7 Módulo Incidencias (nuevo, full-stack)
Tabla `incidencias` (`parking_id`, `user_id`, `user_name`, `category`, `description`, `photo_url`, `status reported|resolved`, `resolution_note`, `created_at`, `resolved_at`); schemas `IncidentCreate/Resolve/Response`; router `POST/GET/GET{id}/PUT{id}/resolve` con RBAC (`user` ve solo suyas, `local/platform` todas + resolver); registrado en `main.py` (`Base.metadata.create_all` lo autocrea).

### 5.8 Finanzas / Notificaciones / Analytics — de semillas fijas a datos reales
- `PlatformFinancesModule` (`GET /finances/summary` `platform` exclusivo): agregación honesta de todas las reservas sin filtro `user_id` (a diferencia de `GET /reservations` que filtra), excluye `cancelled`, calcula `bruta/comisión 12%/neto` por sede y global, ordenada por recaudación.
- `NotificationContext`: polling 60s derivado de `GET /incidents` + `GET /reviews` + `GET /reservations/my-reservations` por rol, sin 12 semillas fijas.
- `AnalyticsGlobalModule`: `sum(total_cost)`, ocupación de `floor-plan`, distribución de reseñas por estrellas, afluencia por franja — todo desde fetches reales con estados vacíos honestos.

---

## 6. Tiempo Real y Optimización

**Problema reportado:** "cualquier acción requiere recargar para verse".

**Solución por capas:**
1. **Polling ligero** en `EstablishmentContext`: cocheras cada 20s, reservas cada 15s (solo con sesión).
2. **Refetch al enfocar pestaña** (`focus`/`visibilitychange`) — al volver de otra pestaña/rol se ve el cambio al instante.
3. **WebSocket** (`/api/v1/ws`): `RealtimeManager` en `backend/app/core/realtime.py` con `broadcast("parkings:updated" | "reservations:updated" | "incidents:updated" | "reviews:updated")` tras cada `commit` en `parkings.py`, `reservations.py`, `incidents.py`, `reviews.py`. Cliente en `EstablishmentContext` conecta a `wss://.../api/v1/ws` (mismo origen, reconexión con backoff 3s, heartbeat 25s) y refetchea al recibir el evento correspondiente. Fallback a polling si se cae.

Validado en producción: `wss://.../api/v1/ws` → `pong` OK; `PUT /parkings/1` → broadcast `{"event":"parkings:updated","parking_id":1}` recibido al instante.

---

## 7. Diseño — Refactor Visual por Capas

### Fase 1 — Sistema base (commit `298bc0b`)
- `index.css`: escala 4/8px estricta, tipografía `heading/subheading/body/caption`, utilidades `.icon-sm/md/lg`, `.grid-equal`, `.card-media h-40 object-cover`, focus ring esmeralda global.
- `button.jsx`: **3 variantes** `primary/secondary/ghost` × **2 tamaños** `sm (h-8)`/`md (h-10)` — `rounded-xl`, `gap-2`, `transition-all`, estados `hover/active:scale-97/focus:ring/disable` normalizados; SVGs `w-5 h-5 shrink-0`.
- `input.jsx`: `h-10`, `rounded-xl`, `px-3.5`, `focus:border-emerald-300 ring-2/20`.
- `card.jsx`: `h-full flex flex-col`, `p-6 gap-4`, `CardFooter mt-auto`.

### Fase 2 — Módulos (commits `2b2870d`, `2d2ab61`)
Normalizados a `variant/size` del sistema, íconos `w-5 h-5 shrink-0 gap-2`, `Input h-10`, `Card h-full gap-4 p-6`, `gap-4` y `overflow-x-auto`:
- `PlatformFinancesModule`, `AnalyticsGlobalModule`, `StaffModule`, `IncidentsModule`, `ReviewsModule`, `ReservationsModule`.

---

## 8. Estado Final y Pendientes

**Producción:** `health: ok` · 37 endpoints en `/api/v1/openapi.json` · 15 tests `passed` · `vite build` OK.

**Eliminado a pedido:** Smart Club & Recompensas (`f26f9b4`).

**Pendientes honestos (no bloquean el flujo crítico):**
- Rate limiting en login, `PyJWT`/`argon2`, tokens cortos con refresh, `class Config` → `ConfigDict`, `utcnow()` → `now(timezone.utc)`.
- `RUC/CCI/cuenta bancaria` por sede y persistencia de liquidaciones (hoy `localSettled` en memoria).
- `sk_test` aún `pk_test` de demo hasta configurar `CULQI_SECRET_KEY`/`VITE_CULQI_PUBLIC_KEY` reales en Railway.

---

## 9. Cómo Reproducir / Comandos

```bash
railway status
railway variables --service smart-park-web --kv
railway up --service smart-park-web
railway logs --deployment
curl https://smart-park-web-production.up.railway.app/health
curl https://smart-park-web-production.up.railway.app/api/v1/openapi.json | jq .paths
# Verificación QR pública (sin token):
curl https://smart-park-web-production.up.railway.app/api/v1/reservations/verify/RSV-XXXX
# WebSocket:
# wss://smart-park-web-production.up.railway.app/api/v1/ws → {"event":"pong"}
```
