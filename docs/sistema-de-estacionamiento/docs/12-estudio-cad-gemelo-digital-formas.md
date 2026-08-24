# 12. Estudio de Dibujo CAD, Gemelo Digital 3D y Terrenos de Formas Reales

## 1. Visión General del Módulo CAD
El subsistema de diseño de planos arquitectónicos de **Smart-Park** permite a administradores locales y operadores proyectar el lote de estacionamiento con precisión geométrica real, prescindiendo de cuadrículas rígidas o simulaciones estáticas.

---

## 2. Geometrías de Terrenos Reales Soportadas
Los predios urbanos en ciudades históricas (como Huamanga / Ayacucho) presentan configuraciones morfológicas diversas. El motor incluye presets y trazado libre:

| Forma de Terreno | Características Arquitectónicas | Aplicación Urbana |
| :--- | :--- | :--- |
| **🔲 Rectangular Clásico** | Linderos ortogonales $30\text{m} \times 20\text{m}$ con carril central de $6.00\text{m}$. | Lotes regulares urbanos estándar. |
| **📐 Lote en 'L' (Esquina)** | Dos alas conectadas (Norte y Oeste) que rodean un **edificio privado colindante** con circulación en escuadra. | Terrenos de esquina con doble acceso o servidumbres. |
| **🔷 Diagonal (45° / 30°)** | Lote trapezoidal con cajones en **espina de pez** a $45^\circ$ o $30^\circ$ y retiro de áreas verdes. | Vías estrechas con maximización de aforo por ángulo de ataque. |
| **🏛️ Lote en 'U' (Patio)** | Distribución perimetral alrededor de un patio o galería comercial central, con garita de entrada y salida independientes. | Centros comerciales, galerías y hoteles. |
| **✏️ Lienzo Libre** | Creación y rotación libre de muros en $360^\circ$, columnas y garitas. | Terrenos de geometría irregular o topografía no estándar. |

---

## 3. Características Técnicas de los Cajones
- **Tipos de Plaza:**
  - 🚗 **Auto Estándar:** $2.50\text{m} \times 5.00\text{m}$ ($75\text{px} \times 140\text{px}$).
  - ♿ **PMR (Discapacitados):** $3.50\text{m} \times 5.00\text{m}$ con franja de transferencia lateral ($90\text{px} \times 140\text{px}$).
  - 🏍️ **Motocicleta:** $1.20\text{m} \times 2.50\text{m}$ ($50\text{px} \times 80\text{px}$).
  - ⛱️ **Plaza Techada (Con Sombra):** Equipado con estructura tensada de protección solar y distintivo ámbar.
- **Transformaciones Interactivas:**
  - 4 agarres en las esquinas para redimensionamiento en tiempo real.
  - Dial superior para rotación en $360^\circ$ con snap angular a $15^\circ$.
  - Botones rápidos de orientación: $0^\circ, 30^\circ, 45^\circ, 60^\circ, 90^\circ$.

---

## 4. Visualización Dual para el Conductor (2D y 3D)
El cliente/conductor visualiza exactamente el mismo plano diseñado por el administrador:
- **Vista 2D:** Mapa arquitectónico responsivo con auto-ajuste de escala (*Fit to Screen*), donde los cajones libres verdes pueden seleccionarse con un clic para generar el pase QR.
- **Vista 3D (Gemelo Digital):** Perspectiva volumétrica isométrica con muros 3D extruidos, cubiertas solares de sombra, sensor ultrasónico cenital LED suspendido y barrera vehicular ANPR automatizada.
