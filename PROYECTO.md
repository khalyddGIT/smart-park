# SMART-PARK — Documentación Integral y Especificación Funcional del Sistema (Prompt Maestro)

Bienvenido a la especificación completa del sistema **Smart Park**. Este documento está estructurado de forma agnóstica al stack tecnológico, funcionando como **Prompt Maestro de Especificación Funcional** para que cualquier equipo de desarrollo o modelo de IA diseñe e implemente la plataforma en la tecnología, lenguaje o framework de su elección.

---

## 1. Descripción General y Objetivos (RQ - Requerimientos Generales)

- **RQ01 - Propósito del Sistema:** Plataforma Marketplace Multi-Tenant de gestión inteligente de estacionamientos que conecta conductores con establecimientos, automatizando la búsqueda, reserva, pago, lectura automática de placas (ANPR), cobro en tiempo real y administración global.
- **RQ02 - Modelo de Operación:** Sistema interactivo web reactivo con gestión de estado, motor de planos CAD 2D, mapas geolocalizados interactivos y pasarela de dispersión financiera quincenal.
- **RQ03 - Multi-Perfil y Accesibilidad por Roles:** Tres perfiles principales con interfaces y permisos estrictamente diferenciados: **Usuario Final / Conductor (`user`)**, **Administrador Local de Cochera (`local`)** y **Super Admin / Dueño de la Plataforma (`platform`)**.

---

## 2. Requerimientos Funcionales (RF)

### Módulo 1: Autenticación, Usuarios, PIN de Seguridad y Perfil
- **RF01 - Registro de Usuarios:** Formulario de registro con datos personales (nombre, correo, teléfono, contraseña) exclusivo para conductores.
- **RF02 - Inicio de Sesión y Autenticación:** Autenticación por credenciales con validación de estado activo.
- **RF03 - Validación por PIN de Seguridad (Acceso Admin):** Autenticación de seguridad mediante código PIN (4 a 6 dígitos) con teclado numérico (*keypad*) interactivo para roles administrativos.
- **RF04 - Gestión de PIN de Acceso:** Configuración, actualización y cambio del código PIN de seguridad del usuario.
- **RF05 - Cambio de Contraseña:** Modificación segura de credenciales.
- **RF06 - Control de Accesos Administrativos:** Restricción estricta de funciones críticas basada en el rol autenticado.
- **RF07 - Historial de Accesos:** Bitácora en tiempo real de intentos de ingreso (fecha, hora, método: Credenciales o PIN, resultado).
- **RF08 - Gestión de Perfiles y Roles (Admin Plataforma):** Directorio global de usuarios con capacidad de cambiar roles (`user`, `local`, `platform`).
- **RF09 - Control de Sesiones Activas:** Visualización de dispositivos conectados y opción de cierre de sesión global.
- **RF10 - Gestión de Vehículos:** CRUD para asociar vehículos (placa, tipo, marca, modelo, color).
- **RF137 - Pestañas Integradas en Perfil:** Consulta unificada de "Mis Vehículos", "Mis Reservas" y "Mis Pagos".

### Módulo 2: Búsqueda, Mapa Interactivo & Marquee Continuo
- **RF11 - Búsqueda de Estacionamientos:** Filtro por texto (nombre, jirón, avenida o distrito).
- **RF12 - Filtros Rápidos de Categoría:** Filtros de un solo clic (*Todas, Centro Histórico, Techadas, Económicas ≤ S/ 4.50*).
- **RF13 - Disponibilidad en Tiempo Real:** Indicador visual y radar animado de plazas libres en cada local.
- **RF14 - Filtro por Tipo de Plaza:** Autos, Motos, Bicicletas y Plazas Inclusivas (PMR bajo Norma A.120).
- **RF15 - Mapa Interactivo Leaflet:** Mapa visual interactivo con zoom, pan, marcadores dinámicos con badges en vivo y switch de capas (*Calles / Satélite HD*).
- **RF16 - Georreferenciación GPS:** Botón de centrado en Ayacucho y detección de ubicación actual del usuario.
- **RF17 - Cinta Marquee Infinita de Sedes:** Desplazamiento horizontal continuo automático de todas las sedes fuera del mapa, con pausa al hacer hover y click para enfocar.

### Módulo 3: Detalle de Estacionamiento y Selección de Espacios
- **RF20 - Ficha Técnica:** Galería de fotos, horarios, dirección y teléfono.
- **RF21 - Vista Gráfica del Plano del Local:** Renderizado interactivo de la distribución física de pisos y cajones.
- **RF22 - Selección Individual de Plaza:** Selección interactiva de una plaza libre sobre el plano para su reserva.
- **RF23 - Selector de Horario y Cálculo de Costo:** Configuración de hora inicio/fin y cálculo de monto total.
- **RF24 - Asignación de Vehículo:** Selección del vehículo registrado para la reserva.
- **RF25 - Generación de Comprobante y Código QR:** Pase de reserva con código QR dinámico único y token ANPR.

### Módulo 4: Gestión de Reservas y Pases de Ingreso
- **RF30 - Panel de Mis Reservas:** Reservas Activas, Programadas y Pasadas.
- **RF31 - Cancelación de Reservas:** Anulación con políticas de devolución y liberación inmediata de plaza.
- **RF32 - Extensión de Tiempo:** Ampliación del tiempo contratado en plazas libres.
- **RF33 - Validaciones en Garita:** Marcación de Check-In (Entrada) y Check-Out (Salida) por el operador de garita.

