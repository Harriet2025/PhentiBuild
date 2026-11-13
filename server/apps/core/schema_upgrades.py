"""
Small, ADDITIVE upgrades to the legacy tables.

db/legacy_schema.sql stays an exact copy of the original PHP-era
structure. Anything Django needs on top of it is listed here and applied
by `python manage.py ensure_legacy_schema` (run on every start-up) and by
the test runner.

Rules for every upgrade in this file:
  * only ADD things (a column, an index) — never DROP, RENAME or change a
    column the PHP app relies on, so the PHP app keeps working;
  * safe to run any number of times (check first, then add);
  * existing rows are only ever filled in, never overwritten.
"""
from __future__ import annotations

from collections.abc import Callable


def _has_column(cursor, table: str, column: str) -> bool:
    cursor.execute(
        'SELECT COUNT(*) FROM information_schema.COLUMNS '
        'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s',
        [table, column],
    )
    return cursor.fetchone()[0] > 0


def _users_profession(cursor) -> str | None:
    """
    2026-11-13: split "role" into two fields.

      users.profession  NEW — what the person does (Contractor, Quantity
                        Surveyor, ...). They choose it and can change it.
      users.role        KEPT — now only means access: 'Admin' or not.
                        Admin is granted only on the server
                        (`python manage.py create_admin`).

    Existing people keep their old role as their profession; the old
    generic 'User' becomes 'Other'. Admins start with no profession and
    pick one in Settings. The role column itself is not changed.
    """
    if _has_column(cursor, 'users', 'profession'):
        return None
    cursor.execute('ALTER TABLE `users` ADD COLUMN `profession` VARCHAR(40) NULL DEFAULT NULL AFTER `role`')
    cursor.execute(
        "UPDATE `users` SET `profession` = CASE `role` WHEN 'User' THEN 'Other' ELSE `role` END "
        "WHERE `profession` IS NULL AND `role` <> 'Admin'"
    )
    return 'users.profession added (filled in from each account\'s old role)'


# Tables whose rows belong to one person (see apps/core/ownership.py).
OWNED_TABLES = ['projects', 'boq_items', 'measurements', 'calculations', 'roof_designs', 'reports']


def _owner_columns(cursor) -> str | None:
    """
    2026-11-13: data ownership. Each owned table gets `owner_id` (the users.id
    of the person who created the row) plus an index for fast filtering.

    Existing rows are left with owner_id NULL: the old PHP app never
    recorded who created anything, so nothing is guessed here. Admins see
    NULL-owner rows; hand them to someone with
    `python manage.py assign_unowned --email ...`.
    """
    added = []
    for table in OWNED_TABLES:
        if _has_column(cursor, table, 'owner_id'):
            continue
        cursor.execute(f'ALTER TABLE `{table}` ADD COLUMN `owner_id` INT UNSIGNED NULL DEFAULT NULL, '
                       f'ADD KEY `idx_{table}_owner` (`owner_id`)')
        added.append(table)
    return f"owner_id added to: {', '.join(added)}" if added else None


# Tables whose rows can belong to one project (reports already had project_id).
PROJECT_LINKED_TABLES = ['boq_items', 'measurements', 'calculations']


def _project_links(cursor) -> str | None:
    """
    2026-11-13: BOQ items, measurements and calculations can belong to a
    project. NULL = "not linked to a project" (all existing rows). When a
    project is deleted its rows are unlinked, never deleted — the same
    ON DELETE SET NULL rule the existing reports.project_id already uses.
    """
    added = []
    for table in PROJECT_LINKED_TABLES:
        if _has_column(cursor, table, 'project_id'):
            continue
        cursor.execute(f'ALTER TABLE `{table}` ADD COLUMN `project_id` INT UNSIGNED NULL DEFAULT NULL, '
                       f'ADD KEY `idx_{table}_project` (`project_id`), '
                       f'ADD CONSTRAINT `fk_{table}_project` FOREIGN KEY (`project_id`) '
                       f'REFERENCES `projects` (`id`) ON DELETE SET NULL')
        added.append(table)
    return f"project_id added to: {', '.join(added)}" if added else None


def _roof_design_projects(cursor) -> str | None:
    """
    2026-11-13: one roof design per project. roof_designs.project_id NULL =
    the person's own design (as before); otherwise that project's design.
    UNIQUE so a project can never get two designs. If a project is deleted
    its design is kept (project_id becomes NULL), never deleted.
    """
    if _has_column(cursor, 'roof_designs', 'project_id'):
        return None
    cursor.execute('ALTER TABLE `roof_designs` ADD COLUMN `project_id` INT UNSIGNED NULL DEFAULT NULL, '
                   'ADD UNIQUE KEY `uq_roof_designs_project` (`project_id`), '
                   'ADD CONSTRAINT `fk_roof_designs_project` FOREIGN KEY (`project_id`) '
                   'REFERENCES `projects` (`id`) ON DELETE SET NULL')
    return 'project_id added to: roof_designs'


UPGRADES: list[Callable] = [_users_profession, _owner_columns, _project_links, _roof_design_projects]


def apply_all(connection) -> list[str]:
    """Run every upgrade; returns a description of each one that changed something."""
    if 'users' not in connection.introspection.table_names():
        return []
    done = []
    with connection.cursor() as cursor:
        for upgrade in UPGRADES:
            message = upgrade(cursor)
            if message:
                done.append(message)
    return done
