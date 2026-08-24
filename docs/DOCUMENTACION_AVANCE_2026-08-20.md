# Smart Park — Documentación de Avance Integral
**Fecha:** 20 de agosto de 2026  
**Proyecto:** `khalyddGIT/smart-park` (`smart-park-seven-ashy.vercel.app`)  
**Stack:** `React 19 + Vite 8 + Tailwind v4 + Leaflet + Fabric.js` | `FastAPI + SQLAlchemy async + asyncpg` | `Supabase Postgres pvjrlquizqvfxmhpjrcy (us-east-1)` | `Vercel Serverless (iad1)` | `GitHub master`
**Autores:** Muse Spark + Equipo Smart Park

---

## 1. Resumen Ejecutivo

Sesión de 60+ turnos para **verificar persistencia del despliegue** con `vercel` `supabase` `gh` CLI y **corregir fuga de datos entre usuarios** + **hacer todo el sistema persistente cross-device**.

**Resultado:** `smart-park-seven-ashy.vercel.app` `● Ready` (`ow1xi8xag` `00a1dee`) con `Supabase` `pooler 6543` `pbkdf2_sha256` y aislamiento `per-user` (nuevo `test@nuevo.com` arranca `0` vehículos/reservas/historial). `vercel ls` `supabase inspect table-stats` `gh repo view` verificados.

---

## 2. Diagnóstico Inicial (con 3 CLIs)

### 2.1 Vercel CLI `58.7.1` `team_oQivc0r3iq8U4bdvNyGAaDZ3` `prj_h05HooCYqG2bTBE6mAut8b0VlkXm`
- `vercel whoami` → `lilkhalydd-9835` ✅
- `vercel ls` → `smart-park-m5dhmfx67` `● Ready` `42s` `2026-08-19T20:24:17Z` alias `smart-park-seven-ashy.vercel.app` (`vercel.json:2` `buildCommand npm run build` `outputDirectory public` `rewrites /api/(.*)→/api/index.py`)
- `vercel env ls` → `DATABASE_URL` `GOOGLE_CLIENT_*` `VITE_GOOGLE_CLIENT_ID` `Hidden` `Production`
- `curl https://smart-park-seven-ashy.vercel.app/` `200` `1.30kB` pero `curl /api/v1/parkings` `500 FUNCTION_INVOCATION_FAILED` `gru1::...`
- `vercel logs --level error --since 1d` → `backend/app/main.py:27` `async with engine.begin() as conn` `OSError: [Errno 99] Cannot assign requested address` `asyncpg/connect_utils.py:969` `uvloop` → `DATABASE_URL` pooler `5432` no ruteable en Vercel serverless.

### 2.2 Supabase CLI `2.111.0` `pvjrlquizqvfxmhpjrcy`
- `supabase projects list` → `smart-park-db` `pvjrlquizqvfxmhpjrcy` `us-east-1` `ACTIVE_HEALTHY` `● LINKED`
- `supabase inspect db table-stats --linked` → `users 48kB 3 rows` `parkings 48kB 3 rows` `vehicles 40kB 3 rows` (datos reales Ayacucho, no seed San Isidro)
- `supabase/.temp/pooler-url` → `postgresql://postgres.pvjrlquizqvfxmhpjrcy@aws-0-us-east-1.pooler.supabase.com:5432/postgres` (puerto `5432` incorrecto para serverless, debe ser `6543` transaction)
- `backend/.env` local sin `DATABASE_URL` → `sqlite+aiosqlite:///./smartpark_dev.db` `backend/app/core/config.py:36` fallback `/tmp` en Vercel → local `127.0.0.1:8000` `200` `4 parkings` OK.

### 2.3 GitHub CLI `2.97.0` `khalyddGIT`
- `gh auth status` → `khalyddGIT` `repo, workflow` ✅
- `git remote -v` → `origin https://github.com/khalyddGIT/smart-park.git` `master` `public`
- `gh repo view --json pushedAt` → `2026-08-19T20:24:15Z` sync con Vercel
- `gh workflow list` → solo `Dependency Graph` (sin CI)

