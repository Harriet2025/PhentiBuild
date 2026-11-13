"""/api/roof-designs/ and /api/roof-ai/generate/ — ports of the PHP endpoints."""
from __future__ import annotations

from django.db import IntegrityError, transaction
from rest_framework.views import APIView

from apps.core.ownership import get_visible
from apps.core.responses import ApiError, success, validation_failed
from apps.core.utils import json_input
from apps.core.validator import Validator, is_php_numeric
from apps.history.service import keys_list, record

from apps.projects.models import Project

from .ai import ALLOWED_ROOF_TYPES, roof_ai_service
from .models import DEFAULT_PROPERTIES, RoofDesign


def get_current(request) -> RoofDesign:
    """The design being worked on; created blank on first use.

      ?projectId=N  -> that project's design (one per project). The project
                       must be visible to you (yours, or any for an Admin);
                       otherwise 404. The design belongs to the project's owner.
      no projectId  -> your own design, not tied to any project (as before).
    """
    raw = request.query_params.get('projectId')
    if raw:
        if not raw.isdigit():
            raise ApiError('Invalid projectId.', 400)
        project = get_visible(Project.objects, request.user, f'Project {raw} was not found.', pk=int(raw))
        lookup = {'project_id': project.id}
        create = {'owner_id': project.owner_id, 'project_id': project.id}
        summary = f'A roof design for project {project.ref} was created.'
    else:
        lookup = {'owner_id': request.user.id, 'project_id__isnull': True}
        create = {'owner_id': request.user.id}
        summary = 'A roof design was created.'

    design = RoofDesign.objects.filter(**lookup).order_by('id').first()
    if design is None:
        try:
            with transaction.atomic():
                design = RoofDesign.objects.create(shapes=[], properties=dict(DEFAULT_PROPERTIES), **create)
        except IntegrityError:  # two tabs opened the same new project at once
            return RoofDesign.objects.get(**lookup)
        record(request, 'roof_design', design.id, 'created', summary, project_id=create.get('project_id'))
        design = RoofDesign.objects.get(pk=design.id)
    return design


class RoofDesignView(APIView):
    def get(self, request):
        return success(get_current(request).to_dict())

    def post(self, request):
        data = json_input(request)
        changes: dict = {}
        if 'shapes' in data:
            shapes = data['shapes']
            if not isinstance(shapes, list):
                raise validation_failed({'shapes': 'Shapes must be an array.'})
            for shape in shapes:
                if (not isinstance(shape, dict) or shape.get('id') is None or shape.get('type') is None
                        or not isinstance(shape.get('points'), list)):
                    raise validation_failed({'shapes': 'Each shape needs an id, a type and a points array.'})
            changes['shapes'] = shapes
        if 'properties' in data:
            if not isinstance(data['properties'], dict):
                raise validation_failed({'properties': 'Properties must be an object.'})
            changes['properties'] = data['properties']
        if not changes:
            raise ApiError('At least one of "shapes" or "properties" must be provided.', 400)

        current = get_current(request)
        current_dict = current.to_dict()
        shapes = changes.get('shapes', current_dict['shapes'])
        properties = {**current_dict['properties'], **changes['properties']} if 'properties' in changes else current_dict['properties']
        RoofDesign.objects.filter(pk=current.id).update(shapes=shapes, properties=properties)
        record(request, 'roof_design', current.id, 'updated', f'Roof design was updated ({keys_list(changes)}).', changes,
               project_id=current.project_id)
        return success(RoofDesign.objects.get(pk=current.id).to_dict())

    put = post
    patch = post

    def delete(self, request):
        current = get_current(request)
        RoofDesign.objects.filter(pk=current.id).update(shapes=[], properties=dict(DEFAULT_PROPERTIES))
        record(request, 'roof_design', current.id, 'deleted', 'Roof design was reset to blank.', project_id=current.project_id)
        return success(RoofDesign.objects.get(pk=current.id).to_dict())


class RoofAIGenerateView(APIView):
    def post(self, request):
        data = json_input(request)
        v = Validator(data)
        v.optional('roofType').in_('roofType', ALLOWED_ROOF_TYPES, 'Roof type')
        v.optional('pitch').numeric('pitch', 'Pitch', 0)
        v.optional('rafterSpacing').numeric('rafterSpacing', 'Rafter spacing', 0)
        v.optional('purlinSpacing').numeric('purlinSpacing', 'Purlin spacing', 0)
        v.optional('roofingMaterial').string('roofingMaterial', 'Roofing material').max_length('roofingMaterial', 120, 'Roofing material')
        if v.fails():
            raise validation_failed(v.errors())

        footprint = {'length': None, 'width': None}
        if isinstance(data.get('footprint'), dict):
            for dim in ('length', 'width'):
                value = data['footprint'].get(dim)
                if value is not None and is_php_numeric(value):
                    footprint[dim] = float(value)

        result = roof_ai_service().generate({**v.validated(), 'footprint': footprint})
        return success(result, allowedRoofTypes=ALLOWED_ROOF_TYPES)
