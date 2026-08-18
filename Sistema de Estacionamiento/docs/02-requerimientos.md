# 02 → Requerimientos Funcionales y No Funcionales

## Requerimientos Funcionales (RF)

### Módulo 1: Autenticación, Usuarios, PIN de Seguridad y Perfil
- **RF01 - Registro de Usuarios:** Registro con nombre, correo, teléfono y contraseña.
- **RF02 - Inicio de Sesión y JWT:** Autenticación por credenciales que emite Token Bearer con rol asociado.
- **RF03 - Validación por PIN de Seguridad:** Acceso a funciones críticas/admin mediante PIN (4 a 6 dígitos) con teclado numérico virtual interactivo.
- **RF04 - Gestión de PIN:** Configuración y modificación del PIN de seguridad.
- **RF05 - Cambio de Contraseña:** Actualización segura de clave de acceso.
- **RF06 - Control de Accesos por Rol:** Restricción según perfil (`user`, `local`, `platform`).
- **RF07 - Bitácora de Accesos:** Log en tiempo real de inicios de sesión con método y resultado.
- **RF08 - Gestión de Perfiles (Admin Plataforma):** Cambio de rol de cualquier usuario del sistema.
- **RF09 - Control de Sesiones:** Visualización y cierre global de sesiones activas.
- **RF10 - CRUD de Mis Vehículos:** Registro de vehículos (placa, tipo, marca, modelo, color).
- **RF137 - Pestañas de Perfil Integrado:** Vista unificada de Vehículos, Reservas y Métodos de Pago.

### Módulo 2: Búsqueda y Geolocalización
- **RF11 - Búsqueda por Texto:** Filtro de parqueos por nombre, distrito o dirección.
- **RF12 - Filtro por Radio de Distancia:** Deslizador de rango en kilómetros.
- **RF13 - Disponibilidad en Tiempo Real:** Contador en vivo de plazas libres por parqueo.
- **RF14 - Filtro por Tipo de Vehículo:** Autos, Motos, Camionetas, Bicis y PMR (Movilidad Reducida).
- **RF15 - Mapa Interactivo:** Marcadores geolocalizados con detalles emergentes.
- **RF16 - Información de Tarifas y Servicios:** Costo por hora/fracción, tolerancia, vigilancia, carga EV, lavado.
- **RF17 - Ordenamiento:** Clasificación por menor precio, cercanía o valoración.

### Módulo 3: Detalle de Estacionamiento y Selección de Espacios
- **RF20 - Ficha Técnica Comercial:** Galería de fotos, dirección, horarios y contacto.
- **RF21 - Plano Interactivo 2D:** Renderizado del piso y distribución de cajones.
- **RF22 - Selección de Plaza en Plano:** Click directo sobre un cajón libre para reservarlo.
- **RF23 - Selector de Horario y Tarifador:** Definición de horas y cálculo de costo total estimado.
- **RF24 - Asignación de Vehículo:** Selección de la placa registrada a estacionar.
- **RF25 - Generación de Comprobante QR:** Emisión de pase digital con QR único.

### Módulo 4: Gestión de Reservas y Pases
- **RF30 - Panel de Mis Reservas:** Categorizadas en Activas, Programadas y Completadas/Canceladas.
- **RF31 - Cancelación de Reserva:** Anulación con política de reembolso/penalidad.
- **RF32 - Extensión de Tiempo:** Ampliación de la duración si el cajón sigue disponible.
- **RF33 - Pase Digital QR:** Modal para mostrar el QR al escáner de la garita.
- **RF34 - Estado en Vivo:** Temporizador en tiempo real con cuenta regresiva.

### Módulo 5: Pasarela de Pagos y Cupones
- **RF40 - Multi-Pasarela:** Tarjeta de Crédito/Débito, Yape/Plin y Transferencia QR.
- **RF41 - Cupones de Descuento:** Aplicación y validación de códigos promocionales.
- **RF42 - Comprobantes Digitales:** Generación automática de Boleta o Factura.
- **RF43 - Historial de Transacciones:** Registro completo de pagos realizados.

### Módulo 6: Historial de Movimientos
- **RF50 - Registro de Movimientos:** Entradas, salidas, duraciones y montos cobrados.
- **RF51 - Filtros Avanzados:** Por rango de fechas, placa de vehículo o establecimiento.
- **RF53 - Exportación CSV:** Descarga directa de datos en archivo CSV.

### Módulo 7: Reseñas y Calificaciones
- **RF60 - Valoración de 1 a 5 Estrellas:** Puntuación y comentarios por parte del conductor.
- **RF61 - Muro de Reseñas:** Consulta pública de valoraciones en la ficha del local.
- **RF62 - Respuesta del Administrador:** Respuesta directa del Administrador Local.

### Módulo 8: Central de Notificaciones
- **RF70 - Notificaciones en Vivo:** Alertas por vencimiento de reserva, pagos y accesos.
- **RF71 - Gestión de Notificaciones:** Botón "Marcar todas como leídas" y filtros.
- **RF72 - Badge Contador:** Indicador numérico de elementos no leídos en la barra superior.

### Módulo 9: Términos y Políticas
- **RF80 - Publicación Legal:** Sección con términos de servicio y privacidad.
- **RF82 - Editor Legal:** Edición de textos por el Administrador de Plataforma.

