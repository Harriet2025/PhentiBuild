"""`manage.py create_admin` — the only way to make an Admin — and the profession schema upgrade."""
from __future__ import annotations

import io
import os
from unittest import mock

from django.core.management import CommandError, call_command
from django.db import connection
from django.test import TransactionTestCase

from apps.accounts.models import User
from apps.core.schema_upgrades import apply_all
from apps.history.models import History

from .base import ApiTestCase


def run(*args) -> str:
    out = io.StringIO()
    call_command('create_admin', *args, stdout=out)
    return out.getvalue()


NEW = ['--email', 'a@example.com', '--name', 'Akua', '--phone', '0241112222']


class CreateAdminCommandTests(ApiTestCase):
    def test_creates_new_admin_who_can_log_in(self):
        with mock.patch.dict(os.environ, {'PHB_ADMIN_PW': 'Server-Only-1'}):
            out = run('--email', 'Boss@Example.com', '--name', 'Boss', '--phone', '0241112222',
                      '--profession', 'Contractor', '--password-env', 'PHB_ADMIN_PW', '--no-input')
        self.assertIn('Admin account created', out)
        self.assertNotIn('Server-Only-1', out)  # never echoes the password
        user = User.objects.get(email='boss@example.com')
        self.assertTrue(user.is_admin)
        self.assertEqual(user.profession, 'Contractor')
        self.assertTrue(user.password.startswith('$2y$'))
        data = self.assertSuccess(self.post('/api/auth/login/', {'email': 'boss@example.com', 'password': 'Server-Only-1'}))
        self.assertEqual(data['role'], 'Admin')
        self.assertTrue(History.objects.filter(entity_id=str(user.pk), summary__contains='create_admin').exists())

    def test_promotes_existing_member_without_touching_password(self):
        old_hash = self.user.password
        self.assertIn('is now an Admin', run('--email', 'OWNER@example.com', '--no-input'))
        user = User.objects.get(pk=self.user.pk)
        self.assertTrue(user.is_admin)
        self.assertEqual(user.password, old_hash)
        self.assertEqual(user.profession, 'Contractor')
        self.assertIn('already an Admin', run('--email', 'owner@example.com', '--no-input'))

    def test_interactive_prompts_with_hidden_password(self):
        with mock.patch('builtins.input', side_effect=['Akua Boss', '0241112222']), \
             mock.patch('getpass.getpass', side_effect=['Typed-Hidden-1', 'Typed-Hidden-1']):
            run('--email', 'akua@example.com')
        self.assertTrue(User.objects.get(email='akua@example.com').is_admin)

    def test_refuses_bad_input_and_creates_nothing(self):
        cases = [
            (['--email', 'not-an-email', '--no-input'], {}),
            (['--email', 'a@example.com', '--no-input'], {}),                       # new account, no details
            (NEW + ['--no-input'], {}),                                              # no password source
            (NEW + ['--password-env', 'PW', '--no-input'], {}),                      # env var not set
            (NEW + ['--password-env', 'PW', '--no-input'], {'PW': 'short'}),         # too short
            (['--email', 'a@example.com', '--name', 'A', '--phone', '0241112222', '--password-env', 'PW', '--no-input'], {'PW': 'Long-Enough-1'}),
            (['--email', 'a@example.com', '--name', 'Akua', '--phone', '12', '--password-env', 'PW', '--no-input'], {'PW': 'Long-Enough-1'}),
        ]
        for args, env in cases:
            with self.subTest(args=args, env=bool(env)):
                with mock.patch.dict(os.environ, env):
                    if not env:
                        os.environ.pop('PW', None)
                    with self.assertRaises(CommandError):
                        run(*args)
        self.assertFalse(User.objects.filter(role='Admin').exists())

    def test_mismatched_passwords_create_nothing(self):
        with mock.patch('builtins.input', side_effect=['Akua Boss', '0241112222']), \
             mock.patch('getpass.getpass', side_effect=['Typed-Hidden-1', 'Different-2']):
            with self.assertRaises(CommandError):
                run('--email', 'akua@example.com')
        self.assertFalse(User.objects.filter(email='akua@example.com').exists())


class ProfessionUpgradeTests(TransactionTestCase):
    """ALTER TABLE commits implicitly in MySQL, so this test cleans up after itself."""
    EMAILS = ['u@example.com', 'qs@example.com', 'ad@example.com']

    def tearDown(self):
        apply_all(connection)
        User.objects.filter(email__in=self.EMAILS).delete()

    def test_upgrade_is_idempotent_and_backfills_from_old_role(self):
        self.assertEqual(apply_all(connection), [])  # the test runner already applied it
        with connection.cursor() as c:
            c.execute('ALTER TABLE users DROP COLUMN profession')  # simulate an old (PHP-era) backup
        for email, role in [('u@example.com', 'User'), ('qs@example.com', 'Quantity Surveyor'), ('ad@example.com', 'Admin')]:
            with connection.cursor() as c:
                c.execute("INSERT INTO users (name, email, phone, password_hash, role) VALUES ('X Y', %s, '0241234567', '!', %s)", [email, role])
        self.assertEqual(len(apply_all(connection)), 1)
        got = dict(User.objects.filter(email__in=self.EMAILS).values_list('email', 'profession'))
        self.assertEqual(got, {'u@example.com': 'Other', 'qs@example.com': 'Quantity Surveyor', 'ad@example.com': None})
        self.assertEqual(apply_all(connection), [])  # second run changes nothing
        self.assertEqual(User.objects.get(email='ad@example.com').role, 'Admin')  # role column untouched
