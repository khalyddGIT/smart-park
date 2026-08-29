"""Visión de ocupación por cajón: YOLO opcional + clasificador OpenCV.

El motor de respaldo replica el algoritmo del proyecto car-parking-finder
(Park_classifier): preprocesamiento Gaussiano -> Umbral Adaptativo ->
Mediana -> Dilatación y conteo de píxeles blancos por cajón, con soporte de
cajas rotadas en cualquier ángulo (cx, cy, w, h, angle) vía warpPerspective.
"""
from typing import List, Dict, Optional, Tuple

# Lienzo CAD del plano (mismo sistema de coordenadas del editor de plano)
CAD_W, CAD_H = 1100, 700

# Caja de referencia del clasificador original (107x48) con umbral fijo de 900
# píxeles blancos -> ratio 0.175 de píxeles "activos" para considerar ocupado.
REF_BOX_AREA = 107.0 * 48.0
REF_THRESHOLD = 900.0
WHITE_RATIO = REF_THRESHOLD / REF_BOX_AREA
# Umbral configurable en runtime (sobrescribe WHITE_RATIO si se envía threshold)
# threshold = conteo absoluto sobre caja 107x48; se escala por área como 900*area/5136


# =======================================================
# Geometría de cajones: soporte rotado (car-parking-finder)
# =======================================================
def _calibration_factors(w_img: int, h_img: int, calibration: Optional[Dict]):
    """Factores de mapeo CAD->imagen. Sin calibración el lienzo cubre la foto
    completa; con calibración {'x','y','w','h'} normalizada (0..1) esa región de
    la foto corresponde al lienzo CAD completo."""
    if calibration:
        rx = float(calibration.get("x", 0) or 0)
        ry = float(calibration.get("y", 0) or 0)
        rw = float(calibration.get("w", 1) or 1)
        rh = float(calibration.get("h", 1) or 1)
        ox, oy = rx * w_img, ry * h_img
        kx = max(rw, 0.05) * w_img / CAD_W
        ky = max(rh, 0.05) * h_img / CAD_H
    else:
        ox = oy = 0.0
        kx, ky = w_img / CAD_W, h_img / CAD_H
    return ox, oy, kx, ky


def map_slot_box(slot: Dict, w_img: int, h_img: int,
                 calibration: Optional[Dict] = None) -> Tuple[float, float, float, float, float]:
    """Cajón CAD (x, y, w, h, rot) -> (cx, cy, w, h, angle) en píxeles de imagen.
    Mantiene el ángulo de rotación para el recorte por perspectiva."""
    ox, oy, kx, ky = _calibration_factors(w_img, h_img, calibration)
    w = max(2.0, float(slot.get("w", 60)) * kx)
    h = max(2.0, float(slot.get("h", 100)) * ky)
    cx = (float(slot.get("x", 0)) + float(slot.get("w", 60)) / 2.0) * kx + ox
    cy = (float(slot.get("y", 0)) + float(slot.get("h", 100)) / 2.0) * ky + oy
    angle = float(slot.get("rot", 0) or 0) % 360
    return cx, cy, w, h, angle


def map_slot_rect(slot: Dict, w_img: int, h_img: int, calibration: Optional[Dict] = None):
    """Compatibilidad: rect sin rotar (x, y, w, h) en píxeles de imagen."""
    cx, cy, w, h, _ = map_slot_box(slot, w_img, h_img, calibration)
    return int(cx - w / 2), int(cy - h / 2), int(w), int(h)


def extract_rotated_crop(image, cx: float, cy: float, w: float, h: float, angle: float):
    """Extrae el parche del cajón desde la imagen procesada.
    Ángulo 0: recorte directo (rápido). Ángulo != 0: warpPerspective con
    boxPoints (idéntico a Park_classifier._extract_rotated_crop)."""
    import cv2
    if angle % 360 == 0:
        x, y = int(cx - w / 2), int(cy - h / 2)
        x1, y1 = max(0, x), max(0, y)
        x2 = min(image.shape[1], x + int(w))
        y2 = min(image.shape[0], y + int(h))
        if x2 <= x1 or y2 <= y1:
            return None
        return image[y1:y2, x1:x2]
    import numpy as np
    rect = ((float(cx), float(cy)), (float(w), float(h)), float(angle))
    box = cv2.boxPoints(rect).astype("float32")
    dst = np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(box, dst)
    return cv2.warpPerspective(image, M, (max(2, int(w)), max(2, int(h))),
                               flags=cv2.INTER_NEAREST, borderValue=0)


