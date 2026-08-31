"""Visión de ocupación por cajón: Clasificador adaptativo OpenCV con WarpPerspective.

Motor de procesamiento de visión artificial para Smart-Park.
Replica y optimiza el algoritmo de clasificación de cajones con preprocesamiento:
Filtro Gaussiano -> Umbral Adaptativo -> Filtro de Mediana -> Dilatación -> Conteo de píxeles activos,
con soporte completo para cajas rotadas (cx, cy, w, h, angle) vía warpPerspective.
"""
import base64
import json
import logging
import os
import threading
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Lienzo CAD del plano (mismo sistema de coordenadas del editor de plano)
CAD_W, CAD_H = 1100, 700

# Caja de referencia del clasificador original (107x48) con umbral fijo de 900 píxeles blancos.
# Ratio: 900 / (107 * 48) = 0.175233...
REF_BOX_AREA = 107.0 * 48.0
REF_THRESHOLD = 900.0
WHITE_RATIO = REF_THRESHOLD / REF_BOX_AREA

# =======================================================
# Control de concurrencia y caché de Modelo YOLO
# =======================================================
_yolo_model = None
_yolo_state = {"tried": False}
_yolo_lock = threading.Lock()


# =======================================================
# Geometría de cajones: soporte rotado (Warp Perspective)
# =======================================================
def _calibration_factors(w_img: int, h_img: int, calibration: Optional[Dict]) -> Tuple[float, float, float, float]:
    """Calcula factores de mapeo de coordenadas CAD a la resolución de imagen.
    
    Sin calibración: el lienzo CAD cubre la foto completa (0..1100 x 0..700).
    Con calibración: mapea la sub-región {'x','y','w','h'} normalizada (0..1) al lienzo CAD.
    """
    if calibration and isinstance(calibration, dict):
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
    """Mapea un cajón del CAD (x, y, w, h, rot) a (cx, cy, w, h, angle) en píxeles de imagen.
    
    Garantiza que dimensiones nulas o degeneradas reciban un valor mínimo seguro (2.0 px).
    """
    ox, oy, kx, ky = _calibration_factors(w_img, h_img, calibration)
    w = max(2.0, float(slot.get("w", 60)) * kx)
    h = max(2.0, float(slot.get("h", 100)) * ky)
    cx = (float(slot.get("x", 0)) + float(slot.get("w", 60)) / 2.0) * kx + ox
    cy = (float(slot.get("y", 0)) + float(slot.get("h", 100)) / 2.0) * ky + oy
    angle = float(slot.get("rot", 0) or 0) % 360
    return cx, cy, w, h, angle


def map_slot_rect(slot: Dict, w_img: int, h_img: int, calibration: Optional[Dict] = None) -> Tuple[int, int, int, int]:
    """Compatibilidad: retorna rectángulo (x, y, w, h) sin rotar en píxeles de imagen."""
    cx, cy, w, h, _ = map_slot_box(slot, w_img, h_img, calibration)
    return int(cx - w / 2), int(cy - h / 2), int(w), int(h)


def extract_rotated_crop(image: np.ndarray, cx: float, cy: float, w: float, h: float, angle: float) -> Optional[np.ndarray]:
    """Extrae el parche/ROI de un cajón desde la imagen procesada o de origen.
    
    - Para ángulo 0°: realiza recorte directo por sub-matriz slicing (alta velocidad).
    - Para ángulo != 0°: calcula la matriz de transformación perspectiva (warpPerspective).
    """
    if image is None or image.size == 0:
        return None

    h_img, w_img = image.shape[:2]

    if angle % 360 == 0:
        x, y = int(cx - w / 2), int(cy - h / 2)
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(w_img, x + int(w)), min(h_img, y + int(h))
        if x2 <= x1 or y2 <= y1:
            return None
        return image[y1:y2, x1:x2]

    w_crop, h_crop = max(2, int(w)), max(2, int(h))
    rect = ((float(cx), float(cy)), (float(w), float(h)), float(angle))
    try:
        box = cv2.boxPoints(rect).astype("float32")
        dst = np.array([[0, 0], [w_crop - 1, 0], [w_crop - 1, h_crop - 1], [0, h_crop - 1]], dtype="float32")
        M = cv2.getPerspectiveTransform(box, dst)
        return cv2.warpPerspective(image, M, (w_crop, h_crop), flags=cv2.INTER_NEAREST, borderValue=0)
    except cv2.error as err:
        logger.warning(f"[Vision Engine] Fallo al extraer parche rotado cx={cx}, cy={cy}: {err}")
        return None


