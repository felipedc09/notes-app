from django.urls import path

from . import views

# design.md §3's contract table fixes both routes with no trailing slash
# on the collection endpoint ("/api/notes") — same convention as
# apps/categories/urls.py. Mounted under prefix "api/notes" (no trailing
# slash) in config/urls.py, so the detail route below carries its own
# leading "/" to produce "/api/notes/<id>" from plain string
# concatenation, instead of "/api/notes<id>". This trades a harmless
# `urls.W002` system-check warning for an exact match against the
# literal API contract with zero redirect hops.
urlpatterns = [
    path("", views.NoteListCreateView.as_view(), name="note-list-create"),
    path("/<int:pk>", views.NoteDetailView.as_view(), name="note-detail"),
]
