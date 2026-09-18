import uuid
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.models import Slot, Reservation, Payment, AuditLog
from sqlalchemy import Index

async def _register_and_get_token(role: str = "user") -> tuple[str, str, int]:
    email = f"test_{role}_{uuid.uuid4().hex[:8]}@smartpark.com"
    password = "SecurePassword123!"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/v1/auth/register", json={
            "full_name": f"Tester {role.capitalize()}",
            "email": email,
            "phone": "+51 988 111 222",
            "password": password,
            "role": role
        })
        assert r.status_code == 201, r.text
        data = r.json()
        return data["access_token"], email, data["user"]["id"]


@pytest.mark.asyncio
async def test_enterprise_security_headers_and_hsts_csp():
    """Pilar 1: Comprobar cabeceras HSTS, CSP, no-sniff y SAMEORIGIN."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/payments/status")
        assert res.status_code == 200
        headers = res.headers

        # HSTS
        assert "Strict-Transport-Security" in headers
        assert "max-age=31536000" in headers["Strict-Transport-Security"]

        # Content-Security-Policy
        assert "Content-Security-Policy" in headers
        csp = headers["Content-Security-Policy"]
        assert "default-src 'self'" in csp
        assert "https://checkout.culqi.com" in csp
        assert "https://www.paypal.com" in csp

        # Anti-sniff & Clickjacking
        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-Frame-Options") in ("DENY", "SAMEORIGIN")


@pytest.mark.asyncio
async def test_gzip_compression_middleware():
    """Pilar 1: Verificar compresión GZip de respuestas >= 1000 bytes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Petición a catálogo público de estacionamientos con Accept-Encoding: gzip
        res = await ac.get("/api/v1/parkings", headers={"Accept-Encoding": "gzip"})
        assert res.status_code == 200
        # Starlette GZipMiddleware comprime automáticamente si el contenido supera minimum_size
        if len(res.content) >= 1000:
            assert res.headers.get("Content-Encoding") == "gzip" or "gzip" in res.headers.get("Vary", "")


@pytest.mark.asyncio
async def test_payment_idempotency_charge():
    """Pilar 1: Idempotencia en cobros de pago evitando dobles transacciones."""
    token, email, user_id = await _register_and_get_token(role="user")
    transport = ASGITransport(app=app)
    idemp_key = f"test-idemp-{uuid.uuid4().hex}"

    # Simular respuesta exitosa de Culqi v2 API
    mock_culqi_resp = MagicMock()
    mock_culqi_resp.status_code = 201
    mock_culqi_resp.json.return_value = {
        "id": f"chr_test_{uuid.uuid4().hex[:12]}",
        "outcome": {"type": "venta_exitosa", "user_message": "Cobro exitoso"},
        "source": {"type": "card"},
        "description": "Reserva Smart Park Test"
    }

    with patch("requests.post", return_value=mock_culqi_resp), \
         patch("app.core.config.settings.CULQI_SECRET_KEY", "sk_test_mock_secret_key"):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            headers = {
                "Authorization": f"Bearer {token}",
                "Idempotency-Key": idemp_key
            }
            body = {
                "amount_cents": 1200,
                "token_id": "tkn_test_sample123",
                "email": email,
                "description": "Reserva Test Idempotente"
            }

            # Primer cobro: procesa normalmente
            res1 = await ac.post("/api/v1/payments/charge", json=body, headers=headers)
            assert res1.status_code == 200
            data1 = res1.json()
            assert "payment_id" in data1
            payment_id_1 = data1["payment_id"]

            # Segundo cobro idéntico con la misma Idempotency-Key: debe responder desde caché con HIT
            res2 = await ac.post("/api/v1/payments/charge", json=body, headers=headers)
            assert res2.status_code == 200
            assert res2.headers.get("X-Cache-Lookup") == "HIT"
            assert res2.headers.get("Idempotency-Key") == idemp_key
            data2 = res2.json()
            assert data2["payment_id"] == payment_id_1