def slot_polygon(cx: float, cy: float, w: float, h: float, angle: float) -> Tuple:
    """Retorna los vértices del polígono (4x2) del cajón rotado."""
    if angle % 360 == 0:
        x, y = cx - w / 2, cy - h / 2
        return ((x, y), (x + w, y), (x + w, y + h), (x, y + h))
    rect = ((float(cx), float(cy)), (float(w), float(h)), float(angle))
    return tuple(cv2.boxPoints(rect))


def point_in_slot(cx: float, cy: float, w: float, h: float, angle: float, px: float, py: float) -> bool:
    """Verifica si el punto (px, py) se encuentra dentro del polígono del cajón (soporta rotación)."""
    if angle % 360 == 0:
        x, y = cx - w / 2, cy - h / 2
        return x <= px <= x + w and y <= py <= y + h
    contour = np.array(slot_polygon(cx, cy, w, h, angle), dtype="float32")
    return cv2.pointPolygonTest(contour, (float(px), float(py)), False) >= 0


# =======================================================
# Preprocesamiento de Frame (Filtros Adaptativos)
# =======================================================
def preprocess_frame(img: np.ndarray) -> np.ndarray:
    """Aplica la secuencia de preprocesamiento de visión artificial:
    
    1. Grayscale -> 2. GaussianBlur(3x3) -> 3. Adaptive Thresholding ->
    4. MedianBlur(5x5) -> 5. Morphological Dilation.
    Resalta los bordes y texturas de los vehículos eliminando el ruido del asfalto.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (3, 3), 1)
    thr = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                cv2.THRESH_BINARY_INV, 25, 16)
    thr = cv2.medianBlur(thr, 5)
    kernel = np.ones((3, 3), np.uint8)
    return cv2.dilate(thr, kernel, iterations=1)


def classify_by_threshold(processed: np.ndarray, original: np.ndarray, slots: List[Dict],
                          w_img: int, h_img: int, calibration: Optional[Dict] = None,
                          white_ratio: Optional[float] = None) -> Dict[str, bool]:
    """Clasifica el estado libre/ocupado de cada cajón mediante conteo de píxeles activos (countNonZero)
    y validación multiseñal (densidad de masa oscura + densidad de bordes Canny).
    """
    global_ratio = white_ratio if white_ratio is not None else WHITE_RATIO
    result = {}

    for s in slots:
        code = s.get("code", "?")
        cx, cy, w, h, angle = map_slot_box(s, w_img, h_img, calibration)
        crop = extract_rotated_crop(processed, cx, cy, w, h, angle)
        
        if crop is None or crop.size == 0:
            result[code] = False
            continue

        # Umbral por zona (slot.thr) o fallback al ratio global
        thr_slot = s.get("thr")
        if thr_slot is not None:
            try:
                ratio = float(thr_slot) / REF_BOX_AREA
            except (ValueError, TypeError):
                ratio = global_ratio
        else:
            ratio = global_ratio

        count = int(cv2.countNonZero(crop))
        slot_area = max(1.0, w * h)
        white_occ = count > (ratio * slot_area)

        if white_occ:
            result[code] = True
            continue

        # Señal 2: Análisis de masa oscura para vehículos de color sólido sobre asfalto claro
        orig_crop = extract_rotated_crop(original, cx, cy, w, h, angle)
        if orig_crop is not None and orig_crop.size > 0:
            g = cv2.cvtColor(orig_crop, cv2.COLOR_BGR2GRAY) if len(orig_crop.shape) == 3 else orig_crop
            dark_ratio = float((g < 90).sum()) / float(max(1, g.size))
            if dark_ratio > 0.30:
                result[code] = True
                continue

            # Señal 3: Densidad de bordes Canny para detalles mecánicos / llantas
            gb = cv2.GaussianBlur(g, (5, 5), 0)
            edges = cv2.Canny(gb, 50, 150)
            edge_density = float((edges > 0).sum()) / float(max(1, edges.size))
            if edge_density > 0.045:
                result[code] = True
                continue

        result[code] = False

    return result


# =======================================================
# Detección de vehículos con YOLO (Thread-Safe Lazy Load)
# =======================================================
def detect_vehicle_boxes(img: np.ndarray, conf: float = 0.35) -> Tuple[List[List[int]], str]:
    """Realiza la detección de vehículos sobre el frame utilizando YOLOv8 si está disponible.
    
    Clases COCO de vehículos: 2 (car), 3 (motorcycle), 5 (bus), 7 (truck).
    Carga el modelo en memoria de forma lazy y thread-safe. Si YOLO no está disponible o no detecta nada,
    aplica la heurística de contornos como respaldo.
    """
    global _yolo_model

    with _yolo_lock:
        if not _yolo_state["tried"]:
            _yolo_state["tried"] = True
            model_candidate = os.getenv("YOLO_VEHICLE_MODEL", "yolov8m.pt")
            for _m in [model_candidate, "yolov8n.pt"]:
                try:
                    from ultralytics import YOLO
                    _yolo_model = YOLO(_m)
                    logger.info(f"[Vision Engine] Modelo YOLO cargado con éxito: {_m}")
                    break
                except Exception as err:
                    logger.debug(f"[Vision Engine] No se pudo cargar {_m}: {err}")
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
        except Exception as err:
            logger.warning(f"[Vision Engine] Inferencia YOLO falló: {err}")
            car_boxes = []

    # Fallback heurístico: Detección de contornos binarios Otsu
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thr = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thr, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    h, w = gray.shape

    for cnt in contours:
        x, y, bw, bh = cv2.boundingRect(cnt)
        area = bw * bh
        if area < w * h * 0.008 or area > w * h * 0.25:
            continue
        if 1.3 < bw / float(max(1, bh)) < 3.5 and bh > 28:
            car_boxes.append([x, y, x + bw, y + bh])

    return car_boxes, ("contours" if car_boxes else "none")


def occupancy_from_boxes(car_boxes: List[List[int]], slots: List[Dict], w_img: int, h_img: int,
                          calibration: Optional[Dict] = None) -> Dict[str, bool]:
    """Evalúa la ocupación combinando las bounding boxes detectadas (YOLO) con los cajones CAD."""
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
                if slot_area > 0 and inter / float(slot_area) > 0.18:
                    occupied = True
                    break

        result[code] = occupied
    return result


# =======================================================
# API y Endpoints de Visión
# =======================================================
def detect_occupancy(image_bytes: bytes, slots: List[Dict]) -> Dict[str, bool]:
    """Decodifica un buffer binario e infiere la ocupación de los cajones solicitados."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")
    
    h_img, w_img = img.shape[:2]
    car_boxes, _ = detect_vehicle_boxes(img)
    
    if car_boxes:
        return occupancy_from_boxes(car_boxes, slots, w_img, h_img)
    
    processed = preprocess_frame(img)
    return classify_by_threshold(processed, img, slots, w_img, h_img)


