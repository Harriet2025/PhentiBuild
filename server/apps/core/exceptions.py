"""
Turns EVERY failure into the standard JSON error envelope — the Django
equivalent of the exception/error handlers in backend/core/bootstrap.php.
The real detail always goes to the server log, never to the client.
"""
from __future__ import annotations

import logging

from django.db import DatabaseError
from django.http import Http404, JsonResponse
from rest_framework import exceptions as drf
from rest_framework.response import Response

from .responses import ApiError, error_body

logger = logging.getLogger('phentibuild.api')


def api_exception_handler(exc, context):
    if isinstance(exc, ApiError):
        return Response(error_body(exc.message, exc.errors), status=exc.status, headers=exc.headers)

    if isinstance(exc, (drf.NotAuthenticated, drf.AuthenticationFailed)):
        return Response(error_body('You must be logged in to do that.'), status=401)

    if isinstance(exc, drf.PermissionDenied):
        detail = str(exc.detail)
        if detail.startswith('CSRF Failed'):
            return Response(error_body('Your security token is missing or has expired. Refresh the page and try again.'), status=403)
        return Response(error_body(detail or 'You do not have permission to do that.'), status=403)

    if isinstance(exc, drf.MethodNotAllowed):
        return Response(error_body('Method not allowed.'), status=405)

    if isinstance(exc, drf.Throttled):
        headers = {'Retry-After': str(int(exc.wait))} if exc.wait else {}
        return Response(error_body('Too many attempts. Please wait a moment and try again.'), status=429, headers=headers)

    if isinstance(exc, (drf.ParseError, drf.UnsupportedMediaType)):
        return Response(error_body('Request body must be valid JSON.'), status=400)

    if isinstance(exc, (drf.NotFound, Http404)):
        return Response(error_body('Resource not found.'), status=404)

    if isinstance(exc, drf.APIException):
        return Response(error_body(str(exc.detail)), status=exc.status_code)

    view = context.get('view')
    logger.exception('Unhandled error in %s', type(view).__name__ if view else 'API', exc_info=exc)
    if isinstance(exc, DatabaseError):
        return Response(error_body('A database error occurred.'), status=500)
    return Response(error_body('An unexpected error occurred.'), status=500)


# ---- Django-level fallbacks (URLs that never reach a DRF view) ---------
def json_404(request, exception=None):
    return JsonResponse(error_body('Resource not found.'), status=404)


def json_500(request):
    return JsonResponse(error_body('An unexpected error occurred.'), status=500)


def json_400(request, exception=None):
    return JsonResponse(error_body('Bad request.'), status=400)


def json_403(request, exception=None):
    return JsonResponse(error_body('You do not have permission to do that.'), status=403)


def csrf_failure(request, reason=''):
    return JsonResponse(error_body('Your security token is missing or has expired. Refresh the page and try again.'), status=403)
