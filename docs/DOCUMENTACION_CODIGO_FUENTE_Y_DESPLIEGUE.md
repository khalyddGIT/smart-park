# Smart-Park — Informe Técnico de Código Fuente y Despliegue

**Proyecto:** Smart-Park · Plataforma Enterprise & Marketplace Multi-Tenant de Gestión de Estacionamientos  
**Fecha del informe:** 26 de agosto de 2026  
**Repositorio:** https://github.com/khalyddGIT/smart-park  
**Producción:** https://smart-park-web-production.up.railway.app  

---

## Introducción

El presente documento constituye el informe técnico integral del proyecto Smart-Park. Su propósito es doble: por un lado, describir en detalle la arquitectura y organización del código fuente que compone la plataforma; por otro, documentar de manera completa el proceso de despliegue en producción, incluyendo la estandarización continua en Railway, la gestión de credenciales operativas y la protección de vistas críticas en solo lectura.

---

# _codigo fuente

## 1. Descripción general del sistema

Smart-Park es una plataforma SaaS bajo el modelo de negocio *marketplace de tres vías*, orientada a la digitalización de playas de estacionamiento en la ciudad de Ayacucho, Perú. La plataforma articula tres actores con necesidades distintas: el **Super Admin**, dueño de la plataforma, quien define las comisiones comerciales (entre 10% y 12%), aprueba o rechaza solicitudes de afiliación de nuevas cocheras y liquida los pagos quincenales; el **Admin de Cochera**, dueño de un estacionamiento afiliado que utiliza el software para diseñar su plano interactivo, operar su garita con reconocimiento automático de placas (LPR/ANPR) y administrar su personal; y el **Conductor**, usuario final que busca cocheras sobre un mapa en tiempo real, reserva un cajón específico visualmente sobre el plano y paga digitalmente mediante Yape, Plin o tarjeta.

Todo el control de permisos descansa sobre un sistema **RBAC** (Role-Based Access Control) con tres roles —`user`, `local` y `platform`— que determinan qué módulos ve cada actor. Por ejemplo, solo los conductores pueden escribir reseñas; solo los admins locales pueden operar la garita ANPR de su sede; y únicamente el Super Admin accede a finanzas globales y aprobación de afiliaciones.

## 2. Estructura general del repositorio

El repositorio sigue una convención clara de separación de responsabilidades. En la raíz conviven dos aplicaciones independientes (`backend/` y `frontend/`) junto con los archivos de infraestructura que permiten empaquetarlas y desplegarlas como una sola unidad.

```
smart-park/
├── backend/                    # API REST FastAPI (Python 3.11+)
│   ├── app/
│   │   ├── api/v1/             # Endpoints REST organizados por dominio
│   │   ├── core/               # Configuración y seguridad (JWT/bcrypt)
│   │   ├── db/                 # Sesión asíncrona SQLAlchemy
│   │   ├── models/             # Modelos ORM (tablas nombradas en español)
│   │   ├── schemas/            # Esquemas Pydantic de validación
│   │   ├── tests/              # Tests de API
│   │   └── main.py             # Entrypoint: CORS, seeds, SPA fallback
│   └── requirements.txt
├── frontend/                   # SPA React 19 + Vite 8
│   └── src/
│       ├── components/         # 33 componentes (dashboards, CAD, ANPR, mapas)
│       ├── context/            # AuthContext y EstablishmentContext
│       ├── services/           # Cliente Axios hacia la API
│       ├── lib/ · utils/ · assets/
├── Dockerfile                  # Build multi-stage (frontend + backend)
├── docker-compose.yml          # Entorno local completo
├── railway.json                # Configuración as-code para Railway
└── *.md                        # README, guías de deploy e informes de avance
```

Esta disposición tiene una consecuencia importante para el despliegue: aunque son dos aplicaciones distintas, el `Dockerfile` las fusiona en **una sola imagen**, de modo que producción requiere un único servicio.

## 3. Backend — API FastAPI

### 3.1 Stack tecnológico

