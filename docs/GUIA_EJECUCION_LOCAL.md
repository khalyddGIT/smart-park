# 🚀 Guía de Ejecución y Pruebas en Entorno Local — Smart-Park

Esta guía detalla el procedimiento paso a paso para levantar, operar, probar y auditar el ecosistema completo de **Smart-Park** en un entorno de desarrollo local (Windows, macOS o Linux).

---

## 📋 1. Requisitos Previos del Sistema

Asegúrate de contar con las siguientes herramientas instaladas en tu máquina:

| Herramienta | Versión Recomendada | Comprobación en Terminal |
| :--- | :--- | :--- |
| **Python** | 3.11, 3.12 o 3.13 | `python --version` |
| **Node.js** | 18.x, 20.x o superior | `node -v` |
| **npm** | 9.x o superior | `npm -v` |
| **PostgreSQL** | 15, 16 o 18 (Nativo o Docker) | `psql -U postgres -V` o `Get-Service *postgres*` |
| **Git** | 2.40+ | `git --version` |

> [!IMPORTANT]
> **PostgreSQL es de uso exclusivo**: SQLite se encuentra completamente eliminado y deshabilitado de la arquitectura de Smart-Park para asegurar la consistencia transaccional y los tipos de datos relacionales en todos los entornos.

---

## 🗄️ 2. Configuración de la Base de Datos (PostgreSQL)

Smart-Park requiere una base de datos PostgreSQL activa con credenciales accesibles.

### Opción A: PostgreSQL Nativo en Windows / Linux (Recomendada)
1. Verifica que el servicio de PostgreSQL esté en ejecución:
   ```powershell
   # En Windows PowerShell:
   Get-Service *postgres*
   ```
2. Asegúrate de que la base de datos `smartpark_db` exista. Puedes crearla desde `psql`:
   ```sql
   CREATE DATABASE smartpark_db;
   ```
3. Configura las variables en el archivo `backend/.env`:
   ```env
   ENVIRONMENT=development
   DATABASE_URL=postgresql://postgres:root@localhost:5432/smartpark_db
   SECRET_KEY=smart_park_super_secret_jwt_key_2026_ayacucho
   UPLOADS_DIR=./uploads
   ```
   *(Ajusta el usuario `postgres` y la contraseña `root` según tu configuración local).*

### Opción B: PostgreSQL mediante Docker
Si prefieres no instalar PostgreSQL en el sistema operativo anfitrión:
```bash
docker compose up -d postgres
```
Esto levantará el contenedor de Postgres 16 mapeado en el puerto local y con el volumen persistente `postgres_data`.

---

## ⚙️ 3. Puesta en Marcha del Backend (FastAPI + ASGI Uvicorn)

El backend de Smart-Park incluye un inicializador inteligente en el arranque (`startup_db`) que:
- Aplica migraciones dinámicas ligeras en PostgreSQL si faltan columnas.
- Genera automáticamente las sedes iniciales (*Smart Park Plaza Mayor*, *Jr. Bellido*, *Mercado Cáceres*, *Sótano 1*).
- Inicializa el plano 2D con cajones CAD (`A-01` a `B-04`) y vías vehiculares.
- Siembra de forma idempotente los usuarios demo con sus roles y contraseñas cifradas con `bcrypt`.

### Pasos para levantar el Backend:

1. **Abrir terminal en el directorio `backend`**:
   ```bash
   cd "backend"
   ```

2. **Crear y activar el entorno virtual de Python**:
   - En Windows (PowerShell):
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - En Linux / macOS:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Iniciar el servidor Uvicorn**:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

5. **Verificación de operatividad**:
   - Salida esperada en consola:
     ```
     INFO: Application startup complete.
     INFO: Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
     ```
   - **Documentación Interactiva Swagger**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - **Healthcheck**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 💻 4. Puesta en Marcha del Frontend (React 19 + Vite + Tailwind v4)

1. **Abrir una segunda terminal en el directorio `frontend`**:
   ```bash
   cd "frontend"
   ```

2. **Instalar dependencias de Node**:
   ```bash
   npm install
   ```

3. **Ejecutar el servidor de desarrollo Vite**:
   ```bash
   npm run dev
   ```

