"""
Auth + account endpoints — ports of backend/api/auth/*.php and
backend/api/account/*.php, with the same validation messages.

Security changes vs the PHP version (deliberate, see docs/ARCHITECTURE.md):
  * "Role" is split in two:
      - profession (Contractor, Quantity Surveyor, ...): chosen by the
        person at sign-up and editable in Settings;
      - access level (Admin / Member): NOBODY can become Admin through the
        website — not by registering, not by editing their profile, not
        even by another Admin. Admin is granted only by someone with
        server access: `python manage.py create_admin`. Admins may demote
        (PATCH /api/users/<id>/role/ with "Member"), never the last one.
  * Login and registration are rate-limited.
  * CSRF: every state-changing request from a logged-in session must send
    the X-CSRFToken header (Django's standard protection).
"""
from __future__ import annotations

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.db import IntegrityError, transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.responses import ApiError, created, not_found, success, validation_failed
from apps.core.utils import json_input
from apps.core.validator import Validator
from apps.history.service import keys_list, record

from . import google
from .models import ACCESS_ADMIN, ACCESS_LEVELS, ACCESS_MEMBER, ADMIN, MEMBER_ROLE, PROFESSIONS, User
from .permissions import IsAdmin

ADMIN_SERVER_ONLY_MESSAGE = ('Admin access cannot be granted through the website. '
                             'Someone with server access must run: python manage.py create_admin')


class ScopedThrottleMixin:
    throttle_classes = [ScopedRateThrottle]


BACKEND = 'apps.accounts.backends.EmailBcryptBackend'


def start_session(request, user: User, remember: bool) -> None:
    """Log `user` in: new session id (fixation protection) + cookie lifetime."""
    login(request, user, backend=BACKEND)
    # "Remember me" = 30-day cookie; otherwise it ends with the browser.
    request.session.set_expiry(settings.REMEMBER_ME_SECONDS if remember else 0)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class MeView(APIView):
    """GET /api/auth/me/ — also hands the browser its CSRF cookie."""

    def get(self, request):
        return success(request.user.to_dict())


class LoginView(ScopedThrottleMixin, APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'login'

    def post(self, request):
        data = json_input(request)
        v = Validator(data)
        v.required('email', 'Email').email('email', 'Email')
        v.required('password', 'Password')
        if v.fails():
            raise validation_failed(v.errors())

        user = authenticate(request, email=str(data['email']).strip(), password=str(data['password']))
        if user is None:
            raise ApiError('Incorrect email or password.', 401)

        start_session(request, user, bool(data.get('remember')))
        return success(user.to_dict())


class RegisterView(ScopedThrottleMixin, APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'register'

    def post(self, request):
        data = json_input(request)
        v = Validator(data)
        v.required('name', 'Name').min_length('name', 2, 'Name').max_length('name', 255, 'Name')
        v.required('email', 'Email').email('email', 'Email').max_length('email', 255, 'Email')
        v.required('phone', 'Phone').phone('phone', 'Phone')
        v.required('password', 'Password').min_length('password', 8, 'Password').max_length('password', 255, 'Password')
        v.required('profession', 'Profession').in_('profession', PROFESSIONS, 'Profession')
        # Any "role" in the body is ignored: every new account is a Member.
        if v.fails():
            raise validation_failed(v.errors())

        clean = v.validated()
        if User.objects.filter(email__iexact=clean['email']).exists():
            raise validation_failed({'email': 'An account with this email already exists.'})
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=clean['email'], password=data['password'],
                    name=clean['name'], phone=clean['phone'],
                    profession=clean['profession'], role=MEMBER_ROLE,
                )
        except IntegrityError:  # two simultaneous sign-ups with one email
            raise validation_failed({'email': 'An account with this email already exists.'})
        # Signed in straight away — no need to type the new password again.
        start_session(request, user, remember=False)
        return created(user.to_dict())


class AuthProvidersView(APIView):
    """GET /api/auth/providers/ — which sign-in options this server offers."""
    permission_classes = [AllowAny]

    def get(self, request):
        return success({'google': {'clientId': settings.GOOGLE_CLIENT_ID} if google.is_enabled() else None})


class GoogleAuthView(ScopedThrottleMixin, APIView):
    """
    POST /api/auth/google/  {"credential": "<Google ID token>", "remember": bool,
                             "phone": "...", "profession": "..."}

    * Email already has an account  -> signed in   {"status": "signed_in", "user": {...}}
    * New email, no phone/profession -> 200        {"status": "needs_profile", "name", "email"}
      (the page asks for them, then sends the same credential again with them)
    * New email + phone + profession -> account created (Member, no password),
      signed in, 201 {"status": "signed_in", "user": {...}}

    Google accounts are never Admin; that is still server-only (create_admin).
    """
    permission_classes = [AllowAny]
    throttle_scope = 'login'

    def post(self, request):
        if not google.is_enabled():
            raise ApiError('Google sign-in is not set up on this server.', 503)
        data = json_input(request)
        credential = data.get('credential')
        if not isinstance(credential, str) or not credential.strip() or len(credential) > 4096:
            raise validation_failed({'credential': 'Google sign-in did not return a valid credential.'})
        try:
            identity = google.verify_credential(credential.strip())
        except google.GoogleUnavailable:
            raise ApiError('Could not reach Google to check your sign-in. Please try again.', 503)
        except google.InvalidGoogleToken:
            raise ApiError('Google sign-in could not be verified. Please try again.', 401)

        remember = bool(data.get('remember'))
        user = User.objects.filter(email__iexact=identity.email).first()
        if user is not None:
            start_session(request, user, remember)
            return success({'status': 'signed_in', 'user': user.to_dict()})

        if 'phone' not in data and 'profession' not in data:
            return success({'status': 'needs_profile', 'name': identity.name, 'email': identity.email})

        v = Validator(data)
        v.required('phone', 'Phone').phone('phone', 'Phone')
        v.required('profession', 'Profession').in_('profession', PROFESSIONS, 'Profession')
        if v.fails():
            raise validation_failed(v.errors())
        clean = v.validated()
        name = identity.name if len(identity.name) >= 2 else identity.email.split('@')[0][:255]
        try:
            with transaction.atomic():
                user = User.objects.create_user(email=identity.email, password=None, name=name, phone=clean['phone'],
                                                profession=clean['profession'], role=MEMBER_ROLE)
        except IntegrityError:  # the same Google account finished sign-up in another tab
            user = User.objects.get(email__iexact=identity.email)
            start_session(request, user, remember)
            return success({'status': 'signed_in', 'user': user.to_dict()})
        start_session(request, user, remember)
        return created({'status': 'signed_in', 'user': user.to_dict()})


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)  # flushes the session server-side
        return success({'loggedOut': True})


