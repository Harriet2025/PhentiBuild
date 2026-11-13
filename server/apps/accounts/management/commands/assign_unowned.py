"""
python manage.py assign_unowned --email someone@example.com [--dry-run]

Gives every record that has NO owner yet (owner_id IS NULL) to one person.
Those are the records created before ownership existed — the old PHP app
never stored who made them. Records that already have an owner are never
touched, so running it twice is harmless.

Use --dry-run first to see the counts without changing anything.
Server access only: there is no web page for this.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import User
from apps.boq.models import BoqItem
from apps.history.models import History
from apps.projects.models import Project
from apps.records.models import Calculation, Measurement
from apps.reports.models import Report
from apps.roofing.models import RoofDesign

OWNED = [
    ('projects', Project), ('BOQ items', BoqItem), ('measurements', Measurement),
    ('calculations', Calculation), ('roof designs', RoofDesign), ('reports', Report),
]


class Command(BaseCommand):
    help = 'Give every record without an owner to one user (server access only).'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True)
        parser.add_argument('--dry-run', action='store_true', help='Only show what would change.')

    def handle(self, *args, email, dry_run, **options):
        user = User.objects.filter(email__iexact=email.strip()).first()
        if user is None:
            raise CommandError(f'No account with email {email!r}. Nothing was changed.')

        with transaction.atomic():
            counts = {}
            for label, model in OWNED:
                qs = model.objects.filter(owner_id__isnull=True)
                counts[label] = qs.count() if dry_run else qs.update(owner_id=user.id)
            total = sum(counts.values())
            if total and not dry_run:
                History.objects.create(
                    entity_type='account', entity_id=str(user.pk), user_id=None, module='Settings', action='updated',
                    summary=f'{total} record(s) without an owner were given to {user.name} on the server (assign_unowned).',
                    details=counts,
                )

        summary = ', '.join(f'{n} {label}' for label, n in counts.items() if n) or 'nothing'
        if dry_run:
            self.stdout.write(f'DRY RUN — would give {user.name}: {summary}. Nothing was changed.')
        else:
            self.stdout.write(self.style.SUCCESS(f'Gave {user.name}: {summary}.'))
