"""Integration tests for GET /api/categories (task 2.9): single-query
aggregation (NFR-05) and per-user isolation."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.categories.services import seed_default_categories

User = get_user_model()

pytestmark = pytest.mark.django_db


def _seeded_user(email: str):
    user = User.objects.create_user(
        username=email, email=email, password="whatever-123"
    )
    seed_default_categories(user)
    return user


class TestCategoryList:
    def test_returns_seeded_categories_ordered_with_counts(self):
        client = APIClient()
        client.force_authenticate(user=_seeded_user("list@example.com"))

        response = client.get("/api/categories")

        assert response.status_code == 200
        body = response.json()
        assert [c["name"] for c in body] == ["Random Thoughts", "School", "Personal"]
        assert [c["color"] for c in body] == ["#ef9c66", "#fcdc94", "#78aba8"]
        assert all(c["noteCount"] == 0 for c in body)
        assert all(set(c.keys()) == {"id", "name", "color", "noteCount"} for c in body)

    def test_counts_computed_in_exactly_one_query(self, django_assert_num_queries):
        client = APIClient()
        client.force_authenticate(user=_seeded_user("queries@example.com"))

        with django_assert_num_queries(1):
            response = client.get("/api/categories")

        assert response.status_code == 200

    def test_categories_do_not_leak_between_users(self):
        client = APIClient()
        client.force_authenticate(user=_seeded_user("userA@example.com"))
        _seeded_user("userB@example.com")

        response = client.get("/api/categories")

        assert response.status_code == 200
        assert len(response.json()) == 3

    def test_requires_authentication(self):
        client = APIClient()

        response = client.get("/api/categories")

        assert response.status_code == 403
