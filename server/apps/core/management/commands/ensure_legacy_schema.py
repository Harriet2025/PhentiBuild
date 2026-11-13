"""
python manage.py ensure_legacy_schema

Creates any PhentiBuild table that does not exist yet, using the exact
structure in db/legacy_schema.sql. Tables that already exist are NEVER
touched (no ALTER, no DROP, no data change) — so this is safe to run on
every start-up, and on a brand-new server it gives an empty but correct
database. Real data is imported separately from a backup (docs/DEPLOYMENT.md).

Afterwards it applies the small additive upgrades in
apps/core/schema_upgrades.py (e.g. the users.profession column). Those
only ever ADD a column if it is missing — so running this again after
importing an old backup brings that backup up to date too.
"""
from __future__ import annotations

import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection

from apps.core.schema_upgrades import apply_all

SCHEMA_FILE = Path(settings.BASE_DIR) / 'db' / 'legacy_schema.sql'
_CREATE = re.compile(r'CREATE TABLE `(?P<name>[A-Za-z0-9_]+)`.*?;\s*$', re.S | re.M)


class Command(BaseCommand):
    help = 'Create missing PhentiBuild tables from db/legacy_schema.sql (never alters existing ones).'

    def handle(self, *args, **options):
        sql = SCHEMA_FILE.read_text(encoding='utf-8')
        existing = set(connection.introspection.table_names())
        created = []
        with connection.cursor() as cursor:
            cursor.execute('SET FOREIGN_KEY_CHECKS = 0')
            try:
                for match in _CREATE.finditer(sql):
                    name = match.group('name')
                    if name in existing:
                        continue
                    cursor.execute(match.group(0).rstrip().rstrip(';'))
                    created.append(name)
            finally:
                cursor.execute('SET FOREIGN_KEY_CHECKS = 1')
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created {len(created)} table(s): {', '.join(created)}"))
        else:
            self.stdout.write('All PhentiBuild tables already exist — nothing changed.')
        for message in apply_all(connection):
            self.stdout.write(self.style.SUCCESS(f'Upgraded: {message}'))
