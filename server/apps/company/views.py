"""/api/company-profile/ and /api/contact/ — ports of the matching PHP endpoints."""
from __future__ import annotations

from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.responses import ApiError, created, success, validation_failed
from apps.core.utils import json_input, strip_tags
from apps.core.validator import Validator, is_valid_email, is_valid_phone
from apps.history.service import keys_list, record

from .models import CompanyProfile, ContactMessage

PROFILE_COLUMNS = {
    'companyName': 'company_name', 'address': 'address', 'phone': 'phone',
    'email': 'email', 'registrationNumber': 'registration_number',
}


def current_profile() -> CompanyProfile:
    """The earliest row, created blank on first use (CompanyProfile::getCurrent)."""
    profile = CompanyProfile.objects.order_by('id').first()
    if profile is None:
        profile = CompanyProfile.objects.create(company_name='', address='', phone='', email='', registration_number='')
        profile = CompanyProfile.objects.get(pk=profile.id)
    return profile


class CompanyProfileView(APIView):
    def get(self, request):
        return success(current_profile().to_dict())

    def put(self, request):
        data = json_input(request)
        errors: dict[str, str] = {}
        changes: dict[str, str] = {}

        def text(key: str) -> str:
            value = data[key]
            return '' if value is None else str(value)

        if 'companyName' in data:
            value = text('companyName')
            if len(value) > 255:
                errors['companyName'] = 'Company name must be 255 characters or fewer.'
            changes['companyName'] = value.strip()
        if 'address' in data:
            value = text('address')
            if len(value) > 500:
                errors['address'] = 'Address must be 500 characters or fewer.'
            changes['address'] = value.strip()
        if 'phone' in data:
            value = text('phone').strip()
            if value and not is_valid_phone(value):
                errors['phone'] = 'Phone must be a valid phone number (7–15 digits).'
            changes['phone'] = value
        if 'email' in data:
            value = text('email').strip()
            if value and not is_valid_email(value):
                errors['email'] = 'Email must be a valid email address.'
            changes['email'] = value
        if 'registrationNumber' in data:
            value = text('registrationNumber')
            if len(value) > 100:
                errors['registrationNumber'] = 'Registration number must be 100 characters or fewer.'
            changes['registrationNumber'] = value.strip()

        if errors:
            raise validation_failed(errors)
        if not changes:
            raise ApiError('At least one field must be provided.', 400)

        profile = current_profile()
        CompanyProfile.objects.filter(pk=profile.id).update(**{PROFILE_COLUMNS[k]: v for k, v in changes.items()})
        record(request, 'company_profile', profile.id, 'updated', f'Company profile was updated ({keys_list(changes)}).', changes)
        return success(CompanyProfile.objects.get(pk=profile.id).to_dict())

    post = put
    patch = put


class ContactSubmitView(APIView):
    """POST /api/contact/ — public; honeypot field `website` silently drops bots."""
    permission_classes = [AllowAny]
    authentication_classes: list = []  # public form: no session, so no CSRF requirement
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'contact'

    def post(self, request):
        data = json_input(request)
        if str(data.get('website') or '').strip():
            return created({'id': None, 'status': 'new', 'emailDelivery': 'pending'})

        v = Validator(data)
        v.required('name', 'Full name').min_length('name', 2, 'Full name').max_length('name', 255, 'Full name')
        v.required('email', 'Email').email('email', 'Email').max_length('email', 255, 'Email')
        v.optional('phone').phone('phone', 'Phone')
        v.required('subject', 'Subject').min_length('subject', 3, 'Subject').max_length('subject', 255, 'Subject')
        v.required('message', 'Message').min_length('message', 10, 'Message').max_length('message', 5000, 'Message')
        if v.fails():
            raise validation_failed(v.errors())
        clean = v.validated()

        row = ContactMessage.objects.create(
            name=strip_tags(clean['name']), email=clean['email'], phone=clean.get('phone'),
            subject=strip_tags(clean['subject']), message=strip_tags(clean['message']),
        )
        row = ContactMessage.objects.get(pk=row.id)
        return created({'id': row.id, 'status': row.status, 'emailDelivery': 'pending'})
