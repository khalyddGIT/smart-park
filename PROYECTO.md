# SMART-PARK — Documentación Integral y Especificación Funcional del Sistema (Prompt Maestro)

Bienvenido a la especificación completa del sistema **Smart Park**. Este documento está estructurado de forma agnóstica al stack tecnológico, funcionando como **Prompt Maestro de Especificación Funcional** para que cualquier equipo de desarrollo o modelo de IA diseñe e implemente la plataforma en la tecnología, lenguaje o framework de su elección.

---

## 1. Descripción General y Objetivos (RQ - Requerimientos Generales)

- **RQ01 - Propósito del Sistema:** Plataforma de gestión inteligente de estacionamientos que conecta conductores con establecimientos, automatizando la búsqueda, reserva, pago, lectura automática de placas (ANPR), cobro en tiempo real y administración global.
- **RQ02 - Modelo de Operación:** Sistema interactivo web con gestión de estado en memoria o persistencia flexible, diseñado para operar de forma fluida y desacoplada de backend en prototipos y escalable a producción.
- **RQ03 - Multi-Perfil y Accesibilidad por Roles:** Tres perfiles principales con interfaces y permisos diferenciados: **Usuario Final (`user`)**, **Administrador Local (`local`)** y **Administrador de Plataforma (`platform`)**.

---

## 2. Requerimientos Funcionales (RF)

### Módulo 1: Autenticación, Usuarios, PIN de Seguridad y Perfil
- **RF01 - Registro de Usuarios:** Formulario de registro con datos personales (nombre, correo, teléfono, contraseña).
- **RF02 - Inicio de Sesión y Autenticación:** Autenticación por credenciales con validación de estado activo.
- **RF03 - Validación por PIN de Seguridad (Acceso Admin):** Autenticación de seguridad mediante código PIN (4 a 6 dígitos) con teclado numérico (*keypad*) interactivo.
- **RF04 - Gestión de PIN de Acceso:** Configuración, actualización y cambio del código PIN de seguridad del usuario.
- **RF05 - Cambio de Contraseña:** Modificación segura de credenciales.
- **RF06 - Control de Accesos Administrativos:** Restricción de funciones críticas basada en el rol autenticado.
- **RF07 - Historial de Accesos:** Bitácora en tiempo real de intentos de ingreso (fecha, hora, método: Credenciales o PIN, resultado).
- **RF08 - Gestión de Perfiles y Roles (Admin Plataforma):** Directorio global de usuarios con capacidad de cambiar roles (`user`, `local`, `platform`).
- **RF09 - Control de Sesiones Activas:** Visualización de dispositivos conectados y opción de cierre de sesión global.
- **RF10 - Gestión de Vehículos:** CRUD para asociar vehículos (placa, tipo, marca, modelo, color).
- **RF137 - Pestañas Integradas en Perfil:** Consulta unificada de "Mis Vehículos", "Mis Reservas" y "Mis Pagos".

### Módulo 2: Búsqueda y Geolocalización
- **RF11 - Búsqueda de Estacionamientos:** Filtro por texto (nombre, distrito, dirección).
- **RF12 - Filtro por Cercanía y Distancia:** Deslizador de radio de distancia en kilómetros.
- **RF13 - Disponibilidad en Tiempo Real:** Indicador visual de plazas libres en cada local.
- **RF14 - Filtro por Tipo de Vehículo:** Autos, Camionetas, Motos, Bicicletas y Plazas Inclusivas (PMR).
- **RF15 - Mapa Interactivo:** Mapa visual con marcadores de ubicación.
- **RF16 - Información de Tarifas y Servicios:** Costo por hora/fracción y servicios (Techado, Vigilancia 24/7, Carga EV, Lavado).
- **RF17 - Ordenamiento de Resultados:** Clasificación por menor precio, distancia o valoración.