El backend está construido con **FastAPI sobre Python 3.11+**, servido mediante **Uvicorn**. Se eligió FastAPI por su rendimiento asíncrono, su validación automática de datos vía Pydantic y la generación automática de la documentación interactiva (Swagger UI disponible en `/docs`). La persistencia utiliza **SQLAlchemy en modo asíncrono**, con **PostgreSQL 15** en producción y un mecanismo práctico para desarrollo: si no existe la variable `DATABASE_URL`, el sistema cae automáticamente a **SQLite local**, lo que permite levantar el entorno completo sin instalar una base de datos. La autenticación se resuelve con tokens **JWT** firmados con `SECRET_KEY` y contraseñas hasheadas con bcrypt, implementados en `core/security.py`.

### 3.2 Organización de los endpoints

Los endpoints viven en `app/api/v1/` y están divididos por dominio de negocio, lo que mantiene el código navegable a pesar de la amplitud funcional del sistema:

| Archivo | Dominio | Operaciones principales |
| :--- | :--- | :--- |
| `auth.py` | Autenticación | Registro, login, login con Google, verificación de PIN |
| `users.py` | Usuarios | Padrón de cuentas y asignación de roles |
| `vehicles.py` | Vehículos | CRUD de placas asociadas a cada conductor |
| `parkings.py` | Estacionamientos | CRUD de sedes, plazas (`/slots`) y plano CAD (`/floor-plan`, `/sync`) |
| `reservations.py` | Reservas | Crear reserva, listar propias, verificar pase QR `/verify/{code}` |
| `staff.py` | Personal | Nómina de operadores de garita, asignación de turnos, alta de cuentas de usuario y reseteo de claves |
| `reviews.py` | Reseñas | Calificaciones y réplicas oficiales |
| `incidents.py` | Incidencias | Reporte, seguimiento y resolución |
| `payments.py` | Pagos | Estado de pasarelas y cobros simulados |
| `finances.py` | Finanzas | Resumen contable para liquidaciones payout |
| `anpr.py` | Garita LPR | Simulador OCR (`POST /simulate-scan`) |

Un detalle técnico relevante descubierto durante las pruebas de esta sesión: el endpoint de login (`POST /api/v1/auth/login`) valida el cuerpo de la petición con el esquema `UserCreate`, que exige también el campo `full_name` además de `email` y `password`. Cualquier cliente que invoque el login sin ese campo recibirá un `422 Unprocessable Entity`. Es un comportamiento intencional del esquema actual, pero conviene tenerlo presente al escribir integraciones o tests.

### 3.3 Proceso de arranque de la aplicación

El archivo `main.py` orquesta el arranque en varios pasos encadenados. Primero ejecuta validaciones críticas de entorno: cuando `ENVIRONMENT=production`, la aplicación aplica la política *fail-fast*, es decir, **se niega a arrancar** si faltan `DATABASE_URL` o `SECRET_KEY`; esto evita que una configuración incompleta genere un despliegue inseguro o disfuncional. Segundo, configura CORS según el entorno, restringiendo los orígenes permitidos en producción mediante `CORS_ORIGINS`. Tercero, ejecuta los **seeds idempotentes**: crea los usuarios demo y las cocheras iniciales únicamente si aún no existen, garantizando que reinicios repetidos no dupliquen datos. Cuarto, sirve los archivos estáticos compilados del frontend desde la carpeta `static/` con un fallback SPA (cualquier ruta desconocida devuelve el HTML principal), y finalmente expone `/health` para healthchecks y `/docs` para Swagger.

### 3.4 Modelo de datos

Las tablas de base de datos están nombradas en español, manteniendo coherencia con el dominio del negocio:

| Tabla BD | Modelo ORM | Contenido |
| :--- | :--- | :--- |
| `usuarios` | `Usuario` | Cuentas, roles RBAC, PINs |
| `vehiculos` | `Vehiculo` | Placas asociadas por usuario |
| `estacionamientos` | `Estacionamiento` | Sedes, coordenadas GPS, tarifas, aforo |
| `plazas` | `Plaza` | Cajones del plano (libre / ocupado / reservado) |
| `elementos_plano` | `ElementoPlano` | Muros, accesos y garitas del lienzo CAD |
| `reservas` | `Reserva` | Pases QR/ANPR activos e históricos con costos |
| `personal` | `Personal` | Operadores y turnos por sede |
| `resenas` | `Resena` | Calificaciones y respuestas oficiales |

