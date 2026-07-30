from rest_framework import generics, status
from rest_framework.response import Response

from .models import Note
from .serializers import NoteSerializer


class NoteListCreateView(generics.ListCreateAPIView):
    """`GET/POST /api/notes` — FR-09, FR-10, FR-11, FR-19, FR-23.

    Unpaginated (Q3): every one of the user's notes is returned, ordered by
    `Note.Meta.ordering` (`-last_edited`, `-id`). `?category={id}` narrows
    the list to one category (FR-19); an unrecognised value is ignored
    rather than raising, since it is not a validated input field.
    """

    serializer_class = NoteSerializer

    def get_queryset(self):
        queryset = Note.objects.filter(user=self.request.user).select_related(
            "category"
        )
        category_id = self.request.query_params.get("category")
        if category_id is not None and category_id.isdigit():
            queryset = queryset.filter(category_id=category_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """`GET/PATCH/DELETE /api/notes/{id}` — FR-15, FR-24, FR-27.

    Only PATCH (partial update) is exposed — design.md §3 supersedes the
    notes spec's PUT because autosave sends a single changed field and PUT
    semantics would clobber the untouched one. `get_queryset()` is scoped
    to `request.user`, so another user's note id 404s (structural IDOR
    protection, not a 403 that would confirm the id exists).
    """

    serializer_class = NoteSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user).select_related("category")

    def destroy(self, request, *args, **kwargs):
        # FR-27: this is an empty-note discard guard, not general note
        # deletion (WL-01 is out of scope). 204 only if both fields are
        # blank after stripping whitespace.
        instance = self.get_object()
        if instance.title.strip() or instance.content.strip():
            return Response(
                {"detail": "Only an empty note can be discarded."},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)
