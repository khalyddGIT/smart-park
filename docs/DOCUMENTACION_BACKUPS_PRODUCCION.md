# Documentación de Respaldos de Producción (Backups & Disaster Recovery) — Smart-Park

Esta guía técnica y operativa documenta la arquitectura, automatización, gestión manual, verificación criptográfica y procedimiento de recuperación ante desastres (**Disaster Recovery**) para la base de datos de producción **PostgreSQL** de la plataforma **Smart-Park**.

---

## 1. Objetivos de Recuperación (SLAs de Continuidad de Negocio)

| Métrica | Objetivo (SLA) | Descripción |
| :--- | :--- | :--- |
| **RPO** (*Recovery Point Objective*) | **≤ 24 horas** (Automático)<br>**0 minutos** (Manual pre-despliegue) | Margen máximo admisible de pérdida de datos ante fallo catastrófico. |
| **RTO** (*Recovery Time Objective*) | **≤ 15 minutos** | Tiempo estimado para restaurar la totalidad del servicio y verificar integridad. |
| **Retención de Historial** | **14 snapshots continuos** | Ciclo de rotación de respaldos para depuración y auditoría histórica. |
| **Integridad de Datos** | **100% verificado vía SHA-256** | Cada respaldo posee un hash criptográfico inmutable para detectar corrupción. |

---

## 2. Arquitectura de Respaldos Multinivel

Smart-Park implementa una **estrategia de doble capa de protección** para garantizar alta disponibilidad y persistencia sin puntos únicos de fallo:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        INFRAESTRUCTURA SMART-PARK                      │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌───────────────────────────────────┐       ┌───────────────────────────────────┐
│  CAPA 1: Respaldos Lógicos App    │       │  CAPA 2: Respaldos Físicos BD     │
│  (Smart-Park Backup Engine)       │       │  (Railway Managed PostgreSQL)     │
├───────────────────────────────────┤       ├───────────────────────────────────┤
│ • Worker asíncrono cada 24 horas  │       │ • Snapshots automáticos en disco  │
│ • Exportación JSON de 14 tablas   │       │ • Recuperación Point-in-Time      │
│ • Checksum criptográfico SHA-256  │       │ • Volcado binario con pg_dump     │
│ • Volumen persistente en /data    │       │ • Aislamiento del contenedor web  │
│ • API REST para Superadmin        │       │ • Gestión nativa desde Railway    │
└───────────────────────────────────┘       └───────────────────────────────────┘
```

### Capa 1: Motor de Respaldos Lógicos de Smart-Park
1. **Módulo de Servicio ([`backup_service.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/services/backup_service.py))**:
   - Extrae exhaustivamente todas las entidades del sistema: `usuarios`, `vehiculos`, `estacionamientos`, `plazas`, `elementos_plano` (CAD 2D), `reservas`, `personal`, `resenas`, `incidencias`, `pagos`, `solicitudes_afiliacion`, `configuracion_plataforma` y `audit_logs`.
   - Serializa fechas ISO 8601, UUIDs, objetos complejos y enumeraciones.
   - Calcula el hash **SHA-256** del volcado de datos.
   - Aplica **escritura atómica** (`.tmp` → `os.replace`) para evitar archivos corruptos si el contenedor se reinicia a mitad de la escritura.
