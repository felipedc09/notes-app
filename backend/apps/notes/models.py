from django.conf import settings
from django.db import models
from django.db.models import Index
from django.utils import timezone

from apps.categories.models import Category


class Note(models.Model):
    """FR-09–FR-17, FR-24–FR-27: a single note, Markdown content, owned by
    exactly one user and referencing exactly one category.

    `last_edited` uses `default=timezone.now`, NOT `auto_now`: FR-13/FR-25
    bump the timestamp when *title or content* changes. `auto_now=True`
    would also bump it on a category-only change (FR-15), silently
    reordering the dashboard grid (FR-23). The bump rule itself lives in
    `NoteSerializer.update()`, not here. `on_delete=PROTECT` on `category`
    because categories have no user-facing delete affordance (design.md
    §2) — a protected FK makes an orphaned note structurally impossible.
    No `deleted_at` / soft-delete manager — WL-01 (note deletion) is out
    of scope.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notes",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="notes",
    )
    title = models.CharField(max_length=255, blank=True)  # FR-27 allows empty
    content = models.TextField(blank=True)  # Markdown source (FR-11)
    created_at = models.DateTimeField(auto_now_add=True)
    last_edited = models.DateTimeField(default=timezone.now)  # NOT auto_now — see above

    class Meta:
        ordering = ["-last_edited", "-id"]  # FR-23 + stable tiebreak
        indexes = [
            Index(fields=["user", "-last_edited"]),
            Index(fields=["user", "category", "-last_edited"]),
        ]

    def __str__(self) -> str:
        return f"{self.title or '(untitled)'} (user={self.user_id})"
