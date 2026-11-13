"""
Test runner that builds the test database from the REAL legacy schema.

The app's own models are managed=False (Django must never alter the
existing tables), so Django would not create those tables in the test
database. This runner loads db/legacy_schema.sql — the exact CREATE TABLE
statements from the live database (ENUMs, defaults, ON UPDATE, foreign
keys) — after Django has created its own tables. Tests therefore run
against the same structure as production, never against real data.
"""
from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.db import connections
from django.test.runner import DiscoverRunner

from apps.core.schema_upgrades import apply_all

SCHEMA_FILE = Path(settings.BASE_DIR) / 'db' / 'legacy_schema.sql'


def _statements(sql: str) -> list[str]:
    lines = [ln for ln in sql.splitlines() if ln.strip() and not ln.strip().startswith('--')]
    return [stmt.strip() for stmt in '\n'.join(lines).split(';\n') if stmt.strip()]


class LegacySchemaTestRunner(DiscoverRunner):
    def setup_databases(self, **kwargs):
        config = super().setup_databases(**kwargs)
        sql = SCHEMA_FILE.read_text(encoding='utf-8')
        with connections['default'].cursor() as cursor:
            cursor.execute('SET FOREIGN_KEY_CHECKS = 0')
            for stmt in _statements(sql):
                cursor.execute(stmt.rstrip(';'))
            cursor.execute('SET FOREIGN_KEY_CHECKS = 1')
        apply_all(connections['default'])  # same additive upgrades as production
        return config
