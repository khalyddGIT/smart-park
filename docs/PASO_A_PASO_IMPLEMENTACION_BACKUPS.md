# Guía Paso a Paso: Implementación del Sistema de Respaldos (Backups) en Smart-Park

Este documento describe detalladamente la arquitectura, decisiones de ingeniería, código fuente y configuración de infraestructura utilizadas para implementar el sistema de respaldos automáticos y bajo demanda en la plataforma **Smart-Park**.

---

## 1. Contexto, Diagnóstico y Objetivos

### El Reto de Infraestructura
Smart-Park opera sobre contenedores en la plataforma **Railway**. En este tipo de infraestructura basada en contenedores (PaaS/Docker), el sistema de archivos es **efímero**: cada vez que se publica una actualización de código o se reinicia un servicio, el contenedor se reconstruye desde cero y cualquier archivo creado en tiempo de ejecución se destruye si no está ubicado en un volumen persistente.

### Datos Críticos en Riesgo
El sistema almacena información crítica distribuida en 14 tablas relacionales:
1. **Identidad y Accesos:** Usuarios y roles (`platform`, `local`, `user`).
2. **Infraestructura de Cocheras:** Sedes matrices, sucursales y dispositivos de cámara/ANPR.
3. **Gemelo Digital 2D (CAD):** Plazas de aparcamiento (`Slot`) y elementos de diseño vectorial (`FloorPlanElement`) con coordenadas métricas $X, Y$, dimensiones y rotación.
4. **Operación Comercial:** Reservas programadas, historial de entradas/salidas en garita y personal asignado.
5. **Transaccionalidad:** Comprobantes y registros de pago (`Payment`).
6. **Seguridad y Confianza:** Reseñas, incidencias operativas con evidencia fotográfica y logs de auditoría inmutables (`AuditLog`).

### Objetivos Planteados
* **RPO (Recovery Point Objective):** $\le$ 24 horas automático, 0 minutos ante despliegues manuales.
* **RTO (Recovery Time Objective):** $\le$ 15 minutos para recuperación completa.
* **Integridad Criptográfica:** Verificación inmutable mediante hash **SHA-256**.
* **Rotación Automática:** Retención de las últimas 14 copias sin saturar el almacenamiento.
* **Escritura Atómica:** Protección total contra archivos corruptos causados por reinicios súbitos del contenedor.
* **Seguridad y RBAC:** Acceso exclusivo restringido a usuarios con rol de SuperAdmin (`platform`).

---

## 2. Arquitectura General del Sistema

El sistema implementa una **estrategia de respaldo de doble capa**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ARQUITECTURA DE RESPALDOS                          │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│  CAPA 1: Respaldos Lógicos App       │       │  CAPA 2: Respaldos Físicos de BD     │
│  (Motor Interno de Smart-Park)       │       │  (Railway Managed PostgreSQL)        │
├──────────────────────────────────────┤       ├──────────────────────────────────────┤
│ • Extracción de 14 tablas en JSON    │       │ • Snapshots continuos de disco       │
│ • Checksum criptográfico SHA-256     │       │ • Point-in-Time Recovery             │
│ • Escritura atómica (.tmp -> .json)  │       │ • Volcado binario con pg_dump        │
│ • Worker en segundo plano (cada 24h) │       │ • Aislamiento del contenedor web     │
│ • Volumen persistente en /data       │       │ • Gestión nativa de infraestructura │
│ • API REST para SuperAdmin           │       │                                      │
└──────────────────────────────────────┘       └──────────────────────────────────────┘
```

---

## 3. Paso 1: Diseño del Servicio Central de Extracción (`backup_service.py`)

Ubicación del archivo: [`backend/app/services/backup_service.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/services/backup_service.py)

### 3.1. Detección Inteligente del Directorio de Persistencia
El servicio detecta automáticamente si se encuentra en producción (con el volumen `/data` montado) o en un entorno de desarrollo local:

```python
DEFAULT_BACKUP_DIR = (
    "/data/backups" if os.path.exists("/data")
    else os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "backups")
)
BACKUPS_DIR = os.getenv("BACKUPS_DIR", DEFAULT_BACKUP_DIR)
MAX_BACKUP_RETENTION = int(os.getenv("MAX_BACKUP_RETENTION", "14"))

os.makedirs(BACKUPS_DIR, exist_ok=True)
```