### Módulo 5: Estudio CAD y Gemelo Digital de Cocheras
- **RF40 - Estudio CAD 1:1:** Lienzo interactivo para diseñar la distribución de la cochera (muros, plazas auto/moto/PMR, garita, pasos peatonales).
- **RF41 - Estado en Vivo de Plazas:** Conmutador manual y automático del estado (*Libre / Ocupado / Reservado*).
- **RF42 - Tarifario y Aforo:** Parámetros de costo por hora y capacidad máxima del local.

### Módulo 6: Control de Garita LPR / ANPR
- **RF50 - Reconocimiento Automático de Matrículas:** Flujo de cámara en vivo y procesamiento OCR de matrículas vehiculares.
- **RF51 - Accionamiento de Barrera:** Apertura y cierre remoto de la barrera vehicular con verificación de acceso activo.

### Módulo 7: Finanzas, Comisiones & Liquidaciones (Super Admin)
- **RF60 - Tablero de KPIs Financieros:** Recaudación bruta de la red, comisión líquida retenida (10%-12%), saldo por transferir a cocheras y fondos liquidados.
- **RF61 - Padrón de Liquidaciones por Sede:** Registro bancario con RUC, Razón Social, Banco (BCP, BBVA, Interbank), Número de Cuenta y CCI.
- **RF62 - Dispersión Bancaria:** Ejecución de liquidaciones quincenales con generación de comprobante / voucher oficial descargable.
- **RF63 - Exportación Contable:** Descarga de reportes financieros consolidados en formato CSV / Excel para SUNAT.

### Módulo 8: Ajustes Maestros de Plataforma & Comunicados Push
- **RF70 - Parámetros Globales:** Configuración del % de comisión por defecto, tiempo de gracia en garita (15 min) y aranceles mínimo/máximo.
- **RF71 - Pasarelas de Pago:** Activación de Yape, Plin, Tarjetas y Smart Wallet en modo Producción o Sandbox.
- **RF72 - Modo Mantenimiento:** Interruptor global para contingencias con mensaje personalizado.
- **RF73 - Broadcast Masivo:** Disparo de notificaciones push a Conductores, Cocheras o toda la red simultáneamente.

### Módulo 9: Embudo de Afiliaciones de Cocheras
- **RF80 - Solicitud desde el Login:** Formulario modal para que dueños de cocheras soliciten unirse a la plataforma.
- **RF81 - Bandeja de Aprobaciones del Super Admin:** Revisión de postulaciones y alta automática de la cochera y credenciales de Admin Local.

### Módulo 10: Reseñas & Calidad Comunitaria
- **RF90 - Publicación de Reseñas:** Exclusivo para conductores tras utilizar el servicio (1 a 5 estrellas + comentario).
- **RF91 - Respuesta Oficial:** Los administradores de cochera pueden responder formalmente a las opiniones de sus clientes.
- **RF92 - Moderación Global:** El Super Admin puede moderar y eliminar comentarios fraudulentos o inapropiados.

### Módulo 11: Incidencias & Asistencia
- **RF100 - Reporte de Conductor:** Notificación de anomalías (cajón bloqueado, cobro indebido, daño vehicular).
- **RF101 - Infracciones de Garita:** Registro de vehículos mal estacionados o estancias vencidas.
- **RF102 - Resolución Administrativa:** Botón de resolución restringido a administradores locales y Super Admin.

---

## 3. Matriz de Roles y Permisos (RBAC)

| Capacidad | Conductor (`user`) | Admin Cochera (`local`) | Super Admin (`platform`) |
| :--- | :---: | :---: | :---: |
| Búsqueda y Reserva en Plano | ✅ | ❌ | ❌ |
| Gestión de Vehículos y Tarjetas | ✅ | ❌ | ❌ |
| Publicar Calificaciones / Reseñas | ✅ | ❌ | ❌ |
| Responder a Reseñas | ❌ | ✅ | ✅ |
| Moderar / Eliminar Reseñas | ❌ | ❌ | ✅ |
| Reportar Incidencias | ✅ | ✅ | ✅ |
| Marcar Incidencias como Resueltas | ❌ | ✅ | ✅ |
| Estudio CAD & Editor de Plazas | ❌ | ✅ (Su sede) | ✅ (Toda la red) |
| Garita LPR & Apertura de Barrera | ❌ | ✅ (Su sede) | ✅ (Telemetría) |
| Check-In / Check-Out en Garita | ❌ | ✅ | ✅ |
| Personal & Turnos | ❌ | ✅ (Su personal) | ✅ (Directorio) |
| Finanzas & Liquidaciones a Cocheras | ❌ | ❌ (Solo ve su caja) | ✅ (Dispersión & Pagos) |
| Ajustes Maestros & Broadcast | ❌ | ❌ | ✅ |
| Aprobación de Afiliaciones | ❌ | ❌ | ✅ |
| Padrón Maestro de Usuarios & PIN | ❌ | ❌ | ✅ |

---

## 4. Modelos de Monetización del Ecosistema

1. **Comisión por Reserva (10% - 12%):** Retención por cada transacción procesada por la plataforma.
2. **Suscripción SaaS para Cocheras:** Planes Básico (S/ 49/m), Pro con LPR (S/ 149/m) y Enterprise (S/ 299/m).
3. **Tarifa de Servicio al Conductor (S/ 0.80):** Cargo de conveniencia por plaza garantizada en hora punta.
4. **Pases Mensuales B2C (S/ 180 - S/ 250 / mes):** Abonos para trabajadores del centro urbano.
5. **Venta de Hardware IoT:** Kits de cámaras LPR IP y controladoras de garita.
6. **Publicidad Geolocalizada:** Comercios cercanos patrocinados en el mapa.
7. **Convenios Corporativos:** Facturación mensual para flotas empresariales.