### Módulo 3: Detalle de Estacionamiento y Selección de Espacios
- **RF20 - Ficha Técnica:** Galería de fotos, horarios, dirección y teléfono.
- **RF21 - Vista Gráfica del Plano del Local:** Renderizado interactivo de la distribución física de pisos y cajones.
- **RF22 - Selección Individual de Plaza:** Selección interactiva de una plaza libre sobre el plano para su reserva.
- **RF23 - Selector de Horario y Cálculo de Costo:** Configuración de hora inicio/fin y cálculo de monto total.
- **RF24 - Asignación de Vehículo:** Selección del vehículo registrado para la reserva.
- **RF25 - Generación de Comprobante y Código QR:** Pase de reserva con código QR único.

### Módulo 4: Gestión de Reservas y Pases de Ingreso
- **RF30 - Panel de Mis Reservas:** Reservas Activas, Programadas y Pasadas.
- **RF31 - Cancelación de Reservas:** Anulación con políticas de devolución/penalidad.
- **RF32 - Extensión de Tiempo:** Ampliación del tiempo contratado en plazas libres.
- **RF33 - Visualización de Código QR:** Pase digital para escaneo en garita.
- **RF34 - Estado en Vivo:** Indicador en tiempo real del tiempo restante de la reserva.

### Módulo 5: Pasarela de Pagos Electrónicos y Descuentos
- **RF40 - Multi-Pasarela de Pago:** Tarjeta de Crédito/Débito, billeteras digitales (Yape/Plin) y Transferencia QR.
- **RF41 - Cupones Promocionales:** Aplicación de códigos de descuento.
- **RF42 - Comprobantes Digitales:** Generación de Boletas y Facturas.
- **RF43 - Historial de Transacciones:** Log de pagos realizados.
- **RF44 - Catálogo de Ofertas:** Promociones vigentes.

### Módulo 6: Historial de Movimientos
- **RF50 - Registro de Movimientos:** Entradas, salidas, duraciones y montos.
- **RF51 - Filtros Avanzados:** Por fecha, vehículo y local.
- **RF52 - Ficha de Detalle:** Detalle completo de la estancia.
- **RF53 - Exportación de Historial:** Descarga de registros en formato CSV.

### Módulo 7: Reseñas y Calificaciones
- **RF60 - Sistema de Calificación:** Valoración de 1 a 5 estrellas y comentarios.
- **RF61 - Muro de Reseñas:** Consulta del promedio y opiniones por estacionamiento.
- **RF62 - Moderación:** Respuestas del administrador local.

### Módulo 8: Central de Notificaciones
- **RF70 - Notificaciones en Tiempo Real:** Avisos de vencimiento, pagos, accesos y alertas.
- **RF71 - Gestión de Lectura:** Categorías y botón "Marcar todas como leídas".
- **RF72 - Indicador Visual:** Badge con contador no leído.

### Módulo 9: Términos y Condiciones
- **RF80 - Publicación Legal:** Consulta de términos y políticas.
- **RF81 - Aceptación:** Registro de conformidad en alta/uso.
- **RF82 - Editor:** Actualización de textos legales por el administrador de plataforma.

### Módulo 10: Mi Local - Datos del Establecimiento
- **RF90 - Perfil Comercial:** Nombre, dirección, coordenadas y contacto.
- **RF91 - Horarios de Atención:** Días, horas o modo 24 Horas.
- **RF92 - Tarifas y Tolerancia:** Precios por tipo de vehículo, hora/fracción, noche y tolerancia sin costo.
- **RF93 - Galería de Fotos:** Carga de imágenes representativas.

### Módulo 11: Gestión de Espacios y Editor Gráfico de Mapas
- **RF100 - CRUD de Plazas:** Código, nivel, tipo de vehículo y estado (Libre, Ocupado, Reservado, Inhabilitado).
- **RF101 - Editor Gráfico Interactivo de Planos:** Editor visual con herramientas de arrastre, rotación, escalado, formas geométricas, texto decorativo y **pasos peatonales (*crosswalks*) con franjas blancas**.
- **RF102 - Edición Masiva (Multi-selección):** Cambio de propiedades de varios objetos en bloque.
- **RF103 - Dibujo Libre:** Trazo a mano alzada para áreas complejas.
- **RF104 - Sincronización del Plano:** Actualización automática del mapa visual de cara al cliente.

