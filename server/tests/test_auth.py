"""Registration, login, sessions, CSRF, profile, password and role rules."""
from __future__ import annotations

from rest_framework.test import APIClient

from apps.accounts.models import User

from .base import PHP_LEGACY_HASH, ApiTestCase

REGISTER = {
    'name': 'Ama Mensah', 'email': 'Ama@Example.com', 'phone': '024 123 4567',
    'profession': 'Quantity Surveyor', 'password': 'Correct-Horse-1',
}

PROTECTED = [
    '/api/auth/me/', '/api/projects/', '/api/materials/', '/api/boq/', '/api/measurements/',
    '/api/calculations/', '/api/roof-designs/', '/api/history/', '/api/reports/',
    '/api/company-profile/', '/api/export/excel/', '/api/users/',
]


class RegistrationTests(ApiTestCase):
    def test_register_success_shape(self):
        data = self.assertSuccess(self.post('/api/auth/register/', REGISTER), 201)
        self.assertEqual(data['email'], 'ama@example.com')  # lower-cased like PHP
        self.assertEqual(data['profession'], 'Quantity Surveyor')
        self.assertEqual(data['role'], 'Member')
        self.assertEqual(User.objects.get(pk=data['id']).role, 'User')  # DB value stays inside the PHP ENUM
        self.assertNotIn('password', data)
        self.assertNotIn('password_hash', data)
        self.assertTrue(User.objects.get(pk=data['id']).password.startswith('$2y$12$'))

    def test_duplicate_email_case_insensitive(self):
        self.post('/api/auth/register/', REGISTER)
        r = self.post('/api/auth/register/', {**REGISTER, 'email': 'AMA@example.COM'})
        self.assertError(r, 422, field='email', field_message='An account with this email already exists.')

    def test_cannot_self_register_as_admin(self):
        # Sneaking role/accessLevel/profession=Admin into the body never gives Admin.
        data = self.assertSuccess(self.post('/api/auth/register/', {**REGISTER, 'role': 'Admin', 'accessLevel': 'Admin'}), 201)
        self.assertEqual(data['role'], 'Member')
        self.assertFalse(User.objects.get(pk=data['id']).is_admin)
        r = self.post('/api/auth/register/', {**REGISTER, 'email': 'x@example.com', 'profession': 'Admin'})
        self.assertError(r, 422, field='profession')
        self.assertFalse(User.objects.filter(role='Admin').exists())

    def test_profession_is_required(self):
        body = {k: v for k, v in REGISTER.items() if k != 'profession'}
        self.assertError(self.post('/api/auth/register/', body), 422, field='profession', field_message='Profession is required.')

    def test_every_profession_can_register(self):
        for i, profession in enumerate(['Contractor', 'Site Manager', 'Quantity Surveyor', 'Draftsman', 'Other']):
            data = self.assertSuccess(self.post('/api/auth/register/', {**REGISTER, 'email': f'p{i}@example.com', 'profession': profession}), 201)
            self.assertEqual((data['profession'], data['role']), (profession, 'Member'))

    def test_field_validation_messages(self):
        body = self.assertError(self.post('/api/auth/register/', {
            'name': 'A', 'email': 'bad', 'phone': '12', 'profession': 'Boss', 'password': 'short'}), 422)
        self.assertEqual(body['errors'], {
            'name': 'Name must be at least 2 characters.',
            'email': 'Email must be a valid email address.',
            'phone': 'Phone must be a valid phone number (7–15 digits).',
            'password': 'Password must be at least 8 characters.',
            'profession': 'Profession must be one of: Contractor, Site Manager, Quantity Surveyor, Draftsman, Other.',
        })

    def test_unicode_and_long_password_edge_cases(self):
        r = self.post('/api/auth/register/', {**REGISTER, 'name': 'Kwame Ọ̀ṣẹ́', 'password': 'p' * 200})
        self.assertSuccess(r, 201)
        self.assertSuccess(self.post('/api/auth/login/', {'email': 'ama@example.com', 'password': 'p' * 200}))


