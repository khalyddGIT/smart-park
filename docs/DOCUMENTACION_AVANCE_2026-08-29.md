# Smart Park — Documentación de Avance: Integración de Monitoreo de Cámaras Independiente

**Fecha:** 2026-08-29  
**Proyecto:** `khalyddGIT/smart-park`  
**Rama:** `master`  
**Stack:** `FastAPI + OpenCV + SQLAlchemy` | `React 19 + Vite 8 + Tailwind v4`

---

## 1. Resumen

Se integró el sistema de detección de ocupación desarrollado en la carpeta externa `car-parking-finder-main` como **módulo de cámaras totalmente independiente del plano de estacionamiento**. El objetivo de despliegue exigía eliminar toda simulación: la vista anterior usaba `Math.sin`/`Math.random` y mezclaba las cajas del estacionamiento (`estacionamientos.plazas`) con la visión, lo que fue corregido.

**Carpeta origen analizada:** `D:\Escritorio\car-parking-finder-main`
- `app.py` — selector de video + loop `cv2.imshow` con HUD y controles `q/s/v/e/+/-`.
- `src/utils.py` — `Park_classifier` (pipeline `GaussianBlur 3x3 → AdaptiveThreshold 25,16 INV → medianBlur 5 → dilate`) y `Coordinate_denoter` con cajas rotadas `(cx,cy,w,h,angle)` vía `warpPerspective`/`boxPoints`, `CarParkPos` pickle por video.
- `car_park_editor.py` — editor Tkinter/OpenCV para crear `CarParkPos`.

El módulo Smart Park ahora replica ese pipeline en el backend y expone un visor independiente donde se dibujan **zonas de cámara propias** (código `CAM-01…`), con umbral calibrado y modo debug visual.

---

## 2. Problema previo

- `frontend/src/components/CameraMonitorModule.jsx` estaba **corrupto** (`webcamRef.current.getScr      let responseData`, `upancyMap };`) y no compilaba.
- Fallback simulado: `seed = |sin(x*12.98+y*78.23)| >0.48` y `confidence = 98.4+random()`.
- El escaneo leía `establishments[].elements type==='slot'` y llamaba `POST /camera/scan` que actualizaba el estado del parqueo. El usuario confirmó: *“el monitoreo es un módulo aparte, me aparecen las cajas del estacionamiento”*.
- Backend `vision.py` ignoraba `rot` y usaba heurística `Canny/dark_ratio` desconectada del finder.

---

## 3. Diseño de la solución

### 3.1 Principio: separación total
- **Zonas de cámara ≠ plazas del plano.** Se almacenan en `localStorage` por sede `smart_park_camera_zones_${parkingId}` (`persistZones`), nunca en `plazas`/`elementos_plano`. El escaneo es `POST /api/v1/parkings/vision/process-boxes` con `slots_json` propio; no toca `Slot.status` ni dispara `camera:events` del parqueo.
- Selector de sede se mantiene solo como organizador y para obtener `camera_url` (snapshot), pero es opcional.

### 3.2 Backend — `backend/app/core/vision.py`
Reescritura para replicar `Park_classifier`:

- `CAD_W/H = 1100/700`, `REF_BOX_AREA=107*48`, `WHITE_RATIO=900/5136≈0.175`.
- Geometría rotada: `map_slot_box()` → `(cx,cy,w,h,angle)` en píxeles con `_calibration_factors()` (respeta `camera_calibration` si existe); `extract_rotated_crop()` usa `boxPoints+getPerspectiveTransform+warpPerspective` (idéntico a `_extract_rotated_crop`); `slot_polygon()`/`point_in_slot()` con `pointPolygonTest`.
- `preprocess_frame()` — pipeline exacto finder.
- `classify_by_threshold(processed, original, slots, ..., white_ratio)` — `countNonZero > ratio*w*h` + fallback `dark_ratio>0.30` (masa oscura uniforme) y `edge_density>0.045` (Canny). `white_ratio` es configurable (`threshold/(107*48)`).
- `detect_vehicle_boxes()` — YOLO cacheado (`yolov8m/n.pt` auto-descarga) + fallback contornos Otsu (`area 0.008–0.25`, `1.3<ar<3.5`). Retorna `yolo|contours|none`.
- `occupancy_from_boxes()` — centro de vehículo dentro de polígono rotado o solape >18 %.
- `detect_occupancy_cv2_adaptive(..., white_ratio)` y `detect_occupancy_cv2_debug()` (retorna `counts`, `processed_image` y `annotated_image` base64 con `_draw_annotations()` que dibuja polígonos rotados).
- `scan_parking_frame()` — si hay `car_boxes` usa `occupancy_from_boxes`, si no `classify_by_threshold`; genera `annotated_jpeg`.