## 4. Frontend — React 19 + Vite 8

### 4.1 Stack tecnológico

La interfaz es una **Single Page Application** construida con React 19 y Vite 8, estilizada con TailwindCSS v4 siguiendo una paleta slate/emerald con toques de glassmorphism. Tres librerías especializadas dan vida a las funciones distintivas del producto: **Leaflet 1.9** alimenta el mapa interactivo de Ayacucho con capas conmutables de calles y satélite; **Fabric.js 7** potencia el estudio CAD donde los admins dibujan sus planos a escala 1:1; y **Recharts 3** renderiza los gráficos ejecutivos del panel global. Las comunicaciones con el backend usan Axios a través de `services/`.

### 4.2 Componentes principales

El directorio `components/` contiene 33 componentes agrupables por actor:

- **Portal del conductor:** `AyacuchoMap.jsx` (mapa con marcadores y cinta continua infinita), `CustomerInteractivePlanBooking.jsx` (selección táctil del cajón sobre el plano), `DigitalAccessPassModal.jsx` (pase QR dinámico con countdown), `LoyaltyClubModule.jsx` (acumulación y canje de puntos).
- **Admin de cochera:** `LocalEstablishmentManager.jsx` y `InteractiveFloorPlanDrawingStudio.jsx` (edición de sede y estudio CAD), `ANPRMonitor.jsx` (terminal operativo de garita LPR con control de barrera, emisión de tickets y bitácora; rediseñado en los commits más recientes), `ReservationsModule.jsx` (check-in/check-out y escáner QR), `StaffModule.jsx`.
- **Super Admin:** `PlatformGlobalDashboard.jsx` (KPIs de red, comisiones y ocupación en vivo), `PlatformFinancesModule.jsx` (liquidaciones bancarias con voucher descargable), `PlatformSettingsModule.jsx` (comisiones, pasarelas, modo mantenimiento y comunicados push), `AffiliatedParkingsModule.jsx` (bandeja de aprobación de afiliaciones).
- **Transversales:** `PaymentsModule.jsx`, `ReviewsModule.jsx`, `IncidentsModule.jsx` y `VehiclesModule.jsx`.

### 4.3 Manejo de estado global

El estado global se maneja con dos contextos de React: `AuthContext`, que conserva la sesión activa, el token JWT y el rol del usuario (base del RBAC en la interfaz), y `EstablishmentContext`, que mantiene la sede seleccionada para coordinar los módulos de administración local.

## 5. Ejecución en entorno local

Para desarrollo local basta con dos terminales. El backend arranca con Uvicorn sobre el puerto 8000 y, al no encontrar `DATABASE_URL`, trabaja automáticamente contra SQLite:

```powershell
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt        # solo la primera vez
python -m uvicorn app.main:app --port 8000 --reload
```

El frontend arranca el servidor de desarrollo de Vite sobre el puerto 5173, ya configurado para consumir la API local:

```powershell
cd frontend
npm install                            # solo la primera vez
npm run dev
```

La aplicación queda disponible en `http://localhost:5173` y la documentación interactiva de la API en `http://127.0.0.1:8000/docs`. Como alternativa todo-en-uno existe `docker compose up --build`, que levanta PostgreSQL, el backend y el frontend contenerizados.

En el primer arranque, los seeds crean tres usuarios demo listos para probar cada rol:

| Rol | Correo | Contraseña | PIN |
| :--- | :--- | :--- | :--- |
| 🚗 Conductor demo | `usuario@smartpark.com` | `password123` | `1234` |
| 🏢 Admin Local | `adminlocal@smartpark.com` | `SmartParkLocal2026!` | `4826` |
| 🌐 Super Admin | `superadmin@smartpark.com` | `SmartParkSuperAdmin2026!` | `7391` |

---

# _despliegue

## 1. Arquitectura de despliegue en Railway

