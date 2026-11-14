"""Sign-up logs you straight in, and "Sign in with Google"."""
from __future__ import annotations

from unittest import mock

from django.test import override_settings

from apps.accounts import google
from apps.accounts.models import User

from .base import ApiTestCase

REGISTER = {'name': 'Ama Mensah', 'email': 'ama@example.com', 'phone': '0241234567',
            'profession': 'Contractor', 'password': 'Correct-Horse-1'}
CLIENT_ID = 'test-client.apps.googleusercontent.com'
AMA = google.GoogleIdentity(email='ama.google@example.com', name='Ama Google', subject='1234567890')


class SignUpStartsSessionTests(ApiTestCase):
    def test_register_logs_the_new_user_in(self):
        self.assertError(self.client.get('/api/auth/me/'), 401)
        data = self.assertSuccess(self.post('/api/auth/register/', REGISTER), 201)
        me = self.assertSuccess(self.client.get('/api/auth/me/'))
        self.assertEqual((me['id'], me['email']), (data['id'], 'ama@example.com'))
        self.assertTrue(me['hasPassword'])
        self.assertSuccess(self.client.get('/api/projects/'))  # protected data works immediately

    def test_failed_registration_does_not_log_in(self):
        self.assertError(self.post('/api/auth/register/', {**REGISTER, 'password': 'short'}), 422)
        self.assertError(self.client.get('/api/auth/me/'), 401)


@override_settings(GOOGLE_CLIENT_ID=CLIENT_ID)
class GoogleSignInTests(ApiTestCase):
    def google(self, body=None, identity=AMA):
        with mock.patch.object(google, 'verify_credential', return_value=identity) as verify:
            r = self.post('/api/auth/google/', {'credential': 'header.payload.signature', **(body or {})})
        return r, verify

    def test_providers_endpoint_exposes_the_client_id(self):
        self.assertEqual(self.assertSuccess(self.client.get('/api/auth/providers/'))['google'], {'clientId': CLIENT_ID})
        with self.settings(GOOGLE_CLIENT_ID=''):
            self.assertIsNone(self.assertSuccess(self.client.get('/api/auth/providers/'))['google'])
            self.assertError(self.post('/api/auth/google/', {'credential': 'x'}), 503)

    def test_new_google_user_is_asked_for_phone_and_profession_first(self):
        r, verify = self.google()
        data = self.assertSuccess(r)
        self.assertEqual(data, {'status': 'needs_profile', 'name': 'Ama Google', 'email': 'ama.google@example.com'})
        verify.assert_called_once_with('header.payload.signature')
        self.assertFalse(User.objects.filter(email='ama.google@example.com').exists())
        self.assertError(self.client.get('/api/auth/me/'), 401)  # not signed in yet

    def test_completing_the_profile_creates_a_member_and_signs_in(self):
        r, _ = self.google({'phone': '0241112222', 'profession': 'Quantity Surveyor', 'role': 'Admin'})
        data = self.assertSuccess(r, 201)
        self.assertEqual(data['status'], 'signed_in')
        user = data['user']
        self.assertEqual((user['name'], user['role'], user['profession'], user['hasPassword']),
                         ('Ama Google', 'Member', 'Quantity Surveyor', False))
        self.assertEqual(self.assertSuccess(self.client.get('/api/auth/me/'))['id'], user['id'])
        db = User.objects.get(pk=user['id'])
        self.assertFalse(db.is_admin)
        self.assertFalse(db.has_usable_password())
        # A Google-only account cannot be logged into with any password.
        self.client.logout()
        for guess in ['', '!', 'anything']:
            self.assertError(self.post('/api/auth/login/', {'email': 'ama.google@example.com', 'password': guess or 'x'}), 401)

    def test_profile_fields_are_validated(self):
        r, _ = self.google({'phone': '12', 'profession': 'Admin'})
        body = self.assertError(r, 422)
        self.assertEqual(set(body['errors']), {'phone', 'profession'})
        self.assertFalse(User.objects.filter(email='ama.google@example.com').exists())

    def test_existing_account_with_same_email_just_signs_in(self):
        existing = self.make_user('ama.google@example.com', name='Ama Existing', profession='Draftsman')
        r, _ = self.google({'remember': True})
        data = self.assertSuccess(r)
        self.assertEqual((data['status'], data['user']['id']), ('signed_in', existing.id))
        self.assertEqual(self.assertSuccess(self.client.get('/api/auth/me/'))['name'], 'Ama Existing')
        self.assertGreater(self.client.session.get_expiry_age(), 7 * 24 * 3600)  # remember me honoured
        self.assertTrue(User.objects.get(pk=existing.pk).check_password(self.password))  # password kept

    def test_rejected_or_unreachable_google(self):
        with mock.patch.object(google, 'verify_credential', side_effect=google.InvalidGoogleToken()):
            self.assertError(self.post('/api/auth/google/', {'credential': 'forged'}), 401,
                             'Google sign-in could not be verified. Please try again.')
        with mock.patch.object(google, 'verify_credential', side_effect=google.GoogleUnavailable()):
            self.assertError(self.post('/api/auth/google/', {'credential': 'x'}), 503)
        for bad in [None, '', 123, 'x' * 5000]:
            with self.subTest(credential=bad):
                self.assertError(self.post('/api/auth/google/', {'credential': bad}), 422, field='credential')
        self.assertError(self.client.get('/api/auth/me/'), 401)

    def test_google_only_account_can_set_a_first_password(self):
        r, _ = self.google({'phone': '0241112222', 'profession': 'Other'})
        self.assertSuccess(r, 201)
        r = self.post('/api/account/password/', {'newPassword': 'Brand-New-Pass-1', 'confirmNewPassword': 'Brand-New-Pass-1'})
        self.assertSuccess(r)
        self.assertTrue(self.assertSuccess(self.client.get('/api/auth/me/'))['hasPassword'])
        # From now on the normal rules apply: the current password is required.
        r = self.post('/api/account/password/', {'newPassword': 'Another-Pass-2', 'confirmNewPassword': 'Another-Pass-2'})
        self.assertError(r, 422, field='currentPassword')


