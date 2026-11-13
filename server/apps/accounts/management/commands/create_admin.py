"""
python manage.py create_admin --email you@example.com

The ONLY way to make someone an Admin. It runs on the server itself (your
computer, or the Coolify container's terminal), so only a person with
server access can use it — there is no web page or API that does this.

  * Email belongs to an existing account  -> that account becomes Admin.
    Its password is NOT changed.
  * Email is new -> a new Admin account is created. You are asked for the
    name, phone and password; the password is typed hidden and twice.

Options for scripts (e.g. a first deploy):
  --name, --phone, --profession   skip those questions
  --password-env VAR              read the password from environment
                                  variable VAR instead of asking (it is
                                  never accepted on the command line,
                                  where it would be saved in shell history)
  --no-input                      never ask anything; fail if info is missing
"""
from __future__ import annotations

import getpass
import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import ADMIN, PROFESSIONS, User
from apps.core.validator import Validator
from apps.history.models import History

MIN_PASSWORD = 8


class Command(BaseCommand):
    help = 'Create a new Admin account, or make an existing account an Admin (server access only).'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True)
        parser.add_argument('--name')
        parser.add_argument('--phone')
        parser.add_argument('--profession', choices=PROFESSIONS)
        parser.add_argument('--password-env', metavar='VAR')
        parser.add_argument('--no-input', action='store_true')

    def handle(self, *args, email, name, phone, profession, password_env, no_input, **options):
        self.interactive = not no_input
        email = email.strip().lower()
        self._check({'email': email}, lambda v: v.required('email', 'Email').email('email', 'Email').max_length('email', 255, 'Email'))

        user = User.objects.filter(email__iexact=email).first()
        if user is not None:
            if user.is_admin:
                self.stdout.write(f'{user.name} <{user.email}> is already an Admin — nothing changed.')
                return
            User.objects.filter(pk=user.pk).update(role=ADMIN)
            self._log(user.pk, f'{user.name} was made an Admin on the server (create_admin).')
            self.stdout.write(self.style.SUCCESS(f'{user.name} <{user.email}> is now an Admin. Password unchanged.'))
            return

        name = (name or self._ask('Full name: ')).strip()
        phone = (phone or self._ask('Phone: ')).strip()
        self._check({'name': name, 'phone': phone}, lambda v: (
            v.required('name', 'Name').min_length('name', 2, 'Name').max_length('name', 255, 'Name'),
            v.required('phone', 'Phone').phone('phone', 'Phone'),
        ))
        password = self._password(password_env)

        with transaction.atomic():
            user = User.objects.create_user(email=email, password=password, name=name, phone=phone,
                                            profession=profession, role=ADMIN)
            self._log(user.pk, f'Admin account for {user.name} was created on the server (create_admin).')
        self.stdout.write(self.style.SUCCESS(f'Admin account created for {user.name} <{user.email}>. They can log in now.'))

    # ------------------------------------------------------------------
    def _ask(self, prompt: str) -> str:
        if not self.interactive:
            raise CommandError(f'Missing value for "{prompt.rstrip(": ")}" and --no-input was given.')
        return input(prompt)

    def _password(self, env_var: str | None) -> str:
        if env_var:
            password = os.environ.get(env_var, '')
            if not password:
                raise CommandError(f'Environment variable {env_var} is empty or not set.')
        else:
            if not self.interactive:
                raise CommandError('With --no-input you must give --password-env VAR.')
            password = getpass.getpass('Password (hidden): ')
            if getpass.getpass('Password again: ') != password:
                raise CommandError('The two passwords do not match. Nothing was created.')
        if len(password) < MIN_PASSWORD:
            raise CommandError(f'Password must be at least {MIN_PASSWORD} characters. Nothing was created.')
        if len(password) > 255:
            raise CommandError('Password must be at most 255 characters. Nothing was created.')
        return password

    @staticmethod
    def _check(data: dict, rules) -> None:
        v = Validator(data)
        rules(v)
        if v.fails():
            raise CommandError(' '.join(v.errors().values()) + ' Nothing was changed.')

    @staticmethod
    def _log(user_id: int, summary: str) -> None:
        # Audit trail: shows up on the History page like any other change.
        History.objects.create(entity_type='account', entity_id=str(user_id), user_id=None,
                               module='Settings', action='updated', summary=summary, details={'role': ADMIN})
