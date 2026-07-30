from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    """GET /api/categories response shape (design.md §3): id, name, color,
    noteCount. `noteCount` is populated by the view's `note_count`
    annotation — never computed client-side (NFR-05)."""

    noteCount = serializers.IntegerField(source="note_count", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "color", "noteCount"]