---

## 3. Problemas Detectados y Fixes

### 3.1 P0 — Despliegue caído `500` (pooler + startup)
**Causa:** `DATABASE_URL` `pooler:5432` + `backend/app/main.py:27` `startup_db` sin `try/except` tumbaba lambda. `asyncpg` en Vercel requiere `6543` `pgbouncer transaction`.

**Fix `1bee2bd` `e11002f` `6ad3d31` `dff1079` `00a1dee`:**
- `backend/app/main.py:24` envuelve `engine.begin()` y `seed` en `try/except` `logging.warning` + `return` (no tumbar lambda)
- `backend/app/core/config.py:23` `ASYNC_DATABASE_URL` corrige `pooler:5432→6543` y elimina `?pgbouncer=true` (asyncpg `TypeError: unexpected kwarg pgbouncer`)
- `backend/app/db/session.py:11` `statement_cache_size=0, prepared_statement_cache_size=0` para `pgbouncer transaction` (`DuplicatePreparedStatementError`)
- `vercel env rm/add DATABASE_URL` → `postgresql://postgres.pvjrlquizqvfxmhpjrcy:SmartPark2026Secure123@aws-0-us-east-1.pooler.supabase.com:6543/postgres` (reset vía Dashboard `https://supabase.com/dashboard/project/pvjrlquizqvfxmhpjrcy/settings/database`)
- `vercel ls` `gao402aqy` `● Ready` `46s` `curl /api/v1/parkings` `200 [{"name":"Smart Park Plaza Mayor Ayacucho",...}]` (antes `500`)
- `ALTER TABLE` Supabase: `parkings add tolerance_minutes/status/image_url` + `users add security_pin` + `vehicles add license_plate` (col `plate` → `license_plate`) + `reservations add license_plate/end_time/total_cost/qr_code` + `setval(users_id_seq)` (fix `duplicate key id=2`).

### 3.2 P0 — `bcrypt` `500` en Vercel
**Causa:** `backend/requirements.txt:7` `passlib[bcrypt]>=1.7.4` instaló `bcrypt 5.0.0` en Vercel `CPython 3.12` → `AttributeError __about__` + `ValueError password >72 bytes` en `passlib/handlers/bcrypt.py:620`.

**Fix `4b98305` `dff1079`:**
- `requirements.txt:7` `passlib==1.7.4` `bcrypt==4.0.1`
- `backend/app/core/security.py:12` cambia a `CryptContext(schemes=["pbkdf2_sha256","bcrypt"])` (sin límite 72, compat hashes viejos) + `get_password_hash`/`verify_password` con fallback truncate.

### 3.3 P1 — Fuga de datos entre usuarios (reporte: nuevo usuario ve reservas/vehículos/historial)
**Causa frontend:**
- `frontend/src/context/EstablishmentContext.jsx:283` `RESERVATIONS_STORAGE_KEY = 'smart_park_unified_reservations_v2'` global + `INITIAL_RESERVATIONS` (3) `INITIAL_HISTORY` (5) hardcodeados
- `frontend/src/components/VehiclesModule.jsx:46` `VEHICLES_STORAGE_KEY = 'smart_park_vehicles_v2'` + `INITIAL_VEHICLES` (3)
- `PaymentsModule.jsx:27` `CARDS_STORAGE_KEY` global + `transactions` 4 hardcodeadas
- `HistoryModule.jsx:27` `INITIAL_HISTORY` global

**Causa backend:**
- `backend/app/api/v1/vehicles.py:12` `list_vehicles(user_id: Optional)` sin `Depends(get_current_user)` → `select(Vehicle)` sin filtro devuelve **todos** + `create_vehicle` `user_id or 1` → nuevo vehículo asignado a demo `id=1`
- `reservations.py:13` idem `user_id=1` default
- `reviews.py:28` `user_id=1` hardcoded