def slot_polygon(cx: float, cy: float, w: float, h: float, angle: float):
    """Polígono (4x2) del cajón rotado, para pruebas de punto/intersección."""
    import cv2
    if angle % 360 == 0:
        x, y = cx - w / 2, cy - h / 2
        return ((x, y), (x + w, y), (x + w, y + h), (x, y + h))
    rect = ((float(cx), float(cy)), (float(w), float(h)), float(angle))
    return tuple(cv2.boxPoints(rect))


def point_in_slot(cx: float, cy: float, w: float, h: float, angle: float,
                  px: float, py: float) -> bool:
    """True si el punto (px, py) cae dentro del cajón (respeta rotación)."""
    import cv2
    import numpy as np
    if angle % 360 == 0:
        x, y = cx - w / 2, cy - h / 2
        return x <= px <= x + w and y <= py <= y + h
    contour = np.array(slot_polygon(cx, cy, w, h, angle), dtype="float32")
    return cv2.pointPolygonTest(contour, (float(px), float(py)), False) >= 0


# =======================================================
# Preprocesamiento (pipeline exacto de car-parking-finder)
# =======================================================
def preprocess_frame(img):
    """GaussianBlur(3x3) -> Umbral Adaptativo Gaussiano INV(25,16) ->
    Mediana(5) -> Dilatación(3x3). Resalta los vehículos sobre el asfalto."""
    import cv2
    import numpy as np
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (3, 3), 1)
    thr = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                cv2.THRESH_BINARY_INV, 25, 16)
    thr = cv2.medianBlur(thr, 5)
    kernel = np.ones((3, 3), np.uint8)
    return cv2.dilate(thr, kernel, iterations=1)


def classify_by_threshold(processed, original, slots: List[Dict], w_img: int, h_img: int,
                          calibration: Optional[Dict] = None, white_ratio: Optional[float] = None) -> Dict[str, bool]:
    """Clasificador car-parking-finder: countNonZero por cajón vs umbral
    escalado al área (900 px en caja 107x48 -> ratio 0.175). Para solidez ante
    vehículos de color uniforme (rectángulos sintéticos/tests) combina con la
    señal de masa oscura (dark_ratio) del ROI original."""
    import cv2
    global_ratio = white_ratio if white_ratio is not None else WHITE_RATIO
    result = {}
    for s in slots:
        code = s.get("code", "?")
        cx, cy, w, h, angle = map_slot_box(s, w_img, h_img, calibration)
        crop = extract_rotated_crop(processed, cx, cy, w, h, angle)
        if crop is None or crop.size == 0:
            result[code] = False
            continue
        # umbral por zona: slot.thr (absoluto sobre 107x48) tiene prioridad sobre global
        thr_slot = s.get("thr")
        if thr_slot is not None:
            try:
                ratio = float(thr_slot) / REF_BOX_AREA
            except Exception:
                ratio = global_ratio
        else:
            ratio = global_ratio
        count = int(cv2.countNonZero(crop))
        white_occ = count > ratio * (w * h)
        if white_occ:
            result[code] = True
            continue
        # Masa oscura sobre asfalto claro (vehículo uniforme sin textura)
        orig_crop = extract_rotated_crop(original, cx, cy, w, h, angle)
        if orig_crop is not None and orig_crop.size > 0:
            g = cv2.cvtColor(orig_crop, cv2.COLOR_BGR2GRAY) if len(orig_crop.shape) == 3 else orig_crop
            dark_ratio = float((g < 90).sum()) / float(g.size) if g.size else 0
            if dark_ratio > 0.30:
                result[code] = True
                continue
            # Densidad de bordes como tercera señal (contornos/ruedas)
            gb = cv2.GaussianBlur(g, (5, 5), 0)
            edges = cv2.Canny(gb, 50, 150)
            edge_density = float((edges > 0).sum()) / float(edges.size) if edges.size else 0
            if edge_density > 0.045:
                result[code] = True
                continue
        result[code] = False
    return result


