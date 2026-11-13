"""/api/projects/ — port of backend/api/projects/index.php + models/Project.php."""
from __future__ import annotations

from django.db import transaction
from rest_framework.views import APIView

from apps.core.ownership import get_visible, visible, with_owner_names
from apps.core.responses import ApiError, created, success, validation_failed
from apps.core.utils import json_input
from apps.core.validator import Validator
from apps.history.service import keys_list, record

from .models import STATUSES, TYPES, Project, project_ref

COLUMN_MAP = {
    'name': 'name', 'client': 'client', 'contact': 'contact', 'location': 'location',
    'type': 'type', 'description': 'description', 'startDate': 'start_date',
    'endDate': 'end_date', 'progress': 'progress', 'status': 'status',
}


def _get(request, pk: int) -> Project:
    return get_visible(Project.objects, request.user, f'Project {pk} was not found.', pk=pk)


class ProjectListView(APIView):
    def get(self, request):
        qs = visible(Project.objects.all(), request.user)
        status = request.query_params.get('status')
        if status:
            if status not in STATUSES:
                raise ApiError('Invalid status filter.', 400)
            qs = qs.filter(status=status)
        ptype = request.query_params.get('type')
        if ptype:
            if ptype not in TYPES:
                raise ApiError('Invalid type filter.', 400)
            qs = qs.filter(type=ptype)
        rows = with_owner_names([p.to_dict() for p in qs.order_by('-updated_at')])
        return success(rows, count=len(rows))

    def post(self, request):
        data = json_input(request)
        v = Validator(data)
        v.required('name', 'Project name').min_length('name', 3, 'Project name').max_length('name', 255, 'Project name')
        v.required('client', 'Client name').min_length('client', 2, 'Client name').max_length('client', 255, 'Client name')
        v.required('contact', 'Client contact').phone_or_email('contact', 'Client contact').max_length('contact', 255, 'Client contact')
        v.required('location', 'Project location').max_length('location', 255, 'Project location')
        v.required('type', 'Project type').in_('type', TYPES, 'Project type')
        v.required('startDate', 'Start date').date('startDate', 'Start date')
        v.required('endDate', 'Expected completion date').date('endDate', 'Expected completion date') \
            .date_not_before('endDate', 'startDate', 'Expected completion date')
        v.optional('description').string('description', 'Description').max_length('description', 1000)
        if v.fails():
            raise validation_failed(v.errors())
        clean = v.validated()

        with transaction.atomic():
            project = Project.objects.create(
                ref=None,
                name=clean['name'], client=clean['client'], contact=clean.get('contact'),
                location=clean['location'], type=clean['type'],
                description=clean.get('description', ''),
                start_date=clean['startDate'], end_date=clean['endDate'],
                progress=0, status='Planning', owner_id=request.user.id,
            )
            ref = project_ref(project.id)
            Project.objects.filter(pk=project.id).update(ref=ref)
        record(request, 'project', project.id, 'created', f'Project {ref} ("{clean["name"]}") was created.', project_id=project.id)
        return created(_get(request, project.id).to_dict())


class ProjectDetailView(APIView):
    def get(self, request, pk: int):
        return success(_get(request, pk).to_dict())

    def put(self, request, pk: int):
        data = json_input(request)
        v = Validator(data)
        v.optional('name').string('name', 'Project name').min_length('name', 3, 'Project name').max_length('name', 255, 'Project name')
        v.optional('client').string('client', 'Client name').min_length('client', 2, 'Client name').max_length('client', 255, 'Client name')
        v.optional('contact').phone_or_email('contact', 'Client contact').max_length('contact', 255, 'Client contact')
        v.optional('location').string('location', 'Project location').max_length('location', 255, 'Project location')
        v.optional('type').in_('type', TYPES, 'Project type')
        v.optional('description').string('description', 'Description').max_length('description', 1000)
        v.optional('startDate').date('startDate', 'Start date')
        v.optional('endDate').date('endDate', 'Expected completion date')
        if 'startDate' in data and 'endDate' in data:
            v.date_not_before('endDate', 'startDate', 'Expected completion date')
        v.optional('progress').integer_between('progress', 0, 100, 'Progress')
        v.optional('status').in_('status', STATUSES, 'Status')
        if v.fails():
            raise validation_failed(v.errors())
        clean = v.validated()
        if not clean:
            raise ApiError('At least one field must be provided to update.', 400)

        _get(request, pk)
        changes = {COLUMN_MAP[k]: (int(float(val)) if k == 'progress' else val) for k, val in clean.items() if k in COLUMN_MAP}
        Project.objects.filter(pk=pk).update(**changes)
        record(request, 'project', pk, 'updated', f'Project #{pk} was updated ({keys_list(clean)}).', clean, project_id=pk)
        return success(_get(request, pk).to_dict())

    patch = put

    def delete(self, request, pk: int):
        project = _get(request, pk)
        deleted, _ = Project.objects.filter(pk=pk).delete()
        if deleted:
            record(request, 'project', pk, 'deleted', f'Project {project.ref} ("{project.name}") was deleted.')
        return success({'id': pk, 'deleted': True})
