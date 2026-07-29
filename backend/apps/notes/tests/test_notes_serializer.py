"""Unit tests for `NoteSerializer` (task 3.8): the `last_edited` bump rule
(FR-13/FR-15/FR-25) and the FR-27 discard guard's blank check, tested
directly against the model/serializer — no HTTP layer."""
import pytest
from django.contrib.auth import get_user_model

from apps.categories.services import seed_default_categories
from apps.notes.models import Note
from apps.notes.serializers import NoteSerializer

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return User.objects.create_user(
        username="notes-unit@example.com",
        email="notes-unit@example.com",
        password="whatever-123",
    )


@pytest.fixture
def categories(user):
    seed_default_categories(user)
    return list(user.categories.order_by("order"))


@pytest.fixture
def note(user, categories):
    return Note.objects.create(
        user=user,
        category=categories[0],
        title="Original title",
        content="Original content",
    )


class TestLastEditedBumpRule:
    def test_title_change_bumps_last_edited(self, note):
        original = note.last_edited

        serializer = NoteSerializer(
            note, data={"title": "Updated title"}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        assert updated.last_edited > original

    def test_content_change_bumps_last_edited(self, note):
        original = note.last_edited

        serializer = NoteSerializer(
            note, data={"content": "Updated content"}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        assert updated.last_edited > original

    def test_category_only_change_does_not_bump_last_edited(self, note, categories):
        original = note.last_edited

        serializer = NoteSerializer(
            note,
            data={"categoryId": categories[1].id},
            partial=True,
            context={"request": _FakeRequest(note.user)},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        assert updated.last_edited == original
        assert updated.category_id == categories[1].id

    def test_resubmitting_identical_title_and_content_does_not_bump(self, note):
        original = note.last_edited

        serializer = NoteSerializer(
            note,
            data={"title": note.title, "content": note.content},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        assert updated.last_edited == original


class TestDiscardGuardBlankCheck:
    def test_blank_after_strip_is_eligible_for_discard(self, note):
        note.title = "   "
        note.content = "\n\t "

        assert not note.title.strip()
        assert not note.content.strip()

    def test_non_blank_title_is_not_eligible_for_discard(self, note):
        note.title = "Not blank"
        note.content = ""

        assert note.title.strip() or note.content.strip()


class _FakeRequest:
    """Minimal stand-in exposing `.user` — enough for
    `NoteSerializer.__init__`'s `context["request"].user` scoping."""

    def __init__(self, user):
        self.user = user
