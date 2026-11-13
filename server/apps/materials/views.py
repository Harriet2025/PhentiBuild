"""/api/materials/ — port of backend/api/materials/index.php + models/Material.php."""
from __future__ import annotations

import re

from django.db import IntegrityError, transaction
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOrReadOnly
from apps.core.responses import ApiError, created, not_found, success, validation_failed
from apps.core.utils import flag, json_input
from apps.core.validator import Validator
from apps.history.service import keys_list, record

from .models import CATEGORIES, Material

COLUMN_MAP = {
    'name': 'name', 'category': 'category', 'unit': 'unit', 'dimensions': 'dimensions',
    'overallDimensions': 'overall_dimensions', 'effectiveCoverage': 'effective_coverage',
    'standardLength': 'standard_length', 'spacing': 'spacing', 'description': 'description',
}
_MAT_ID = re.compile(r'^MAT-[0-9]+$')


def next_material_id() -> str:
    """Highest MAT-#### + 1, starting at MAT-1001 (Material::nextId)."""
    numbers = [int(i[4:]) for i in Material.objects.values_list('id', flat=True) if _MAT_ID.match(i)]
    return f'MAT-{max(numbers) + 1 if numbers else 1001}'


def _get(pk: str) -> Material:
    material = Material.objects.filter(pk=pk).first()
    if material is None:
        raise not_found(f'Material {pk} was not found.')
    return material


def _rules(v: Validator, creating: bool) -> None:
    if creating:
        v.required('name', 'Material name').min_length('name', 2, 'Material name').max_length('name', 255, 'Material name')
        v.required('category', 'Category').in_('category', CATEGORIES, 'Category')
        v.required('unit', 'Unit').max_length('unit', 100, 'Unit')
    else:
        v.optional('name').min_length('name', 2, 'Material name').max_length('name', 255, 'Material name')
        v.optional('category').in_('category', CATEGORIES, 'Category')
        v.optional('unit').max_length('unit', 100, 'Unit')
    v.optional('dimensions').max_length('dimensions', 255, 'Dimensions')
    v.optional('overallDimensions').max_length('overallDimensions', 255, 'Overall dimensions')
    v.optional('effectiveCoverage').max_length('effectiveCoverage', 255, 'Effective coverage')
    v.optional('standardLength').max_length('standardLength', 255, 'Standard length')
    v.optional('spacing').max_length('spacing', 255, 'Spacing')
    v.optional('description').max_length('description', 1000, 'Description')


class MaterialListView(APIView):
    # Everyone can read the shared library; only Admins may change it.
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request):
        qs = Material.objects.all()
        if not flag(request, 'includeInactive'):
            qs = qs.filter(is_active=True)
        category = request.query_params.get('category')
        if category:
            if category not in CATEGORIES:
                raise ApiError('Invalid category filter.', 400)
            qs = qs.filter(category=category)
        # ORDER BY category on the ENUM column sorts by declaration order,
        # exactly like the PHP query.
        rows = [m.to_dict() for m in qs.order_by('category', 'name')]
        return success(rows, count=len(rows))

    def post(self, request):
        data = json_input(request)
        v = Validator(data)
        _rules(v, creating=True)
        if v.fails():
            raise validation_failed(v.errors())
        clean = v.validated()

        fields = {COLUMN_MAP[k]: val for k, val in clean.items() if k in COLUMN_MAP}
        fields.setdefault('description', '')
        for attempt in range(3):  # another request may grab the same next id
            material_id = next_material_id()
            try:
                with transaction.atomic():
                    Material.objects.create(id=material_id, is_active=True, **fields)
                break
            except IntegrityError:
                if attempt == 2:
                    raise
        record(request, 'material', material_id, 'created', f'Material {material_id} ("{clean["name"]}") was created.')
        return created(_get(material_id).to_dict())


class MaterialDetailView(APIView):
    # Everyone can read the shared library; only Admins may change it.
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request, pk: str):
        return success(_get(pk).to_dict())

    def put(self, request, pk: str):
        data = json_input(request)
        v = Validator(data)
        _rules(v, creating=False)
        if v.fails():
            raise validation_failed(v.errors())
        clean = v.validated()
        if not clean:
            raise ApiError('At least one field must be provided to update.', 400)
        _get(pk)
        Material.objects.filter(pk=pk).update(**{COLUMN_MAP[k]: val for k, val in clean.items() if k in COLUMN_MAP})
        record(request, 'material', pk, 'updated', f'Material {pk} was updated ({keys_list(clean)}).', clean)
        return success(_get(pk).to_dict())

    patch = put

    def delete(self, request, pk: str):
        """Soft delete: deactivates (or ?reactivate=1 brings it back)."""
        _get(pk)
        if flag(request, 'reactivate'):
            Material.objects.filter(pk=pk).update(is_active=True)
            record(request, 'material', pk, 'reactivated', f'Material {pk} was reactivated.')
        else:
            Material.objects.filter(pk=pk).update(is_active=False)
            record(request, 'material', pk, 'deactivated', f'Material {pk} was deactivated.')
        return success(_get(pk).to_dict())
