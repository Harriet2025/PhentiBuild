"""
The JSON envelope every endpoint replies with — identical to
backend/core/Response.php so the frontend works with either backend:

    { "success": true,  "data": ..., <optional meta keys> }
    { "success": false, "error": "...", "errors": { field: message } }

Views either return success()/created(), or raise ApiError (and its
helpers). core.exceptions.api_exception_handler turns every raised error
— ours, DRF's, or an unexpected crash — into the error envelope.
"""
from __future__ import annotations

from typing import Any

from rest_framework.response import Response


def success(data: Any = None, status: int = 200, **meta: Any) -> Response:
    return Response({'success': True, 'data': data, **meta}, status=status)


def created(data: Any = None) -> Response:
    return success(data, status=201)


class ApiError(Exception):
    """Raise anywhere inside a view to stop and reply with an error envelope."""

    def __init__(self, message: str, status: int = 400, errors: dict[str, str] | None = None,
                 headers: dict[str, str] | None = None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.errors = errors or {}
        self.headers = headers or {}


def validation_failed(errors: dict[str, str]) -> ApiError:
    return ApiError('Validation failed.', 422, errors)


def not_found(message: str = 'Resource not found.') -> ApiError:
    return ApiError(message, 404)


def error_body(message: str, errors: dict[str, str] | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {'success': False, 'error': message}
    if errors:
        body['errors'] = errors
    return body
