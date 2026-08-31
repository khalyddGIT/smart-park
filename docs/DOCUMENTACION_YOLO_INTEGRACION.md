# Documentación Técnica: Integración de YOLOv8 en Smart-Park

## 1. Visión General y Arquitectura

El sistema **Smart-Park** utiliza un motor híbrido de visión computacional alojado en `backend/app/core/vision.py`. Este motor combina redes neuronales de detección de objetos en tiempo real (**YOLOv8**) con algoritmos de procesamiento digital de imágenes de respaldo (OpenCV con umbralización adaptativa).

```
                      [ Frame de Cámara (JPEG/RTSP) ]
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │  ¿YOLOv8 disponible & activo?  │
                    └────────────────┘────────────────┘
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
                     [ SÍ ]                    [ NO ]
                        │                         │
                        ▼                         ▼
            ┌──────────────────────┐  ┌──────────────────────┐
            │ Detección YOLOv8     │  │ Preprocesamiento CV  │
            │ Clases COCO (2,3,5,7)│  │ Gaussiano + Adaptive │
            └───────────┬──────────┘  └───────────┬──────────┘
                        │                         │
                        ▼                         ▼
            ┌──────────────────────┐  ┌──────────────────────┐
            │ Solape & Polígonos   │  │ Conteo nonZero +     │
            │ Rotados (Warp)       │  │ Densidad Bordes Canny│
            └───────────┬──────────┘  └───────────┬──────────┘
                        │                         │
                        └────────────┬────────────┘
                                     │
                                     ▼
                      [ Ocupación por Cajón (JSON) ]
```

---

## 2. Configuración y Carga del Modelo

### 2.1 Variables de Entorno
El modelo YOLOv8 puede ser configurado mediante la variable de entorno `YOLO_VEHICLE_MODEL`:

```bash
# Ejemplo en backend/.env o docker-compose.yml
YOLO_VEHICLE_MODEL=yolov8m.pt   # Opciones: yolov8n.pt, yolov8s.pt, yolov8m.pt, yolov8l.pt
```

* **Default**: `yolov8m.pt` (Modelo mediano: equilibrio ideal entre precisión mAP y velocidad de inferencia).
* **Fallback**: Si no se especifica o falla la carga, intenta cargar `yolov8n.pt` (Nano).
* **Descarga Automática**: Ultralytics descarga automáticamente los pesos `.pt` en la primera ejecución si no se encuentran localmente.

### 2.2 Control de Concurrencia y Carga Paga (*Lazy Loading*)
Para prevenir condiciones de carrera en servidores web multihilo (**FastAPI / Uvicorn**), la inicialización del modelo implementa el patrón **Singleton Thread-Safe** mediante `threading.Lock`:

```python
_yolo_model = None
_yolo_state = {"tried": False}
_yolo_lock = threading.Lock()

def detect_vehicle_boxes(img: np.ndarray, conf: float = 0.35):
    global _yolo_model
    with _yolo_lock:
        if not _yolo_state["tried"]:
            _yolo_state["tried"] = True
            model_path = os.getenv("YOLO_VEHICLE_MODEL", "yolov8m.pt")
            for _m in [model_path, "yolov8n.pt"]:
                try:
                    from ultralytics import YOLO
                    _yolo_model = YOLO(_m)
                    break
                except Exception as err:
                    _yolo_model = None
```

---

## 3. Clases COCO Filtradas y Parámetros de Inferencia

YOLOv8 está entrenado sobre el conjunto de datos COCO (80 clases). El motor de Smart-Park filtra estrictamente únicamente las clases correspondientes a vehículos de transporte terrestre:

| ID Clase COCO | Nombre de Clase | Tipo de Vehículo en Smart-Park |
| :---: | :---: | :--- |
| **2** | `car` | Automóvil / Camioneta / SUV |
| **3** | `motorcycle` | Motocicleta / Cuatrimoto |
| **5** | `bus` | Ómnibus / Minibús |
| **7** | `truck` | Camión / Vehículo Pesado |

### Umbral de Confianza (`conf`)
* **Valor por defecto**: `0.35` (35% de confianza).
* **Razón**: Permite detectar vehículos parcialmente ocluidos o bajo condiciones de iluminación difíciles (sombras, noche, lluvia) sin generar falsos positivos desmedidos.

