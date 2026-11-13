"""
Reads (and caches) the request body once, up front.

Django's CSRF check and DRF's request parsing can both consume the body
stream; once consumed, request.body can no longer be read and the view's
json_input() would crash. Reading it here first makes Django keep a cached
copy that every later reader can use. Bodies over
DATA_UPLOAD_MAX_MEMORY_SIZE are left alone — json_input() turns that into
a clean 413.
"""
from __future__ import annotations

from django.core.exceptions import RequestDataTooBig


class BufferRequestBodyMiddleware:
    METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in self.METHODS:
            try:
                request.body  # noqa: B018 — caches the body on the request
            except RequestDataTooBig:
                pass
        return self.get_response(request)
