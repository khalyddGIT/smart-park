"""Cliente ligero y robusto para cámaras IP y streams de video (MJPEG, JPEG, RTSP).

Centralizado aquí para poder usarse tanto desde los endpoints de la API como
desde el worker de auto-escaneo en segundo plano (sin importes circulares).
"""
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def extract_first_jpeg(buf: bytes) -> bytes:
    """Extrae el primer frame JPEG completo de un buffer MJPEG o devuelve el
    buffer tal cual si ya es un JPEG único."""
    if not buf or len(buf) < 4:
        return buf
    start = buf.find(b"\xff\xd8")
    if start == -1:
        return buf  # quizá PNG/otro formato; se valida al decodificar
    end = buf.find(b"\xff\xd9", start)
    if end == -1:
        return buf[start:]  # frame incompleto: intentar decodificar igualmente
    return buf[start:end + 2]


def _is_cloud_metadata_url(url: str) -> bool:
    """Bloquea únicamente endpoints de metadata en la nube (AWS/GCP/Azure) y esquemas inseguros.
    Permite redes locales (192.168.x.x, 10.x.x.x, 172.16.x.x), localhost y dominios públicos,
    necesarios para cámaras IP y CCTV en garitas y redes de estacionamientos.
    """
    try:
        from urllib.parse import urlparse
        import ipaddress
        parsed = urlparse(url)
        scheme = (parsed.scheme or "").lower()
        if scheme not in ("http", "https", "rtsp"):
            return True
        host = (parsed.hostname or "").lower()
        if not host:
            return True
        # Bloquear metadata cloud conocido
        if host in ("169.254.169.254", "169.254.170.2", "metadata.google.internal"):
            return True
        if host.endswith(".internal") and "metadata" in host:
            return True
        try:
            ip = ipaddress.ip_address(host)
            # Solo bloquear link-local reservado para cloud metadata (169.254.0.0/16)
            if ip.is_link_local:
                return True
        except ValueError:
            pass
        return False
    except Exception:
        return True


def _fetch_frame_opencv(url: str, timeout_s: float = 6.0) -> bytes:
    """Captura un frame utilizando OpenCV (compatible con RTSP, codecs de video H.264/H.265 y streams)."""
    import cv2
    import os
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|timeout;5000000"
    cap = cv2.VideoCapture(url)
    if not cap.isOpened():
        raise ConnectionError(f"No se pudo abrir el stream de la cámara ({url}). Verifica que la IP y puerto sean accesibles.")
    try:
        ret, frame = cap.read()
        if not ret or frame is None:
            raise ConnectionError(f"Se conectó a la cámara pero no se pudo leer fotogramas ({url}).")
        ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
        if not ok:
            raise ConnectionError("Error al codificar el fotograma a JPEG")
        return buf.tobytes()
    finally:
        cap.release()


def fetch_camera_frame(url: str, max_bytes: int = 6 * 1024 * 1024, timeout_s: float = 6.0) -> bytes:
    """Descarga un frame desde una cámara IP o stream de video.
    Soporta:
    - JPEG estático (HTTP/HTTPS)
    - MJPEG stream (HTTP/HTTPS)
    - RTSP stream (vía OpenCV cv2.VideoCapture)
    - Detección inteligente de subrutas para apps de cámara (IP Webcam, DroidCam)
    Bloqueante: llamar vía asyncio.to_thread.
    """
    if not url:
        raise ConnectionError("No se proporcionó URL de cámara")

    clean_url = url.strip()
    if _is_cloud_metadata_url(clean_url):
        raise ConnectionError("URL de cámara no permitida: esquema no soportado o endpoint reservado de metadata.")

    # Si es RTSP, procesar directamente con OpenCV
    if clean_url.lower().startswith("rtsp://"):
        return _fetch_frame_opencv(clean_url, timeout_s=timeout_s)

    import requests

    def _try_http(target_url: str) -> Optional[bytes]:
        try:
            resp = requests.get(target_url, stream=True, timeout=timeout_s, allow_redirects=True)
            if resp.status_code in (401, 403):
                raise ConnectionError(f"La cámara requiere autenticación (HTTP {resp.status_code}). Incluye usuario y contraseña en la URL (ej: http://admin:clave@ip:puerto/video).")
            if resp.status_code == 404:
                return None
            if resp.status_code != 200:
                raise ConnectionError(f"La cámara respondió con HTTP {resp.status_code}")

            content_type = (resp.headers.get("Content-Type") or "").lower()

            # Si es HTML, no es imagen directa (el usuario probablemente puso la URL raíz sin /video o /shot.jpg)
            if "text/html" in content_type:
                resp.close()
                return None

            is_mjpeg_stream = (
                "multipart" in content_type or "octet-stream" in content_type
                or target_url.lower().endswith(("mjpeg", "mjpg", "/video"))
            )
            if is_mjpeg_stream:
                buf = b""
                for chunk in resp.iter_content(chunk_size=65536):
                    if not chunk:
                        continue
                    buf += chunk
                    if len(buf) > max_bytes:
                        break
                    start = buf.find(b"\xff\xd8")
                    if start != -1 and buf.find(b"\xff\xd9", start) != -1:
                        break
                resp.close()
                extracted = extract_first_jpeg(buf)
                if extracted and len(extracted) > 100:
                    return extracted
                return None

            # JPEG / PNG estático
            data = b""
            for chunk in resp.iter_content(chunk_size=65536):
                data += chunk
                if len(data) > max_bytes:
                    break
            resp.close()
            if data and len(data) > 100:
                if data.startswith(b"\xff\xd8") or data.startswith(b"\x89PNG") or b"\xff\xd8" in data:
                    return extract_first_jpeg(data)
                return data
            return None
        except requests.exceptions.ConnectTimeout:
            raise ConnectionError(f"Tiempo de espera agotado al conectar a la cámara ({target_url}). Si estás en la nube (Railway), asegúrate de usar un túnel público (ngrok) o IP pública.")
        except requests.exceptions.ConnectionError:
            raise ConnectionError(f"No se pudo conectar a la cámara ({target_url}). Verifica que el dispositivo esté encendido y la IP/puerto sean correctos.")
        except ConnectionError:
            raise
        except Exception as e:
            logger.warning(f"Error al solicitar frame HTTP de {target_url}: {e}")
            return None

    # 1. Intentar con la URL tal como la proporcionó el usuario
    try:
        frame = _try_http(clean_url)
        if frame:
            return frame
    except ConnectionError:
        raise

    # 2. Si devolvió None (por ejemplo porque devolvió HTML o 404 en la raíz), probar sufijos comunes de IP Webcam
    from urllib.parse import urlparse
    parsed = urlparse(clean_url)
    if not parsed.path or parsed.path in ("/", ""):
        base_clean = clean_url.rstrip("/")
        for subpath in ("/video", "/shot.jpg", "/videofeed", "/cam/1/frame.jpg"):
            try:
                candidate = f"{base_clean}{subpath}"
                candidate_frame = _try_http(candidate)
                if candidate_frame:
                    return candidate_frame
            except Exception:
                continue

    # 3. Fallback final: intentar con OpenCV (por si es un stream de video HTTP no MJPEG)
    try:
        return _fetch_frame_opencv(clean_url, timeout_s=timeout_s)
    except Exception:
        raise ConnectionError(f"No se pudo obtener imagen de la cámara ({clean_url}). Verifica que el stream esté activo y entregue video o JPEG.")