@pytest.mark.asyncio
async def test_payment_idempotency_paypal_orders():
    """Pilar 1: Idempotencia en órdenes PayPal (create-order)."""
    token, _, _ = await _register_and_get_token(role="user")
    transport = ASGITransport(app=app)
    idemp_key = f"pp-ord-idemp-{uuid.uuid4().hex}"

    mock_resp = MagicMock()
    mock_resp.status_code = 201
    mock_order_id = f"ORDER-MOCK-{uuid.uuid4().hex[:8]}"
    mock_resp.json.return_value = {
        "id": mock_order_id,
        "status": "CREATED",
        "links": []
    }

    with patch("requests.post", return_value=mock_resp), \
         patch("app.api.v1.payments.get_paypal_access_token", return_value="mock_access_token"):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            headers = {
                "Authorization": f"Bearer {token}",
                "Idempotency-Key": idemp_key
            }
            body = {
                "amount": 15.0,
                "currency": "PEN",
                "description": "Orden Test"
            }

            # 1. Primera petición
            r1 = await ac.post("/api/v1/payments/paypal/create-order", json=body, headers=headers)
            assert r1.status_code == 200
            d1 = r1.json()
            assert d1["order_id"] == mock_order_id

            # 2. Reintento con la misma clave: debe devolver HIT sin volver a llamar a PayPal
            r2 = await ac.post("/api/v1/payments/paypal/create-order", json=body, headers=headers)
            assert r2.status_code == 200
            assert r2.headers.get("X-Cache-Lookup") == "HIT"
            d2 = r2.json()
            assert d2["order_id"] == mock_order_id


@pytest.mark.asyncio
async def test_reservations_pagination_and_backward_compatibility():
    """Pilar 3: Paginación estándar retrocompatible en /api/v1/reservations."""
    # Usar platform para ver todas las reservas
    token, _, _ = await _register_and_get_token(role="platform")
    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # A) Sin parámetros de paginación -> Devuelve lista plana (100% retrocompatible)
        res_list = await ac.get("/api/v1/reservations", headers=headers)
        assert res_list.status_code == 200
        data_list = res_list.json()
        assert isinstance(data_list, list), "Debe devolver lista cuando no se envía page"

        # B) Con parámetros de paginación (page=1, page_size=2) -> Devuelve estructura enriquecida
        res_page = await ac.get("/api/v1/reservations?page=1&page_size=2", headers=headers)
        assert res_page.status_code == 200
        data_page = res_page.json()
        assert isinstance(data_page, dict), "Debe devolver dict cuando se solicita page"
        assert "items" in data_page
        assert "total" in data_page
        assert "page" in data_page
        assert "page_size" in data_page
        assert "total_pages" in data_page
        assert data_page["page"] == 1
        assert data_page["page_size"] == 2
        assert len(data_page["items"]) <= 2


@pytest.mark.asyncio
async def test_audit_logs_pagination_and_backward_compatibility():
    """Pilar 3: Paginación estándar retrocompatible en /api/v1/audit/logs."""
    token, _, _ = await _register_and_get_token(role="platform")
    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # A) Sin page -> Lista plana
        r_list = await ac.get("/api/v1/audit/logs", headers=headers)
        assert r_list.status_code == 200
        assert isinstance(r_list.json(), list)

        # B) Con page=1, page_size=5 -> Estructura paginada
        r_page = await ac.get("/api/v1/audit/logs?page=1&page_size=5", headers=headers)
        assert r_page.status_code == 200
        d_page = r_page.json()
        assert isinstance(d_page, dict)
        assert "items" in d_page
        assert "total" in d_page
        assert d_page["page"] == 1
        assert d_page["page_size"] == 5


def test_composite_database_indexes_definition():
    """Pilar 3: Verificación de índices compuestos B-Tree en modelos SQLAlchemy."""
    models_to_check = [Slot, Reservation, Payment, AuditLog]
    for model in models_to_check:
        table_args = getattr(model, "__table_args__", None)
        assert table_args is not None, f"El modelo {model.__name__} debe tener __table_args__"
        indexes = [item for item in table_args if isinstance(item, Index)]
        assert len(indexes) >= 2, f"El modelo {model.__name__} debe tener al menos 2 índices compuestos"
