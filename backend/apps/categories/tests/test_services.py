"""Unit tests for FR-07 category seeding (task 2.8)."""
import pytest
from django.contrib.auth import get_user_model

from apps.categories.constants import DEFAULT_CATEGORIES
from apps.categories.models import Category
from apps.categories.services import seed_default_categories

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return User.objects.create_user(
        username="seed@example.com", email="seed@example.com", password="whatever-123"
    )


def test_seed_default_categories_creates_exactly_three(user):
    seed_default_categories(user)

    assert Category.objects.filter(user=user).count() == 3


def test_seed_default_categories_uses_nfr06_colors_and_order(user):
    seed_default_categories(user)

    actual = {
        (c.name, c.color, c.order) for c in Category.objects.filter(user=user)
    }
    expected = {(c["name"], c["color"], c["order"]) for c in DEFAULT_CATEGORIES}
    assert actual == expected


def test_seed_default_categories_is_idempotent(user):
    seed_default_categories(user)
    seed_default_categories(user)

    assert Category.objects.filter(user=user).count() == 3
