"""Email + bcrypt login backend (port of User::verifyCredentials)."""
from __future__ import annotations

from django.contrib.auth.backends import BaseBackend

from .models import DUMMY_HASH, User, verify_password


class EmailBcryptBackend(BaseBackend):
    def authenticate(self, request, email: str | None = None, password: str | None = None, **kwargs):
        if not email or password is None:
            return None
        user = User.objects.filter(email__iexact=email.strip()).first()
        if user is None:
            # Same work as a real check, so a missing email and a wrong
            # password take about the same time (no account enumeration).
            verify_password(password, DUMMY_HASH)
            return None
        return user if user.check_password(password) else None

    def get_user(self, user_id):
        return User.objects.filter(pk=user_id).first()