# =======================================================
# Detección de vehículos: YOLO con caché por proceso
# =======================================================
_yolo_model = None
_yolo_state = {"tried": False}


def detect_vehicle_boxes(img, conf: float = 0.35):
    """Detección real de vehículos sobre una imagen BGR.

    1. Usa el modelo YOLO persistido en el proceso (COCO: 2=car, 3=moto,
       5=bus, 7=truck). Si el archivo .pt no existe, ultralytics lo descarga
       automáticamente en la primera inferencia (requiere internet solo esa vez,
       o define YOLO_VEHICLE_MODEL apuntando a un .pt local).
    2. Si no hay modelo disponible o no detecta nada, retorna lista vacía y el
       llamador aplica el clasificador de umbral adaptativo (car-parking-finder).

    Retorna (car_boxes: [[x1,y1,x2,y2], ...], engine: "yolo" | "none").
    """
    global _yolo_model

    if not _yolo_state["tried"]:
        _yolo_state["tried"] = True
        import os
        for _m in [os.getenv("YOLO_VEHICLE_MODEL", ""), "yolov8m.pt", "yolov8n.pt"]:
            if not _m:
                continue
            try:
                from ultralytics import YOLO
                _yolo_model = YOLO(_m)  # descarga automática si falta el archivo
                break
            except Exception:
                _yolo_model = None

    car_boxes = []
    if _yolo_model is not None:
        try:
            results = _yolo_model(img, verbose=False, conf=conf)
            for r in results:
                for box in r.boxes:
                    cls = int(box.cls[0]) if hasattr(box, "cls") else -1
                    if cls in (2, 3, 5, 7):
                        car_boxes.append(list(map(int, box.xyxy[0].tolist())))
            if car_boxes:
                return car_boxes, "yolo"
        except Exception:
            car_boxes = []

    # Fallback sin YOLO: contornos oscuros sobre asfalto claro (sintéticos/tests)
    import cv2
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thr = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thr, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    h, w = gray.shape
    for cnt in contours:
        x, y, bw, bh = cv2.boundingRect(cnt)
        area = bw * bh
        if area < w * h * 0.008 or area > w * h * 0.25:
            continue
        if 1.3 < bw / float(bh) < 3.5 and bh > 28:
            car_boxes.append([x, y, x + bw, y + bh])
    return car_boxes, ("contours" if car_boxes else "none")


def occupancy_from_boxes(car_boxes: List, slots: List[Dict], w_img: int, h_img: int,
                         calibration: Optional[Dict] = None) -> Dict[str, bool]:
    """Ocupación por cajón según cajas de vehículos detectadas (YOLO).
    Ocupado si el centro de un vehículo cae dentro del cajón (polígono rotado)
    o el solape con su bbox supera el 18% del área del cajón."""
    result = {}
    for s in slots:
        code = s.get("code", "?")
        cx, cy, w, h, angle = map_slot_box(s, w_img, h_img, calibration)
        x1, y1 = int(cx - w / 2), int(cy - h / 2)
        x2, y2 = int(cx + w / 2), int(cy + h / 2)
        occupied = False
        for (bx1, by1, bx2, by2) in car_boxes:
            bcx, bcy = (bx1 + bx2) // 2, (by1 + by2) // 2
            if point_in_slot(cx, cy, w, h, angle, bcx, bcy):
                occupied = True
                break
            ix1, iy1 = max(x1, bx1), max(y1, by1)
            ix2, iy2 = min(x2, bx2), min(y2, by2)
            if ix2 > ix1 and iy2 > iy1:
                inter = (ix2 - ix1) * (iy2 - iy1)
                slot_area = (x2 - x1) * (y2 - y1)
                if slot_area > 0 and inter / slot_area > 0.18:
                    occupied = True
                    break
        result[code] = occupied
    return result


# =======================================================
# Endpoints legados (compatibles con la API existente)
# =======================================================
def detect_occupancy(image_bytes: bytes, slots: List[Dict]) -> Dict[str, bool]:
    """Detecta si cada cajón está ocupado (endpoint /camera/detect).
    Prioriza YOLO; sin detecciones aplica el clasificador de umbral adaptativo."""
    import cv2
    import numpy as np

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")
    h_img, w_img = img.shape[:2]

    car_boxes, engine = detect_vehicle_boxes(img)
    if car_boxes:
        result = occupancy_from_boxes(car_boxes, slots, w_img, h_img)
    else:
        processed = preprocess_frame(img)
        result = classify_by_threshold(processed, img, slots, w_img, h_img)
    return result


