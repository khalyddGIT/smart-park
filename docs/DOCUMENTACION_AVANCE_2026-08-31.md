# 📑 Informe Técnico de Avances y Soluciones Arquitectónicas — 31 de Agosto de 2026

**Plataforma:** Smart-Park Multi-Estacionamiento  
**Producción:** Railway (`https://smart-park-web-production.up.railway.app`)  
**Base de Datos:** PostgreSQL 15 (Railway)  
**Versión:** `v2.4.0 — Unified Real-time CAD & Persistent RBAC`

---

## 📑 Resumen Ejecutivo

En esta iteración se resolvieron las discrepancias de persistencia y sincronización visual entre dispositivos en el entorno desplegado en Railway, garantizando que el mapa interactivo CAD, el padrón de reservas, los vehículos y las cuentas de personal funcionen bajo la **única fuente de verdad: PostgreSQL**.

---

## 🛠️ Detalle de Problemas Resueltos y Soluciones Aplicadas

### 1. Sincronización del Plano CAD entre Conductor, Garita y Admin
- **Diagnóstico:** En la vista del personal de garita (`PersonalGaritaModule.jsx`), la función `fetchParkings` conservaba los planos previamente cargados en memoria mediante `if (Array.isArray(before?.elements)) return { ...m, elements: before.elements };`. Por ello, al cambiar el estado de una plaza a `reserved` u `occupied` desde el celular de un conductor, la pantalla de garita mantenía el estado verde (`free`) anterior.
- **Solución:** Se forzó la re-hidratación periódica de las plazas desde PostgreSQL a través de `hydrateFloorPlan(m.id, true)` cada 5-6 segundos en segundo plano, logrando que el mapa interactivo ($1100 \times 700\text{px}$) refleje los estados en vivo:
  - **Verde (`#10b981`):** Cajón libre disponible.
  - **Turquesa (`#06b6d4`):** Reserva programada (*Scheduled*).
  - **Rojo (`#ef4444`):** Vehículo dentro / Ocupado (*Active*).

### 2. Persistencia Garantizada de las 4 Cuentas del Sistema
- **Diagnóstico:** El procedimiento `startup_db()` omitía el poblado inicial de datos cuando detectaba `ENVIRONMENT=production`. Al arrancar en Railway por primera vez, la base de datos PostgreSQL carecía de las cuentas administrativas preconfiguradas.
- **Solución:** Se implementó un algoritmo de *Upsert* idempotente en `backend/app/main.py` que verifica e inserta/actualiza las credenciales y hashes de PIN para los 4 roles del sistema en cada arranque del servidor:

| Rol | Correo Electrónico | Contraseña | PIN Hasheado | Tabla en BD |
| :--- | :--- | :--- | :--- | :--- |
| **🌐 Super Admin** | `superadmin@smartpark.com` | `SmartParkSuperAdmin2026!` | `7391` | `usuarios` (`role: platform`) |
| **🏢 Admin Local** | `adminlocal@smartpark.com` | `SmartParkLocal2026!` | `4826` | `usuarios` (`role: local`) |
| **🚗 Conductor Demo** | `usuario@smartpark.com` | `password123` | `1234` | `usuarios` (`role: user`) |
| **🚪 Operador Garita** | `operador.garita@smartpark.pe` | `Operador2026!` | `2580` | `usuarios` y `personal` (`parking_id: 1`) |

### 3. Registro de Vehículos sin Restricciones de Formato
- **Diagnóstico:** La expresión regular anterior `/^([A-Z]{3}-[0-9]{3}|[0-9]{4}-[A-Z]{2}|[A-Z]{2}-[0-9]{4})$/` en Pydantic (`schemas.py`) y React (`VehiclesModule.jsx`) rechazaba matrículas alfanuméricas peruanas modernas (`A1B-234`, `V1A892`, `C8A-710`) o placas sin guión (`ABC123`).
- **Solución:** Se actualizó el validador a `/^[A-Z0-9]{2,4}[- ]?[A-Z0-9]{2,4}$/i`, permitiendo placas de 4 a 8 caracteres alfanuméricos en formato auto o moto.

### 4. Corrección de Escala y Origen de Transformación del Plano de Reserva
- **Diagnóstico:** El contenedor de reserva del conductor (`CustomerInteractivePlanBooking.jsx`) mostraba un desajuste superior debido a `transformOrigin: 'top center'` y márgenes negativos.
- **Solución:** Se refactorizó la escala utilizando `ResizeObserver` reactivo con `transformOrigin: 'center center'` y encuadre flex centrado (`h-[480px] sm:h-[560px] lg:h-[620px]`).

---

## 🧪 Matriz de Pruebas y Verificación

| Módulo / Funcionalidad | Método de Verificación | Resultado |
| :--- | :--- | :--- |
| **Compilación Frontend** | `npm --prefix frontend run build` | ✓ Éxito (3.94s, 0 errores) |
| **Persistencia PostgreSQL** | Inserción/Consulta desde Vercel/Railway | ✓ Verificado (Google Auth + Cuentas Semilla) |
| **Sincronización Garita-Conductor** | Polling SSE/WS + `hydrateFloorPlan(id, true)` | ✓ Verificado (Plazas cambian de color en tiempo real) |
| **Despliegue GitHub/Railway** | `git push origin master` (Commit `033cc3c`, `19680e6`, `033cc3c`) | ✓ Desplegado exitosamente en producción |