### 3.3 Backend — `backend/app/api/v1/parkings.py`
- `Form` faltante en `from fastapi import …` causaba `NameError` en tests — corregido.
- `POST /vision/process-boxes` ahora acepta `threshold: Form(None)` y `debug: Form(None)`. Si `debug=true` delega a `detect_occupancy_cv2_debug`; si no a `detect_occupancy_cv2_adaptive` con `white_ratio` derivado. Retorna `occupancy`, `counts`/`processed_image`/`annotated_image` en modo debug.

### 3.4 Frontend — `frontend/src/components/CameraMonitorModule.jsx` (reescritura 714→608 líneas)
- Estado: `camZones`, `selectedZoneIdx`, `rectW/H`, `currentRot`, `mode` (`monitor`/`edit`), `history`, `isDragging`, `threshold` (default 900), `debugMode`/`debugData`, `sourceMode` (`camera|webcam|image`), `testFile`/`testPreview`, `snapshotUrl`.
- Persistencia independiente: `camZonesKey(id)`.
- Editor canvas 1100×700: `getCanvasCoords`, `hitTest`, `handleMouseDown/Move/Up/ContextMenu`, `useEffect` dibujo con `roundRect`/colores `emerald/rose/amber`.
- Toolbar edición: `Guardar zonas`, `+TAM/-TAM`, `Rotar 45°`, `Deshacer`, `Limpiar`.
- Fuentes: WebCam (`react-webcam` → blob), Imagen (`File` upload), Cámara IP (`GET /camera/snapshot` → blob). Todas van a `/vision/process-boxes` con `threshold` y `debug`.
- Controles nuevos: slider `UMBRAL 300–1800` (900 original) y check `Debug`. En debug se muestra panel violeta con `PROCESADO` y `ANOTADO` + tabla `count/area/ratio/thr/dark/edge` por zona para calibrar (instrucción: bajar si LIBRE con auto, subir si OCUP con vacío).
- Visor: `object-cover` para que lo dibujado coincida con lo analizado; overlay de zonas en `monitor` con `transform: rotate()`.
- Config cámara IP (`PUT /camera/config`) se mantiene para `camera_url`/`camera_enabled` vía `useEstablishments`.

### 3.5 Otros archivos tocados
- `frontend/src/context/EstablishmentContext.jsx` — mapea `camera_url/enabled/calibration` desde `ParkingResponse` para el snapshot.
- `backend/app/core/*` — nuevos `camera_events.py`, `camera_worker.py`, `ipcam.py` (ya existían, se conservaron).
- `frontend/src/components/CameraCalibrator.jsx`, `CarParkZoneEditor.jsx` — auxiliares no modificados.

---

## 4. Calibración con imágenes reales del usuario

Carpeta `car-parking-finder-main/video/` y `videos/` contiene `captura_ejemplo.jpg`, `captura_HD.jpg` (1100×720) y WhatsApp 1920×1080. Pruebas locales:

```python
from app.core.vision import detect_occupancy_cv2_adaptive
slots = [{'code':'CAM-01','x':52,'y':93,'w':107,'h':48,'rot':0}, ...]
detect_occupancy_cv2_adaptive(open('captura_ejemplo.jpg','rb').read(), slots)  # thr900 → True
detect_occupancy_cv2_debug(..., white_ratio=500/5136)  # para asfalto oscuro
```

La desalineación inicial en 1920×1080 se debía a `CarParkPos` del `carPark.mp4` (1100×720) aplicado sin escalar y a `object-contain` con letterboxing — corregido a `object-cover` y escala `w_img/1100`.

---

## 5. Verificación

- `npm run build` — 2955 módulos, `✓ built in 4–6s`.
- `pytest` — `25 passed, 1 skipped` (`test_camera_scan` incluye `test_scan_with_upload…` y `test_events_flow_with_camera_calibration`). Fallo previo `vehicles_detected==0` se corrigió restaurando fallback de contornos y umbral híbrido.
- Ejecución local (`backend/.venv` + `frontend` Vite):
  ```powershell
  cd backend; .\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
  cd frontend; npm run dev -- --host 127.0.0.1 --port 5173
  # → http://127.0.0.1:5173 (módulo Cámaras → Imagen/WebCam/Cámara IP, Debug activo)
  # → http://127.0.0.1:8000/docs
  ```
- Credenciales seed: `superadmin@smartpark.com` / `SmartParkSuperAdmin2026!`, `adminlocal@smartpark.com` / `SmartParkLocal2026!`, `usuario@smartpark.com` / `password123`.

---

## 6. Próximos pasos

- Importador de `CarParkPos` pickle a `camZones` para precargar las 69 zonas sin redibujar.
- Persistencia de zonas de cámara en BD (`cameras.zones_json`) si se requiere multi-dispositivo.
- YOLO `yolov8n.pt` en imagen Docker para inferencia <300 ms sin descarga en primer escaneo.
