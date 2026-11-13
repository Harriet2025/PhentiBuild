"""
History::record() — writes one audit entry.

Exactly like the PHP version it never lets a logging failure break the
operation being logged: errors are written to the server log and
swallowed. Each write runs in its own savepoint so a failure can't poison
an outer transaction either.
"""
from __future__ import annotations

import logging
from typing import Any

from django.db import transaction

from .models import ACTIONS, MODULE_LABELS, History

logger = logging.getLogger('phentibuild.history')


def record(request, entity_type: str, entity_id: Any, action: str, summary: str,
           details: dict | None = None, project_id: int | None = None) -> None:
    if action not in ACTIONS:
        return
    user = getattr(request, 'user', None)
    user_id = user.id if user is not None and user.is_authenticated else None
    try:
        with transaction.atomic():
            History.objects.create(
                entity_type=entity_type,
                entity_id=str(entity_id),
                user_id=user_id,
                project_id=project_id,
                module=MODULE_LABELS.get(entity_type),
                action=action,
                summary=summary[:500],
                details=details,
            )
    except Exception:  # noqa: BLE001 — must never break the caller
        logger.exception('Failed to record history entry (%s %s %s)', entity_type, entity_id, action)


def keys_list(data: dict) -> str:
    """PHP: implode(', ', array_keys($data))"""
    return ', '.join(data.keys())