### Módulo 12: Registro y Control en Garita
- **RF110 - Control Manual de Accesos:** Registro de ingresos y salidas en puerta.
- **RF111 - Búsqueda Instantánea:** Consulta por placa o documento.
- **RF112 - Emisión de Ticket:** Comprobante físico/digital con sello de tiempo.
- **RF113 - Precobro en Garita:** Liquidación manual según permanencia.

### Módulo 13: Reconocimiento Automático de Placas ANPR/LPR
- **RF120 - Lectura de Placas (ANPR):** Simulación de lectura de matrículas en tiempo real.
- **RF121 - Validación contra Reservas:** Cotejo automático con reservas programadas.
- **RF122 - Control de Barrera:** Apertura automática de talanquera tras validación positiva.
- **RF123 - Bitácora ANPR:** Log de capturas con foto, placa detectada y nivel de certeza.

### Módulo 14: Monitoreo en Tiempo Real y Vigilancia
- **RF130 - Cuadrícula de Cámaras:** Feeds simulados de seguridad.
- **RF131 - Mapa de Ocupación Dinámico:** Matriz gráfica con colores por estado de cajón.
- **RF132 - Métricas de Capacidad:** Ocupación libre/ocupado en vivo.
- **RF133 - Alertas Operativas:** Notificaciones por permanencia excesiva o mal estacionamiento.

### Módulo 15: Motor de Cobro Automático
- **RF140 - Algoritmo de Liquidación:** Evaluación de tiempo, tolerancia, fraccionamiento y descuentos.
- **RF141 - Débito Directo al Salir:** Cobro automático al usuario registrado al pasar la barrera.
- **RF142 - Desglose Visual:** Resumen en pantalla del tiempo facturado e importe.

### Módulo 16: Visión Artificial y Analítica de Video
- **RF150 - Detección por Computadora:** Algoritmo de detección de objetos en video.
- **RF151 - Clasificación:** Identificación de Autos, Motos, Camiones y Peatones.
- **RF152 - Detección de Eventos:** Alertas por infracciones o invasión de carril.
- **RF153 - Recuadros de Seguimiento:** Delimitadores visuales (*bounding boxes*) en cámaras.

### Módulo 17: Gestión de Mi Personal / Staff
- **RF160 - Directorio de Empleados:** Administración del personal del local.
- **RF161 - CRUD de Staff:** Alta, edición, estado, DNI, cargo y turno.
- **RF162 - Búsqueda y Filtros:** Búsqueda por nombre, cargo o turno.
- **RF163 - Exportación:** Descarga de la nómina en formato CSV.

### Módulo 18: Reportes y Estadísticas Analytics
- **RF170 - Dashboard de KPIs:** Ingresos, afluencia, ocupación promedio y horas pico.
- **RF171 - Gráficas Comparativas:** Tendencias por periodo.
- **RF172 - Exportación Analítica:** Formatos CSV y JSON.
- **RF173 - Analytics Globales (Admin Plataforma):** Métricas consolidadas de la red de locales.

### Módulo 19: Estacionamientos Afiliados
- **RF180 - Administración de Establecimientos:** Registro de nuevos locales y suspensión.
- **RF181 - Configuración de Comisiones:** Tarifas de convenio de la plataforma.
- **RF182 - Estado Operativo:** Activo, En Mantenimiento, Suspendido.

### Módulo 20: Configuración del Sistema
- **RF190 - Parámetros Operativos:** Tolerancias y políticas de ticket perdido.
- **RF191 - Integración de Hardware:** Configuración de tótems, barreras y cámaras.
- **RF192 - Configuración de Alertas:** Umbrales de notificación.