4. **Acceder a la aplicación**:
   - Abre tu navegador web en: **[http://localhost:5173](http://localhost:5173)**

---

## 🔑 5. Directorio de Credenciales Semilla por Rol

El sistema viene preconfigurado con cuatro cuentas demo que cubren la totalidad de los flujos de negocio. Puedes usarlas en el formulario de inicio de sesión o seleccionar el rol directamente:

| Rol | Correo Electrónico | Contraseña | PIN de Garita | Ámbito / Privilegios |
| :--- | :--- | :--- | :--- | :--- |
| **SuperAdmin (Plataforma)** | `superadmin@smartpark.com` | `SmartParkSuperAdmin2026!` | `7391` | **Control Macro Global**: Todas las sedes, comisiones del 12%, afiliaciones, finanzas, RBAC y auditoría. |
| **Administrador Local** | `adminlocal@smartpark.com` | `SmartParkLocal2026!` | `4826` | **Gestión de Sede**: Tarifas por hora/minuto/noche, editor CAD 2D, nómina de personal y moderación. |
| **Operador de Garita** | `operador.garita@smartpark.pe` | `Operador2026!` | `2580` | **Operación Táctica en Pista**: Registro rápido por placa, apertura de barrera, ticket térmico y cobro. |
| **Conductor Demo** | `usuario@smartpark.com` | `password123` | `1234` | **Cliente Final**: Garaje digital, reserva interactiva 2D, Pase Digital QR con tolerancia de 15 min. |

---

## 🧪 6. Guía Rápida de Pruebas de Flujos E2E

### Flujo 1: Conductor — Reserva Interactiva en Plano CAD 2D
1. Ingresa a `http://localhost:5173` con rol **Conductor**.
2. Selecciona la sede **"Smart Park Plaza Mayor - Planta Baja"**.
3. Pulsa el botón **"Reservar Plaza"**.
4. En el modal interactivo, haz clic sobre una plaza libre (verde, ej. `A-03`), escoge tu vehículo o escribe una placa, selecciona el tiempo estimado y pulsa **"Confirmar Reserva"**.
5. Se abrirá de inmediato el **Pase Digital con QR Dinámico**, mostrando el código de acceso, cuenta regresiva de tolerancia (15 minutos) y botones de navegación GPS hacia Waze / Google Maps.

### Flujo 2: Garita — Registro Rápido & Cobro Express
1. Cambia de rol a **Personal de Garita** (o inicia sesión con PIN `2580`).
2. En la barra de entrada rápida, introduce la placa registrada (ej. `ABC-123`) y presiona `Enter`.
3. Verás que el aforo se descuenta en vivo y el vehículo aparece en la lista de estancias activas.
4. Para dar salida, haz clic en **"Cobrar / Salida"**: se calculará el tiempo de estadía, el monto exacto según la tarifa y se desplegará el **Ticket Térmico Digital**.

### Flujo 3: Admin Local — Tarifas Dinámicas & Plano CAD
1. Cambia de rol a **Administrador Local**.
2. Ve al módulo **"Mi Establecimiento"**:
   - Ajusta las tarifas por minuto (ej. S/ 0.08 auto) o el recargo del turno noche.
   - Accede a la pestaña **"Plano 2D"** para arrastrar cajones, rotar plazas o agregar zonas de tránsito.
   - Guarda los cambios y verifica la notificación de éxito.

### Flujo 4: SuperAdmin — Liquidaciones & Auditoría
1. Cambia de rol a **SuperAdmin**.
2. En el **Tablero Global**, visualiza la recaudación acumulada, el aforo general de la red y el 12% retenido de comisión.
3. Ve a **"Finanzas"** para inspeccionar las liquidaciones por sede y emitir comprobantes de pago.
4. En **"Auditoría"**, examina la bitácora inmutable de eventos con el visor sintáctico de JSON.

---

## 🧪 7. Ejecución de Tests Automatizados (QA)

Para verificar que la lógica de negocio y las validaciones de datos se mantengan íntegras:

### Backend: Validaciones de Placas, Tolerancia y Restricciones
```powershell
# En el directorio backend:
.\venv\Scripts\python -m pytest app/tests/test_plate_and_field_validations.py -v
```
*Resultado esperado: **30 passed**.*

### Frontend: Verificación de Compilación para Producción
```bash
# En el directorio frontend:
npm run build
```
*Resultado esperado: Compilación sin errores (`vite build` exitoso).*

---

## 🛠️ 8. Solución de Problemas Frecuentes (Troubleshooting)

| Síntoma | Causa Probable | Solución |
| :--- | :--- | :--- |
| `ConnectionRefusedError: [Errno 111] connect` | El servicio de PostgreSQL no está corriendo en el puerto 5432. | Inicia el servicio local (`Start-Service postgresql-x64-18`) o ejecuta `docker compose up -d postgres`. |
| `password authentication failed for user "postgres"` | La contraseña en `backend/.env` no coincide con tu instalación local. | Corrige la variable `DATABASE_URL` en `backend/.env` con tu clave de PostgreSQL. |
| `EADDRINUSE: address already in use :::5173` | Ya existe una instancia previa de Vite ejecutándose. | Cierra el proceso anterior o ejecuta `npm run dev` (Vite tomará automáticamente el puerto 5174). |
| `Port 8000 already in use` | Una instancia previa de Uvicorn quedó activa. | En PowerShell, busca el PID con `Get-Process python` o `Get-NetTCPConnection -LocalPort 8000` y ciérralo. |
| Los diálogos se ven desalineados tras una actualización | Caché residual de paquetes de Node. | Ejecuta `npm run build` o borra la carpeta `frontend/node_modules/.vite` y reinicia `npm run dev`. |