class LoginTests(ApiTestCase):
    def test_login_then_me(self):
        data = self.assertSuccess(self.post('/api/auth/login/', {'email': 'owner@example.com', 'password': self.password}))
        self.assertEqual(data['email'], 'owner@example.com')
        me = self.assertSuccess(self.client.get('/api/auth/me/'))
        self.assertEqual(me['id'], self.user.id)

    def test_login_email_is_case_insensitive(self):
        self.assertSuccess(self.post('/api/auth/login/', {'email': 'OWNER@example.com', 'password': self.password}))

    def test_wrong_password_and_unknown_email_look_identical(self):
        a = self.post('/api/auth/login/', {'email': 'owner@example.com', 'password': 'wrong-pass'})
        b = self.post('/api/auth/login/', {'email': 'nobody@example.com', 'password': 'wrong-pass'})
        self.assertError(a, 401, 'Incorrect email or password.')
        self.assertError(b, 401, 'Incorrect email or password.')

    def test_missing_fields(self):
        body = self.assertError(self.post('/api/auth/login/', {}), 422)
        self.assertEqual(body['errors'], {'email': 'Email is required.', 'password': 'Password is required.'})

    def test_existing_php_account_can_log_in(self):
        """Accounts created by the PHP app keep working with their passwords."""
        legacy = User.objects.create_user(email='legacy@example.com', password='x', name='Legacy', phone='0241234567')
        User.objects.filter(pk=legacy.pk).update(password=PHP_LEGACY_HASH)
        self.assertSuccess(self.post('/api/auth/login/', {'email': 'legacy@example.com', 'password': 'Legacy-Pass-1'}))
        self.assertEqual(User.objects.get(pk=legacy.pk).password, PHP_LEGACY_HASH)  # hash left untouched

    def test_remember_me_controls_cookie_lifetime(self):
        self.post('/api/auth/login/', {'email': 'owner@example.com', 'password': self.password})
        self.assertTrue(self.client.session.get_expire_at_browser_close())
        self.client = APIClient()
        self.post('/api/auth/login/', {'email': 'owner@example.com', 'password': self.password, 'remember': True})
        self.assertFalse(self.client.session.get_expire_at_browser_close())
        self.assertEqual(self.client.session.get_expiry_age(), 30 * 24 * 60 * 60)

    def test_session_cookie_is_httponly(self):
        r = self.post('/api/auth/login/', {'email': 'owner@example.com', 'password': self.password})
        cookie = r.cookies['phb_sid']
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['samesite'], 'Lax')

    def test_logout_ends_session(self):
        self.post('/api/auth/login/', {'email': 'owner@example.com', 'password': self.password})
        self.assertSuccess(self.post('/api/auth/logout/'))
        self.assertError(self.client.get('/api/auth/me/'), 401, 'You must be logged in to do that.')

    def test_login_is_rate_limited(self):
        for _ in range(10):
            self.post('/api/auth/login/', {'email': 'owner@example.com', 'password': 'nope-nope'})
        self.assertError(self.post('/api/auth/login/', {'email': 'owner@example.com', 'password': self.password}), 429)

    def test_every_protected_endpoint_requires_login(self):
        for url in PROTECTED:
            self.assertError(self.client.get(url), 401, 'You must be logged in to do that.')
        self.assertError(self.post('/api/projects/', {'name': 'x'}), 401)