---

## 3. Requerimientos No Funcionales (RNF)

- **RNF01 - Rendimiento y Tiempo de Respuesta:** Navegación instantánea entre vistas y carga ágil de componentes.
- **RNF02 - Gestión de Estado Reactiva:** Mantención consistente del estado de la aplicación en la sesión del cliente o backend.
- **RNF03 - Diseño Adaptativo e Interfaz Responsiva:** Compatibilidad fluida en escritorios, tablets y smartphones.
- **RNF04 - Fluidez Gráfica en Editor de Planos:** Manipulación interactiva a 60 FPS en operaciones de arrastre, escalado y rotación.
- **RNF05 - Seguridad y Protección de Datos:** Enmascaramiento de contraseñas, PIN de seguridad protegido y cifrado de datos.
- **RNF06 - Sistema de Diseño Uniforme:** Componentes estandarizados (Modales, Notificaciones Toast, Badges de estado, Tablas responsive) con estética moderna (Dark/Light mode, tipografía limpia, iconografía clara).
- **RNF07 - Escalabilidad e Independencia:** Arquitectura modular desacoplada que permite reemplazar componentes sin afectar el resto del sistema.
- **RNF08 - Tolerancia a Fallos y Recuperación:** Resiliencia de estado y restablecimiento controlado ante eventos inesperados.

---

## 4. Catálogo Detallado de Vistas y Pantallas del Sistema

### 4.1 Pantallas Comunes
1. **Pantalla de Carga / Inicialización.**
2. **Encabezado Global (Navbar):** Buscador, conmutador de perfil (*Profile Switcher*), notificaciones y cuenta.
3. **Barra Lateral (Sidebar):** Menú por rol.
4. **Dashboards Principales:**
   - **Usuario:** Reservas activas, locales cercanos y vehículos.
   - **Admin Local:** KPIs diarios, gráfico de afluencia y acceso a Editar Mapa.
   - **Admin Plataforma:** Métricas consolidadas de la red.

### 4.2 Pantallas del Rol Usuario Final (`user`)
- Búsqueda y Geolocalización (Filtros, mapa, disponibilidad libre/ocupado).
- Detalle de Estacionamiento (Plano 2D, selección de plaza, horas y reserva).
- Mis Reservas y Pases (Códigos QR, extensión y cancelación).
- Pasarela de Pagos (Métodos de pago, cupones, comprobante Boleta/Factura).
- Historial de Estancias (Detalles y exportación CSV).
- Reseñas y Calificaciones (Estrellas y comentarios).
- Mi Cuenta (Datos personales, CRUD Mis Vehículos, Mis Reservas, Mis Pagos, PIN de Seguridad).
- Notificaciones y Términos & Condiciones.

### 4.3 Pantallas del Rol Administrador Local (`local`)
- Mi Local (Perfil comercial, tarifas por vehículo/fracción, horarios, fotos).
- Gestión de Espacios y **Editor Gráfico de Planos** (Arrastre de cajones, crosswalks con bandas blancas, multi-selección, dibujo libre).
- Control de Garita (Registro manual de entradas/salidas y precobro).
- Reconocimiento de Placas ANPR (Cámara simulada, lecturas y certeza).
- Monitoreo en Tiempo Real (Cuadrícula de cámaras y mapa de ocupación).
- Cobro Automático (Liquidación automática y débito directo al salir).
- Visión Artificial (Clasificación de objetos y recuadros de seguimiento).
- Mi Personal / Staff (CRUD del equipo, turnos, DNI, estado y exportación CSV).
- Reportes y Estadísticas del Local.
- Configuración de Hardware y Tolerancias.

### 4.4 Pantallas del Rol Administrador Plataforma (`platform`)
- Dashboard Consolidado Global.
- Estacionamientos Afiliados (Directorio, comisiones, altas/bajas).
- Gestión de Roles y Usuarios (Tabla global, cambio de rol `user`/`local`/`platform` y bitácora de accesos).
- Reportes Analíticos de Plataforma.

