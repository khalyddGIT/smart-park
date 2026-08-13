# 07 → Diseño de Interfaces de Usuario (UI/UX)

## Guía Estética y Tokens de Diseño

- **Modo Predeterminado:** Dark Mode Elegante / Glassmorphism.
- **Paleta de Colores:**
  - **Fondo Principal:** Deep Slate `#0B0F19` / `#111827`.
  - **Superficie de Tarjetas:** Dark Navy `#1F2937` con bordes sutiles `border-slate-700/50`.
  - **Color Primario (Acción):** Electric Emerald `#10B981` / Cyan Glow `#06B6D4`.
  - **Estados de Plazas de Parqueo:**
    - **Libre (Free):** Emerald Green `#22C55E`
    - **Ocupado (Occupied):** Rose Red `#EF4444`
    - **Reservado (Reserved):** Amber Gold `#F59E0B`
    - **Inhabilitado (Disabled):** Slate Gray `#64748B`
- **Tipografía:** Sans-Serif moderna (Inter / Roboto) con jerarquía clara y pesos bold para números/tarifas.

---

## Estructura de Pantallas por Rol

### 1. Rol Usuario Final (`user`)
- **Dashboard Cliente:** Resumen de reserva activa (con temporizador en vivo), acceso rápido a buscar estacionamiento y lista de vehículos.
- **Búsqueda & Mapa:** Barra superior con filtros (distancia, tarifa, vehículos) y visualización combinada de lista a la izquierda y mapa interactivo a la derecha.
- **Detalle de Local & Plano 2D:** Ficha comercial con fotos y visualizador gráfico del plano. El usuario hace click sobre un cajón verde para abrir la ventana modal de confirmación de reserva.
- **Pase Digital QR:** Modal emergente con código QR nítido, datos del vehículo, hora límite y botón de extensión de tiempo.

---

### 2. Rol Administrador Local (`local`)
- **Editor Gráfico de Planos (Canva 2D):**
  - **Barra Lateral de Herramientas:** Agregar Cajón (Auto, Moto, PMR), Pared, Vía, Paso Peatonal (*Crosswalk*), Texto.
  - **Lienzo Canva Central:** Cuadrícula de precisión con arrastrar/soltar, guías visuales y controles de rotación (0°, 90°, 180°).
  - **Pasos Peatonales:** Dibujados con zona gris y franjas perpendiculares blancas de alto contraste.
  - **Panel de Propiedades:** Formulario flotante para modificar código de cajón, piso y atributos.
- **Control de Garita:** Interfaz simplificada con teclado numérico para entrada rápida de placa, emisión de ticket y apertura manual de barrera.
- **Monitor ANPR & Ocupación:** Matriz de cámaras simuladas con overlays de recuadros verdes/rojos y log de lecturas con foto simulada y porcentaje de certeza.

---

### 3. Rol Administrador Plataforma (`platform`)
- **Dashboard Consolidado:** Tarjetas KPI globales (Ingresos totales de la red, parqueos afiliados, ocupación media global).
- **Gestión de Roles & Usuarios:** Tabla responsiva con buscador, badge de rol actual y modal con Teclado PIN para confirmación de cambios de permisos.
- **Estacionamientos Afiliados:** Tabla con switch para activar/suspender locales y modal para ajustar el porcentaje de comisión SaaS.
