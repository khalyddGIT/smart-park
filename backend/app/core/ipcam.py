"""Cliente ligero para camaras IP HTTP (MJPEG stream o JPEG estatico).

Centralizado aqui para poder usarse tanto desde los endpoints de la API como
desde el worker de auto-escaneo en segundo plano (sin importes circulares).
"""


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


def fetch_camera_frame(url: str, max_bytes: int = 6 * 1024 * 1024, timeout_s: float = 8.0) -> bytes:
    """Descarga un frame desde una cámara IP. Soporta JPEG estático y stream
    MJPEG (toma el primer frame completo). Bloqueante: llamar vía asyncio.to_thread."""
    import requests
    resp = requests.get(url, stream=True, timeout=timeout_s)
    if resp.status_code != 200:
        raise ConnectionError(f"La cámara respondió con HTTP {resp.status_code}")
    content_type = (resp.headers.get("Content-Type") or "").lower()
    is_mjpeg_stream = (
        "multipart" in content_type or "octet-stream" in content_type
        or url.lower().endswith(("mjpeg", "mjpg"))
    )
    if is_mjpeg_stream:
        # Stream MJPEG: acumular hasta tener un JPEG completo
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
        return extract_first_jpeg(buf)
    # JPEG/PNG estático: leer todo (con límite)
    data = b""
    for chunk in resp.iter_content(chunk_size=65536):
        data += chunk
        if len(data) > max_bytes:
            break
    resp.close()
    return data