---

## 5. Modelos Conceptuales de Datos (Entidades del Sistema)

- **Usuario:** ID, Nombre, Correo, Rol (`user`, `local`, `platform`), Teléfono, Fecha de Registro, PIN de Seguridad.
- **Personal / Staff:** ID, Local_ID, Nombre, Cargo, Teléfono, Correo, DNI, Turno, Estado (`activo`/`inactivo`), Fecha de Contratación.
- **Estacionamiento / Local:** ID, Nombre, Dirección, Coordenadas, Estado (`Activo`, `Mantenimiento`, `Suspendido`), Horario, Minutos de Tolerancia, Tarifas por Tipo de Vehículo, Plano Estructural.
- **Espacio / Cajón:** ID, Local_ID, Código (ej. A-01), Piso, Tipo de Vehículo, Estado (`libre`, `ocupado`, `reservado`, `inhabilitado`), Coordenadas/Dimensiones en Plano.
- **Elemento del Plano (Celda de Diseño):** ID, Tipo (rectángulo, círculo, diamante, línea, texto, paso peatonal), Coordenadas, Ancho, Alto, Color de Relleno/Borde, Rotación, Orden Visual (Z-Index).
- **Vehículo:** ID, Usuario_ID, Placa, Tipo, Marca, Modelo, Color.
- **Reserva:** ID, Código, Usuario_ID, Local_ID, Espacio_ID, Placa, Hora Inicio, Hora Fin, Estado (`activa`, `programada`, `completada`, `cancelada`), Costo Total, Código QR.
- **Transacción / Pago:** ID, Reserva_ID, Usuario_ID, Monto, Método de Pago, Cupón Aplicado, Descuento, Estado, Tipo de Comprobante (Boleta/Factura), Fecha.

---

## 6. Reglas de Negocio Explícitas

### 6.1 Liquidación de Tarifa de Parqueo
1. `Tiempo Total = Hora de Salida - Hora de Ingreso`.
2. Si `Tiempo Total <= Tolerancia del Local`, el costo base de estancia es **0**.
3. Si `Tiempo Total > Tolerancia del Local`, `Tiempo Facturable = Tiempo Total - Tolerancia`.
4. `Monto Final = (Tiempo Facturable × Tarifa por Fracción/Minuto) + Costo de Reserva - Descuentos Promocionales`.

### 6.2 Lógica de Lectura y Validación ANPR
1. La cámara detecta la matrícula del vehículo a la entrada.
2. El sistema coteja la placa con las reservas programadas/activas del establecimiento.
3. **Si coincide:** Marca el espacio como `ocupado`, registra la entrada en la bitácora y envía la señal de apertura de barrera.
4. **Si no coincide:** Notifica al operador de garita para emitir un ticket de parqueo manual.

### 6.3 Editor Gráfico de Planos (*Floor Plan*)
1. Permite posicionar libremente plazas de parqueo, áreas peatonales y elementos decorativos sobre un lienzo de diseño.
2. Soporta transformaciones visuales (arrastrar, rotar, redimensionar, cambiar capas de nivel Z).
3. **Paso Peatonal (*Crosswalk*):** Renderiza una zona peatonal gris con franjas blancas perpendiculares al flujo.
4. Al guardar el diseño, el plano se actualiza automáticamente para que los clientes seleccionen su cajón sobre la vista interactiva 2D.

---

## 7. Matriz de Roles y Permisos