def detect_occupancy_cv2_adaptive(image_bytes: bytes, slots: List[Dict],
                                  white_ratio: Optional[float] = None) -> Dict[str, bool]:
    """Clasificación pura por umbralización adaptativa sin inferencia por redes neuronales."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {}

    h_img, w_img = img.shape[:2]
    processed = preprocess_frame(img)
    return classify_by_threshold(processed, img, slots, w_img, h_img, white_ratio=white_ratio)


def detect_occupancy_cv2_debug(image_bytes: bytes, slots: List[Dict],
                                white_ratio: Optional[float] = None) -> Dict:
    """Modo depuración: incluye estadísticas de densidad y capturas anotadas en formato Base64."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")

    h_img, w_img = img.shape[:2]
    processed = preprocess_frame(img)
    ratio = white_ratio if white_ratio is not None else WHITE_RATIO
    counts = {}
    occupancy = {}

    for s in slots:
        code = s.get("code", "?")
        thr_slot = s.get("thr")
        try:
            r = float(thr_slot) / REF_BOX_AREA if thr_slot is not None else ratio
        except (ValueError, TypeError):
            r = ratio

        cx, cy, w, h, angle = map_slot_box(s, w_img, h_img)
        crop = extract_rotated_crop(processed, cx, cy, w, h, angle)
        cnt = int(cv2.countNonZero(crop)) if crop is not None and crop.size else 0
        area = int(max(1.0, w * h))
        
        counts[code] = {
            "count": cnt,
            "area": area,
            "ratio": round(cnt / float(area), 4),
            "threshold": int(r * area),
            "thr": thr_slot
        }
        occupancy[code] = cnt > (r * area)

        if not occupancy[code]:
            orig_crop = extract_rotated_crop(img, cx, cy, w, h, angle)
            if orig_crop is not None and orig_crop.size:
                g = cv2.cvtColor(orig_crop, cv2.COLOR_BGR2GRAY) if len(orig_crop.shape) == 3 else orig_crop
                dark = float((g < 90).sum()) / float(max(1, g.size))
                counts[code]["dark_ratio"] = round(dark, 4)
                if dark > 0.30:
                    occupancy[code] = True
                    continue

                gb = cv2.GaussianBlur(g, (5, 5), 0)
                edges = cv2.Canny(gb, 50, 150)
                ed = float((edges > 0).sum()) / float(max(1, edges.size))
                counts[code]["edge_density"] = round(ed, 4)
                if ed > 0.045:
                    occupancy[code] = True

    _, buf_proc = cv2.imencode(".jpg", processed)
    proc_b64 = "data:image/jpeg;base64," + base64.b64encode(buf_proc.tobytes()).decode("ascii")
    ann = _draw_annotations(img, slots, occupancy, [])
    _, buf_ann = cv2.imencode(".jpg", ann, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    ann_b64 = "data:image/jpeg;base64," + base64.b64encode(buf_ann.tobytes()).decode("ascii")

    return {
        "occupancy": occupancy,
        "counts": counts,
        "white_ratio": ratio,
        "processed_image": proc_b64,
        "annotated_image": ann_b64
    }


def parse_calibration(raw: Optional[str]) -> Optional[Dict[str, float]]:
    """Parsea y valida la cadena JSON de calibración guardada en la base de datos."""
    if not raw:
        return None
    try:
        d = json.loads(raw)
        if isinstance(d, dict) and all(k in d for k in ("x", "y", "w", "h")):
            return {k: float(d[k]) for k in ("x", "y", "w", "h")}
    except Exception:
        pass
    return None


def _draw_annotations(img: np.ndarray, slots: List[Dict], occupancy: Dict[str, bool],
                      car_boxes: List[List[int]], calibration: Optional[Dict] = None) -> np.ndarray:
    """Genera el frame anotado dibujando polígonos de cajones, bboxes y banner superior."""
    h_img, w_img = img.shape[:2]
    canvas = img.copy()

    for s in slots:
        code = s.get("code", "?")
        cx, cy, w, h, angle = map_slot_box(s, w_img, h_img, calibration)
        occupied = occupancy.get(code, False)
        color = (60, 60, 230) if occupied else (80, 200, 80)
        label = f"{code} {'OK' if occupied else 'LIBRE'}"

        if angle % 360 == 0:
            x, y = int(cx - w / 2), int(cy - h / 2)
            cv2.rectangle(canvas, (x, y), (x + int(w), y + int(h)), color, 2)
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
            ly = max(th + 6, y - 4)
            cv2.rectangle(canvas, (x, ly - th - 6), (x + tw + 6, ly), color, -1)
            cv2.putText(canvas, label, (x + 3, ly - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.4,
                        (255, 255, 255), 1, cv2.LINE_AA)
        else:
            poly = np.array(slot_polygon(cx, cy, w, h, angle), dtype=np.int32)
            cv2.polylines(canvas, [poly], True, color, 2, cv2.LINE_AA)
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
            tx, ty = int(cx - tw / 2), int(cy + th / 2)
            cv2.rectangle(canvas, (tx - 2, ty - th - 2), (tx + tw + 2, ty + 2), color, -1)
            cv2.putText(canvas, label, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.4,
                        (255, 255, 255), 1, cv2.LINE_AA)

    for (bx1, by1, bx2, by2) in car_boxes:
        cv2.rectangle(canvas, (bx1, by1), (bx2, by2), (50, 170, 240), 2)

    n_occ = sum(1 for v in occupancy.values() if v)
    banner = f"AUTOS: {len(car_boxes)}  OCUPADOS: {n_occ}/{len(occupancy)}"
    cv2.rectangle(canvas, (0, 0), (w_img, 34), (30, 30, 30), -1)
    cv2.putText(canvas, banner, (10, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                (120, 230, 120), 2, cv2.LINE_AA)

    return canvas


def scan_parking_frame(image_bytes: bytes, slots: List[Dict],
                       calibration: Optional[Dict] = None) -> Dict:
    """Realiza el escaneo completo de un frame para el monitoreo en tiempo real."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")

    h_img, w_img = img.shape[:2]
    car_boxes, engine = detect_vehicle_boxes(img)

    if car_boxes:
        occupancy = occupancy_from_boxes(car_boxes, slots, w_img, h_img, calibration)
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
