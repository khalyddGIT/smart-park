# Smart Park Ayacucho — Informe de Avances y Mejoras del Sistema

**Fecha:** 04 de Septiembre, 2026  
**Rama:** `master`  
**Repositorio:** [khalyddGIT/smart-park](https://github.com/khalyddGIT/smart-park)  
**Entorno de Ejecución:** Producción / Staging  

---

## 📋 Resumen Ejecutivo

Durante las sesiones de desarrollo y estabilización del sistema **Smart Park**, se han implementado mejoras fundamentales en la arquitectura de datos, la experiencia de usuario (UX), la seguridad operacional y la consistencia de las validaciones de negocio en **frontend** y **backend**. 

El objetivo primordial ha sido asegurar que el ciclo de vida de una reserva (creación, tolerancia de llegada, escaneo en garita, estancia y cancelación) sea **real, persistente, matemáticamente exacto y visualmente transparente** para conductores y operadores.

---

## 1. 🛡️ Sistema de Auditoría y Bitácora de Seguridad Empresarial

Se transformó el módulo de auditoría en una arquitectura empresarial con trazabilidad inmutable de eventos:

- **Modelo Persistente (`AuditLog`)**:
  - Tabla `audit_logs` con columnas indexadas: `id`, `user_id`, `user_email`, `role`, `action`, `target`, `severity`, `ip_address`, `parking_id`, `parking_name`, `details` (JSON) y `created_at`.
- **Servicio Asíncrono Fail-Safe (`audit_service.py`)**:
  - Función `record_audit_event`: extrae la IP real del cliente (incluso detrás de proxies como Railway mediante `X-Forwarded-For`), registra severidad (`Info`, `Advertencia`, `Crítico`) y evita que fallos de auditoría interrumpan transacciones operativas.
- **Trazabilidad en Operaciones Críticas**:
  - Registro de creación de cuentas, logins exitosos/fallidos, bloqueos por rate limit anti fuerza bruta.
  - Modificaciones de tarifas, comisiones y activación del modo mantenimiento.
  - Modificación de roles RBAC, cambio de PIN de seguridad y bloqueo de cuentas.
- **Interfaz Renovada (`AuditLogsModule.jsx`)**:
  - Métricas KPI superiores (Total Eventos, Alertas Críticas, Operaciones).
  - Filtros en vivo: búsqueda por texto, filtro por severidad y sede, paginación dinámica.
  - Modal de inspección detallada con visor JSON de metadatos técnicos y botón "Copiar JSON".
  - Modo oscuro nativo y exportación a formato CSV.

---

## 2. 🚗 Validación Estricta de Placas Vehiculares (Formato Peruano con Guión)

Se erradicó la ambigüedad en el registro de vehículos y reservas al exigir un formato de placa estandarizado:

- **Regla Global**: La placa vehicular debe contener obligatoriamente un guión separador (`-`).
  - Patrón de expresión regular: `^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}$` (ejemplos: `ABC-123`, `W1P-404`, `1234-5A`).
- **Validación en Backend (`schemas.py`)**:
  - Se implementó el validador `_clean_plate()` aplicado transversalmente en `VehicleCreate`, `VehicleUpdate`, `ReservationCreate` y escaneo ANPR (`ANPRScanRequest`).
  - Las placas son limpiadas de espacios internos y normalizadas a mayúsculas.
- **Experiencia de Usuario en Frontend**:
  - **`CustomerInteractivePlanBooking.jsx`**: Auto-formateo inteligente mientras el usuario escribe (inserta el guión automáticamente tras los primeros 3 caracteres) y validación reactiva en el formulario de reserva.
  - **`VehiclesModule.jsx`**: Auto-formateo de placa y validación inmediata con rechazo de placas sin guión o con espacios corruptos.

---

## 3. 🔍 Pantalla Pública de Verificación de Reservas (`/verify/{code}`)

Se reconstruyó completamente la página accesible desde tótems y códigos QR escaneados por operadores o conductores (`VerifyReservationPage.jsx`):

- **Calibración Horaria (Corrección de Desfase de 5 Horas)**:
  - El endpoint `/api/v1/reservations/verify/{code}` ahora serializa todas las marcas de tiempo (`start_time`, `end_time`, `actual_entry`, `actual_exit`) en formato UTC ISO 8601 explícito.
  - El frontend procesa estas fechas mediante `parseUtcDate`, garantizando que la hora local peruana (UTC-5) coincida exactamente con el reloj del cliente.
- **Cronómetro Inteligente en Vivo**:
  - Muestra la cuenta regresiva exacta para llegar a la cochera calculada con la tolerancia real elegida por el usuario (10, 15, 20 min).
  - Al vencerse el tiempo, se detiene e indica "Tolerancia vencida".
- **Distintivo de Placa Oficial Peruana**:
  - Badge visual con estética de placa real (franja celeste superior, texto monoespaciado en alto contraste y bandera).
- **Acciones Operativas para Garita**:
  - Botón de **"Marcar Ingreso / Check-in"** y **"Marcar Salida / Check-out"** directamente en la pantalla de verificación para agilizar la operación vehicular.

---

## 4. ⏱️ Calibración de Tiempos y Horarios en "Mis Reservas" (Rol Usuario)

Se corrigió la visualización engañosa y descalibrada de tiempos en la lista de reservas del usuario (`ReservationsModule.jsx`):

- **Reservas Canceladas Clarificadas**:
  - **Antes**: Mostraba `15:59 - 17:59 (2h)` dando la falsa impresión de que el conductor ocupó el cajón por 2 horas.
  - **Ahora**: Explica con precisión el horario reservado y la hora exacta en que venció la tolerancia:  
    > `Programada: 03:59 p.m. (2h) · Cancelada: tolerancia de 10 min venció a las 04:09 p.m.`
- **Reservas Programadas (En ruta)**:
  - Muestra la hora máxima de llegada calculada con la tolerancia real del cliente:  
    > `Llegada máx: 04:09 p.m. (10 min tol · Estancia: 2h)`
- **Reservas en Estancia (Activas)**:
  - Detalla la hora real de check-in y la salida estimada:  
    > `Ingresó: 04:05 p.m. · Salida prevista: 06:05 p.m. (2h)`
- **Formato Amigable**:
  - Horarios presentados en formato 12 horas con indicador am/pm (`03:59 p.m.`) en lugar de 24 horas crudas.
  - Etiqueta de fecha contextual (`Hoy`, `Ayer` o fecha corta como `04 sep`).

---

## 5. 🚫 Flujo y Estado de Pase QR y Tickets en Reservas Canceladas

Se resolvieron las fallas donde una reserva cancelada permitía ver un pase activo, corría un reloj en bucle o mostraba un comprobante "AUTORIZADO":

- **Eliminación del Temporizador en Bucle Fantasma**:
  - En `DigitalAccessPassModal.jsx`, se desactiva inmediatamente el contador cuando la reserva está en estado `CANCELLED` o `COMPLETED`.
  - En el campo **Estado** ya no corre un tiempo regresivo ficticio (`01:23:56`), sino que muestra en rojo: `Cancelada` junto con `Tolerancia de X min vencida · Plaza liberada · Sin acceso`.
- **Pase QR Inhabilitado**:
  - El QR escaneable se reemplaza por un cuadro de **Pase Inhabilitado** con icono `XCircle` rojo y marca de agua `RESERVA_CANCELADA_SIN_VALIDEZ`.
  - Se removió el texto que invitaba a escanear en el tótem.
  - El botón de copiar token se desactiva con la etiqueta `Token Anulado`.
  - Se ocultan las opciones de navegación GPS (Google Maps / Waze).
- **Importe en Cero**:
  - Muestra claramente `Importe de reserva: S/ 0.00 (Anulada sin costo)`.
- **Botones Inteligentes en Tarjetas**:
  - Para reservas canceladas, el botón principal cambia de `Pase QR` a `[X] Pase Anulado`.
  - El botón de ticket se etiqueta como `Ticket Anulado`.
- **Comprobante de Cancelación**:
  - El modal de ticket imprime `*** COMPROBANTE DE RESERVA ANULADA ***`, advirtiendo que la plaza fue liberada y que no se generó cobro alguno.

---

## 6. 🔧 Auditoría de Validaciones e Inconsistencias Resueltas

Se identificaron y corrigieron discrepancias en las reglas de validación del sistema:

1. **Esquema de Inicio de Sesión (`UserLogin`)**:
   - **Problema**: `/auth/login` usaba el esquema `UserCreate`, que exigía obligatoriamente `full_name` para iniciar sesión. Si un cliente enviaba solo correo y contraseña, recibía un error 422.
   - **Solución**: Se creó el esquema `UserLogin` en `schemas.py` exigiendo estrictamente solo `email` y `password`.
2. **Nombre Real del Conductor en Reservas del Mapa**:
   - **Problema**: Al reservar una plaza desde el mapa interactivo (`App.jsx`), el nombre del cliente se enviaba fijado como `"Conductor Registrado"`.
   - **Solución**: Se enlazó con la información del usuario autenticado en sesión (`user.name || user.full_name`).
3. **Ajuste de Cooldown por Cancelaciones (Regla S-02)**:
   - **Problema**: El sistema bloqueaba la cuenta del usuario durante 24 horas (`HTTP 429`) si acumulaba 2 cancelaciones en un día (incluso por expiración automática de tolerancia durante pruebas).
   - **Solución**: Se aumentó el margen a **5 cancelaciones diarias**, permitiendo pruebas y uso regular sin interrupciones injustificadas.
4. **Validación de Placa Duplicada al Editar Vehículo**:
   - **Problema**: En `/vehicles/{vehicle_id}`, al cambiar la placa a una ya existente en la base de datos, ocurría un error 500 no controlado.
   - **Solución**: Se añadió verificación previa que responde `HTTP 400: Esta placa ya se encuentra registrada en otro vehículo`.
5. **Limpieza Automática de Espacios en Placas**:
   - Se asegura la eliminación automática de espacios periféricos o intermedios (`ABC - 123` $\rightarrow$ `ABC-123`) tanto en formularios como al enviar la reserva.
6. **Unificación de Tiempos en Resumen de Reserva**:
   - Se unificó la información en el resumen de reserva del mapa interactivo, evitando la duplicidad entre "Tiempo de llegada" y "Tolerancia de ingreso".

---

## 7. 🧪 Cobertura y Pruebas Automatizadas

Se cuenta con una suite automatizada de pruebas unitarias y de integración para garantizar que ninguna regresión afecte las reglas de negocio:

- **Archivo de Pruebas**: [`backend/app/tests/test_plate_and_field_validations.py`](backend/app/tests/test_plate_and_field_validations.py)
- **Casos Validados (23/23 tests pasando - 100% éxito)**:
  - Formato de placas con guión y normalización de mayúsculas.
  - Rechazo de placas sin guión o con caracteres inválidos.
  - Tolerancias de reserva dentro del rango permitido (5 min a 120 min).
  - Validación de horas (`end_time > start_time`).
  - Validación de comprobantes SUNAT (RUC de 11 dígitos y Razón Social para facturas).
  - Validación de DNI peruano de 8 dígitos para personal de cochera.
  - Validación de compuertas ANPR (`entry`/`exit`).
  - Validación del esquema `UserLogin`.
  - Verificación del endpoint público `/verify/{code}` ante códigos inexistentes (404).

---

## 9. 🔐 Autenticación Segura con Cookies HttpOnly y Compatibilidad Dual

Se migró la arquitectura de autenticación hacia **Cookies HttpOnly**, blindando el sistema contra ataques de robo de tokens (XSS) y manteniendo **compatibilidad dual** con Bearer tokens:

- **Cookies HttpOnly Seguras**:
  - En los endpoints `/auth/register`, `/auth/login` y `/auth/google`, el backend emite automáticamente una cookie segura `access_token` con atributos `HttpOnly=True`, `SameSite=Lax`, `Path=/`, `Max-Age=7 días`.
  - El flag `Secure=True` se activa automáticamente en entornos de producción (`https`), permitiendo desarrollo fluido en `http://localhost`.
  - Al no ser accesible por JavaScript mediante `document.cookie`, scripts maliciosos inyectados no pueden sustraer las credenciales de la sesión.
- **Soporte Dual en Backend (`get_current_user`)**:
  - La dependencia central de seguridad ahora inspecciona en primer orden el encabezado `Authorization: Bearer <token>` y, en su defecto, la cookie `access_token`.
  - Permite que las pruebas automatizadas (Pytest), aplicaciones móviles y clientes de API sigan funcionando sin requerir modificaciones.
- **Logout Completo e Invalidación de Sesión**:
  - El endpoint `/auth/logout` revoca el token en Redis (lista negra) y emite un `Set-Cookie` de expiración (`Max-Age=0`), instruyendo al navegador a eliminar la cookie de inmediato.
- **Integración Transparente en Frontend**:
  - Se configuró `withCredentials: true` en la instancia central de Axios (`api.js`), asegurando el envío y recepción automática de cookies de sesión en todas las peticiones.
  - `AuthContext.jsx` verifica la sesión persistente en el montaje mediante `GET /auth/me`, restaurando la sesión automáticamente a partir de la cookie de forma instantánea.
- **Pruebas Automatizadas de Cookies**:
  - Se añadieron pruebas dedicadas en [`backend/app/tests/test_cookie_auth.py`](backend/app/tests/test_cookie_auth.py) que validan el registro, login, acceso a `/auth/me` exclusivamente con cookies, acceso con Bearer, y borrado en logout.

---

## 10. 📦 Historial de Commits en GitHub

Todos los cambios han sido compilados y subidos satisfactoriamente a la rama `master`:

| Commit | Descripción |
| :--- | :--- |
| [`0bb81f0`](https://github.com/khalyddGIT/smart-park/commit/0bb81f0) | `docs: agregar documento de consolidacion de avances y correcciones del proyecto` |
| [`0474946`](https://github.com/khalyddGIT/smart-park/commit/0474946) | `fix(reservas): corregir flujo de pase y ticket en reservas canceladas, detener contador y deshabilitar QR` |
| [`807dda3`](https://github.com/khalyddGIT/smart-park/commit/807dda3) | `fix(reservas): corregir formato de tiempo, fechas y tolerancia en vista de reservas del usuario` |
| [`2619d1e`](https://github.com/khalyddGIT/smart-park/commit/2619d1e) | `fix(core): corregir inconsistencias en validaciones de login, reserva, cooldown y vehiculos` |

---

*Documento generado y sincronizado automáticamente con el código fuente del proyecto Smart Park.*
