"""Tests for CareLens user authentication and role-based access control."""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.api.deps import require_role
from app.core import security
from app.db.session import engine
from app.domain.models import User
from app.main import app
from app.seed import SEED_PASSWORD, SEED_USERS, seed_users

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_seed_users():
    """Ensure seeded users exist in database before each test run."""
    with Session(engine) as session:
        seed_users(session)


def test_all_seven_users_can_login():
    """Assert all seven spec users can log in and receive valid 8-hour JWTs with sub and role."""
    for user_spec in SEED_USERS:
        username = user_spec["username"]
        expected_role = user_spec["role"]

        response = client.post(
            "/auth/login",
            json={"username": username, "password": SEED_PASSWORD},
        )

        assert response.status_code == 200, f"User {username} failed login: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in_hours"] == 8
        assert data["role"] == expected_role
        assert data["username"] == username
        assert len(data["full_name"]) > 0

        # Validate decoded JWT claims
        token = data["access_token"]
        payload = security.decode_access_token(token)
        assert payload["sub"] == username
        assert payload["role"] == expected_role
        assert "exp" in payload
        assert "iat" in payload
        # Ensure expiration is ~8 hours from issue
        diff_hours = (payload["exp"] - payload["iat"]) / 3600
        assert diff_hours == pytest.approx(8.0, abs=0.1)


def test_login_invalid_credentials():
    """Assert invalid password returns 401 Unauthorized."""
    response = client.post(
        "/auth/login",
        json={"username": "dr.rao", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert "Invalid username or password" in response.json()["detail"]


def test_login_nonexistent_user():
    """Assert nonexistent username returns 401 Unauthorized."""
    response = client.post(
        "/auth/login",
        json={"username": "unknown.user", "password": "carelens-demo"},
    )
    assert response.status_code == 401


def test_protected_route_without_token_returns_401():
    """Assert access to protected route without Authorization header returns 401."""
    response = client.get("/me")
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]


def test_protected_route_with_invalid_token_returns_401():
    """Assert access to protected route with invalid token returns 401."""
    response = client.get("/me", headers={"Authorization": "Bearer invalid.token.signature"})
    assert response.status_code == 401
    assert "Invalid or expired token" in response.json()["detail"]


def test_protected_route_with_valid_token_returns_user_profile():
    """Assert authenticated user can retrieve their /me profile."""
    # Login as doctor
    login_res = client.post(
        "/auth/login",
        json={"username": "dr.rao", "password": SEED_PASSWORD},
    )
    token = login_res.json()["access_token"]

    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    profile = response.json()
    assert profile["username"] == "dr.rao"
    assert profile["role"] == "doctor"
    assert "Doctor" in profile["full_name"]


def test_require_role_dependency():
    """Test require_role dependency directly for RBAC enforcement."""

    # Define a temporary route requiring 'doctor' role
    @app.get("/test-doctor-only")
    def doctor_only(user: User = pytest.importorskip("fastapi").Depends(require_role("doctor"))):
        return {"status": "authorized", "user": user.username}

    # Dr Rao (doctor) should succeed
    dr_token = client.post(
        "/auth/login",
        json={"username": "dr.rao", "password": SEED_PASSWORD},
    ).json()["access_token"]

    dr_res = client.get("/test-doctor-only", headers={"Authorization": f"Bearer {dr_token}"})
    assert dr_res.status_code == 200
    assert dr_res.json()["status"] == "authorized"

    # Billing Sunil should be forbidden with 403
    billing_token = client.post(
        "/auth/login",
        json={"username": "billing.sunil", "password": SEED_PASSWORD},
    ).json()["access_token"]

    billing_res = client.get(
        "/test-doctor-only", headers={"Authorization": f"Bearer {billing_token}"}
    )
    assert billing_res.status_code == 403
    assert "Forbidden" in billing_res.json()["detail"]
