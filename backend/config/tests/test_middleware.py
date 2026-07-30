"""Tests for LoopbackCsrfOriginMiddleware: an editor-forwarded localhost port
must be able to perform unsafe requests in DEBUG, while a non-loopback origin
and a DEBUG=False deployment keep the stock origin check."""
import pytest
from django.contrib.auth import get_user_model
from django.test import RequestFactory, override_settings
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.categories.services import seed_default_categories
from config.middleware import LoopbackCsrfOriginMiddleware

User = get_user_model()

FORWARDED_ORIGIN = "http://localhost:59478"


def _origin_after_middleware(origin: str, **request_kwargs) -> str | None:
    """Run one request through the middleware and report the resulting Origin."""
    request = RequestFactory().post("/api/notes", HTTP_ORIGIN=origin, **request_kwargs)
    LoopbackCsrfOriginMiddleware(lambda req: None)(request)
    return request.META.get("HTTP_ORIGIN")


class TestOriginRewriting:
    @override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver"])
    @pytest.mark.parametrize(
        "origin",
        [
            FORWARDED_ORIGIN,
            "http://localhost:3000",
            "http://127.0.0.1:8123",
            "http://[::1]:4200",
        ],
    )
    def test_loopback_origin_on_any_port_is_normalized(self, origin):
        assert _origin_after_middleware(origin) == "http://testserver"

    @override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver"])
    @pytest.mark.parametrize(
        "origin",
        ["http://evil.example.com", "http://localhost.evil.com:59478", "https://10.0.0.5"],
    )
    def test_non_loopback_origin_is_left_untouched(self, origin):
        assert _origin_after_middleware(origin) == origin

    @override_settings(DEBUG=False, ALLOWED_HOSTS=["testserver"])
    def test_inert_when_debug_is_off(self):
        assert _origin_after_middleware(FORWARDED_ORIGIN) == FORWARDED_ORIGIN

    @override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver"])
    def test_missing_origin_header_is_not_invented(self):
        request = RequestFactory().post("/api/notes")
        LoopbackCsrfOriginMiddleware(lambda req: None)(request)
        assert "HTTP_ORIGIN" not in request.META

    @override_settings(DEBUG=True, ALLOWED_HOSTS=["only-this-host"])
    def test_disallowed_host_leaves_origin_unchanged(self):
        # request.get_host() raises DisallowedHost; the request must still be
        # rejected on its own merits rather than 500 inside the middleware.
        assert _origin_after_middleware(FORWARDED_ORIGIN) == FORWARDED_ORIGIN


@pytest.mark.django_db
class TestForwardedPortCanWrite:
    """End-to-end: the exact failure reported from a VS Code forwarded port."""

    def _csrf_client_and_category(self):
        # A real session login is required: force_authenticate() skips
        # SessionAuthentication, and with it enforce_csrf(), so the origin
        # check under test would never run at all.
        user = User.objects.create_user(
            username="fwd@example.com", email="fwd@example.com", password="whatever-123"
        )
        seed_default_categories(user)
        category = Category.objects.filter(user=user).first()

        client = APIClient(enforce_csrf_checks=True)
        # GET /api/auth/me is @ensure_csrf_cookie, so it seeds the token.
        client.get("/api/auth/me")
        client.post(
            "/api/auth/login",
            {"email": "fwd@example.com", "password": "whatever-123"},
            format="json",
            HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
        )
        # Django rotates the CSRF token on login, so re-read it after.
        return client, client.cookies["csrftoken"].value, category

    @override_settings(DEBUG=True)
    def test_forwarded_localhost_port_can_create_a_note(self):
        client, token, category = self._csrf_client_and_category()

        response = client.post(
            "/api/notes",
            {"title": "t", "content": "c", "categoryId": category.id},
            format="json",
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN=FORWARDED_ORIGIN,
        )

        assert response.status_code == 201
        assert response.data["lastEdited"] is not None

    @override_settings(DEBUG=True)
    def test_cross_site_origin_is_still_rejected(self):
        client, token, category = self._csrf_client_and_category()

        response = client.post(
            "/api/notes",
            {"title": "t", "content": "c", "categoryId": category.id},
            format="json",
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN="http://evil.example.com",
        )

        assert response.status_code == 403
        assert "Origin checking failed" in response.data["detail"]