class CsrfTests(ApiTestCase):
    def test_state_changing_request_needs_csrf_token(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.user)
        r = client.post('/api/measurements/', {'sectionType': 'walls', 'values': {'a': 1}}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertIn('security token', r.json()['error'])

        token = client.get('/api/auth/me/').cookies['phb_csrftoken'].value
        r = client.post('/api/measurements/', {'sectionType': 'walls', 'values': {'a': 1}}, format='json',
                        HTTP_X_CSRFTOKEN=token)
        self.assertEqual(r.status_code, 201)


class ProfileAndPasswordTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login()

    def profile(self, **overrides):
        return {'name': 'New Name', 'email': 'owner@example.com', 'phone': '0249999999', 'profession': 'Contractor', **overrides}

    def test_update_profile_records_history(self):
        data = self.assertSuccess(self.put('/api/account/profile/', self.profile()))
        self.assertEqual(data['name'], 'New Name')
        h = self.last_history()
        self.assertEqual((h.entity_type, h.action, h.module, h.user_id), ('account', 'updated', 'Settings', self.user.id))
        self.assertEqual(h.summary, 'Profile was updated (name, email, phone, profession).')

    def test_member_can_change_own_profession(self):
        data = self.assertSuccess(self.put('/api/account/profile/', self.profile(profession='Draftsman')))
        self.assertEqual((data['profession'], data['role']), ('Draftsman', 'Member'))

    def test_profile_can_never_grant_admin(self):
        data = self.assertSuccess(self.put('/api/account/profile/', self.profile(role='Admin', accessLevel='Admin')))
        self.assertEqual(data['role'], 'Member')
        self.assertFalse(User.objects.get(pk=self.user.pk).is_admin)
        self.assertError(self.put('/api/account/profile/', self.profile(profession='Admin')), 422, field='profession')

    def test_admin_editing_profile_stays_admin(self):
        admin = self.make_user('admin@example.com', role='Admin', profession=None)
        self.login(admin)
        data = self.assertSuccess(self.put('/api/account/profile/', self.profile(email='admin@example.com', profession='Site Manager')))
        self.assertEqual((data['role'], data['profession']), ('Admin', 'Site Manager'))

    def test_email_taken_by_another_user(self):
        self.make_user('taken@example.com')
        r = self.put('/api/account/profile/', self.profile(email='Taken@Example.com'))
        self.assertError(r, 422, field='email', field_message='That email address is already in use.')

    def test_password_change_flow(self):
        r = self.post('/api/account/password/', {'currentPassword': 'wrong', 'newPassword': 'Another-Pass-9', 'confirmNewPassword': 'Another-Pass-9'})
        self.assertError(r, 422, field='currentPassword', field_message='Current password is incorrect.')
        r = self.post('/api/account/password/', {'currentPassword': self.password, 'newPassword': 'Another-Pass-9', 'confirmNewPassword': 'Different-9'})
        self.assertError(r, 422, field='confirmNewPassword', field_message='New password and confirmation do not match.')
        self.assertSuccess(self.post('/api/account/password/', {'currentPassword': self.password, 'newPassword': 'Another-Pass-9', 'confirmNewPassword': 'Another-Pass-9'}))
        self.assertSuccess(self.client.get('/api/auth/me/'))  # this session survives
        fresh = APIClient()
        self.assertEqual(fresh.post('/api/auth/login/', {'email': 'owner@example.com', 'password': self.password}, format='json').status_code, 401)
        self.assertEqual(fresh.post('/api/auth/login/', {'email': 'owner@example.com', 'password': 'Another-Pass-9'}, format='json').status_code, 200)


class AdminRoleTests(ApiTestCase):
    def test_non_admin_is_forbidden(self):
        self.login()
        self.assertError(self.client.get('/api/users/'), 403)
        self.assertError(self.patch(f'/api/users/{self.user.id}/role/', {'role': 'Admin'}), 403)

    def test_even_an_admin_cannot_promote_through_the_website(self):
        admin = self.make_user('admin@example.com', role='Admin', name='Boss')
        self.login(admin)
        r = self.patch(f'/api/users/{self.user.id}/role/', {'role': 'Admin'})
        self.assertError(r, 422, field='role', field_message=(
            'Admin access cannot be granted through the website. Someone with server access must run: python manage.py create_admin'))
        self.assertFalse(User.objects.get(pk=self.user.pk).is_admin)

    def test_admin_can_list_users_and_demote(self):
        admin = self.make_user('admin@example.com', role='Admin', name='Boss')
        other = self.make_user('admin2@example.com', role='Admin', name='Second')
        self.login(admin)
        r = self.client.get('/api/users/')
        self.assertEqual(len(self.assertSuccess(r)), 3)
        self.assertEqual(r.json()['accessLevels'], ['Member', 'Admin'])
        data = self.assertSuccess(self.patch(f'/api/users/{other.id}/role/', {'role': 'Member'}))
        self.assertEqual(data['role'], 'Member')
        self.assertError(self.patch('/api/users/999999/role/', {'role': 'Member'}), 404)
        self.assertError(self.patch(f'/api/users/{self.user.id}/role/', {'role': 'Contractor'}), 422, field='role')

    def test_last_admin_cannot_be_demoted(self):
        admin = self.make_user('admin@example.com', role='Admin')
        self.login(admin)
        self.assertError(self.patch(f'/api/users/{admin.id}/role/', {'role': 'Member'}), 422, field='role')
        self.assertTrue(User.objects.get(pk=admin.pk).is_admin)