2. **Worker de Fondo ([`backup_worker.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/core/backup_worker.py))**:
   - Se inicia automáticamente en el ciclo de vida de FastAPI (`lifespan`).
   - Revisa cada **1 hora** si existe algún respaldo con más de **24 horas** de antigüedad o si la base de datos carece de respaldos previos.
   - Dispone de **lock distribuido** (`lock:daily_backup`) para evitar que múltiples instancias o réplicas compitan generando volcados concurrentes.
3. **Persistencia en Volumen**:
   - Ruta en producción: `/data/backups/smartpark_backup_YYYYMMDD_HHMMSS.json`.
   - Protegida contra reinicios y nuevos despliegues mediante el montaje del **Railway Volume** en `/data`.

### Capa 2: Respaldo Gestionado por Railway
- Railway provee almacenamiento transaccional en PostgreSQL con snapshots de disco continuos y capacidad de réplicas en caliente.

---

## 3. Endpoints de la API REST de Respaldos

Todos los endpoints están protegidos bajo **RBAC estricto** y requieren autenticación con rol de SuperAdmin (`platform`):

| Método | Endpoint | Rol Mínimo | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/backups/status` | `platform` | Diagnóstico del motor: volumen montado, último snapshot, archivos disponibles y cuotas. |
| `POST` | `/api/v1/backups/generate` | `platform` | Dispara la generación inmediata de un snapshot completo de todas las tablas. |
| `GET` | `/api/v1/backups/download/latest` | `platform` | Descarga directa del archivo JSON del respaldo más reciente generado. |
| `GET` | `/api/v1/backups/download/{filename}` | `platform` | Descarga de un respaldo histórico por nombre (con protección contra Path Traversal). |
| `POST` | `/api/v1/backups/verify` | `platform` | Verifica la integridad física y el hash SHA-256 de un archivo de respaldo. |

---

## 4. Guía Operativa para el Administrador (Paso a Paso)

### A. Consultar el Estado del Sistema de Respaldos
Vía cURL o desde Swagger Docs (`https://tu-app.up.railway.app/docs`):

```bash
curl -X GET "https://smart-park-web-production.up.railway.app/api/v1/backups/status" \
  -H "Cookie: access_token=TU_TOKEN_SUPERADMIN"
```

**Respuesta típica:**
```json
{
  "enabled": true,
  "destination_dir": "/data/backups",
  "is_persistent_volume": true,
  "database_engine": "PostgreSQL",
  "retention_count": 14,
  "schedule": "Diario automático cada 24 horas",
  "total_backups_stored": 5,
  "latest_backup": {
    "filename": "smartpark_backup_20260914_030000.json",
    "size_bytes": 154200,
    "size_kb": 150.59,
    "created_at": "2026-09-14T03:00:00.000000Z",
    "metadata": {
      "app": "Smart-Park",
      "version": "2.0",
      "total_records": 1280,
      "checksum_sha256": "3a7b8e...d4c1"
    }
  },
  "available_backups": [ ... ]
}
```

---

### B. Generar un Respaldo Manual Bajo Demanda
Recomendado **antes de cualquier actualización de esquema, migración o cambio mayor de configuración**:

```bash
curl -X POST "https://smart-park-web-production.up.railway.app/api/v1/backups/generate" \
  -H "Cookie: access_token=TU_TOKEN_SUPERADMIN"
```

---

### C. Descargar y Custodiar una Copia Local (Cold Storage)
Para cumplir con la regla 3-2-1 de seguridad (mantener al menos 1 copia fuera de la nube del proveedor):

```bash
curl -X GET "https://smart-park-web-production.up.railway.app/api/v1/backups/download/latest" \
  -H "Cookie: access_token=TU_TOKEN_SUPERADMIN" \
  -o "smartpark_produccion_backup_$(date +%Y%m%d).json"
```

---

### D. Validar la Integridad Criptográfica del Respaldo
```bash
curl -X POST "https://smart-park-web-production.up.railway.app/api/v1/backups/verify" \
  -H "Cookie: access_token=TU_TOKEN_SUPERADMIN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "smartpark_backup_20260914_030000.json"}'
```

**Respuesta de validación:**
```json
{
  "filename": "smartpark_backup_20260914_030000.json",
  "is_valid": true,
  "checksum_verified": true,
  "computed_sha256": "3a7b8e...d4c1",
  "expected_sha256": "3a7b8e...d4c1",
  "total_records": 1280
}
```

---

## 5. Procedimientos de Recuperación ante Desastres (Disaster Recovery Runbook)

### Escenario A: Restauración Físico-Binaria con `pg_dump` y `psql` (Más Rápido para Desastres Totales)

Si la base de datos se corrompe completamente o se requiere clonar a un nuevo cluster de PostgreSQL:

#### 1. Volcado binario desde Railway CLI (Backup en frío):
```bash
railway run pg_dump "$DATABASE_URL" -Fc -f smartpark_dump_prod.dump
```

#### 2. Restauración hacia una base de datos limpia:
```bash
# Limpiar esquema previo si existe
railway run psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restaurar el volcado con pg_restore
railway run pg_restore -d "$DATABASE_URL" --no-owner --no-privileges smartpark_dump_prod.dump
```

---

### Escenario B: Restauración Selectiva desde Snapshot JSON

Si se requiere recuperar entidades específicas (por ejemplo, si se borró accidentalmente una cochera con sus planos CAD 2D):

El archivo de respaldo JSON contiene cada tabla en bloques aislados:
```json
{
  "metadata": { ... },
  "data": {
    "estacionamientos": [ ... ],
    "elementos_plano": [ ... ],
    "plazas": [ ... ],
    "reservas": [ ... ]
  }
}
```

Para insertar o sincronizar los datos de nuevo en PostgreSQL:
```python
# Script de recuperación rápida (ejecutable en el contenedor o venv)
import json, asyncio
from app.db.session import AsyncSessionLocal
from app.models.models import Parking, Slot, FloorPlanElement

async def restore_from_json(backup_file):
    with open(backup_file, "r", encoding="utf-8") as f:
        payload = json.load(f)
    
    data = payload["data"]
    async with AsyncSessionLocal() as session:
        # Re-insertar estacionamientos y slots
        print(f"Restaurando {len(data['estacionamientos'])} cocheras y {len(data['plazas'])} plazas...")
        # Lógica de merge idempotente
        await session.commit()
```

---

### Escenario C: Restauración Nativa desde el Dashboard de Railway

1. Ingresa a [railway.app](https://railway.app) y entra a tu proyecto de Smart-Park.
2. Haz clic en el servicio de **PostgreSQL**.
3. Dirígete a la pestaña **Backups** o **Data**.
4. Selecciona el snapshot deseado y haz clic en **Restore**.
5. Railway creará una instancia restablecida con los datos al punto temporal seleccionado sin afectar las variables de entorno de tu aplicación.

---

## 6. Variables de Entorno de Configuración

Para configurar la política de respaldos en Railway (*Variables del Servicio Web*):

| Variable | Valor por Defecto | Descripción |
| :--- | :---: | :--- |
| `BACKUPS_DIR` | `/data/backups` | Ruta del volumen persistente donde se escriben los respaldos. |
| `MAX_BACKUP_RETENTION` | `14` | Cantidad de respaldos rotativos retenidos en el disco antes de purgar los más antiguos. |
| `ENVIRONMENT` | `production` | Activa el modo de producción estricto con registros de auditoría obligatorios. |

---

## 7. Checklist Mensual de Respaldo y Resiliencia

Para asegurar que los respaldos son 100% operativos cuando ocurra una emergencia:

- [ ] **Semana 1:** Verificar en `/api/v1/backups/status` que el worker diario esté generando snapshots continuos.
- [ ] **Semana 2:** Descargar el último archivo JSON y validar su hash SHA-256.
- [ ] **Semana 3:** Comprobar el espacio libre del volumen persistente en Railway (`/data`).
- [ ] **Semana 4:** Ejecutar una prueba de restauración en un entorno de pruebas o base de datos local para certificar que el RTO se mantenga por debajo de los 15 minutos.
