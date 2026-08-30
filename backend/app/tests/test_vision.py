"""Pruebas unitarias para el motor de visión computacional (vision.py).
Cubre flujo feliz, casos límite (edge cases) y manejo de excepciones.
"""
import pytest
import numpy as np
import cv2
from app.core import vision

def _create_dummy_image(w=640, h=480, color=(128, 128, 128)) -> np.ndarray:
    """Crea una imagen sintética BGR para pruebas de visión."""
    img = np.zeros((h, w, 3), dtype=np.uint8)
    img[:] = color
    return img

def _image_to_bytes(img: np.ndarray) -> bytes:
    """Convierte ndarray BGR a bytes JPEG."""
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return buf.tobytes()


# ===================================================================
# a) FLUJO FELIZ (Casos Exitosos Estándar)
# ===================================================================

def test_map_slot_box_standard():
    """Verifica mapeo de coordenadas CAD a píxeles de imagen sin calibración."""
    slot = {"x": 100, "y": 200, "w": 60, "h": 100, "rot": 45}
    cx, cy, w, h, angle = vision.map_slot_box(slot, w_img=1100, h_img=700, calibration=None)
    assert cx == 130.0
    assert cy == 250.0
    assert w == 60.0
    assert h == 100.0
    assert angle == 45.0

def test_preprocess_frame_output_shape():
    """Verifica que preprocess_frame retorne una máscara binaria 1-canal."""
    img = _create_dummy_image()
    processed = vision.preprocess_frame(img)
    assert len(processed.shape) == 2
    assert processed.shape == img.shape[:2]

def test_extract_rotated_crop_angle_zero():
    """Verifica extracción de recorte sin rotación (ángulo 0)."""
    img = _create_dummy_image(w=200, h=200)
    crop = vision.extract_rotated_crop(img, cx=100, cy=100, w=50, h=50, angle=0)
    assert crop is not None
    assert crop.shape[:2] == (50, 50)

def test_extract_rotated_crop_with_rotation():
    """Verifica extracción de recorte rotado con warpPerspective."""
    img = _create_dummy_image(w=300, h=300)
    crop = vision.extract_rotated_crop(img, cx=150, cy=150, w=60, h=40, angle=30)
    assert crop is not None
    assert crop.shape[:2] == (40, 60)

def test_detect_occupancy_free_and_occupied_slots():
    """Prueba clasificación de cajones libres y ocupados en imagen sintética."""
    img = _create_dummy_image(w=1100, h=700, color=(200, 200, 200)) # Asfalto claro
    # Dibujar un bloque oscuro simulando vehículo en cajón A-02
    cv2.rectangle(img, (130, 50), (190, 150), (20, 20, 20), -1)
    
    img_bytes = _image_to_bytes(img)
    slots = [
        {"code": "A-01", "x": 50, "y": 50, "w": 60, "h": 100, "rot": 0},
        {"code": "A-02", "x": 130, "y": 50, "w": 60, "h": 100, "rot": 0},
    ]
    result = vision.detect_occupancy(img_bytes, slots)
    assert result.get("A-01") is False
    assert result.get("A-02") is True


# ===================================================================
# b) CASOS LÍMITE (Edge Cases & Valores Frontera)
# ===================================================================

def test_map_slot_box_zero_or_tiny_dimensions():
    """Garantiza que dimensiones 0 o negativas reciban un tamaño mínimo de seguridad."""
    slot = {"x": 0, "y": 0, "w": 0, "h": -5}
    cx, cy, w, h, angle = vision.map_slot_box(slot, w_img=1100, h_img=700)
    assert w >= 2.0
    assert h >= 2.0

def test_extract_rotated_crop_out_of_bounds():
    """Recorte fuera de los límites de la imagen debe ser handled correctamente."""
    img = _create_dummy_image(w=100, h=100)
    crop = vision.extract_rotated_crop(img, cx=-500, cy=-500, w=50, h=50, angle=0)
    assert crop is None or crop.size == 0

def test_parse_calibration_formats():
    """Verifica parseo de JSON de calibración válido, inválido e incompleto."""
    assert vision.parse_calibration(None) is None
    assert vision.parse_calibration("") is None
    assert vision.parse_calibration("invalid_json") is None
    assert vision.parse_calibration('{"x": 0.1, "y": 0.2}') is None # Incompleto
    
    valid = vision.parse_calibration('{"x": "0.1", "y": "0.2", "w": "0.8", "h": "0.8"}')
    assert valid == {"x": 0.1, "y": 0.2, "w": 0.8, "h": 0.8}


# ===================================================================
# c) MANEJO DE ERRORES Y EXCEPCIONES ESPERADAS
# ===================================================================

def test_detect_occupancy_corrupt_bytes_raises_value_error():
    """Imagen corrupta o no decodificable debe lanzar ValueError."""
    corrupt_bytes = b"not_an_image_file_binary_stream"
    with pytest.raises(ValueError, match="No se pudo decodificar la imagen"):
        vision.detect_occupancy(corrupt_bytes, [])

def test_classify_by_threshold_invalid_slot_threshold_fallback():
    """Si slot.thr contiene un tipo o valor inválido, debe caer al ratio global sin romper la app."""
    img = _create_dummy_image(w=1100, h=700)
    processed = vision.preprocess_frame(img)
    slots = [{"code": "TEST-1", "x": 10, "y": 10, "w": 50, "h": 50, "thr": "INVALID_VALUE"}]
    res = vision.classify_by_threshold(processed, img, slots, 1100, 700)
    assert "TEST-1" in res
