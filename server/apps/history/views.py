"""GET /api/history/ and /api/history/<id>/ — port of api/history/index.php."""
from __future__ import annotations

from datetime import datetime

from django.db.models import Q
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.core.responses import ApiError, not_found, success
from apps.core.utils import fmt_datetime
from apps.projects.models import Project

from .models import ENTITY_TYPES, History, valid_modules


def _serialize(rows: list[History]) -> list[dict]:
    """Rows + user_name / project_ref / project_name (the PHP LEFT JOINs)."""
    user_ids = {r.user_id for r in rows if r.user_id}
    project_ids = {r.project_id for r in rows if r.project_id}
    users = dict(User.objects.filter(id__in=user_ids).values_list('id', 'name')) if user_ids else {}
    projects = {p.id: p for p in Project.objects.filter(id__in=project_ids)} if project_ids else {}
    out = []
    for r in rows:
        project = projects.get(r.project_id)
        out.append({
            'id': r.id,
            'entity_type': r.entity_type,
            'entity_id': r.entity_id,
            'user_id': r.user_id,
            'project_id': r.project_id,
            'module': r.module,
            'action': r.action,
            'summary': r.summary,
            'created_at': fmt_datetime(r.created_at),
            'details': r.details,
            'user_name': users.get(r.user_id),
            'project_ref': project.ref if project else None,
            'project_name': project.name if project else None,
        })
    return out


class HistoryListView(APIView):
    def get(self, request):
        # Members see only what THEY did; Admins see everyone's activity.
        qs = History.objects.all() if request.user.is_admin else History.objects.filter(user_id=request.user.id)
        params = request.query_params

        entity_type = params.get('entityType')
        if entity_type:
            if entity_type not in ENTITY_TYPES:
                raise ApiError('Invalid entityType filter.', 400)
            qs = qs.filter(entity_type=entity_type)

        if params.get('entityId'):
            qs = qs.filter(entity_id=params['entityId'])

        module = params.get('module')
        if module:
            if module not in valid_modules():
                raise ApiError('Invalid module filter.', 400)
            qs = qs.filter(module=module)

        project_id = params.get('projectId')
        if project_id:
            if not project_id.isdigit():
                raise ApiError('Invalid projectId filter.', 400)
            qs = qs.filter(project_id=int(project_id))

        user_id = params.get('userId')
        if user_id:
            if not user_id.isdigit():
                raise ApiError('Invalid userId filter.', 400)
            qs = qs.filter(user_id=int(user_id))

        day = params.get('date')
        if day:
            try:
                parsed = datetime.strptime(day, '%Y-%m-%d')
                if parsed.strftime('%Y-%m-%d') != day:
                    raise ValueError
            except ValueError:
                raise ApiError('Invalid date filter — expected YYYY-MM-DD.', 400)
            qs = qs.filter(created_at__date=parsed.date())

        q = (params.get('q') or '').strip()
        if q:
            match_users = User.objects.filter(name__icontains=q).values_list('id', flat=True)
            match_projects = Project.objects.filter(Q(name__icontains=q) | Q(ref__icontains=q)).values_list('id', flat=True)
            qs = qs.filter(
                Q(summary__icontains=q) | Q(entity_id__icontains=q)
                | Q(user_id__in=list(match_users)) | Q(project_id__in=list(match_projects))
            )

        limit_raw = params.get('limit', '')
        limit = int(limit_raw) if limit_raw.isdigit() else 100
        limit = max(1, min(500, limit))

        rows = list(qs.order_by('-created_at', '-id')[:limit])
        people = User.objects.all() if request.user.is_admin else User.objects.filter(pk=request.user.id)
        filter_users = [{'id': uid, 'name': name} for uid, name in people.order_by('name').values_list('id', 'name')]
        return success(_serialize(rows), count=len(rows), users=filter_users, modules=valid_modules())


class HistoryDetailView(APIView):
    def get(self, request, pk: int):
        row = History.objects.filter(pk=pk).first()
        if row is None or not (request.user.is_admin or row.user_id == request.user.id):
            raise not_found(f'History entry {pk} was not found.')
        return success(_serialize([row])[0])
