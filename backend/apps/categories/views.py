from django.db.models import Count
from rest_framework import generics

from .models import Category
from .serializers import CategorySerializer


class CategoryListView(generics.ListAPIView):
    """GET /api/categories — the requesting user's 3 seeded categories,
    ordered by `order`, with a server-computed `noteCount` (NFR-05).

    Scoped to `request.user` so categories never leak between users.
    `note_count` is a real `Count("notes")` aggregation over
    `apps.notes.models.Note.category` (`related_name="notes"`), still in
    exactly one query (NFR-05, asserted by
    `test_counts_computed_in_exactly_one_query`).
    """

    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user).annotate(
            note_count=Count("notes")
        )
