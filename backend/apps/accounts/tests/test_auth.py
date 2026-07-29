"""
Integration tests for the accounts API (task 1.15).

Covers the auth spec's security constraints (NFR-04, FR-05): session cookie
flags, CSRF enforcement on unsafe methods, and a login failure message that
never discloses which field (email or password) was wrong.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture
def csrf_client():
    return APIClient(enforce_csrf_checks=True)


def _seed_csrf_token(client):
    """GET /api/auth/me is @ensure_csrf_cookie, so it seeds the csrftoken cookie
    even for an anonymous visitor (design.md §4)."""
    client.get("/api/auth/me")
    return client.cookies["csrftoken"].value


class TestSignup:
    def test_signup_sets_httponly_secure_samesite_lax_session_cookie(self, csrf_client):
        token = _seed_csrf_token(csrf_client)

        response = csrf_client.post(
            "/api/auth/signup",
            {"email": "new@example.com", "password": "correct-horse-battery-staple"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        assert response.status_code == 201
        session_cookie = response.cookies["sessionid"]
        assert session_cookie["httponly"] is True
        assert session_cookie["secure"] is True
        assert session_cookie["samesite"] == "Lax"

    def test_signup_response_body(self, csrf_client):
        token = _seed_csrf_token(csrf_client)

        response = csrf_client.post(
            "/api/auth/signup",
            {"email": "body@example.com", "password": "correct-horse-battery-staple"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        assert response.status_code == 201
        body = response.json()
        assert body["email"] == "body@example.com"
        assert "id" in body
        assert "password" not in body

    def test_signup_without_csrf_token_succeeds(self, csrf_client):
        # DRF's SessionAuthentication.enforce_csrf() only runs once a session
        # user is already resolved (see LoginView test below for the
        # authenticated case); an anonymous signup has no prior session to
        # protect, so DRF's documented behavior is CSRF-exempt here.
        _seed_csrf_token(csrf_client)

        response = csrf_client.post(
            "/api/auth/signup",
            {"email": "no-csrf@example.com", "password": "correct-horse-battery-staple"},
            format="json",
        )

        assert response.status_code == 201


class TestLogin:
    def test_login_failure_never_discloses_which_field(self, csrf_client):
        User.objects.create_user(
            username="known@example.com",
            email="known@example.com",
            password="right-password-123",
        )
        token = _seed_csrf_token(csrf_client)

        wrong_password = csrf_client.post(
            "/api/auth/login",
            {"email": "known@example.com", "password": "wrong-password"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        unknown_email = csrf_client.post(
            "/api/auth/login",
            {"email": "nobody@example.com", "password": "whatever-123"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        assert wrong_password.status_code == 400
        assert unknown_email.status_code == 400
        expected = {"detail": "Invalid email or password."}
        assert wrong_password.json() == expected
        assert unknown_email.json() == expected

    def test_login_success_rotates_session_and_returns_user(self, csrf_client):
        User.objects.create_user(
            username="ok@example.com",
            email="ok@example.com",
            password="right-password-123",
        )
        token = _seed_csrf_token(csrf_client)

        response = csrf_client.post(
            "/api/auth/login",
            {"email": "ok@example.com", "password": "right-password-123"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        assert response.status_code == 200
        assert response.json()["email"] == "ok@example.com"
        assert "sessionid" in response.cookies

    def test_login_without_csrf_token_succeeds(self, csrf_client):
        # Same DRF semantics as signup: no prior authenticated session means
        # no CSRF enforcement. The unsafe-method-without-CSRF -> 403 case is
        # exercised below on the authenticated logout endpoint.
        User.objects.create_user(
            username="csrf@example.com",
            email="csrf@example.com",
            password="right-password-123",
        )
        _seed_csrf_token(csrf_client)

        response = csrf_client.post(
            "/api/auth/login",
            {"email": "csrf@example.com", "password": "right-password-123"},
            format="json",
        )

        assert response.status_code == 200


class TestMeAndLogout:
    def test_me_is_forbidden_when_anonymous(self, csrf_client):
        response = csrf_client.get("/api/auth/me")
        assert response.status_code == 403

    def test_me_returns_current_user_when_authenticated(self, csrf_client):
        User.objects.create_user(
            username="me@example.com", email="me@example.com", password="right-password-123"
        )
        token = _seed_csrf_token(csrf_client)
        csrf_client.post(
            "/api/auth/login",
            {"email": "me@example.com", "password": "right-password-123"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        response = csrf_client.get("/api/auth/me")

        assert response.status_code == 200
        assert response.json()["email"] == "me@example.com"

    def test_logout_requires_authentication(self, csrf_client):
        response = csrf_client.post("/api/auth/logout")
        assert response.status_code == 403

    def test_logout_clears_session_when_authenticated(self, csrf_client):
        # R6: Django rotates the CSRF token on login, so the pre-login token
        # must not be reused — re-read it after login, exactly like
        # lib/api-client.ts does on every unsafe request (task 1.13).
        User.objects.create_user(
            username="bye@example.com", email="bye@example.com", password="right-password-123"
        )
        token = _seed_csrf_token(csrf_client)
        csrf_client.post(
            "/api/auth/login",
            {"email": "bye@example.com", "password": "right-password-123"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        rotated_token = _seed_csrf_token(csrf_client)

        response = csrf_client.post("/api/auth/logout", HTTP_X_CSRFTOKEN=rotated_token)

        assert response.status_code == 204

    def test_stale_csrf_token_from_before_login_is_rejected(self, csrf_client):
        # Documents R6 directly: reusing the pre-login token after login fails.
        User.objects.create_user(
            username="stale@example.com", email="stale@example.com", password="right-password-123"
        )
        stale_token = _seed_csrf_token(csrf_client)
        csrf_client.post(
            "/api/auth/login",
            {"email": "stale@example.com", "password": "right-password-123"},
            format="json",
            HTTP_X_CSRFTOKEN=stale_token,
        )

        response = csrf_client.post("/api/auth/logout", HTTP_X_CSRFTOKEN=stale_token)

        assert response.status_code == 403
