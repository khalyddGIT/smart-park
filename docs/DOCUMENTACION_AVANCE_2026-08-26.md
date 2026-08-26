# Smart Park — Documentación de Avance Integral

**Fecha:** 2026-08-26  
**Proyecto:** `khalyddGIT/smart-park`  
**Producción:** Railway `https://smart-park-web-production.up.railway.app` · Postgres nativo con volumen · Docker multi-stage  
**Stack:** `React 19 + Vite 8 + Tailwind v4 + Leaflet + Fabric.js + Recharts + Lucide React` | `FastAPI + SQLAlchemy async (PostgreSQL / SQLite dev)`  
**Rama:** `master` · **Commits:** `a54aadb` → `7429036`

---

## 1. Resumen Ejecutivo

Durante la jornada del **26 de agosto de 2026** se consolidaron mejoras arquitectónicas, funcionales y de seguridad de alto impacto en Smart-Park:

1. **Gestión Integral de Credenciales de Trabajadores y Operadores de Garita:**
   - Habilitación en el panel de **Administrador Local** de la creación, vinculación, actualización y reseteo de cuentas de acceso (`email`, `password`, `security_pin`, `role="local"`) para el personal de garita.
   - Sincronización bidireccional entre la tabla `personal` y la tabla `usuarios` mediante los endpoints `POST /api/v1/staff` y `PUT /api/v1/staff/{id}` con validación de contraseñas hasheadas (`bcrypt`) y autenticación JWT.
   - Eliminación de campos redundantes o inseguros (como el selector de *Rol Sistema*) para que los administradores de cochera gestionen únicamente operadores de nivel local.

2. **Aislamiento y Modo Solo Lectura en "Ver Plano" (Gestión de Sedes & Establecimientos):**
   - Separación estricta entre la acción de **"Ver"** (Visualizador 2D de Solo Lectura) y **"Editar Plano"** (Estudio CAD Interactivo).
   - Bloqueo y ocultamiento en modo lectura de presets de lote (*Rectangular*, *Forma en 'L'*, *Diagonal 45°*, *Forma en 'U'*, *Lienzo Libre*), botón de auto-numerar, deshacer/rehacer, interruptores de rejilla, paleta de herramientas de dibujo y controles de mutación/arrastre.
   - Panel lateral de inspección limpia con detalles de especificaciones (tipo de plaza, techado, ocupación, matrícula asociada y dimensiones) y métricas globales de la sede.

3. **Estandarización 100% a Iconos Vectoriales SVG (Lucide React):**
   - Reemplazo exhaustivo de caracteres unicode y emojis por componentes SVG vectoriales oficiales (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `ArrowUpDown`, `ArrowLeftRight`, `Camera`, `CreditCard`, `Lock`, `Info`, `Lightbulb`).
   - Aspecto visual uniforme, nítido y de grado empresarial en todos los navegadores y densidades de pantalla.

4. **Depuración y Despliegue Exclusivo en Railway:**
   - Eliminación total de configuraciones residuales y artefactos legacy de Vercel y Supabase.
   - Arquitectura unificada en un solo contenedor Docker multi-stage en Railway conectado a base de datos PostgreSQL estándar con integración continua y despliegue automático desde GitHub.
   - Suite de pruebas unitarias automatizadas (`test_staff_credentials.py`) con cobertura de creación de colaboradores, autenticación, rotación de claves y bloqueo de claves antiguas.

---

## 2. Detalle de Implementación por Módulo

### 2.1 Módulo de Personal & Credenciales (`StaffModule.jsx` + `staff.py`)

* **Backend (`backend/app/api/v1/staff.py`):**
  - Al registrar un colaborador con `email` y `password`, se valida que el correo no esté ocupado y se crea automáticamente un registro en la tabla `usuarios` con `role="local"` y `hashed_password` calculado con `get_password_hash()`.
  - Al actualizar un colaborador existente vía `PUT /api/v1/staff/{id}`, si se envía una nueva contraseña o se cambia el correo, se actualiza la cuenta vinculada o se crea si el trabajador aún no disponía de credenciales.
  - Al eliminar un colaborador (`DELETE /api/v1/staff/{id}`), se desvincula o da de baja la cuenta de usuario asociada para revocar el acceso inmediatamente.
