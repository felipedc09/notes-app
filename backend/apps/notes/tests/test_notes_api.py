"""Integration tests for `/api/notes` (task 3.9): ordering with stable
tiebreak (FR-23/FR-11), `?category=` filter (FR-19), cross-user IDOR on
read (FR-24) and write (FR-11), and the FR-27 discard guard end to end."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.categories.services import seed_default_categories
from apps.notes.models import Note

User = get_user_model()

pytestmark = pytest.mark.django_db


def _seeded_user(email: str):
    user = User.objects.create_user(username=email, email=email, password="whatever-123")
    seed_default_categories(user)
    return user


def _authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class TestNoteOrdering:
    def test_notes_ordered_by_last_edited_descending_with_id_tiebreak(self):
        user = _seeded_user("order@example.com")
        category = user.categories.first()
        client = _authed_client(user)

        # Two notes created back to back can share a `last_edited` value at
        # this resolution — the `-id` tiebreak (Note.Meta.ordering) must
        # still produce a deterministic order: newest id first.
        older = Note.objects.create(user=user, category=category)
        newer = Note.objects.create(user=user, category=category)
        Note.objects.filter(pk=older.pk).update(last_edited=newer.last_edited)

        response = client.get("/api/notes")

        assert response.status_code == 200
        ids = [note["id"] for note in response.json()]
        assert ids == [newer.id, older.id]

    def test_editing_an_older_note_moves_it_to_the_top(self):
        user = _seeded_user("reorder@example.com")
        category = user.categories.first()
        client = _authed_client(user)

        first = Note.objects.create(user=user, category=category, title="first")
        Note.objects.create(user=user, category=category, title="second")

        client.patch(f"/api/notes/{first.id}", {"title": "edited"}, format="json")
        response = client.get("/api/notes")

        assert [note["id"] for note in response.json()][0] == first.id


class TestCategoryFilter:
    def test_filters_notes_by_category(self):
        user = _seeded_user("filter@example.com")
        random_thoughts, school, _personal = user.categories.order_by("order")
        client = _authed_client(user)
        Note.objects.create(user=user, category=random_thoughts, title="a")
        target = Note.objects.create(user=user, category=school, title="b")

        response = client.get(f"/api/notes?category={school.id}")

        assert response.status_code == 200
        body = response.json()
        assert [note["id"] for note in body] == [target.id]
        assert body[0]["categoryName"] == "School"


class TestOwnershipScoping:
    def test_another_users_note_id_returns_404_not_403(self):
        owner = _seeded_user("owner@example.com")
        intruder = _seeded_user("intruder@example.com")
        note = Note.objects.create(user=owner, category=owner.categories.first())
        client = _authed_client(intruder)

        response = client.get(f"/api/notes/{note.id}")

        assert response.status_code == 404

    def test_patching_another_users_note_id_returns_404(self):
        owner = _seeded_user("owner2@example.com")
        intruder = _seeded_user("intruder2@example.com")
        note = Note.objects.create(user=owner, category=owner.categories.first())
        client = _authed_client(intruder)

        response = client.patch(
            f"/api/notes/{note.id}", {"title": "hijacked"}, format="json"
        )

        assert response.status_code == 404
        note.refresh_from_db()
        assert note.title != "hijacked"

    def test_foreign_users_category_id_is_rejected_with_400(self):
        user = _seeded_user("write-owner@example.com")
        other_user = _seeded_user("other-owner@example.com")
        foreign_category = other_user.categories.first()
        client = _authed_client(user)

        response = client.post(
            "/api/notes",
            {"title": "t", "content": "c", "categoryId": foreign_category.id},
            format="json",
        )

        assert response.status_code == 400

    def test_invalid_category_id_on_create_returns_400(self):
        user = _seeded_user("invalid-cat@example.com")
        client = _authed_client(user)

        response = client.post(
            "/api/notes",
            {"title": "t", "content": "c", "categoryId": 999999},
            format="json",
        )

        assert response.status_code == 400


class TestNoteCreateAndRetrieveShape:
    def test_create_returns_denormalised_category_fields(self):
        user = _seeded_user("shape@example.com")
        category = user.categories.first()
        client = _authed_client(user)

        response = client.post(
            "/api/notes",
            {"title": "My note", "content": "Hello", "categoryId": category.id},
            format="json",
        )

        assert response.status_code == 201
        body = response.json()
        assert body["categoryId"] == category.id
        assert body["categoryName"] == category.name
        assert body["categoryColor"] == category.color
        assert set(body.keys()) == {
            "id",
            "title",
            "content",
            "categoryId",
            "categoryName",
            "categoryColor",
            "createdAt",
            "lastEdited",
        }


class TestPatchNotPut:
    def test_put_is_not_allowed(self):
        user = _seeded_user("put@example.com")
        category = user.categories.first()
        note = Note.objects.create(user=user, category=category)
        client = _authed_client(user)

        response = client.put(
            f"/api/notes/{note.id}",
            {"title": "x", "content": "y", "categoryId": category.id},
            format="json",
        )

        assert response.status_code == 405


class TestDiscardGuard:
    def test_delete_blank_note_returns_204(self):
        user = _seeded_user("discard@example.com")
        note = Note.objects.create(
            user=user, category=user.categories.first(), title="", content=""
        )
        client = _authed_client(user)

        response = client.delete(f"/api/notes/{note.id}")

        assert response.status_code == 204
        assert not Note.objects.filter(pk=note.id).exists()

    def test_delete_whitespace_only_note_returns_204(self):
        user = _seeded_user("discard-ws@example.com")
        note = Note.objects.create(
            user=user, category=user.categories.first(), title="   ", content="\n\t"
        )
        client = _authed_client(user)

        response = client.delete(f"/api/notes/{note.id}")

        assert response.status_code == 204

    def test_delete_non_blank_note_returns_409(self):
        user = _seeded_user("no-discard@example.com")
        note = Note.objects.create(
            user=user,
            category=user.categories.first(),
            title="Has content",
            content="",
        )
        client = _authed_client(user)

        response = client.delete(f"/api/notes/{note.id}")

        assert response.status_code == 409
        assert response.json() == {"detail": "Only an empty note can be discarded."}
        assert Note.objects.filter(pk=note.id).exists()

    def test_delete_another_users_note_returns_404_not_409(self):
        owner = _seeded_user("discard-owner@example.com")
        intruder = _seeded_user("discard-intruder@example.com")
        note = Note.objects.create(
            user=owner, category=owner.categories.first(), title="mine"
        )
        client = _authed_client(intruder)

        response = client.delete(f"/api/notes/{note.id}")

        assert response.status_code == 404


class TestListRequiresAuthentication:
    def test_anonymous_list_returns_403(self):
        client = APIClient()

        response = client.get("/api/notes")

        assert response.status_code == 403