class ProfileView(APIView):
    """PUT (or POST) /api/account/profile/ — the whole profile, every field required."""

    def put(self, request):
        data = json_input(request)
        user: User = request.user
        v = Validator(data)
        v.required('name', 'Name').min_length('name', 2, 'Name').max_length('name', 255, 'Name')
        v.required('email', 'Email').email('email', 'Email').max_length('email', 255, 'Email')
        v.required('phone', 'Phone').phone('phone', 'Phone')
        v.required('profession', 'Profession').in_('profession', PROFESSIONS, 'Profession')
        # "role" (access level) is never read from this form — not even for Admins.
        if v.fails():
            raise validation_failed(v.errors())

        clean = v.validated()
        email = clean['email'].lower()
        if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            raise validation_failed({'email': 'That email address is already in use.'})

        User.objects.filter(pk=user.pk).update(name=clean['name'], email=email, phone=clean['phone'], profession=clean['profession'])
        user.refresh_from_db()
        record(request, 'account', user.pk, 'updated', f'Profile was updated ({keys_list(clean)}).')
        return success(user.to_dict())

    post = put


class PasswordView(APIView):
    def post(self, request):
        data = json_input(request)
        user: User = request.user
        has_password = user.has_usable_password()  # False for Google-only accounts
        v = Validator(data)
        if has_password:
            v.required('currentPassword', 'Current password')
        v.required('newPassword', 'New password').min_length('newPassword', 8, 'New password').max_length('newPassword', 255, 'New password')
        v.required('confirmNewPassword', 'Confirm new password')
        if v.fails():
            raise validation_failed(v.errors())
        if data['newPassword'] != data['confirmNewPassword']:
            raise validation_failed({'confirmNewPassword': 'New password and confirmation do not match.'})

        if has_password and not user.check_password(str(data['currentPassword'])):
            raise validation_failed({'currentPassword': 'Current password is incorrect.'})

        user.set_password(str(data['newPassword']))
        User.objects.filter(pk=user.pk).update(password=user.password)
        update_session_auth_hash(request, user)  # keep THIS session; others are logged out
        record(request, 'account', user.pk, 'updated', 'Password was changed.')
        return success({'changed': True})


# ---------------------------------------------------------------- Admin
class UserListView(APIView):
    """GET /api/users/ — Admin only."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        users = [u.to_dict() for u in User.objects.order_by('name')]
        return success(users, count=len(users), accessLevels=ACCESS_LEVELS, professions=PROFESSIONS)


class UserRoleView(APIView):
    """PATCH /api/users/<id>/role/ — Admin only. Body: {"role": "Member"}.

    Demotion only. Making someone an Admin is refused here on purpose —
    that is done on the server with `python manage.py create_admin`.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk: int):
        data = json_input(request)
        v = Validator(data)
        v.required('role', 'Role').in_('role', ACCESS_LEVELS, 'Role')
        if data.get('role') == ACCESS_ADMIN:
            v.fail('role', ADMIN_SERVER_ONLY_MESSAGE)
        if v.fails():
            raise validation_failed(v.errors())
        target = User.objects.filter(pk=pk).first()
        if target is None:
            raise not_found(f'User {pk} was not found.')
        if target.is_admin and User.objects.filter(role=ADMIN).count() <= 1:
            raise validation_failed({'role': 'This is the only administrator — create another one on the server first.'})
        User.objects.filter(pk=pk).update(role=MEMBER_ROLE)
        target.refresh_from_db()
        record(request, 'account', target.pk, 'updated', f'Access for {target.name} was changed to {ACCESS_MEMBER}.', {'role': ACCESS_MEMBER})
        return success(target.to_dict())

    put = patch