---

## 4. Mapeo Geométrico y Evaluación de Ocupación

Una vez detectadas las cajas delimitadoras (*Bounding Boxes* $[x_1, y_1, x_2, y_2]$) de los vehículos, se evalúa su intersección contra la geometría de cada cajón en el plano CAD.

### 4.1 Transformación de Coordenadas (CAD -> Imagen)
La función `map_slot_box` convierte las coordenadas del lienzo plano ($1100 \times 700$ px) a píxeles de la cámara:

$$\begin{aligned}
W_{\text{img}} &= \text{Ancho en px del frame de la cámara} \\
H_{\text{img}} &= \text{Alto en px del frame de la cámara} \\
cx &= (x_{\text{CAD}} + w_{\text{CAD}} / 2) \cdot k_x + o_x \\
cy &= (y_{\text{CAD}} + h_{\text{CAD}} / 2) \cdot k_y + o_y
\end{aligned}$$

Soporta ángulos de rotación arbitrarios ($\theta \in [0^\circ, 360^\circ[$) mediante **Warp Perspective** de OpenCV.

### 4.2 Criterio de Ocupación (`occupancy_from_boxes`)
Un cajón se marca como **OCUPADO (`True`)** si se cumple cualquiera de las dos condiciones:

1. **Punto dentro del polígono**: El centro del vehículo $(cx_{\text{vehículo}}, cy_{\text{vehículo}})$ se encuentra dentro del polígono rotado del cajón (`point_in_slot` con `cv2.pointPolygonTest`).
2. **Solape por Área de Intersección (IoU parcial)**: El área de intersección entre la *bbox* del vehículo y la caja del cajón supera el **18% del área total del cajón**:
   $$\frac{\text{Área}(\text{BBox} \cap \text{Cajón})}{\text{Área}(\text{Cajón})} > 0.18$$

---

## 5. Estrategia de Fallback (Motor de Respaldo OpenCV)

Si YOLOv8 no está instalado, si el archivo de modelo falla o si YOLO no detecta vehículos en la imagen (por ejemplo, en imágenes sintéticas de prueba), el sistema activa automáticamente el clasificador de preprocesamiento espectral de OpenCV:

1. **Filtro Gaussiano**: `cv2.GaussianBlur(gray, (3, 3), 1)`
2. **Umbral Adaptativo Gaussiano**: `cv2.adaptiveThreshold(..., cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 16)`
3. **Filtro de Mediana**: `cv2.medianBlur(thr, 5)`
4. **Dilatación Morfológica**: `cv2.dilate(thr, kernel_3x3, iterations=1)`
5. **Conteo Multi-Señal**:
   * Ratio de píxeles activos frente al área de referencia ($900 / (107 \times 48) \approx 0.175$).
   * Análisis de masa oscura ($g < 90$) para autos de color uniforme.
   * Densidad de bordes Canny ($> 0.045$) para detalles mecánicos.

---

## 6. Endpoints y Puntos de Integración en el Backend

1. **`scan_parking_frame(image_bytes, slots, calibration)`**:
   * Procesa la imagen enviada por cámara o subida manualmente.
   * Retorna estado de ocupación `{code: bool}`, cajas detectadas, el motor utilizado (`"yolo"` o `"threshold"`) y el frame anotado codificado en JPEG.
2. **Worker de Monitoreo Server-Side (`backend/app/core/camera_worker.py`)**:
   * Escanea periódicamente las sedes activas con cámara habilitada.
   * Emite eventos en tiempo real a los clientes conectados vía WebSockets (`backend/app/core/realtime.py`).

---

## 7. Pruebas Unitarias e Integración

Las pruebas automatizadas de la integración de visión y YOLO se encuentran en:
* [`backend/app/tests/test_vision.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/tests/test_vision.py): Evalúa recortes rotados, umbrales, formatos de calibración y manejo de errores.
* [`backend/app/tests/test_camera_scan.py`](file:///d:/Escritorio/smart%20park/smart-park/backend/app/tests/test_camera_scan.py): Pruebas de integración de endpoints de escaneo con anotaciones.

Comando para ejecutar la suite de visión:
```bash
PYTHONPATH=backend backend/.venv/Scripts/python.exe -m pytest backend/app/tests/test_vision.py -v
```