### 3.2. Serialización Polimórfica de Tipos Complejos
Para evitar fallos al convertir tipos de Python a JSON estándar, se implementaron helpers que convierten fechas, horas, UUIDs y tipos enumerados:

```python
def _serialize_value(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if hasattr(val, "value"):  # Soporte para Enum
        return val.value
    return val

def _row_to_dict(model_instance: Any, exclude_fields: Optional[set] = None) -> Dict[str, Any]:
    exclude = exclude_fields or set()
    result = {}
    for col in model_instance.__table__.columns:
        if col.name not in exclude:
            val = getattr(model_instance, col.name)
            result[col.name] = _serialize_value(val)
    return result
```

### 3.3. Extracción de las 14 Tablas Relacionales
La función `generate_database_backup` consulta de manera asíncrona todos los modelos de SQLAlchemy:

```python
data_tables: Dict[str, List[Dict[str, Any]]] = {
    "usuarios": await _dump_table(session, User),
    "vehiculos": await _dump_table(session, Vehicle),
    "estacionamientos": await _dump_table(session, Parking),
    "cameras_dispositivos": await _dump_table(session, CameraDevice),
    "plazas": await _dump_table(session, Slot),
    "elementos_plano": await _dump_table(session, FloorPlanElement),
    "reservas": await _dump_table(session, Reservation),
    "personal": await _dump_table(session, Staff),
    "resenas": await _dump_table(session, Review),
    "incidencias": await _dump_table(session, Incident),
    "pagos": await _dump_table(session, Payment),
    "solicitudes_afiliacion": await _dump_table(session, AffiliationRequest),
    "configuracion_plataforma": await _dump_table(session, PlatformSettings),
    "audit_logs": await _dump_table(session, AuditLog),
}
```

### 3.4. Cálculo de Integridad SHA-256
Se calcula el hash sobre el contenido JSON ordenado (`sort_keys=True`):

```python
data_json = json.dumps(data_tables, ensure_ascii=False, sort_keys=True)
checksum = compute_sha256(data_json)
```

### 3.5. Patrón de Escritura Atómica en Disco
**Problema resuelto:** Si el contenedor se apaga o reinicia mientras se escribe un archivo grande, el archivo resultante queda truncado e irrecuperable.
**Solución implementada:** Se escribe primero en un archivo temporal con extensión `.tmp` y luego se reemplaza atómicamente mediante `os.replace`:

```python
filename = f"smartpark_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
filepath = os.path.join(BACKUPS_DIR, filename)
tmp_filepath = filepath + ".tmp"

with open(tmp_filepath, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

# Operación atómica garantizada por el sistema operativo
os.replace(tmp_filepath, filepath)
```

### 3.6. Rotación Automática de Archivos Antiguos
Para mantener el almacenamiento dentro de límites controlados, se eliminan los respaldos que excedan la retención configurada (14 copias):

```python
def rotate_old_backups(max_keep: int = MAX_BACKUP_RETENTION) -> int:
    pattern = os.path.join(BACKUPS_DIR, "smartpark_backup_*.json")
    files = glob.glob(pattern)
    files.sort(key=lambda x: os.path.getmtime(x))  # Orden cronológico

    deleted = 0
    if len(files) > max_keep:
        to_delete = files[:len(files) - max_keep]
        for f in to_delete:
            try:
                os.remove(f)
                deleted += 1
            except Exception as e:
                logger.warning(f"No se pudo eliminar respaldo antiguo {f}: {e}")
    return deleted
```

---

## 4. Paso 2: Automatización con Worker en Segundo Plano (`backup_worker.py`)