@override_settings(GOOGLE_CLIENT_ID=CLIENT_ID)
class VerifyCredentialTests(ApiTestCase):
    """The real verify_credential(), with Google's library call replaced."""
    PATCH = 'google.oauth2.id_token.verify_oauth2_token'

    def test_accepts_a_verified_email_for_our_client(self):
        claims = {'email': 'Ama@Example.com', 'email_verified': True, 'name': 'Ama', 'sub': '42'}
        with mock.patch(self.PATCH, return_value=claims) as verify:
            identity = google.verify_credential('tok')
        self.assertEqual(identity, google.GoogleIdentity(email='ama@example.com', name='Ama', subject='42'))
        self.assertEqual(verify.call_args.args[2], CLIENT_ID)  # audience = OUR client id

    def test_rejects_unverified_or_missing_email_and_bad_tokens(self):
        for claims in [{'email': 'a@example.com', 'email_verified': False}, {'email_verified': True}, {'email': 'a@example.com'}]:
            with self.subTest(claims=claims), mock.patch(self.PATCH, return_value=claims):
                with self.assertRaises(google.InvalidGoogleToken):
                    google.verify_credential('tok')
        with mock.patch(self.PATCH, side_effect=ValueError('Token expired')):
            with self.assertRaises(google.InvalidGoogleToken):
                google.verify_credential('tok')

    def test_network_failure_is_reported_as_unavailable(self):
        from google.auth.exceptions import TransportError
        with mock.patch(self.PATCH, side_effect=TransportError('offline')):
            with self.assertRaises(google.GoogleUnavailable):
                google.verify_credential('tok')

    def test_a_garbage_token_is_rejected_by_the_real_library(self):
        with self.assertRaises((google.InvalidGoogleToken, google.GoogleUnavailable)):
            google.verify_credential('not-a-jwt')
