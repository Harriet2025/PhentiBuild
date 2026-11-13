"""/api/reports/ and /api/export/excel/ — ports of the matching PHP endpoints."""
from __future__ import annotations

import logging
import re
from datetime import datetime

from django.http import HttpResponse
from rest_framework.views import APIView

from apps.boq.models import BoqItem
from apps.core.ownership import get_visible, visible, with_owner_names
from apps.core.responses import ApiError, created, not_found, success, validation_failed
from apps.core.utils import json_input
from apps.core.validator import Validator
from apps.history.service import keys_list, record
from apps.materials.models import Material
from apps.projects.models import Project

from .excel import build_workbook
from .models import Report

logger = logging.getLogger('phentibuild.export')


def _get(request, pk: int) -> Report:
    return get_visible(Report.objects, request.user, f'Report {pk} was not found.', pk=pk)


def _is_digits(value) -> bool:
    return str(value).isdigit()


def _check_project_id(request, data: dict) -> None:
    value = data.get('projectId')
    if value is None or value == '':
        return
    if not _is_digits(value) or not visible(Project.objects, request.user).filter(pk=int(value)).exists():
        raise validation_failed({'projectId': 'That project does not exist.'})


def create_report(request, *, title: str, rtype: str = 'custom', project_id: int | None = None,
                  content=None, notes: str | None = None) -> Report:
    row = Report.objects.create(title=title, type=rtype, project_id=project_id, content=content, notes=notes,
                                owner_id=request.user.id)
    record(request, 'report', row.id, 'created', f'Report "{title}" was exported.', project_id=project_id)
    return row


class ReportListView(APIView):
    def get(self, request):
        qs = visible(Report.objects.all(), request.user)
        project_id = request.query_params.get('projectId')
        if project_id:
            if not project_id.isdigit():
                raise ApiError('Invalid projectId filter.', 400)
            qs = qs.filter(project_id=int(project_id))
        rows = with_owner_names([r.to_dict() for r in qs.order_by('-created_at', '-id')])
        return success(rows, count=len(rows))

    def post(self, request):
        data = json_input(request)
        v = Validator(data)
        v.required('title', 'Title').max_length('title', 255, 'Title')
        v.optional('type').max_length('type', 50, 'Type')
        v.optional('notes').max_length('notes', 2000, 'Notes')
        if v.fails():
            raise validation_failed(v.errors())
        _check_project_id(request, data)
        clean = v.validated()
        project_id = int(data['projectId']) if data.get('projectId') not in (None, '') else None
        row = create_report(request, title=clean['title'], rtype=clean.get('type', 'custom'),
                            project_id=project_id, content=data.get('content'), notes=clean.get('notes'))
        return created(_get(request, row.id).to_dict())


class ReportDetailView(APIView):
    def get(self, request, pk: int):
        return success(_get(request, pk).to_dict())

    def put(self, request, pk: int):
        data = json_input(request)
        v = Validator(data)
        v.optional('title').max_length('title', 255, 'Title')
        v.optional('type').max_length('type', 50, 'Type')
        v.optional('notes').max_length('notes', 2000, 'Notes')
        if v.fails():
            raise validation_failed(v.errors())
        _check_project_id(request, data)
        clean = v.validated()
        changes = dict(clean)
        if 'projectId' in data:
            changes['projectId'] = None if data['projectId'] in (None, '') else int(data['projectId'])
        if 'content' in data:
            changes['content'] = data['content']
        if not changes:
            raise ApiError('At least one field must be provided to update.', 400)

        _get(request, pk)
        column = {'title': 'title', 'type': 'type', 'notes': 'notes', 'projectId': 'project_id', 'content': 'content'}
        Report.objects.filter(pk=pk).update(**{column[k]: v for k, v in changes.items()})
        updated = _get(request, pk)
        record(request, 'report', pk, 'updated', f'Report #{pk} was updated ({keys_list(changes)}).', changes,
               project_id=updated.project_id)
        return success(updated.to_dict())

    patch = put

    def delete(self, request, pk: int):
        existing = _get(request, pk)
        deleted, _ = Report.objects.filter(pk=pk).delete()
        if deleted:
            record(request, 'report', pk, 'deleted', f'Report "{existing.title}" was deleted.', project_id=existing.project_id)
        return success({'id': pk, 'deleted': True})


class ExcelExportView(APIView):
    """GET /api/export/excel/?projectId=N — streams an .xlsx download."""

    def get(self, request):
        project = None
        project_id = request.query_params.get('projectId')
        if project_id:
            if not project_id.isdigit():
                raise ApiError('Invalid projectId.', 400)
            obj = visible(Project.objects, request.user).filter(pk=int(project_id)).first()
            if obj is None:
                raise not_found(f'Project {project_id} was not found.')
            project = obj.to_dict()

        # General export = the whole BOQ the person sees on the BOQ page;
        # a project export = only the BOQ items linked to that project.
        boq_qs = visible(BoqItem.objects, request.user)
        if project:
            boq_qs = boq_qs.filter(project_id=project['id'])
        boq = [i.to_dict() for i in boq_qs.order_by('category', 'item')]
        materials = [m.to_dict() for m in Material.objects.filter(is_active=True).order_by('category', 'name')]
        try:
            payload = build_workbook(project, boq, materials)
        except Exception:  # noqa: BLE001
            logger.exception('Failed to build workbook')
            raise ApiError('Could not generate the Excel workbook.', 500)

        base = re.sub(r'[^A-Za-z0-9\-]+', '-', f"{project['ref']}-{project['name']}") if project else 'General'
        filename = f"PhentiBuild-Export-{base.strip('-')}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.xlsx"
        create_report(
            request,
            title=f"Excel export — {project['name']}" if project else 'Excel export — General',
            rtype='xlsx', project_id=project['id'] if project else None,
            content={'filename': filename, 'boqItemCount': len(boq), 'materialCount': len(materials)},
            notes='Generated by the Excel Export Center.',
        )
        response = HttpResponse(payload, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Cache-Control'] = 'max-age=0, must-revalidate'
        return response