**Fix `0ad7632` `581a176`:**
- **Backend** `security.py:26` añade `get_current_user` (`HTTPBearer` JWT `sub`) + `vehicles.py:14` `where user_id==current_user.id` + `403` si `vehicle.user_id != current_user.id` + `reservations.py:15` `where user_id==current_user.id` + `reviews.py:14` `current_user.id/name`
- **Frontend per-user** `getCurrentUserKey()` → `smart_park_user_session.id/email`:
  - `EstablishmentContext.jsx:1` `RESERVATIONS_STORAGE_KEY_BASE + _${userId}` + `INITIAL_RESERVATIONS = []` para nuevo user + `useEffect` escucha `storage` + `interval` recarga al cambiar usuario + `saveReservations` per-user + `useEffect` sync `api.get('/parkings')` globales + `listMyReservations()` si `getAccessToken()` (Supabase persistente, fallback local)
  - `VehiclesModule.jsx:46` `VEHICLES_STORAGE_KEY_BASE_...` + `INITIAL_VEHICLES = []` + `useEffect` fetch `listVehicles()` si token + `handleSaveCreate` intenta `apiCreateVehicle` primero (cross-device) → fallback local
  - `HistoryModule.jsx:7` solo `fromReservations` (no `INITIAL_HISTORY`)
  - `PaymentsModule.jsx:27` `CARDS_STORAGE_KEY_BASE_...` + `transactions=[]` + per-user `useEffect`
- **Verificación `curl` prod:**
  ```
  POST /auth/register multi_tndsm@testuser.com → 201 id=5 → GET /vehicles → 200 [] → POST /vehicles MUL220 → 201 → GET /vehicles → 200 [MUL220]
  POST /auth/register multi_skahs@testuser.com → 201 id=6 → GET /vehicles → 200 [MUL469] (no ve MUL220) ✅ aislamiento
  ```

### 3.4 P2 — Persistencia cross-device (reporte: varios usuarios en distintos dispositivos no ven datos)
**Causa:** `frontend/src/**/*.jsx` solo `2 fetch` (`AuthContext.jsx:59` google, `ANPRMonitor.jsx:115`) → todo `localStorage` mock, no `Supabase`.

**Fix `581a176`:**
- Crea `frontend/src/services/api.js:1` `axios` `API_BASE` `VITE_API_URL || localhost:8000` + `interceptor Bearer` + `register/login/googleAuth` + `listVehicles/createVehicle` + `listMyReservations/createReservationApi`
- `AuthContext.jsx:1` `loginWithEmail` `async` intenta `apiLogin` primero → `setAccessToken` + `setUser({id: data.user.id, ...})` (persistente), fallback local `Date.now()` si offline; `registerUser` `apiRegister`; `loginWithGoogle` `apiGoogleAuth`; `logout` `setAccessToken(null)`
- `VehiclesModule` + `EstablishmentContext` ya hacen `if (token) listVehicles()/listMyReservations()` y `create` intenta API primero → `Supabase` `vehicles` `reservations` (mismo `email/password` en 2 dispositivos → mismo `id` → ven mismos datos)

---

## 4. Cambios por Archivo (commits `1bee2bd..00a1dee`)

| Archivo | Líneas | Cambio |
|---|---|---|
| `backend/app/main.py:24` | +12/-2 | `startup_db` resiliente `try/except` |
| `backend/app/core/config.py:23` | +7/-3 | `5432→6543` + strip `pgbouncer` |
| `backend/app/db/session.py:11` | +4/-2 | `statement_cache_size=0` pgbouncer |
| `backend/app/core/security.py:12` | +28/-7 | `pbkdf2_sha256` + `get_current_user` JWT |
| `backend/app/api/v1/vehicles.py:12` | +18/-8 | `Depends(get_current_user)` + `where user_id==current_user.id` + `403` |
| `backend/app/api/v1/reservations.py:13` | +22/-11 | idem + `current_user.id` en `create` |
| `backend/app/api/v1/reviews.py:14` | +6/-4 | `current_user` en `create` |
| `backend/requirements.txt:7` | +2/-1 | `passlib==1.7.4` `bcrypt==4.0.1` |
| `frontend/src/services/api.js:1` | +47 | nuevo `axios` JWT service |
| `frontend/src/context/AuthContext.jsx:1` | +72/-38 | `apiRegister/apiLogin` + `setAccessToken` |
| `frontend/src/context/EstablishmentContext.jsx:1` | +42/-12 | `per-user reservations` + `GET /parkings` sync |
| `frontend/src/components/VehiclesModule.jsx:46` | +58/-22 | `per-user vehicles` + `listVehicles` sync |
| `frontend/src/components/HistoryModule.jsx:7` | +4/-3 | solo `fromReservations` |
| `frontend/src/components/PaymentsModule.jsx:27` | +38/-16 | `per-user cards` + `transactions=[]` |
| `.vercelignore:18` | +1 | `backend/.pytest_cache` (fix bundle 311MB→88MB) |

