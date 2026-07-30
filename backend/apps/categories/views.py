from django.db.models import IntegerField, Value
from rest_framework import generics

from .models import Category
from .serializers import CategorySerializer


class CategoryListView(generics.ListAPIView):
    """GET /api/categories — the requesting user's 3 seeded categories,
    ordered by `order`, with a server-computed `noteCount` (NFR-05).

    Scoped to `request.user` so categories never leak between users.

    TODO(slice-3): `apps.notes.models.Note` doesn't exist yet. Once it
    lands with `category = ForeignKey(Category, related_name="notes")`,
    swap the static `Value(0)` annotation below for
    `Count("notes")` so `noteCount` reflects real notes — still in the
    same single query, per NFR-05. Until Notes exist, 0 is the correct
    value for every category, not a placeholder faking the aggregation.
    """

    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user).annotate(
            note_count=Value(0, output_field=IntegerField())
        )
