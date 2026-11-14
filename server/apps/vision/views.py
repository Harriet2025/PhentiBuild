"""
/api/scanner/detect/ — Camera Scanner analysis (port of api/scanner/detect.php,
now backed by real measuring in apps/vision/service.py).

GET  -> is automatic measuring switched on? + object types + reference objects
POST {"image": <base64>, "mimeType": "image/jpeg", "reference": "card|a4|none"}
     -> the analysis result, which the person always checks before saving.

Honest by design: with no ANTHROPIC_API_KEY the answer is status
'not_configured' and nothing is invented.
"""
from __future__ import annotations

from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.responses import ApiError, success, validation_failed
from apps.core.utils import json_input
from apps.core.validator import Validator

from . import service

MAX_IMAGE_CHARS = 8 * 1024 * 1024
PLANNED_OBJECT_TYPES = service.OBJECT_TYPES  # name kept for the API's meta key
REFERENCE_OPTIONS = [{'id': k, 'label': v['label'], 'size': v['size']} for k, v in service.REFERENCES.items()]


def _meta() -> dict:
    return {'plannedObjectTypes': PLANNED_OBJECT_TYPES, 'references': REFERENCE_OPTIONS}


class VisionThrottle(ScopedRateThrottle):
    """Throttle only the paid analysis (POST), never the status check."""

    def allow_request(self, request, view):
        if request.method != 'POST' or not service.is_configured():
            return True
        return super().allow_request(request, view)


class DetectView(APIView):
    throttle_classes = [VisionThrottle]
    throttle_scope = 'vision'

    def get(self, request):
        return success({'configured': service.is_configured()}, **_meta())

    def post(self, request):
        data = json_input(request)
        v = Validator(data)
        v.required('image', 'Image')
        v.optional('mimeType')
        v.optional('reference').in_('reference', list(service.REFERENCES), 'Reference')
        if v.fails():
            raise validation_failed(v.errors())
        image = data['image']
        if not isinstance(image, str):
            raise validation_failed({'image': 'The captured image could not be read.'})
        if len(image) > MAX_IMAGE_CHARS:
            raise ApiError('Captured image is too large.', 413)

        if not service.is_configured():
            return success(dict(service.NOT_CONFIGURED), **_meta())

        try:
            photo = service.validate_photo(image, str(data.get('mimeType') or 'image/jpeg'))
        except service.InvalidImage as exc:
            if str(exc) == 'too_large':
                raise ApiError('Captured image is too large.', 413)
            raise validation_failed({'image': str(exc)})

        try:
            result = service.analyse(photo, str(data.get('reference') or 'card'))
        except service.VisionUnavailable as exc:
            raise ApiError(str(exc), 503)
        return success(result, **_meta())
