"""Tests para el conector de cámaras IP: soporte de red local, RTSP, bloqueo de metadata y manejo de errores."""
import pytest
from app.core.ipcam import _is_cloud_metadata_url, extract_first_jpeg, fetch_camera_frame


def test_metadata_ssrf_protection():
    # Endpoints de metadatos cloud que DEBEN ser bloqueados
    assert _is_cloud_metadata_url("http://169.254.169.254/latest/meta-data") is True
    assert _is_cloud_metadata_url("http://169.254.170.2/v2/metadata") is True
    assert _is_cloud_metadata_url("http://metadata.google.internal/computeMetadata/v1") is True
    assert _is_cloud_metadata_url("file:///etc/passwd") is True
    assert _is_cloud_metadata_url("gopher://127.0.0.1:8080") is True

    # Redes locales y cámaras habituales que DEBEN estar permitidas
    assert _is_cloud_metadata_url("http://192.168.1.50:8080/video") is False
    assert _is_cloud_metadata_url("http://10.0.0.15:8080/shot.jpg") is False
    assert _is_cloud_metadata_url("http://172.16.1.20:4747/video") is False
    assert _is_cloud_metadata_url("http://localhost:8080/video") is False
    assert _is_cloud_metadata_url("http://127.0.0.1:8080/video") is False
    assert _is_cloud_metadata_url("https://tunel.ngrok-free.app/video") is False
    assert _is_cloud_metadata_url("rtsp://admin:12345@192.168.1.50:554/stream") is False


def test_extract_first_jpeg():
    # Buffer con JPEG completo
    fake_frame = b"\x00\x00\xff\xd8DATOFRAME1\xff\xd9\x00\x00\xff\xd8DATOFRAME2\xff\xd9"
    first = extract_first_jpeg(fake_frame)
    assert first == b"\xff\xd8DATOFRAME1\xff\xd9"

    # Buffer que ya es un solo JPEG
    single = b"\xff\xd8DATOFRAME\xff\xd9"
    assert extract_first_jpeg(single) == single


def test_fetch_camera_frame_metadata_rejected():
    with pytest.raises(ConnectionError) as exc_info:
        fetch_camera_frame("http://169.254.169.254/latest/meta-data")
    assert "URL de cámara no permitida" in str(exc_info.value)


def test_fetch_camera_frame_unreachable_gives_clear_error():
    # Conexión a un puerto no abierto en IP local debe dar un error claro, no crash ni 500
    with pytest.raises(ConnectionError) as exc_info:
        fetch_camera_frame("http://127.0.0.1:59999/video", timeout_s=1.0)
    err = str(exc_info.value)
    assert "No se pudo conectar a la cámara" in err or "Tiempo de espera agotado" in err