def detect_occupancy_cv2_adaptive(image_bytes: bytes, slots: List[Dict], white_ratio: Optional[float] = None) -> Dict[str, bool]:
    """Clasificación pura por umbralización adaptativa (algoritmo de
    car-parking-finder) con soporte de cajas rotadas vía warpPerspective."""
    import cv2
    import numpy as np

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {}

    h_img, w_img = img.shape[:2]
    processed = preprocess_frame(img)
    return classify_by_threshold(processed, img, slots, w_img, h_img, white_ratio=white_ratio)


def detect_occupancy_cv2_debug(image_bytes: bytes, slots: List[Dict], white_ratio: Optional[float] = None) -> Dict:
    """Versión debug: retorna occupancy + conteos por zona y jpegs base64 del frame procesado y anotado."""
    import cv2
    import numpy as np
    import base64
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")
    h_img, w_img = img.shape[:2]
    processed = preprocess_frame(img)
    ratio = white_ratio if white_ratio is not None else WHITE_RATIO
    counts = {}
    occupancy = {}
    global_ratio_dbg = ratio
    for s in slots:
        code = s.get("code", "?")
        thr_slot = s.get("thr")
        try:
            r = float(thr_slot)/REF_BOX_AREA if thr_slot is not None else global_ratio_dbg
        except Exception:
            r = global_ratio_dbg
        cx, cy, w, h, angle = map_slot_box(s, w_img, h_img)
        crop = extract_rotated_crop(processed, cx, cy, w, h, angle)
        cnt = int(cv2.countNonZero(crop)) if crop is not None and crop.size else 0
        counts[code] = {"count": cnt, "area": int(w*h), "ratio": round(cnt/max(1,w*h),4), "threshold": int(r*w*h), "thr": thr_slot}
        occupancy[code] = cnt > r*w*h
        if not occupancy[code]:
            orig_crop = extract_rotated_crop(img, cx, cy, w, h, angle)
            if orig_crop is not None and orig_crop.size:
                g = cv2.cvtColor(orig_crop, cv2.COLOR_BGR2GRAY) if len(orig_crop.shape)==3 else orig_crop
                dark = float((g<90).sum())/float(g.size) if g.size else 0
                if dark > 0.30:
                    occupancy[code] = True
                    counts[code]["dark_ratio"] = round(dark,4)
                    continue
                gb = cv2.GaussianBlur(g,(5,5),0)
                edges = cv2.Canny(gb,50,150)
                ed = float((edges>0).sum())/float(edges.size) if edges.size else 0
                counts[code]["dark_ratio"] = round(dark,4)
                counts[code]["edge_density"] = round(ed,4)
                if ed > 0.045:
                    occupancy[code] = True
    # jpegs debug
    _, buf_proc = cv2.imencode(".jpg", processed)
    proc_b64 = "data:image/jpeg;base64," + base64.b64encode(buf_proc.tobytes()).decode("ascii")
    ann = _draw_annotations(img, slots, occupancy, [])
    _, buf_ann = cv2.imencode(".jpg", ann, [int(cv2.IMWRITE_JPEG_QUALITY),80])
    ann_b64 = "data:image/jpeg;base64," + base64.b64encode(buf_ann.tobytes()).decode("ascii")
    return {"occupancy": occupancy, "counts": counts, "white_ratio": ratio, "processed_image": proc_b64, "annotated_image": ann_b64}


# =======================================================
# Calibración de cámara
# =======================================================
def parse_calibration(raw) -> Optional[Dict]:
    """Parsea el JSON de calibración almacenado en BD. None si es inválido."""
    if not raw:
        return None
    try:
        import json as _json
        d = _json.loads(raw)
        if isinstance(d, dict) and all(k in d for k in ("x", "y", "w", "h")):
            return {k: float(d[k]) for k in ("x", "y", "w", "h")}
    except Exception:
        pass
    return None