### Módulo 10: Mi Local - Datos del Establecimiento
- **RF90 - Perfil Comercial:** Edición de nombre, dirección, coordenadas y teléfono.
- **RF91 - Horarios de Atención:** Días y rango horario o modo 24 Horas.
- **RF92 - Tarifas y Tolerancia:** Precios por tipo de vehículo, tolerancia gratuita (minutos) y tarifa plana nocturna.
- **RF93 - Galería de Fotos:** Carga y administración de imágenes del local.

### Módulo 11: Editor Gráfico de Planos y Espacios
- **RF100 - CRUD de Plazas:** Código (ej. A-01), piso, tipo y estado (`libre`, `ocupado`, `reservado`, `inhabilitado`).
- **RF101 - Editor Canva 2D Interactivo:** Herramienta visual con arrastrar/soltar, rotación, redimensionado y elementos geométricos.
- **RF101.1 - Pasos Peatonales (*Crosswalks*):** Renderizado de zonas peatonales grises con franjas blancas perpendiculares.
- **RF102 - Edición Masiva:** Selección múltiple para cambio de atributos en bloque.
- **RF104 - Sincronización en Vivo:** Actualización inmediata para la vista del cliente.

### Módulo 12: Registro y Control en Garita
- **RF110 - Control Manual en Puerta:** Registro directo de ingreso y salida por placa.
- **RF111 - Búsqueda Rápida:** Búsqueda instantánea por matrícula o documento.
- **RF112 - Emisión de Ticket:** Impresión/generación de ticket con sello de tiempo.
- **RF113 - Precobro en Garita:** Liquidación en efectivo o POS al momento de salir.

### Módulo 13: Reconocimiento ANPR/LPR
- **RF120 - Lectura de Placas ANPR:** Simulación de lectura mediante cámaras de garita.
- **RF121 - Validación de Reservas:** Cotejo automático de la placa detectada contra reservas vigentes.
- **RF122 - Control de Barrera:** Apertura automática de talanquera si la validación es positiva.
- **RF123 - Bitácora ANPR:** Log de lecturas con foto simulada, placa, nivel de confianza y hora.

### Módulo 14: Monitoreo en Tiempo Real y Vigilancia
- **RF130 - Cuadrícula de Cámaras:** Visualización simulada de streams de video de seguridad.
- **RF131 - Mapa de Ocupación Dinámico:** Matriz gráfica codificada por colores por estado de cajón.
- **RF132 - Métricas de Capacidad:** Porcentaje de ocupación y plazas disponibles en tiempo real.

### Módulo 15: Motor de Cobro Automático
- **RF140 - Algoritmo de Liquidación:** `Monto = (Tiempo Total - Tolerancia) × Tarifa + Costos Extra - Descuento`.
- **RF141 - Débito Directo al Salir:** Cobro automático a la tarjeta guardada al cruzar la barrera de salida.

### Módulo 16: Visión Artificial
- **RF150 - Detección de Objetos:** Simulación de IA para clasificación de Autos, Motos, Camiones y Peatones.
- **RF153 - Recuadros Bounding Box:** Overlays visuales sobre las cámaras de vigilancia.

### Módulo 17: Gestión de Personal / Staff
- **RF160 - Directorio de Personal:** Lista de empleados asignados al parqueo.
- **RF161 - CRUD de Staff:** Alta, baja, edición de DNI, cargo, teléfono y turno.
- **RF163 - Exportación Staff CSV:** Descarga del listado de personal.

### Módulo 18: Reportes y Analítica
- **RF170 - Dashboard KPIs:** Afluencia diaria, ingresos acumulados, ocupación promedio y horas pico.
- **RF171 - Gráficas de Tendencia:** Gráficos interactivos por día, semana y mes.
- **RF173 - Analytics Globales Red:** Resumen consolidado para Admin Plataforma.

### Módulo 19: Estacionamientos Afiliados (Admin Plataforma)
- **RF180 - Directorio Global de Locales:** Registro, aprobación, suspensión y edición de parqueos afiliados.
- **RF181 - Configuración de Comisiones:** Definición del porcentaje de comisión del SaaS.

### Módulo 20: Configuración del Sistema
- **RF190 - Parámetros Operativos:** Tolerancias por defecto y políticas de ticket perdido.
- **RF191 - Integración Hardware:** Configuración de direcciones IP de cámaras y barreras.

---

## Requerimientos No Funcionales (RNF)

- **RNF01 - Rendimiento:** Tiempo de respuesta de endpoints API < 100ms. Carga de vistas frontend < 1s.
- **RNF02 - Concurrencia:** Soporte de conexiones WebSockets simultáneas para actualización en vivo.
- **RNF03 - Responsividad y Diseño:** Adaptabilidad fluida (Mobile First / Desktop) con Tailwind CSS.
- **RNF04 - Fluidez Gráfica Canva:** Renderizado de plano a 60 FPS con interacciones fluidas.
- **RNF05 - Seguridad:** Hashing de contraseñas con bcrypt, cifrado de PIN, tokens JWT con expiración.
- **RNF06 - Arquitectura:** Backend en FastAPI en capas (Routers, Services, Repositories, Schemas Pydantic, Models SQLAlchemy) y Frontend modular React.