* **Frontend (`frontend/src/components/StaffModule.jsx`):**
  - Formulario integrado con visor interactivo de contraseña (`Eye` / `EyeOff`) y generador de claves aleatorias de alta entropía (`Sparkles`).
  - Campo de PIN de Garita / ANPR (4 dígitos) con validación numérica estricta.
  - Modal de **Credenciales Rápidas** para restablecimiento de claves en 1 clic.
  - Eliminación del selector de *Rol Sistema*, garantizando que todo el personal creado por un Admin Local posea el rol operativo `local`.

### 2.2 Estudio de Planos 2D (`InteractiveFloorPlanDrawingStudio.jsx`)

* **Aislamiento del Modo Solo Lectura (`readOnly = true`):**
  - **Barra Superior:** Muestra badge `[🟢 Visualizador de Plano 2D • Solo Lectura]` junto a los controles de Zoom (`-`, `+`, `%`, `Ajustar pantalla`). Se ocultan los presets de terreno, el botón de auto-numerar, deshacer/rehacer, rejilla y el botón de guardar.
  - **Lienzo de Dibujo:** Se deshabilita el arrastre de elementos, el resize y la rotación interactiva.
  - **Inspector Lateral Informativo:**
    - Al hacer clic en una plaza: Muestra una tarjeta con código, tipo de vehículo (auto/moto), si es techada o no, estado de ocupación (`LIBRE` / `OCUPADO` con matrícula), dimensiones y orientación.
    - Sin elemento seleccionado: Muestra métricas consolidadas de la sede (total plazas, libres, ocupadas, motos y techadas) con una nota orientativa indicando que las modificaciones se realizan desde "Editar Plano".
* **Modo Editor CAD (`readOnly = false`):**
  - Conserva todas las capacidades avanzadas de ingeniería: herramientas de dibujo, auto-numeración espacial, imantación a rejilla, rotación libre en 360°, duplicación con `Ctrl+D`, alineación en el lote y guardado persistente en base de datos.

### 2.3 Estandarización de Iconografía SVG

* **Componentes Refactorizados:**
  - `InteractiveFloorPlanDrawingStudio.jsx`: Botones de alineación (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `ArrowUpDown`, `ArrowLeftRight`), indicadores de garita (`Camera` para ANPR, `CreditCard` para POS), notas y avisos (`Lock`, `Info`, `Lightbulb`).
  - `UserProfileModule.jsx`: Badges de campos protegidos con `<Lock className="w-2.5 h-2.5" />`.
  - `StaffModule.jsx`: Avisos y recomendaciones de acceso con `<Lightbulb className="w-3.5 h-3.5 text-amber-400" />`.

---

## 3. Pruebas Unitarias y Automatización

* Se implementó el archivo de pruebas `backend/app/tests/test_staff_credentials.py` ejecutado con `pytest` y `httpx.AsyncClient` sobre `ASGITransport`:
  1. Autenticación de un Administrador Local en el endpoint `/api/v1/auth/login`.
  2. Creación de un operador de garita con credenciales completas (`POST /api/v1/staff`).
  3. Comprobación de inicio de sesión exitoso con las credenciales del trabajador recién creado.
  4. Actualización de contraseña desde el panel de administración (`PUT /api/v1/staff/{id}`).
  5. Verificación de inicio de sesión con la nueva clave asignada.
  6. Confirmación de rechazo (`401 Unauthorized`) al intentar ingresar con la contraseña antigua.

**Resultado de la Suite:**
```text
collected 1 item
app/tests/test_staff_credentials.py::test_create_and_login_worker PASSED [100%]
======================= 1 passed in 6.77s ========================
```

---

## 4. Despliegue en Producción (Railway)

* Todos los cambios fueron compilados exitosamente con Vite 8 (`✓ built in 6.83s`) y enviados al repositorio remoto `https://github.com/khalyddGIT/smart-park.git`:
  - `a54aadb`: Limpieza de dependencias legacy y estandarización a Railway.
  - `d009135`: Aislamiento de modo visualizador en solo lectura en estudio CAD.
  - `6b2edd0`: Remoción de selector redundante de Rol Sistema en modales de personal.
  - `7429036`: Reemplazo de emojis por iconos vectoriales SVG oficiales de Lucide.
* Railway detecta automáticamente los commits en `origin/master` y despliega la imagen Docker multi-stage en el servicio de producción: `https://smart-park-web-production.up.railway.app`.
