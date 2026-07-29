from django.conf import settings
from django.db import models


class Category(models.Model):
    """FR-07: exactly 3 fixed categories seeded per user at signup.

    NFR-06 fixes the color palette; `order` drives the sidebar's fixed
    display order (FR-18). No user-facing CRUD — see decisions.md.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField(max_length=64)
    color = models.CharField(max_length=7)  # "#ef9c66" (NFR-06)
    order = models.PositiveSmallIntegerField()  # fixed sidebar order (FR-18)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "name"], name="uniq_user_category"),
        ]
        ordering = ["order"]

    def __str__(self) -> str:
        return f"{self.name} (user={self.user_id})"
