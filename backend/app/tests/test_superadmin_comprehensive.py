import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

async def _register_and_get_token(role: str = "user") -> tuple[str, str, int]:
    email = f"{role}_{uuid.uuid4().hex[:8]}@smartpark.com"
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
        token = data["access_token"]
        user_id = data["user"]["id"]
        return token, email, user_id

@pytest.mark.asyncio
async def test_superadmin_affiliations_and_company_lifecycle():
    platform_token, platform_email, _ = await _register_and_get_token(role="platform")
    user_token, _, _ = await _register_and_get_token(role="user")
    
    transport = ASGITransport(app=app)
    platform_headers = {"Authorization": f"Bearer {platform_token}"}
    user_headers = {"Authorization": f"Bearer {user_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Non-platform users cannot access affiliation requests list
        bad_get = await ac.get("/api/v1/affiliation-requests", headers=user_headers)
        assert bad_get.status_code == 403

        # 2. Public / Driver can submit an affiliation request
        aff_email = f"empresa_{uuid.uuid4().hex[:6]}@cochera.pe"
        create_resp = await ac.post("/api/v1/affiliation-requests", json={
            "parkingName": "Cochera Central Ayacucho",
            "ownerName": "Corporación Los Andes SAC",
            "email": aff_email,
            "phone": "+51 966 555 444",
            "address": "Jr. 28 de Julio 321",
            "city": "Ayacucho - Huamanga",
            "capacity": 30,
            "rate": 6.0,
            "notes": "Empresa matriz con 3 sucursales proyectadas"
        })
        assert create_resp.status_code == 201, create_resp.text
        aff_id = create_resp.json()["id"]
        assert create_resp.json()["status"] == "pending"

        # 3. SuperAdmin views list and sees the new affiliation
        list_resp = await ac.get("/api/v1/affiliation-requests", headers=platform_headers)
        assert list_resp.status_code == 200
        ids = [item["id"] for item in list_resp.json()]
        assert aff_id in ids

        # 4. SuperAdmin approves affiliation -> Creates parking + local admin user + staff
        approve_resp = await ac.put(f"/api/v1/affiliation-requests/{aff_id}/approve", headers=platform_headers, json={
            "admin_email": aff_email,
            "admin_password": "NewCompanyPass123!",
            "admin_name": "Gerente General Los Andes",
            "admin_phone": "+51 966 555 444"
        })
        assert approve_resp.status_code == 200, approve_resp.text
        appr_data = approve_resp.json()
        assert appr_data["status"] == "approved"
        new_parking_id = appr_data["parking_id"]

        # Verify parking exists and is active
        p_resp = await ac.get(f"/api/v1/parkings/{new_parking_id}")
        assert p_resp.status_code == 200
        assert p_resp.json()["name"] == "Cochera Central Ayacucho"
        assert p_resp.json()["status"] == "active"

        # Verify that approved affiliation cannot be re-approved
        dup_appr = await ac.put(f"/api/v1/affiliation-requests/{aff_id}/approve", headers=platform_headers)
        assert dup_appr.status_code == 400

        # 5. Create second affiliation and test rejection
        create_resp2 = await ac.post("/api/v1/affiliation-requests", json={
            "parkingName": "Cochera Invalida",
            "ownerName": "Propietario Invalido",
            "email": f"invalido_{uuid.uuid4().hex[:6]}@mail.com"
        })
        assert create_resp2.status_code == 201
        aff_id2 = create_resp2.json()["id"]

        reject_resp = await ac.put(f"/api/v1/affiliation-requests/{aff_id2}/reject", headers=platform_headers)
        assert reject_resp.status_code == 200
        assert reject_resp.json()["status"] == "rejected"

@pytest.mark.asyncio
async def test_superadmin_parking_management_and_deletion_persistence():
    platform_token, _, _ = await _register_and_get_token(role="platform")
    user_token, _, _ = await _register_and_get_token(role="user")

    transport = ASGITransport(app=app)
    platform_headers = {"Authorization": f"Bearer {platform_token}"}
    user_headers = {"Authorization": f"Bearer {user_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create a parking
        p_create = await ac.post("/api/v1/parkings", headers=platform_headers, json={
            "name": "Cochera SuperAdmin Test",
            "address": "Av. Los Libertadores 789",
            "city": "Ayacucho",
            "hourly_rate": 5.5,
            "total_capacity": 20,
            "tolerance_minutes": 15
        })
        assert p_create.status_code == 201
        parking_id = p_create.json()["id"]

        # Superadmin updates parking status (disable/maintenance)
        p_update = await ac.put(f"/api/v1/parkings/{parking_id}", headers=platform_headers, json={
            "status": "maintenance",
            "owner": "Empresa Actualizada"
        })
        assert p_update.status_code == 200
        assert p_update.json()["status"] == "maintenance"

        # Regular user cannot delete parking
        user_del = await ac.delete(f"/api/v1/parkings/{parking_id}", headers=user_headers)
        assert user_del.status_code == 403

        # SuperAdmin deletes parking permanently
        del_resp = await ac.delete(f"/api/v1/parkings/{parking_id}", headers=platform_headers)
        assert del_resp.status_code in [200, 204]

        # Verify parking does NOT exist anymore (no auto-restoring)
        check_p = await ac.get(f"/api/v1/parkings/{parking_id}")
        assert check_p.status_code == 404

@pytest.mark.asyncio
async def test_superadmin_review_and_incident_moderation():
    platform_token, _, _ = await _register_and_get_token(role="platform")
    user_token, _, user_id = await _register_and_get_token(role="user")

    transport = ASGITransport(app=app)
    platform_headers = {"Authorization": f"Bearer {platform_token}"}
    user_headers = {"Authorization": f"Bearer {user_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create parking
        p_resp = await ac.post("/api/v1/parkings", headers=platform_headers, json={
            "name": "Cochera Moderacion Global",
            "address": "Plaza Mayor 101",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "total_capacity": 15,
            "tolerance_minutes": 15
        })
        assert p_resp.status_code == 201
        parking_id = p_resp.json()["id"]

        # User posts a review
        rev_resp = await ac.post("/api/v1/reviews", headers=user_headers, json={
            "parking_id": parking_id,
            "rating": 2,
            "comment": "Atencion lenta en garita"
        })
        assert rev_resp.status_code == 201
        rev_id = rev_resp.json()["id"]

        # SuperAdmin toggles visibility
        hide_resp = await ac.put(f"/api/v1/reviews/{rev_id}/visibility", headers=platform_headers, json={"is_hidden": True})
        assert hide_resp.status_code == 200
        assert hide_resp.json()["is_hidden"] is True

        # Regular user cannot see hidden review
        pub_revs = await ac.get("/api/v1/reviews", headers=user_headers)
        assert rev_id not in [r["id"] for r in pub_revs.json()]

        # SuperAdmin permanently deletes the review
        del_rev = await ac.delete(f"/api/v1/reviews/{rev_id}", headers=platform_headers)
        assert del_rev.status_code == 200

        # Verify it is completely removed
        admin_revs = await ac.get("/api/v1/reviews", headers=platform_headers)
        assert rev_id not in [r["id"] for r in admin_revs.json()]