| Módulo / Funcionalidad | Usuario Final (`user`) | Admin Local (`local`) | Admin Plataforma (`platform`) |
|------------------------|:---------------------:|:--------------------:|:----------------------------:|
| **Dashboard** | Panel Cliente | Panel Local | Panel Consolidado Global |
| **Búsqueda & Geolocalización** | Acceso Total | Lectura | Lectura |
| **Detalle & Reserva de Plazas** | Acceso Total | Lectura | Lectura |
| **Pases QR & Mis Reservas** | Acceso Total | Consulta de Pases | Consulta Global |
| **Pagos, Cupones & Comprobantes** | Paga / Aplica Promo | Lectura | Auditoría Financiera Global |
| **Historial de Movimientos** | Mis Movimientos | Movimientos del Local | Movimientos de la Red |
| **Reseñas y Calificaciones** | Emite Opinión | Responde Reseñas | Moderación Global |
| **Central de Notificaciones** | Alertas de Cliente | Alertas Operativas | Alertas del Sistema |
| **Mi Cuenta & Vehículos** | CRUD Mis Vehículos | Datos de Cuenta | Datos de Cuenta |
| **Mi Local (Tarifas/Horarios)** | Sin Acceso | Acceso Total (CRUD) | Lectura / Supervisión |
| **Gestión Espacios & Editor Canva** | Sin Acceso | Acceso Total (Editor Gráfico) | Supervisión |
| **Registro Vehicular Garita** | Sin Acceso | Acceso Total | Sin Acceso |
| **Reconocimiento ANPR / Cámaras** | Sin Acceso | Acceso Total | Sin Acceso |
| **Monitoreo Tiempo Real / IA** | Sin Acceso | Acceso Total | Sin Acceso |
| **Cobro Automático Salida** | Recibe Cobro | Administra Motor | Auditoría |
| **Gestión de Mi Personal** | Sin Acceso | Acceso Total (CRUD Staff) | Sin Acceso |
| **Reportes & Estadísticas** | Sin Acceso | Analytics del Local | Analytics Globales Red |
| **Estacionamientos Afiliados** | Sin Acceso | Sin Acceso | Acceso Total (CRUD Locales) |
| **Gestión de Roles & Usuarios** | Sin Acceso | Sin Acceso | Acceso Total (Asignar Roles) |
| **Configuración de Dispositivos** | Sin Acceso | Acceso Total | Supervisión |

---

## 8. Prompt Maestro de Especificación Funcional (System Master Prompt)

> **Copia y pega este bloque en cualquier asistente de IA desarrollador:**

```text
Actúa como un Arquitecto de Software Senior y Desarrollador Full-Stack.

Tu objetivo es diseñar e implementar el sistema web completo "SMART PARK" siguiendo estrictamente la especificación funcional descrita en este documento.

REGLAS DE IMPLEMENTACIÓN:
1. INDEPENDENCIA TECNOLÓGICA: Utiliza el lenguaje, marco de trabajo (framework) o arquitectura web de tu elección que mejor se adapte para cumplir con todos los requerimientos funcionales descritos.
2. NAVEGACIÓN Y ROLES: Implementa el soporte para los 3 perfiles principales ('user', 'local', 'platform') con un conmutador de roles dinámico que adapte los menús, permisos y paneles en tiempo real.
3. EDITOR GRÁFICO DE PLANOS: Implementa un editor interactivo de mapas para que el Administrador Local diseñe el plano del parqueo (plazas, paredes, pasos peatonales con franjas blancas, texto) y sincronice dicho plano para que el Usuario Final pueda seleccionar su cajón en 2D.
4. CONTROL DE ACCESOS Y ANPR: Simula la lectura automática de matrículas (ANPR) cotejando placas con reservas para la apertura de barrera y la actualización en tiempo real del mapa de ocupación.
5. SEGURIDAD Y PIN: Implementa autenticación administrativa por código PIN de seguridad de 4 a 6 dígitos con teclado numérico interactivo.
6. DISEÑO E INTERFAZ: Proporciona un diseño limpio, responsivo y profesional con notificaciones visuales, modales, tablas dinámicas y gráficos analíticos.

Implementa los 20 módulos respetando los códigos de Requerimientos Funcionales (RF01 a RF192) y las reglas de negocio establecidas.
```