# =======================================================
# Anotación del resultado sobre el frame
# =======================================================
def _draw_annotations(img, slots, occupancy, car_boxes, calibration=None):
    """Dibuja sobre una copia: cajones (verde libre / rojo ocupado, polígono
    rotado cuando aplica), cajas ámbar de vehículos y banner con el resumen.
    Réplica del estilo de dibujo de Park_classifier.classify()."""
    import cv2 as _cv2
    import numpy as _np

    h_img, w_img = img.shape[:2]
    canvas = img.copy()

    for s in slots:
        code = s.get("code", "?")
        cx, cy, w, h, angle = map_slot_box(s, w_img, h_img, calibration)
        occupied = occupancy.get(code, False)
        color = (60, 60, 230) if occupied else (80, 200, 80)  # BGR rojo/verde
        label = f"{code} {'OK' if occupied else 'LIBRE'}"

        if angle % 360 == 0:
            x, y = int(cx - w / 2), int(cy - h / 2)
            _cv2.rectangle(canvas, (x, y), (x + int(w), y + int(h)), color, 2)
            (tw, th), _ = _cv2.getTextSize(label, _cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
            ly = max(th + 6, y - 4)
            _cv2.rectangle(canvas, (x, ly - th - 6), (x + tw + 6, ly), color, -1)
            _cv2.putText(canvas, label, (x + 3, ly - 4), _cv2.FONT_HERSHEY_SIMPLEX, 0.4,
                         (255, 255, 255), 1, _cv2.LINE_AA)
        else:
            poly = _np.array(slot_polygon(cx, cy, w, h, angle), dtype=_np.int32)
            _cv2.polylines(canvas, [poly], True, color, 2, _cv2.LINE_AA)
            (tw, th), _ = _cv2.getTextSize(label, _cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
            tx, ty = int(cx - tw / 2), int(cy + th / 2)
            _cv2.rectangle(canvas, (tx - 2, ty - th - 2), (tx + tw + 2, ty + 2), color, -1)
            _cv2.putText(canvas, label, (tx, ty), _cv2.FONT_HERSHEY_SIMPLEX, 0.4,
                         (255, 255, 255), 1, _cv2.LINE_AA)

    for (bx1, by1, bx2, by2) in car_boxes:
        _cv2.rectangle(canvas, (bx1, by1), (bx2, by2), (50, 170, 240), 2)

    n_occ = sum(1 for v in occupancy.values() if v)
    banner = f"AUTOS: {len(car_boxes)}  OCUPADOS: {n_occ}/{len(occupancy)}"
    _cv2.rectangle(canvas, (0, 0), (w_img, 34), (30, 30, 30), -1)
    _cv2.putText(canvas, banner, (10, 23), _cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                 (120, 230, 120), 2, _cv2.LINE_AA)
    return canvas


# =======================================================
# Escaneo completo (monitor en tiempo real + worker server-side)
# =======================================================
def scan_parking_frame(image_bytes: bytes, slots: List[Dict], calibration: Optional[Dict] = None) -> Dict:
    """Escaneo completo de un frame para el monitor en tiempo real.

    1. Detecta vehículos con YOLO (si hay modelo disponible).
    2. Con detecciones YOLO: ocupación por solape centro/área (polígonos rotados).
       Sin detecciones: clasificador de umbral adaptativo de car-parking-finder
       (pipeline Gaussiano->Adaptativo->Mediana->Dilatación + countNonZero).
    3. Genera una imagen anotada JPEG con el resultado.

    Retorna {"occupancy": {code: bool}, "car_boxes": [[x1,y1,x2,y2], ...],
             "engine": "yolo" | "threshold", "annotated_jpeg": bytes}
    """
    import cv2
    import numpy as np

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")
    h_img, w_img = img.shape[:2]

    car_boxes, engine = detect_vehicle_boxes(img)

    if car_boxes:
        occupancy = occupancy_from_boxes(car_boxes, slots, w_img, h_img, calibration)
        # engine ya es "yolo" o "contours"
    else:
        processed = preprocess_frame(img)
        occupancy = classify_by_threshold(processed, img, slots, w_img, h_img, calibration)
        engine = "threshold"

    annotated = _draw_annotations(img, slots, occupancy, car_boxes, calibration)
    ok, jpeg = cv2.imencode(".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    return {
        "occupancy": occupancy,
        "car_boxes": car_boxes,
        "engine": engine,
        "annotated_jpeg": jpeg.tobytes() if ok else None,
    }
