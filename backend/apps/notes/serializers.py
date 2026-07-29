from django.utils import timezone
from rest_framework import serializers

from apps.categories.models import Category

from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    """`GET/POST/PATCH /api/notes[/{id}]` response/request shape (design.md
    §3): `{id, title, content, categoryId, categoryName, categoryColor,
    createdAt, lastEdited}`. `categoryName`/`categoryColor` are denormalised
    from the `select_related("category")` queryset so the client needs no
    join (FR-16/FR-20).
    """

    categoryId = serializers.PrimaryKeyRelatedField(
        source="category", queryset=Category.objects.none()
    )
    categoryName = serializers.CharField(source="category.name", read_only=True)
    categoryColor = serializers.CharField(source="category.color", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    lastEdited = serializers.DateTimeField(source="last_edited", read_only=True)

    class Meta:
        model = Note
        fields = [
            "id",
            "title",
            "content",
            "categoryId",
            "categoryName",
            "categoryColor",
            "createdAt",
            "lastEdited",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Scope the `categoryId` choices to the requesting user's own
        # categories — an id belonging to another user must 400, not leak
        # via a cross-user FK assignment (IDOR on write).
        request = self.context.get("request")
        if request is not None:
            self.fields["categoryId"].queryset = Category.objects.filter(
                user=request.user
            )

    def update(self, instance, validated_data):
        # FR-13/FR-25: bump `last_edited` only when title or content
        # actually changed — never on a category-only PATCH (FR-15), which
        # would otherwise silently reorder the dashboard grid (FR-23).
        incoming_title = validated_data.get("title", instance.title)
        incoming_content = validated_data.get("content", instance.content)
        if incoming_title != instance.title or incoming_content != instance.content:
            validated_data["last_edited"] = timezone.now()
        return super().update(instance, validated_data)
