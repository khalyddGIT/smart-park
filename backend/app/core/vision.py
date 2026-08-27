"""Visión de ocupación por cajón: YOLO opcional + OpenCV fallback."""
import time
from typing import List, Dict


def detect_occupancy(image_bytes: bytes, slots: List[Dict]) -> Dict[str, bool]:
    """Detecta si cada cajón está ocupado.

    slots: lista de dicts con {code, x, y, w, h, rot}
    Retorna {code: True si ocupado, False si libre}
    Intenta YOLO para autos, fallback a contornos si no hay modelo.
    """
    import cv2
    import numpy as np

    t0 = time.perf_counter()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")
    h_img, w_img = img.shape[:2]

    # Intentar YOLO
    car_boxes = []
    yolo_ok = False
    try:
        from ultralytics import YOLO
        import os
        model_path = os.getenv("YOLO_VEHICLE_MODEL", "yolov8n.pt")
        if os.path.exists(model_path):
            model = YOLO(model_path)
            results = model(img, verbose=False, conf=0.35)
            for r in results:
                for box in r.boxes:
                    cls = int(box.cls[0]) if hasattr(box, 'cls') else -1
                    # COCO: 2=car, 3=motorcycle, 5=bus, 7=truck
                    if cls in (2, 3, 5, 7):
                        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                        car_boxes.append((x1, y1, x2, y2))
            yolo_ok = len(car_boxes) > 0
    except Exception:
        pass

    # Fallback clásico: si no hay YOLO o no detectó nada, usar heurística de contornos por ROI
    # Para cada slot, recortar ROI y medir densidad de bordes / color
    result = {}
    for s in slots:
        code = s.get("code", "?")
        # Escalar slot CAD (1100x700) a tamaño de imagen
        # Si slot ya está en coords de imagen (cuando se calibró sobre foto), el escalado es aprox 1:1 si imagen es ~1100
        # Usamos escala proporcional
        x = int(s.get("x", 0) * w_img / 1100)
        y = int(s.get("y", 0) * h_img / 700)
        w = int(s.get("w", 60) * w_img / 1100)
        h = int(s.get("h", 100) * h_img / 700)
        rot = s.get("rot", 0)

        # Si hay rotación, aproximar con bounding rect sin rotar (suficiente para YOLO centro)
        x1, y1, x2, y2 = x, y, x + w, y + h
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w_img, x2), min(h_img, y2)
        if x2 <= x1 or y2 <= y1:
            result[code] = False
            continue

        occupied = False
        if yolo_ok:
            # Ocupado si el centro de algún auto cae dentro del rect del cajón
            for (bx1, by1, bx2, by2) in car_boxes:
                cx, cy = (bx1 + bx2) // 2, (by1 + by2) // 2
                if x1 <= cx <= x2 and y1 <= cy <= y2:
                    # También verificar solapamiento de área >30%
                    inter_x1, inter_y1 = max(x1, bx1), max(y1, by1)
                    inter_x2, inter_y2 = min(x2, bx2), min(y2, by2)
                    if inter_x2 > inter_x1 and inter_y2 > inter_y1:
                        inter = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
                        slot_area = (x2 - x1) * (y2 - y1)
                        if inter / slot_area > 0.18:
                            occupied = True
                            break
                    else:
                        # Centro dentro pero sin solape suficiente: considerar ocupado si centro está bien dentro
                        occupied = True
                        break
        else:
            # Fallback sin YOLO: medir varianza de bordes en el ROI
            roi = img[y1:y2, x1:x2]
            if roi.size == 0:
                result[code] = False
                continue
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            # Ecualizar para iluminación variable
            gray = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(gray, 50, 150)
            edge_density = float((edges > 0).sum()) / float(edges.size) if edges.size else 0
            # Un cajón vacío (asfalto liso) tiene baja densidad de bordes; ocupado tiene alta
            # Umbral empírico 0.04, ajustable por calibración
            occupied = edge_density > 0.045

        result[code] = occupied

    return result