Ubicación del archivo: [`backend/app/core/backup_worker.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/core/backup_worker.py)

### 4.1. Bucle Asíncrono Horario
El worker ejecuta una revisión periódica cada 3600 segundos (1 hora). Si no hay copias previas o si la más reciente tiene 24 horas o más de antigüedad, inicia la generación automática:

```python
BACKUP_CHECK_INTERVAL_SECONDS = 3600  # Chequeo cada hora
BACKUP_CYCLE_HOURS = 24               # Frecuencia de respaldo diario

async def check_and_run_scheduled_backup():
    backups = list_backups()
    needs_backup = False

    if not backups:
        needs_backup = True
    else:
        latest = backups[0]
        created_str = latest["created_at"].rstrip("Z")
        created_dt = datetime.fromisoformat(created_str)
        if datetime.utcnow() - created_dt >= timedelta(hours=BACKUP_CYCLE_HOURS):
            needs_backup = True

    if not needs_backup:
        return
```

### 4.2. Bloqueo Distribuido Anti-Carrera (*Distributed Lock*)
En entornos con múltiples réplicas o trabajadores Uvicorn, todas las instancias podrían intentar generar el respaldo al mismo tiempo. Se implementó un lock con expiración TTL para garantizar ejecución única:

```python
async def _acquire_lock(lock_name: str, ttl: int = 120) -> bool:
    try:
        from app.core.cache import get_client
        client = get_client()
        if client is None:
            return True
        acquired = await client.set(f"lock:{lock_name}", "1", nx=True, ex=ttl)
        return bool(acquired)
    except Exception:
        return True
```

### 4.3. Registro en el Ciclo de Vida de FastAPI
En [`backend/app/main.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/main.py), dentro del contexto `lifespan`:

```python
# Worker de respaldos automáticos diarios
try:
    from app.core.backup_worker import start_backup_worker
    start_backup_worker()
except Exception as e:
    logging.warning(f"[smart-park] backup-worker no iniciado: {e}")
```

---

## 5. Paso 3: Exposición de Endpoints REST Seguros (`backups.py`)