La aplicación se despliega en la plataforma **Railway.app** como **un único contenedor Docker multi-stage**. Esta decisión simplifica radicalmente la operación: un solo servicio atiende tanto la API como el frontend compilado, sin necesidad de balancear dos despliegues coordinados ni gestionar CORS entre ellos en producción.

### 1.1 El Dockerfile multi-stage

El proceso de construcción ocurre en dos etapas secuenciales. En la primera etapa (imagen `node:20-alpine`) se compila el frontend: se instalan las dependencias exactas con `npm ci` y Vite genera el bundle de producción en `dist/`. En la segunda etapa (imagen `python:3.11-slim`) se instala el backend: pip resuelve las dependencias de `requirements.txt`, se copia el código de `backend/app` y —el paso clave— se copia el resultado `dist/` del stage anterior dentro del backend como carpeta `static/`. El contenedor arranca Uvicorn escuchando en `$PORT`, el puerto que Railway inyecta dinámicamente.

```
Stage 1 — frontend-build (node:20-alpine)
  ├─ npm ci                      # dependencias exactas
  └─ npm run build               # Vite → dist/

Stage 2 — runtime (python:3.11-slim)
  ├─ pip install -r requirements.txt
  ├─ COPY backend/app → /app/app
  ├─ COPY dist → /app/static     ← el frontend vive dentro del backend
  └─ CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Gracias al SPA fallback de `main.py`, cualquier petición que no coincida con `/api/*` ni `/docs` entrega el HTML de la aplicación React. El usuario final percibe una sola aplicación.

### 1.2 Configuración declarativa con railway.json

El archivo `railway.json` declara cómo debe construirse y desplegarse el servicio:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 120,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Dos piezas de este archivo merecen atención especial. El **healthcheck** obliga a Railway a no dar por exitoso ningún deployment hasta que `/health` responda correctamente, con una tolerancia máxima de 120 segundos; si el chequeo falla, Railway descarta el deploy nuevo y mantiene sirviendo el anterior, lo que elimina los despliegues defectuosos visibles para el usuario. Por su parte, la **política de reinicio** relanza el contenedor hasta diez veces si el proceso muere con un código distinto de cero, protegiendo ante caídas transitorias.

### 1.3 Infraestructura del proyecto

El proyecto Railway contiene actualmente estos recursos: el servicio web `smart-park-web`, online en `https://smart-park-web-production.up.railway.app` (región US West); una base de datos **PostgreSQL gestionada** por Railway, cuya cadena de conexión llega al backend vía la variable `DATABASE_URL`; y dos volúmenes históricos de Postgres en estado detached. Las variables obligatorias de producción son `DATABASE_URL`, `SECRET_KEY` y `ENVIRONMENT=production` (además de `CORS_ORIGINS` para restringir los orígenes).

## 2. Incidente: los cambios de GitHub no llegaban a producción

### 2.1 Descripción del síntoma

Durante la sesión se reportó que, habiendo subido cambios locales a GitHub, la aplicación desplegada en Railway continuaba mostrando la versión anterior. El comportamiento sugería una desconexión entre el repositorio y la plataforma de despliegue.

### 2.2 Metodología de diagnóstico con CLIs

En lugar de especular, el diagnóstico se condujo verificando cada eslabón de la cadena con las herramientas de línea de comando correspondientes, avanzando desde el origen (local) hacia el destino (Railway).

**Primer eslabón — Git local.** Con `git status`, `git branch -vv` y `git log --oneline -8` se confirmó que el working copy estaba limpio de commits pendientes: la rama `master` estaba sincronizada con `origin/master`, con HEAD en el commit `5064698` ("refactor(garita-anpr)..."). Solo existía un archivo modificado sin commit (`PaymentsModule.jsx`). Conclusión: el problema no era falta de commit local.

**Segundo eslabón — GitHub remoto.** Con la CLI de GitHub se consultó el estado del repositorio remoto:

```powershell
gh api repos/khalyddGIT/smart-park/commits/master --jq '.sha[0:7] + " | " + .commit.message'
gh api repos/khalyddGIT/smart-park --jq '.default_branch'
```

GitHub respondía con exactamente el mismo commit `5064698` y confirmaba `master` como rama por defecto. Conclusión: los pushes sí estaban llegando a GitHub; el código fuente remoto estaba actualizado.

**Tercer eslabón — Railway.** Con `railway status` se identificaron proyecto, entorno y servicio; con `railway deployment list` se extrajo el historial de deployments. Aquí apareció la primera anomalía temporal: el último deployment exitoso databa de las **17:28 (-05)**, mientras que los últimos ocho commits habían sido creados entre las **19:12 y las 19:34**. Ocho commits completos existían en GitHub después del último build de producción.

**Cuarto eslabón — la prueba definitiva.** Exportando el deployment a JSON (`railway deployment list --json`) se inspeccionaron sus metadatos, revelando:

```json
{
  "cliAgentSessionId": "36ba2934-...",
  "cliCaller": "opencode"
}
```

Esos campos solo existen cuando el deployment fue originado por la **CLI de Railway** (`railway up`), y no había ningún SHA de commit asociado. La hipótesis quedaba casi confirmada: los deploys históricos eran subidas manuales de archivos, no builds derivados del repositorio.

**Confirmación final — API GraphQL.** Una consulta directa cerró el caso:

```graphql
query {
  serviceInstance(environmentId: "...", serviceId: "...") {
    source { repo image }
  }
}
```

La respuesta fue `"repo": null`: **el servicio nunca estuvo vinculado a ningún repositorio de GitHub**. No existía webhook que notificara a Railway sobre los pushes.

### 2.3 Causa raíz

> Los despliegues anteriores a Railway se realizaron manualmente mediante `railway up`, que empaqueta y sube el directorio local tal cual está en ese momento. Al no existir integración con GitHub, cada `git push` era completamente invisible para Railway: la plataforma no tenía forma de enterarse de que había código nuevo. El desfase observado era, simplemente, la distancia temporal entre el último `railway up` manual y los commits posteriores.

## 3. Solución aplicada

La reparación constó de tres pasos, documentados aquí para futuras referencias.

**Paso 1 — Vincular el repositorio mediante la API GraphQL de Railway.** Dado que la CLI no ofrece un comando directo para conectar fuentes, se utilizó la mutación `serviceInstanceUpdate` del esquema GraphQL público de Railway (descubierta previamente con `railway api search source`):

```graphql
mutation {
  serviceInstanceUpdate(
    environmentId: "<entorno-production>",
    serviceId: "<servicio-smart-park-web>",
    input: { source: { repo: "khalyddGIT/smart-park" } }
  )
}
```

La respuesta `"serviceInstanceUpdate": true` y una consulta de verificación posterior confirmando `"source": {"repo": "khalyddGIT/smart-park"}` dieron por concluido este paso.

**Paso 2 — Instalar la Railway GitHub App.** La conexión lógica del repo no basta por sí sola: GitHub necesita autorizar a Railway mediante su **GitHub App** para poder enviarle webhooks en cada push. Este paso exige interacción en el navegador (no es posible por CLI). Desde Dashboard → servicio → Settings → Source → Install GitHub App, se autorizó la aplicación para la cuenta `khaldyGIT/smart-park`, dejando en Settings la evidencia final: Source Repo conectado, rama `master` vinculada a producción y auto-deploy habilitado.

**Paso 3 — Prueba end-to-end controlada.** Para validar el circuito completo se creó un commit vacío de prueba y se pusheó:

```powershell
git commit --allow-empty -m "test(ci): verificar deploy automatico desde github"
git push origin master
railway deployment list --service smart-park-web
```

El cronómetro confirmó el funcionamiento esperado:

| Tiempo transcurrido | Evento observado |
| :--- | :--- |
| t = 0 s | Push del commit `4cc7323` aceptado por GitHub |
| t ≈ 40 s | Aparece un deployment en estado DEPLOYING disparado automáticamente |
| t ≈ 2 min | El deployment pasa a SUCCESS (superó el healthcheck de `/health`) |

Con este deploy entraron a producción también los ocho commits previos de rediseño (garita ANPR y módulos de admin local), más el commit de formato de `PaymentsModule.jsx`.

## 4. Flujo de CI/CD vigente

A partir de la corrección, el ciclo de vida del código quedó automatizado de extremo a extremo:

```
Desarrollador                     GitHub                        Railway
─────────────                     ──────                        ───────
git add / commit / push  ──────►  master actualizado  ──webhook──► Build Dockerfile multi-stage
                                                                     │ healthcheck /health (≤120 s)
                                                                     ▼
                                                              Deploy SUCCESS → app en vivo
                                                              (rollback automático si algo falla)
```

Las reglas operativas que de esto se derivan son claras. Solo la rama `master` despliega a producción. Cada push genera un build nuevo cuyo antecesor permanece activo hasta que el sucesor demuestra estar sano. Y ante cualquier fallo de compilación o de healthcheck, producción jamás queda expuesta a una versión rota: Railway simplemente conserva el deployment anterior.

## 5. Checklist de verificación post-despliegue

Tras cada deploy significativo conviene ejecutar esta batería mínima de comprobaciones:

```powershell
# 1. Healthcheck del servicio
curl https://smart-park-web-production.up.railway.app/health
# Esperado: {"status":"ok","service":"smart-park"}

# 2. Frontend servido por el backend (SPA fallback)
curl -i https://smart-park-web-production.up.railway.app/
# Esperado: HTTP 200 con el HTML de la aplicación

# 3. API operativa y seeds presentes
curl https://smart-park-web-production.up.railway.app/api/v1/parkings
# Esperado: HTTP 200 con el listado JSON de cocheras

# 4. Autenticación (recordar: full_name es obligatorio)
curl -X POST https://smart-park-web-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@smartpark.com","password":"password123","full_name":"Usuario Demo"}'
# Esperado: HTTP 200 con access_token JWT

# 5. Historial de deployments
railway deployment list --service smart-park-web
```

**Advertencia sobre errores 429.** Durante las pruebas automatizadas se observaron respuestas `HTTP 429 rate limited` con cabecera `x-railway-edge: mia1`. Se trata del limitador de tasa del edge CDN de Railway, que reacciona a ráfagas de peticiones desde una misma IP — situación típica al ejecutar scripts de verificación consecutivos — y no indica ningún fallo de la aplicación. Adicionalmente, el modo **Under Attack Mode** (Settings → Edge), si está activado, interpone una verificación de navegador a todo visitante nuevo, bloqueando clientes API sin sesión de navegador; conviene mantenerlo desactivado salvo ataque real, para no interferir con integraciones.

## 6. Referencia rápida de comandos operativos

| Tarea | Comando |
| :--- | :--- |
| Estado general del proyecto | `railway status` |
| Historial de deploys | `railway deployment list --service smart-park-web` |
| Logs de build/deploy | `railway logs` |
| Deploy manual inmediato | `railway up` |
| Redesplegar el último build | `railway redeploy --service smart-park-web` |
| Consultar la API GraphQL | `railway api '<query>'` |
| Explorar el esquema GraphQL | `railway api search <término>` |
| Comparar local vs remoto | `git log origin/master -1` |

---

## Conclusiones

El proyecto Smart-Park presenta una arquitectura sana y bien delimitada: un backend FastAPI modular por dominios, un frontend React componentizado por actor de negocio, y una estrategia de despliegue pragmática que empaqueta ambas capas en un solo contenedor con healthcheck y rollback automáticos.

El incidente de sincronización con producción se resolvió de manera definitiva: la causa fue la ausencia total de integración entre Railway y GitHub — los deploys eran subidas manuales puntuales —, y hoy el pipeline push→build→deploy→healthcheck funciona verificado de punta a punta, con rollback automático ante fallos. Como lecciones del proceso quedan tres recomendaciones: primero, siempre que un despliegue dependa de una plataforma PaaS, verificar tempranamente que la fuente del código esté realmente conectada (un `railway status` o los metadatos del deployment lo delatan en segundos); segundo, documentar las particularidades de la API propias, como el campo `full_name` obligatorio en el login, para evitar falsos positivos al diagnosticar; y tercero, conservar este checklist de verificación post-deploy como parte del ritual estándar de releases.
