"""GET /api/ping/ — health check (port of backend/api/ping.php). Used by Coolify."""
from __future__ import annotations

from datetime import datetime

from django.conf import settings
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from .responses import success


class PingView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        return success({
            'app': settings.APP_NAME,
            'env': settings.APP_ENV,
            'database': 'connected',
            'timestamp': datetime.now().astimezone().isoformat(timespec='seconds'),
        })
