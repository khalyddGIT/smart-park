# 🅿️ Smart Park Ayacucho — Documentación Gráfica e Integral de Vistas

Documento técnico y visual que detalla la arquitectura, roles de usuario, vistas, componentes y funcionalidades de la plataforma **Smart Park Enterprise**, incluyendo capturas reales de cada módulo.

---

## 📑 Tabla de Contenidos
1. [Arquitectura de Roles y Accesos](#1-arquitectura-de-roles-y-accesos)
2. [Vistas Públicas (Sin Autenticación)](#2-vistas-públicas-sin-autenticación)
   - 2.1. Landing Page Principal (Hero, Red de Cocheras, Mapa y Footer)
   - 2.2. Modal de Autenticación & Acceso Rápido
   - 2.3. Verificación Pública de Pases QR (`/verify/:id`)
3. [Vistas del Rol Conductor (Usuario / Cliente)](#3-vistas-del-rol-conductor-usuario--cliente)
   - 3.1. Búsqueda de Cocheras & Mapa en Vivo
   - 3.2. Plano Topográfico & Reserva Interactiva de Cajón
   - 3.3. Pase de Acceso Digital QR
   - 3.4. Padrón de Mis Reservas
   - 3.5. Mis Vehículos & Reconocimiento LPR
   - 3.6. Métodos de Pago & Billeteras Digitales
   - 3.7. Reporte de Incidencias & Asistencia
   - 3.8. Historial de Estancias & Descarga de Boletas
   - 3.9. Reseñas y Calificaciones de Cocheras
   - 3.10. Perfil de Usuario & Preferencias
4. [Vistas del Rol Administrador de Cochera (Garita / Local)](#4-vistas-del-rol-administrador-de-cochera-garita--local)
   - 4.1. Panel de Espacios & Edición de Sede (4 Pestañas)
   - 4.2. Estudio de Dibujo y Edición del Plano (CAD Studio)
   - 4.3. Control de Garita & Lector LPR Inteligente
   - 4.4. Directorio de Personal & Turnos
   - 4.5. Reportes de Ocupación & Rendimiento
   - 4.6. Diagnóstico y Resiliencia de Servicios
5. [Vistas del Rol Super Administrador de Plataforma (Platform)](#5-vistas-del-rol-super-administrador-de-plataforma-platform)
   - 5.1. Dashboard Global de la Red
   - 5.2. Finanzas & Liquidaciones por Sede
   - 5.3. Afiliación & Auditoría de Sedes
   - 5.4. Gestión de Usuarios & Permisos RBAC
   - 5.5. Ajustes Globales de Plataforma
6. [Diseño Responsivo & Reglas de Estilo](#6-diseño-responsivo--reglas-de-estilo)

---

## 1. Arquitectura de Roles y Accesos

El sistema opera bajo un esquema de **Control de Acceso Basado en Roles (RBAC)** con 3 perfiles principales:

| Rol | Identificador | Público Objetivo | Capacidades Principales |
| :--- | :---: | :--- | :--- |
| **Conductor** | `user` | Clientes y conductores en Ayacucho | Buscar cocheras, ver mapa satelital, elegir cajón en plano, reservar, emitir pases QR, gestionar vehículos, pagar con Yape/Plin/Tarjeta y reportar incidencias. |
| **Administrador de Cochera** | `local` | Dueños de garita y operadores | Editar sede (datos, fotos, mapa, redes), diseñar plano arquitectónico, monitorear cámara LPR, abrir barrera, emitir tickets presenciales y gestionar personal. |
| **Super Administrador** | `platform` | Administradores de la red Smart Park | Supervisión de todas las sedes en Ayacucho, recaudación financiera global, métricas de ocupación, comisiones, personal y auditoría. |

---

## 2. Vistas Públicas (Sin Autenticación)

### 2.1. Landing Page Principal (`LandingPage.jsx`)
* **Propósito:** Página de inicio y presentación corporativa orientada a conductores y dueños de playas de estacionamiento en Ayacucho.
* **Componentes Principales:**
  - **Banner Superior (Hero):** Título principal, estadísticas en tiempo real (Cocheras activas, Plazas libres, Tiempo de reserva < 30s) y botón de búsqueda directa.
  - **Buscador & Filtros en Vivo:** Filtro por zonas clave de Ayacucho (*Centro Histórico, Jr. Bellido, Mercado Cáceres, Terminal Libertadores*).
  - **Mapa Interactivo de Sedes (`AyacuchoMap.jsx`):** Vista geográfica con pines interactivos que muestran tarifas por hora y estado de ocupación.
  - **Tarjetas de Cocheras:** Listado con foto en encuadre 16:9, tarifa en Nuevos Soles (ej. `S/ 5.00/h`), distancia estimada y botón *"Ver Plano & Reservar"*.
  - **Pilares Tecnológicos:** Secciones explicativas sobre lectura automática de placas LPR, pagos sin contacto y seguridad 24/7.
  - **Footer Institucional:** Enlaces directos a Términos y Condiciones Legales, contacto y soporte por WhatsApp.

#### 📸 Capturas de la Landing Page:

**Hero Principal & Buscador:**
![Landing Page Hero](screenshots/landing_hero.png)

**Red de Cocheras & Mapa Interactivo en Ayacucho:**
![Mapa y Red de Estacionamientos](screenshots/landing_map_network.png)

**Pilares Tecnológicos & Beneficios:**
![Características del Sistema](screenshots/landing_features.png)

**Preguntas Frecuentes & Pie de Página Institucional:**
![Footer y Preguntas Frecuentes](screenshots/landing_footer.png)

---

### 2.2. Modal de Autenticación & Acceso Rápido (`LoginAuthScreen.jsx`)
* **Propósito:** Acceso seguro con estándares modernos de autenticación.
* **Características:**
  - **Google One-Tap / OAuth:** Inicio de sesión en 1 clic mediante credencial JWT oficial.
  - **Acceso Tradicional:** Correo electrónico y contraseña con validación contra el servidor backend FastAPI / PostgreSQL (Railway).
  - **Selector Rápido de Roles (Desarrollo/Demo):** Botones directos para alternar entre *Conductor*, *Administrador Local* y *Super Admin*.

#### 📸 Captura del Modal de Autenticación:
![Modal de Autenticación](screenshots/auth_modal.png)

---

### 2.3. Verificación Pública de Pases QR (`VerifyReservationPage.jsx`)
* **Ruta:** `/verify/:id` (ej. `/verify/RSV-8912`).
* **Propósito:** Página pública ligera diseñada para ser leída por cualquier escáner móvil o cámara de celular (Google Lens).
* **Contenido:**
  - Muestra en tiempo real si el pase está **Válido / En Estancia / Finalizado**.
  - Datos de placa, cajón asignado, cochera y tiempo transcurrido.

---

## 3. Vistas del Rol Conductor (Usuario / Cliente)

### 3.1. Búsqueda de Cocheras & Mapa en Vivo (`App.jsx` + `AyacuchoMap.jsx`)
* **Propósito:** Dashboard principal del conductor para localizar estacionamientos disponibles cerca de su destino.
* **Funcionalidades:**
  - Búsqueda predictiva por nombre de calle, referencia o barrio en Huamanga.
  - Filtros rápidos: `Todos`, `Centro Histórico`, `Techados`, `Económicos (≤ S/ 4.50)`.
  - Tarjetas informativas con indicador de plazas libres y botón directo para ingresar al plano.

---

### 3.2. Plano Topográfico & Reserva Interactiva (`CustomerInteractivePlanBooking.jsx`)
* **Propósito:** Permite al cliente explorar visualmente la cochera en un plano arquitectónico y elegir su plaza exacta.
* **Componentes:**
  - **Lienzo Gráfico (Canvas):** Renderiza en tiempo real muros, carriles viales con flechas de sentido, pasos peatonales, cajones estándar y plazas techadas (`⛱️`).
  - **Interacción Táctil / Mouse:** Soporte de paneo (arrastrar) y zoom (+/-) adaptable a celulares y escritorios.
  - **Estado de Cajones:**
    - Verde: *Libre*.
    - Rojo: *Ocupado (con placa del auto estacionado)*.
    - Cyan Pulsante: *Seleccionado por el usuario*.
  - **Panel Lateral de Reserva:** Selector de vehículo registrado, duración estimada en horas (`1h`, `2h`, `4h`, `8h`), cálculo de tarifa y botón `[ Confirmar Reserva ]`.

#### 📸 Captura del Plano Topográfico Interactivo:
![Reserva Interactiva sobre Plano](screenshots/conductor_plano_booking.png)

---

### 3.3. Pase de Acceso Digital QR (`DigitalAccessPassModal.jsx`)
* **Propósito:** Credencial digital generada al reservar para ingreso y salida en garita.
* **Elementos:**
  - Código QR de alta resolución con URL de verificación encriptada.
  - Temporizador de cuenta regresiva con tiempo restante de estancia.
  - Datos clave: Código de reserva (`RSV-XXXX`), Placa (`ABC-123`), Cajón (`A-01`) y Tarifa.
  - Botón directo para imprimir o descargar el comprobante.

#### 📸 Captura del Pase Digital QR:
![Pase de Acceso Digital QR](screenshots/conductor_pase_qr.png)

---

### 3.4. Padrón de Mis Reservas (`ReservationsModule.jsx`)
* **Propósito:** Gestión y seguimiento del historial de reservas del usuario.
* **Características:**
  - Pestañas de estado: `Todas`, `En Estancia (Activas)`, `Programadas`, `Finalizadas`, `Canceladas`.
  - Barra de progreso de tiempo transcurrido para estancias en curso.
  - Acceso inmediato al **Pase QR**, **Impresión de Ticket** o **Cancelación**.

#### 📸 Captura del Módulo de Reservas:
![Listado de Reservas del Conductor](screenshots/conductor_reservas.png)

---

### 3.5. Mis Vehículos & Reconocimiento LPR (`VehiclesModule.jsx`)
* **Propósito:** Registro del parque automotor del conductor para permitir la apertura automática de barrera por LPR.
* **Características:**
  - Formato de placa peruana estandarizado (ej. `ABC-123` para autos, `1234-5A` para motos).
  - Consulta automática de foto oficial del vehículo (API Car Imagery) según marca y modelo (Toyota RAV4, Hyundai Tucson, etc.).
  - Opción de capturar foto con la cámara del dispositivo o subir desde la galería.
  - Selector de vehículo predeterminado para reservas rápidas.

#### 📸 Captura del Módulo de Vehículos:
![Padrón de Vehículos](screenshots/conductor_vehiculos.png)

---

### 3.6. Métodos de Pago & Billeteras Digitales (`PaymentsModule.jsx`)
* **Propósito:** Configuración de medios de pago y consulta de comprobantes fiscales.
* **Características:**
  - **Billeteras Móviles (Yape & Plin):** Cobro instantáneo mediante código QR sin comisión.
  - **Tarjetas Tokenizadas (Visa / Mastercard):** Guardado seguro con tokenización.
  - **Comprobantes Electrónicos:** Registro de boletas y facturas emitidas bajo normativa SUNAT con botón para visualizar e imprimir comprobante.

#### 📸 Captura de Métodos de Pago en Móvil:
![Métodos de Pago](screenshots/pagos_mobile.png)

---

### 3.7. Reporte de Incidencias & Asistencia (`IncidentsModule.jsx`)
* **Propósito:** Canal de atención y reporte de problemas durante la estancia.
* **Categorías:** Cajón bloqueado, cobro indebido, daño vehicular, iluminación deficiente u otros.
* **Funcionalidad:** Adjuntar evidencia fotográfica (comprimida a dataURL) y seguimiento de respuesta de la administración.

---

### 3.8. Historial de Estancias & Descarga de Boletas (`HistoryModule.jsx`)
* **Propósito:** Padrón cronológico completo de todas las visitas realizadas con detalle de horas, montos pagados y comprobantes electrónicos PDF.

---

### 3.9. Reseñas y Calificaciones de Cocheras (`ReviewsModule.jsx`)
* **Propósito:** Evaluación de 1 a 5 estrellas y comentarios sobre la seguridad, limpieza y atención recibida en cada cochera.

---

### 3.10. Perfil de Usuario & Preferencias (`UserProfileModule.jsx`)
* **Propósito:** Actualización de datos de contacto, documento de identidad (DNI/RUC), configuración de notificaciones por WhatsApp/Email y gestión de seguridad.

---

### 3.11. Modal de Abonos Flexibles y Fecha Adelantada (`MoreReservationsModal.jsx`)
* **Propósito:** Permite al conductor contratar abonos periódicos o programar reservas anticipadas.
* **Planes de Abono Disponibles:**
  - **3 Semanas (21 días):** Plan destacado con prorrateo exacto al 70% del mes.
  - **1 Mes (30 días):** Abono mensual estándar completo.
  - **2 Semanas (14 días)** y **1 Semana (7 días):** Opciones intermedias proporcionales.
  - **Tarifario Fraccionado por Días:** Selector numérico de días personalizados con chips rápidos (5d, 10d, 15d, 25d, 45d) y tarificación prorrateada diaria:
    $$\text{Tarifa Diaria} = \frac{\text{Abono Mensual}}{30} \quad\longrightarrow\quad \text{Costo Total} = \text{Tarifa Diaria} \times \text{Días}$$
* **Reserva por Fecha Adelantada:** Selección de fecha y hora futura con cálculo anticipado de costos y tolerancia.
* **Protección contra Sedes Inactivas:** Si la cochera tiene el switch maestro desactivado (`subscription_enabled = false`), el modal bloquea automáticamente la pestaña de abonos y muestra una advertencia informativa guiando al conductor hacia la fecha adelantada.

---

## 4. Vistas del Rol Administrador de Cochera (Garita / Local)

### 4.1. Panel de Gestión Integral de Sede (`LocalEstablishmentManager.jsx`)
Permite al propietario gestionar de forma completa su establecimiento mediante 4 pestañas operativas:

1. **Pestaña 1: Datos de Sede & Ubicación:**
   - Nombre comercial de la cochera, RUC fiscal y titularidad.
   - Estado de operación: *Operativo (Abierto)*, *En Mantenimiento*, *Cerrado Temporalmente*.
   - Dirección física, referencia urbana y horario de atención (atajos: `24/7`, `06:00 AM - 10:00 PM`).
   - Selector GPS interactivo con mapa **Leaflet** nativo (marcador arrastrable y buscador de calles en Ayacucho).
   - Teléfono fijo, línea de atención WhatsApp con prueba de enlace y galería fotográfica.

2. **Pestaña 2: Tarifas, Abonos & Turno Noche:**
   - **Switch Maestro de Abonos (`subscription_enabled`):** Activa o desactiva con un solo clic la disponibilidad de suscripciones recurrentes y abonos flexibles en la sede.
   - **Padrón Dinámico de Tarifarios (CRUD Completo):**
     - Botón `+ Agregar Tarifario`: modal interactivo para crear tarifas por tipo de vehículo (Auto, Camioneta, Mototaxi, Moto, Personalizado) con cálculo automático del costo por minuto y abono de 3 semanas.
     - **Edición Rápida Inline:** Modificación directa de importes dentro de las tarjetas de tarifa en la cuadrícula.
     - **Edición Completa en Modal:** Ajuste exhaustivo de categorías, condiciones y notas.
     - **Eliminación con Confirmación:** Borrado seguro de tarifas personalizadas.
     - **Sincronización Bidireccional:** Todo cambio se refleja inmediatamente en las columnas nativas de la base de datos (`rate_auto`, `rate_suv`, `rate_moto`, `rate_mototaxi`, `rate_monthly_*`) para garantizar compatibilidad con Garita y ANPR.
   - **Turno Noche:** Conmutador de horario nocturno, definición de hora de inicio (`20:00`), hora de fin (`06:00`) y recargo por hora nocturna.

3. **Pestaña 3: Aforo & Distribución:**
   - Capacidad total de plazas de estacionamiento y niveles de lote (Superficie, Sótanos).
   - Configuración de minutos de tolerancia para la llegada de conductores (10, 15 o 20 minutos).

4. **Pestaña 4: Cámaras & Garita:**
   - URL del flujo de video IP/RTSP para reconocimiento automático de placas.
   - Calibración interactiva del cuadro OCR para el encuadre de la matrícula vehicular.

---

### 4.2. Visualizador de Plano 2D vs. Estudio CAD (`InteractiveFloorPlanDrawingStudio.jsx`)
* **Propósito:** Visualización e ingeniería topográfica digital de la distribución física de la cochera con modos estrictamente diferenciados.
* **Modos de Operación:**
  - **Modo Visualizador 2D ("Ver" - Solo Lectura):**
    - Diseñado para inspección rápida sin riesgo de alterar o mover elementos accidentalmente.
    - Oculta presets, auto-numeración, deshacer/rehacer, rejilla y herramientas de dibujo.
    - Al seleccionar cualquier plaza, despliega una tarjeta de especificaciones de solo lectura (código, tipo auto/moto, techado, estado libre/ocupado, matrícula y dimensiones).
    - Muestra métricas globales de la sede (total plazas, libres, ocupadas, motos y techadas).
  - **Modo Editor CAD ("Editar Plano" - Totalmente Interactivo):**
    - Herramienta completa de arquitectura y trazado: añadir cajones para autos, motos y techadas.
    - Trazado de muros perimetrales, carriles viales con flechas direccionales, pasos peatonales cebra, jardines y garitas con sensores ANPR.
    - Auto-renumeración espacial inteligente, snapping a rejilla imantada, rotación libre en 360°, duplicación y alineación en el lote.
    - Guardado y persistencia en tiempo real en la base de datos de la sede.

#### 📸 Captura del CAD Drawing Studio:
![Editor de Plano Topográfico](screenshots/cad_floor_plan_studio.png)

---

### 4.3. Control de Garita & Lector LPR Inteligente (`ANPRMonitor.jsx` & `PersonalGaritaModule.jsx`)
* **Propósito:** Consola operativa para el guardia u operador de garita con hardware de cámara y control de acceso.
* **Funcionalidades:**
  - **Visor de Cámara CCTV / WebCam:** Transmisión de video con encuadre de captura de placa.
  - **Reconocimiento OCR Ultrarrápido (`plateOcr.js`):** Normalización y corrección de caracteres confusos (ej. `O` por `0`, `I` por `1`) con verificación de reservas en base de datos.
  - **Mando de Barrera Manual:** Botón directo integrado en el encabezado `[ Abrir Barrera ]` / `[ Barrera Abierta ]`.
  - **Emisión Rápida de Tickets Presenciales:** Emite ticket con plaza asignada en 1 clic para clientes sin reserva previa.
  - **Monitor de Vehículos en Cochera:** Lista en tiempo real de los autos estacionados con su tiempo de estancia y botón de `Salida`.
  - **Liquidación Estricta de Sobreestadía:** Cobro del tiempo excedido en caja antes de autorizar la apertura de barrera.
  - **Bitácora de Accesos:** Registro cronológico de ingresos, salidas, placas y montos recaudados con exportación a CSV.

---

### 4.4. Padrón Operativo de Reservas de Garita (`ReservationsModule.jsx`)
* **Propósito:** Gestión táctica de llegadas, validación de pases QR y control de tolerancia.
* **Operaciones Clave:**
  - Marcación de **Check-In** y **Check-Out** por lectura de código QR o matrícula.
  - Detección visual de **Tolerancia Vencida (No-Show)** con liberación automática de cajón.
  - Registro de cobro presencial en efectivo o POS.

---

### 4.5. Directorio de Personal & Credenciales de Acceso (`StaffModule.jsx`)
* **Propósito:** Administración integral de la nómina de colaboradores, operadores de garita, guardias de seguridad y supervisores del establecimiento.
* **Capacidades Principales:**
  - **Asignación de Credenciales de Acceso:** Configuración directa de correo electrónico y contraseña segura para que los trabajadores inicien sesión directamente con rol operativo local.
  - **Control de Turnos & PIN de Garita:** Gestión de turnos (*Mañana, Tarde, Noche, Rotativo 24/7*), cargos operativos y PIN numérico de 4 dígitos para validación rápida en garita/ANPR.
  - **Gestión Rápida de Claves & Estados:** Modales para restablecer contraseñas de trabajadores y suspender o reactivar accesos al instante.

---

## 5. Vistas del Rol Super Administrador de Plataforma (Platform)

> **Nota Arquitectónica:** Para garantizar una separación estricta de responsabilidades, el rol de Superadministrador no interviene en la operación directa de garita de sedes individuales (el monitoreo de cámara local y el padrón operativo de reservas son exclusivos del Administrador Local y Operadores de Garita). El Superadministrador se enfoca en la gobernanza, finanzas, analítica y seguridad global de la red.

### 5.1. Dashboard Global de la Red (`PlatformGlobalDashboard.jsx`)
* **Propósito:** Centro de comando consolidado para la supervisión de toda la red de estacionamientos afiliados en Ayacucho.
* **Métricas Principales:** Recaudación bruta consolidada, comisión neta retenida (10%-12%), volumen de estancias atendidas, ocupación en tiempo real de toda la red y live feed de eventos.

### 5.2. Analítica Global de Red (`AnalyticsGlobalModule.jsx`)
* **Propósito:** Inteligencia de negocios para el dueño de la plataforma con gráficos interactivos Recharts:
  - Curvas de demanda por franja horaria y días de mayor saturación vehicular en el centro urbano.
  - Comparativa de rendimiento comercial y facturación entre sedes afiliadas.
  - Proyección de ingresos y métricas de retención de clientes.

### 5.3. Finanzas & Liquidaciones Bancarias Payout (`PlatformFinancesModule.jsx`)
* **Propósito:** Gestión de transferencias y dispersión de fondos a propietarios de cochera.
* **Funcionalidades:**
  - Padrón bancario de sedes con RUC, Razón Social, Banco (BCP, BBVA, Interbank), Número de Cuenta y CCI.
  - Ejecución de liquidaciones con generación de **Voucher Oficial descargable e imprimible**.
  - Conciliación contable y exportación a formato CSV / Excel para declaraciones tributarias (SUNAT).

### 5.4. Gestión de Sedes & Solicitudes de Afiliación (`AffiliatedParkingsModule.jsx`)
* **Propósito:** Bandeja de entrada para revisar solicitudes de afiliación enviadas por nuevos estacionamientos desde el portal público, con aprobación en 1 clic y alta automática de credenciales.

### 5.5. Directorio Global de Usuarios & Roles (`UserRolesModule.jsx`)
* **Propósito:** Administración centralizada de cuentas de usuario, asignación dinámica de roles (`user`, `local`, `platform`) y gestión de PINs de seguridad.

### 5.6. Ajustes Maestros de Plataforma (`PlatformSettingsModule.jsx`)
* **Propósito:** Parámetros globales del servicio (comisión estándar, ventana de gracia en garita), conmutador de pasarelas de pago (Producción/Sandbox), interruptor de modo mantenimiento y centro de comunicados masivos push.

### 5.7. Auditoría Forense Inmutable (`AuditLogsModule.jsx`)
* **Propósito:** Registro detallado de eventos de seguridad (creación de cuentas, cambio de tarifas, IPs y fallos de autenticación) con visor JSON y exportación.

### 5.8. Diagnóstico & Resiliencia de Servicios (`ResiliencySimModule.jsx`)
* **Propósito:** Monitoreo del estado de salud de la infraestructura en Railway, latencia de base de datos PostgreSQL, servicio WebSocket y simulaciones de contingencia de red.

---

## 6. Diseño Responsivo & Reglas de Estilo

1. **Cero Badges Innecesarios:**
   - La interfaz utiliza etiquetas de texto sobrias y directas, evitando saturar con píldoras o insignias decorativas.
2. **Navegación Móvil Flotante Glassmorphism:**
   - En pantallas pequeñas (`< 768px`), el sistema activa la barra de navegación curva inferior con botón activo elevado y menú desplegable *Drawer* para un manejo ergonómico con una sola mano.
3. **Rejillas Elásticas (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`):**
   - Garantizan que ningún texto o botón se corte en dispositivos móviles (iPhone, Android, Tablets y Laptops).
4. **Paleta de Colores Curada:**
   - Fondos claros y descansados (`slate-50`, `white`), contraste ejecutivo (`slate-900`, `slate-950`) y acentos de confirmación en verde esmeralda (`emerald-500`, `emerald-600`).

---

*Documentación generada y sincronizada con el repositorio master de Smart Park Ayacucho.*