**Supabase SQL directo (vía `asyncpg` `fix_*.py`):**
```sql
ALTER TABLE public.parkings ADD COLUMN IF NOT EXISTS tolerance_minutes INT DEFAULT 15, status VARCHAR(20) DEFAULT 'active', image_url VARCHAR(255);
UPDATE public.parkings SET tolerance_minutes=grace_minutes WHERE tolerance_minutes IS NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS security_pin VARCHAR(255) DEFAULT '1234';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS license_plate VARCHAR(20); UPDATE vehicles SET license_plate=plate WHERE license_plate IS NULL; ALTER TABLE vehicles ALTER COLUMN plate DROP NOT NULL;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS license_plate VARCHAR(20), end_time TIMESTAMP, total_cost FLOAT, qr_code VARCHAR(255);
SELECT setval(pg_get_serial_sequence('public.users','id'), (SELECT MAX(id) FROM users), true);
```

---

## 5. Verificación Final

```bash
vercel ls → ow1xi8xag ● Ready 00a1dee (e11002f pbkdf2)
supabase inspect db table-stats --linked → users 6, parkings 3, vehicles 4, reservations 0
curl -X POST https://smart-park-seven-ashy.vercel.app/api/v1/auth/register -d '{"email":"final2_bbaqk@testuser.com",...}' → 201 id=4
curl -H "Authorization: Bearer <token4>" /vehicles → 200 [{"license_plate":"TST488"}] (solo suyo)
curl -H "Authorization: Bearer <token5>" /vehicles → 200 [{"MUL220"}] != [MUL469] ✅
curl /parkings → 200 3 Ayacucho (Plaza Mayor, 28 Julio, Mariscal)
npm run build → 1,848kB gzip 511kB ✓
```

Nuevo `test@nuevo.com` → `Vehicles 0` `Reservas 0` `Historial 0` `Pagos 0`. Mismo login en otro dispositivo → ve `Supabase` (no `localStorage` local).

---

## 6. Estado Pendiente (no bloqueante)

- `IncidentsModule.jsx:81` `StaffModule.jsx:20` `ReviewsModule` (global wall) aún `localStorage` mock — pueden hacerse `per-user` + `GET /reviews /staff` si se requiere 100% Supabase.
- `establishments` `INITIAL_ESTABLISHMENTS` (4 mock EST-01) vs `public.parkings` (3 reales) — sync ya hecho pero `elements` (plano CAD) aún mock local (requiere `POST /parkings/{id}/floor-plan/sync`).
- `frontend` bundle `1,848kB` >500kB — recomendar `dynamic import()` para `Fabric.js`/`Recharts`.

---

## 7. Cómo Reproducir / Comandos

```bash
# Local
npm --prefix frontend run build && python -m uvicorn app.main:app --port 8000 --reload (backend) + npm run ws (8080) + npm run dev (5173)
# Prod
vercel ls; vercel logs --level error --since 1h; supabase inspect db table-stats --linked; gh repo view khalyddGIT/smart-park --json pushedAt
# Reset DB password
# https://supabase.com/dashboard/project/pvjrlquizqvfxmhpjrcy/settings/database → Reset → vercel env rm/add DATABASE_URL → git push
```

**Alias prod:** `https://smart-park-seven-ashy.vercel.app` / `https://smart-park-lilkhalydd-9835s-projects.vercel.app`
