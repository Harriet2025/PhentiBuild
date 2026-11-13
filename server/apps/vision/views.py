"""
POST /api/scanner/detect/ — port of api/scanner/detect.php + VisionService.php.

Honest by design: no computer-vision model is integrated yet, so the
service always answers status='not_configured' and never invents a
detection. Swapping in a real model later only changes vision_service().
"""
from __future__ import annotations

from rest_framework.views import APIView

from apps.core.responses import ApiError, success, validation_failed
from apps.core.utils import json_input
from apps.core.validator import Validator

MAX_IMAGE_CHARS = 8 * 1024 * 1024

PLANNED_OBJECT_TYPES = [
    {'id': 'timber_2x2', 'category': 'timber', 'label': '2 × 2 Timber'},
    {'id': 'timber_2x3', 'category': 'timber', 'label': '2 × 3 Timber'},
    {'id': 'timber_2x4', 'category': 'timber', 'label': '2 × 4 Timber'},
    {'id': 'timber_2x6', 'category': 'timber', 'label': '2 × 6 Timber'},
    {'id': 'timber_4x4', 'category': 'timber', 'label': '4 × 4 Timber'},
    {'id': 'exposed_wall', 'category': 'wall', 'label': 'Exposed Wall (length, height, surface area)'},
]


class UnavailableVisionService:
    def detect(self, image_base64: str, mime_type: str) -> dict:
        return {
            'status': 'not_configured',
            'objectType': None,
            'label': None,
            'measurements': [],
            'confidence': None,
            'message': 'Computer vision detection is not connected yet. No model has been integrated, so nothing '
                       'was auto-detected — enter the object type and measurements manually below.',
        }


def vision_service():
    return UnavailableVisionService()


class DetectView(APIView):
    def post(self, request):
        data = json_input(request)
        v = Validator(data)
        v.required('image', 'Image')
        v.optional('mimeType')
        if v.fails():
            raise validation_failed(v.errors())
        image = str(data['image'])
        if len(image) > MAX_IMAGE_CHARS:
            raise ApiError('Captured image is too large.', 413)
        result = vision_service().detect(image, str(data.get('mimeType') or 'image/jpeg'))
        return success(result, plannedObjectTypes=PLANNED_OBJECT_TYPES)
