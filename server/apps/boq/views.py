"""/api/boq/ — port of backend/api/boq/index.php + models/BoqItem.php."""
from __future__ import annotations

from django.db import transaction
from rest_framework.views import APIView

from apps.core.ownership import filter_by_project, get_visible, project_id_from, visible, with_owner_names
from apps.core.responses import ApiError, created, success, validation_failed
from apps.core.utils import json_input, to_decimal
from apps.core.validator import Validator
from apps.history.service import keys_list, record

from .models import CATEGORIES, BoqItem, boq_ref

COLUMN_MAP = {
    'item': 'item', 'category': 'category', 'description': 'description',
    'specification': 'specification', 'unit': 'unit', 'quantity': 'quantity',
    'wastePercent': 'waste_percent', 'unitPrice': 'unit_price', 'notes': 'notes',
}
# DECIMAL column scale + the largest value each column can hold.
DECIMALS = {'quantity': (3, 99_999_999_999.999), 'waste_percent': (2, 9_999.99), 'unit_price': (2, 999_999_999_999.99)}


def _get(request, ref: str) -> BoqItem:
    return get_visible(BoqItem.objects, request.user, f'BOQ item {ref} was not found.', ref=ref)


def _columns(clean: dict) -> dict:
    cols = {}
    for key, val in clean.items():
        if key not in COLUMN_MAP:
            continue
        col = COLUMN_MAP[key]
        cols[col] = to_decimal(val, DECIMALS[col][0]) if col in DECIMALS else val
    return cols


def _rules(v: Validator, creating: bool) -> None:
    if creating:
        v.required('item', 'Item').max_length('item', 255, 'Item')
        v.required('category', 'Category').in_('category', CATEGORIES, 'Category')
        v.required('unit', 'Unit').max_length('unit', 100, 'Unit')
        v.required('quantity', 'Quantity').numeric('quantity', 'Quantity', 0, DECIMALS['quantity'][1])
    else:
        v.optional('item').max_length('item', 255, 'Item')
        v.optional('category').in_('category', CATEGORIES, 'Category')
        v.optional('unit').max_length('unit', 100, 'Unit')
        v.optional('quantity').numeric('quantity', 'Quantity', 0, DECIMALS['quantity'][1])
    v.optional('wastePercent').numeric('wastePercent', 'Waste %', 0, DECIMALS['waste_percent'][1])
    v.optional('unitPrice').numeric('unitPrice', 'Unit price', 0, DECIMALS['unit_price'][1])
    v.optional('description').max_length('description', 2000, 'Description')
    v.optional('specification').max_length('specification', 255, 'Specification')
    v.optional('notes').max_length('notes', 2000, 'Notes')
    if creating:
        v.optional('source').max_length('source', 20, 'Source')


class BoqListView(APIView):
    def get(self, request):
        qs = filter_by_project(visible(BoqItem.objects.all(), request.user), request)
        category = request.query_params.get('category')
        if category:
            if category not in CATEGORIES:
                raise ApiError('Invalid category filter.', 400)
            qs = qs.filter(category=category)
        rows = with_owner_names([i.to_dict() for i in qs.order_by('category', 'item')])
        return success(rows, count=len(rows))

    def post(self, request):
        data = json_input(request)
        v = Validator(data)
        _rules(v, creating=True)
        if v.fails():
            raise validation_failed(v.errors())
        clean = v.validated()

        project_id = project_id_from(request, data, owner_id=request.user.id)
        cols = _columns(clean)
        cols.setdefault('description', '')
        with transaction.atomic():
            item = BoqItem.objects.create(ref=None, source=clean.get('source', 'manual'), owner_id=request.user.id,
                                          project_id=project_id, **cols)
            ref = boq_ref(item.seq)
            BoqItem.objects.filter(seq=item.seq).update(ref=ref)
        record(request, 'boq_item', ref, 'created', f'BOQ item {ref} ("{clean["item"]}") was created.', project_id=project_id)
        return created(_get(request, ref).to_dict())


class BoqDetailView(APIView):
    def get(self, request, ref: str):
        return success(_get(request, ref).to_dict())

    def put(self, request, ref: str):
        data = json_input(request)
        v = Validator(data)
        _rules(v, creating=False)
        if v.fails():
            raise validation_failed(v.errors())
        clean = v.validated()
        item = _get(request, ref)
        cols = _columns(clean)
        if 'projectId' in data:
            cols['project_id'] = clean['projectId'] = project_id_from(request, data, owner_id=item.owner_id)
        if not cols:
            raise ApiError('At least one field must be provided to update.', 400)
        BoqItem.objects.filter(ref=ref).update(**cols)
        record(request, 'boq_item', ref, 'updated', f'BOQ item {ref} was updated ({keys_list(clean)}).', clean,
               project_id=cols.get('project_id', item.project_id))
        return success(_get(request, ref).to_dict())

    patch = put

    def delete(self, request, ref: str):
        item = _get(request, ref)
        deleted, _ = BoqItem.objects.filter(ref=ref).delete()
        if deleted:
            record(request, 'boq_item', ref, 'deleted', f'BOQ item {ref} ("{item.item}") was deleted.')
        return success({'id': ref, 'deleted': True})
