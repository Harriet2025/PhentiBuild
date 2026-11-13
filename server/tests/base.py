"""Shared helpers for the API test suite."""
from __future__ import annotations

from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.history.models import History

# A real hash produced by XAMPP's PHP password_hash('Legacy-Pass-1').
PHP_LEGACY_HASH = '$2y$10$CYPjY7dLkHmEdr/ye2MOZumwRWKtSSb2LmkgBFpfjNURMurJXweZG'


class ApiTestCase(TestCase):
    password = 'Str0ng-Pass!'

    def setUp(self):
        cache.clear()  # reset rate-limit counters between tests
        self.client = APIClient()
        self.user = self.make_user('owner@example.com', profession='Contractor')

    def make_user(self, email: str, role: str = 'User', name: str = 'Test User', profession: str | None = 'Other') -> User:
        return User.objects.create_user(email=email, password=self.password, name=name, phone='0241234567',
                                        role=role, profession=profession)

    def login(self, user: User | None = None) -> None:
        self.client.force_login(user or self.user)

    # ---- request shortcuts ---------------------------------------------
    def get(self, url, **params):
        return self.client.get(url, params)

    def post(self, url, data=None):
        return self.client.post(url, data if data is not None else {}, format='json')

    def put(self, url, data=None):
        return self.client.put(url, data if data is not None else {}, format='json')

    def patch(self, url, data=None):
        return self.client.patch(url, data if data is not None else {}, format='json')

    def delete(self, url):
        return self.client.delete(url)

    def raw(self, method: str, url: str, body: bytes | str, content_type='application/json'):
        return getattr(self.client, method)(url, data=body, content_type=content_type)

    # ---- assertions ----------------------------------------------------
    def assertSuccess(self, response, status: int = 200):
        self.assertEqual(response.status_code, status, response.content[:500])
        self.assertIs(response.json()['success'], True)
        return response.json()['data']

    def assertError(self, response, status: int, message: str | None = None, field: str | None = None,
                    field_message: str | None = None):
        self.assertEqual(response.status_code, status, response.content[:500])
        body = response.json()
        self.assertIs(body['success'], False)
        if message is not None:
            self.assertEqual(body['error'], message)
        if field is not None:
            self.assertIn(field, body.get('errors', {}), body)
            if field_message is not None:
                self.assertEqual(body['errors'][field], field_message)
        return body

    def last_history(self) -> History:
        return History.objects.order_by('-id').first()
