"""FR-07 backfill (task 2.5): idempotently seed the 3 default categories for
every existing user, e.g. a superuser created before the signup-time
seeding flow existed. Safe to run repeatedly."""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.categories.services import seed_default_categories

User = get_user_model()


class Command(BaseCommand):
    help = "Idempotently seed the 3 default categories for every existing user."

    def handle(self, *args, **options):
        count = 0
        for user in User.objects.all():
            seed_default_categories(user)
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Seeded categories for {count} user(s)."))
