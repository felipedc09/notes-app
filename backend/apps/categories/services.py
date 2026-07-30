"""FR-07 seeding: explicit service call, not a signal, not a data migration.

design.md §2 — a data migration runs once against existing rows and never
sees future signups; a signal is action-at-a-distance. The signup view
calls `seed_default_categories` directly inside its own `transaction.atomic()`
block (apps/accounts/views.py), and `manage.py seed_categories` reuses the
same function for backfill.
"""

from .constants import DEFAULT_CATEGORIES
from .models import Category


def seed_default_categories(user) -> None:
    """Idempotently create the 3 fixed categories for `user`.

    Safe to call more than once — `get_or_create` keys on the same
    `(user, name)` pair enforced by `Category`'s unique constraint, so a
    repeat call (e.g. from the backfill command) is a no-op.
    """
    for entry in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(
            user=user,
            name=entry["name"],
            defaults={"color": entry["color"], "order": entry["order"]},
        )
