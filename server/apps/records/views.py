"""
/api/measurements/ and /api/calculations/ — ports of the matching PHP
endpoints and models (Measurement.php, Calculation.php).
"""
from __future__ import annotations

from rest_framework.views import APIView

from apps.core.ownership import filter_by_project, get_visible, project_id_from, visible, with_owner_names
from apps.core.responses import ApiError, created, success, validation_failed
from apps.core.utils import json_input
from apps.core.validator import Validator
from apps.history.service import record

from .models import CALCULATION_TYPES, SECTION_TYPES, Calculation, Measurement


def _non_empty_collection(value) -> bool:
    """PHP: is_array($v) && !empty($v) — a non-empty JSON object or array."""
    return isinstance(value, (dict, list)) and len(value) > 0


# ------------------------------------------------------------ Measurements
def _get_measurement(request, pk: int) -> Measurement:
    return get_visible(Measurement.objects, request.user, f'Measurement {pk} was not found.', pk=pk)


class MeasurementListView(APIView):
    def get(self, request):
        qs = filter_by_project(visible(Measurement.objects.all(), request.user), request)
        section = request.query_params.get('sectionType')
        if section:
            if section not in SECTION_TYPES:
                raise ApiError('Invalid sectionType filter.', 400)
            qs = qs.filter(section_type=section)
        rows = with_owner_names([m.to_dict() for m in qs.order_by('-created_at', '-id')])
        return success(rows, count=len(rows))

    def post(self, request):
        data = json_input(request)
        v = Validator(data)
        v.required('sectionType', 'Section type').in_('sectionType', SECTION_TYPES, 'Section type')
        v.optional('label').max_length('label', 255, 'Label')
        v.optional('notes').max_length('notes', 1000, 'Notes')
        if v.fails():
            raise validation_failed(v.errors())
        if not _non_empty_collection(data.get('values')):
            raise validation_failed({'values': 'At least one measurement value is required.'})
        clean = v.validated()
        project_id = project_id_from(request, data, owner_id=request.user.id)
        row = Measurement.objects.create(
            section_type=clean['sectionType'], label=clean.get('label'),
            values=data['values'], notes=clean.get('notes'), owner_id=request.user.id, project_id=project_id,
        )
        record(request, 'measurement', row.id, 'created', f'Measurement #{row.id} ({clean["sectionType"]}) was saved.', project_id=project_id)
        return created(_get_measurement(request, row.id).to_dict())


class MeasurementDetailView(APIView):
    def get(self, request, pk: int):
        return success(_get_measurement(request, pk).to_dict())

    def put(self, request, pk: int):
        data = json_input(request)
        v = Validator(data)
        v.optional('label').max_length('label', 255, 'Label')
        v.optional('notes').max_length('notes', 1000, 'Notes')
        if v.fails():
            raise validation_failed(v.errors())
        changes = v.validated()
        if data.get('values') is not None:
            if not _non_empty_collection(data['values']):
                raise validation_failed({'values': 'At least one measurement value is required.'})
            changes['values'] = data['values']
        row = _get_measurement(request, pk)
        if 'projectId' in data:
            changes['project_id'] = project_id_from(request, data, owner_id=row.owner_id)
        if not changes:
            raise ApiError('At least one field must be provided to update.', 400)
        Measurement.objects.filter(pk=pk).update(**changes)
        record(request, 'measurement', pk, 'updated', f'Measurement #{pk} was updated.', changes)
        return success(_get_measurement(request, pk).to_dict())

    patch = put

    def delete(self, request, pk: int):
        _get_measurement(request, pk)
        deleted, _ = Measurement.objects.filter(pk=pk).delete()
        if deleted:
            record(request, 'measurement', pk, 'deleted', f'Measurement #{pk} was deleted.')
        return success({'id': pk, 'deleted': True})


# ------------------------------------------------------------ Calculations
def _get_calculation(request, pk: int) -> Calculation:
    return get_visible(Calculation.objects, request.user, f'Calculation {pk} was not found.', pk=pk)


class CalculationListView(APIView):
    def get(self, request):
        qs = filter_by_project(visible(Calculation.objects.all(), request.user), request)
        ctype = request.query_params.get('calculationType')
        if ctype:
            if ctype not in CALCULATION_TYPES:
                raise ApiError('Invalid calculationType filter.', 400)
            qs = qs.filter(calculation_type=ctype)
        rows = with_owner_names([c.to_dict() for c in qs.order_by('-created_at', '-id')])
        return success(rows, count=len(rows))

    def post(self, request):
        data = json_input(request)
        v = Validator(data)
        v.required('calculationType', 'Calculation type').in_('calculationType', CALCULATION_TYPES, 'Calculation type')
        v.optional('label').max_length('label', 255, 'Label')
        v.optional('notes').max_length('notes', 1000, 'Notes')
        if v.fails():
            raise validation_failed(v.errors())
        if not _non_empty_collection(data.get('input')):
            raise validation_failed({'input': 'The calculation input is required.'})
        if not _non_empty_collection(data.get('result')):
            raise validation_failed({'result': 'The calculation result is required.'})
        clean = v.validated()
        project_id = project_id_from(request, data, owner_id=request.user.id)
        row = Calculation.objects.create(
            calculation_type=clean['calculationType'], label=clean.get('label'),
            input=data['input'], result=data['result'], notes=clean.get('notes'), owner_id=request.user.id,
            project_id=project_id,
        )
        record(request, 'calculation', row.id, 'created', f'Calculation #{row.id} ({clean["calculationType"]}) was saved.', project_id=project_id)
        return created(_get_calculation(request, row.id).to_dict())


class CalculationDetailView(APIView):
    def get(self, request, pk: int):
        return success(_get_calculation(request, pk).to_dict())

    def put(self, request, pk: int):
        data = json_input(request)
        v = Validator(data)
        v.optional('label').max_length('label', 255, 'Label')
        v.optional('notes').max_length('notes', 1000, 'Notes')
        if v.fails():
            raise validation_failed(v.errors())
        clean = v.validated()
        row = _get_calculation(request, pk)
        if 'projectId' in data:
            clean['project_id'] = project_id_from(request, data, owner_id=row.owner_id)
        if not clean:
            raise ApiError('At least one field (label or notes) must be provided to update.', 400)
        Calculation.objects.filter(pk=pk).update(**clean)
        record(request, 'calculation', pk, 'updated', f'Calculation #{pk} was updated.', clean)
        return success(_get_calculation(request, pk).to_dict())

    patch = put

    def delete(self, request, pk: int):
        _get_calculation(request, pk)
        deleted, _ = Calculation.objects.filter(pk=pk).delete()
        if deleted:
            record(request, 'calculation', pk, 'deleted', f'Calculation #{pk} was deleted.')
        return success({'id': pk, 'deleted': True})