Ubicación del archivo: [`backend/app/api/v1/backups.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/api/v1/backups.py)

### 5.1. Blindaje RBAC (Rol `platform`)
Ningún usuario no autorizado puede interactuar con los respaldos:

```python
router = APIRouter(prefix="/backups", tags=["Respaldos & Recuperación"])
platform_required = require_role("platform")
```

### 5.2. Protección contra *Path Traversal*
Para evitar que un atacante descargue archivos del sistema operativo mediante nombres manipulados (e.g. `../../etc/passwd`), se valida estrictamente el patrón del nombre:

```python
def get_backup_filepath(filename: str) -> Optional[str]:
    clean_name = os.path.basename(filename)
    if not clean_name.startswith("smartpark_backup_") or not clean_name.endswith(".json"):
        return None
    full_path = os.path.join(BACKUPS_DIR, clean_name)
    if os.path.isfile(full_path):
        return full_path
    return None
```

### 5.3. Catálogo de Endpoints Implementados
* **`GET /api/v1/backups/status`:** Consulta de salud, volumen persistente, cantidad de copias y metadatos del último snapshot.
* **`POST /api/v1/backups/generate`:** Generación manual inmediata con motivo registrado.
* **`GET /api/v1/backups/download/latest`:** Retorna el archivo JSON más reciente vía `FileResponse`.
* **`GET /api/v1/backups/download/{filename}`:** Descarga de una copia histórica específica.
* **`POST /api/v1/backups/verify`:** Valida la estructura del archivo y recalcula el checksum SHA-256.

---

## 6. Paso 4: Configuración de Infraestructura en Contenedores (`Dockerfile`)

Ubicación del archivo: [`Dockerfile`](file:///d:/Escritorio/smart%20park/smart-park/Dockerfile)

Para garantizar la coexistencia de subidas de imágenes y respaldos en el volumen persistente de Railway:

```dockerfile
# Variables de persistencia para el volumen montado en /data
ENV STATIC_DIR=/app/static
ENV UPLOADS_DIR=/data/uploads
ENV BACKUPS_DIR=/data/backups

# Creación de los directorios persistentes en la fase de empaquetado
RUN mkdir -p /data/uploads /data/backups

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

En la configuración del servicio de Railway, se vincula un **Volume** con punto de montaje `/data`.

---

## 7. Paso 5: Interfaz de Gestión para SuperAdmin (`PlatformSettingsModule.jsx`)

Ubicación del archivo: [`frontend/src/components/PlatformSettingsModule.jsx`](file:///d:/Escritorio/smart%20park/smart-park/frontend/src/components/PlatformSettingsModule.jsx)

Se integró una sección de administración con las siguientes capacidades:
1. **Tarjeta de Diagnóstico en Tiempo Real:** Muestra el motor de base de datos (`PostgreSQL`), el tipo de almacenamiento (`/data/backups (Volumen)`), el total de registros respaldados y el tamaño del último snapshot.
2. **Botón de Generación Bajo Demanda:** Dispara `POST /api/v1/backups/generate`, mostrando un estado de carga y refrescando los indicadores.
3. **Descarga Directa al Navegador:** Obtiene el blob desde `GET /api/v1/backups/download/latest` y lo descarga automáticamente con el nombre original del archivo.
4. **Historial de Archivos:** Lista las copias disponibles y permite su descarga individual.

---

## 8. Paso 6: Verificación Mediante Pruebas Automatizadas (`test_backups.py`)

Ubicación del archivo: [`backend/app/tests/test_backups.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/tests/test_backups.py)

Se diseñaron tres pruebas automatizadas con pytest:

### Test 1: Servicio de Extracción y Checksum
Valida que `generate_database_backup` extraiga datos de todas las tablas, calcule el hash SHA-256 y genere un archivo legible y válido.

### Test 2: Blindaje de Seguridad RBAC
Verifica que usuarios con rol `user` o `local` reciban un código HTTP **403 Forbidden** al intentar consultar o generar respaldos.

### Test 3: Ciclo Completo de SuperAdmin
Comprueba el flujo de punta a punta:
1. Generación de snapshot (`201 Created`).
2. Consulta de estado (`200 OK`).
3. Descarga del último respaldo comprobando la coincidencia del checksum.
4. Descarga del archivo por nombre exacto.
5. Verificación de integridad mediante `POST /api/v1/backups/verify`.

Resultado de ejecución:
```
app/tests/test_backups.py::test_generate_database_backup_service PASSED          [ 33%]
app/tests/test_backups.py::test_backup_api_security_enforcement PASSED           [ 66%]
app/tests/test_backups.py::test_superadmin_can_generate_and_download_backup PASSED [100%]
============================== 3 passed in 7.99s ==============================
```

---

## 9. Resumen de Archivos Involucrados

| Componente | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| **Servicio de Respaldos** | [`backend/app/services/backup_service.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/services/backup_service.py) | Extracción de 14 tablas, serialización, checksum SHA-256, escritura atómica y rotación. |
| **Worker en Segundo Plano** | [`backend/app/core/backup_worker.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/core/backup_worker.py) | Chequeo horario, detección de ciclo de 24 horas y bloqueo distribuido. |
| **Controlador REST** | [`backend/app/api/v1/backups.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/api/v1/backups.py) | Endpoints de consulta, generación, descarga y verificación con RBAC `platform`. |
| **Inicialización** | [`backend/app/main.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/main.py) | Inclusión del router `/backups` y arranque del worker en el ciclo de vida `lifespan`. |
| **Infraestructura** | [`Dockerfile`](file:///d:/Escritorio/smart%20park/smart-park/Dockerfile) | Configuración de variables de entorno y directorios persistentes `/data/backups`. |
| **Panel Frontend** | [`frontend/src/components/PlatformSettingsModule.jsx`](file:///d:/Escritorio/smart%20park/smart-park/frontend/src/components/PlatformSettingsModule.jsx) | Interfaz visual de diagnóstico, generación y descarga de respaldos para SuperAdmin. |
| **Suite de Pruebas** | [`backend/app/tests/test_backups.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/tests/test_backups.py) | Pruebas de extracción, integridad, seguridad RBAC y endpoints de administración. |
| **Runbook Operativo** | [`docs/DOCUMENTACION_BACKUPS_PRODUCCION.md`](file:///d:/Escritorio/smart%20park/smart-park/docs/DOCUMENTACION_BACKUPS_PRODUCCION.md) | Guía de recuperación ante desastres (*Disaster Recovery*) y comandos operativos. |
