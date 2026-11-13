"""
Who may see which rows — enforced on the server for every owned table
(projects, BOQ items, measurements, calculations, roof designs, reports).

  * A Member sees and changes ONLY rows they own (owner_id = their id).
  * An Admin sees and manages everyone's rows, including old rows that
    have no owner yet.
  * A row you may not see answers 404 "not found" — exactly as if it did
    not exist, so other people's record ids are not revealed.

Every list / detail / update / delete goes through `visible()` or
`get_visible()`; every create stamps `owner_id=request.user.id`.
"""
from __future__ import annotations

from django.db.models import QuerySet

from apps.accounts.models import User

from .responses import not_found, validation_failed


def visible(qs: QuerySet, user) -> QuerySet:
    if getattr(user, 'is_admin', False):
        return qs
    return qs.filter(owner_id=user.id)


def get_visible(qs: QuerySet, user, message: str, **lookup):
    obj = visible(qs, user).filter(**lookup).first()
    if obj is None:
        raise not_found(message)
    return obj


def project_id_from(request, data: dict, owner_id: int | None) -> int | None:
    """
    Validates the optional `projectId` in a request body.

    Returns None for "no project" (missing / null / ""). Otherwise the
    project must exist, be visible to the requester, and belong to the same
    person as the record (so an item is never linked to someone else's
    project). Anything else -> 422 {"projectId": "That project does not exist."}.
    """
    from apps.projects.models import Project  # local import: avoids an app import cycle

    value = data.get('projectId')
    if value is None or value == '':
        return None
    if isinstance(value, bool) or not str(value).isdigit():
        raise validation_failed({'projectId': 'That project does not exist.'})
    project = visible(Project.objects, request.user).filter(pk=int(value)).first()
    if project is None:
        raise validation_failed({'projectId': 'That project does not exist.'})
    if project.owner_id != owner_id:
        raise validation_failed({'projectId': 'That project belongs to someone else.'})
    return project.id


def filter_by_project(qs: QuerySet, request) -> QuerySet:
    """`?projectId=N` -> that project's rows; `?projectId=none` -> rows not linked to any project."""
    from .responses import ApiError

    value = request.query_params.get('projectId')
    if not value:
        return qs
    if value == 'none':
        return qs.filter(project_id__isnull=True)
    if not value.isdigit():
        raise ApiError('Invalid projectId filter.', 400)
    return qs.filter(project_id=int(value))


def with_owner_names(rows: list[dict]) -> list[dict]:
    """Adds `ownerName` to each dict (one query), so Admins can tell whose a row is."""
    ids = {r.get('ownerId') for r in rows if r.get('ownerId')}
    names = dict(User.objects.filter(id__in=ids).values_list('id', 'name')) if ids else {}
    for r in rows:
        r['ownerName'] = names.get(r.get('ownerId'))
    return rows
