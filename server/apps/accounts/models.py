"""
The existing `users` table, used exactly as it is (managed = False:
Django never creates, alters or drops it).

Passwords stay in PHP's bcrypt format ("$2y$..."), in the same
`password_hash` column, so:
  - every existing account logs in with its current password
  - a password set through Django still works in the PHP app
"""
from __future__ import annotations

import bcrypt
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models
from django.db.models.functions import Now

from apps.core.utils import fmt_datetime

# Values the `role` COLUMN may hold (the PHP-era ENUM — unchanged so the PHP
# app keeps working). Since the profession split, Django only cares whether
# it is 'Admin' or not; new accounts get 'User'.
ROLES = ['User', 'Contractor', 'Site Manager', 'Quantity Surveyor', 'Draftsman', 'Admin']
ADMIN = 'Admin'
MEMBER_ROLE = 'User'

# What the API calls the two access levels.
ACCESS_ADMIN = 'Admin'
ACCESS_MEMBER = 'Member'
ACCESS_LEVELS = [ACCESS_MEMBER, ACCESS_ADMIN]

# What a person does — they choose it themselves (users.profession).
PROFESSIONS = ['Contractor', 'Site Manager', 'Quantity Surveyor', 'Draftsman', 'Other']

# Same cost PHP's PASSWORD_DEFAULT would move to on modern hardware.
BCRYPT_ROUNDS = 12
# bcrypt only uses the first 72 bytes; PHP silently truncates, the Python
# library raises — so truncate explicitly, exactly like PHP.
_BCRYPT_MAX_BYTES = 72
# Dummy hash for timing-equalisation on unknown emails (from User.php).
DUMMY_HASH = '$2y$10$abcdefghijklmnopqrstuuJ8x9nF1z8m1e6i5r6c8e8f2g4h6i8k0lO'


def hash_password(raw: str) -> str:
    hashed = bcrypt.hashpw(raw.encode('utf-8')[:_BCRYPT_MAX_BYTES], bcrypt.gensalt(BCRYPT_ROUNDS)).decode()
    # $2b$ and $2y$ are the same algorithm; $2y$ is what PHP writes/expects.
    return '$2y$' + hashed[4:]


def verify_password(raw: str, stored: str | None) -> bool:
    if not stored or not stored.startswith(('$2y$', '$2b$', '$2a$')):
        return False
    try:
        return bcrypt.checkpw(raw.encode('utf-8')[:_BCRYPT_MAX_BYTES], stored.encode())
    except ValueError:
        return False


class UserManager(BaseUserManager):
    def create_user(self, email: str, password: str | None, **extra) -> 'User':
        """password=None creates an account that can only sign in with Google."""
        user = self.model(email=email.lower(), **extra)
        if password is None:
            user.set_unusable_password()
        else:
            user.set_password(password)
        user.save(using=self._db)
        user.refresh_from_db()
        return user


class User(AbstractBaseUser):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.CharField(max_length=255, unique=True)
    phone = models.CharField(max_length=30)
    password = models.CharField(max_length=255, db_column='password_hash')
    # Access level only: 'Admin' = administrator, anything else = member.
    # Never set from the website to 'Admin' — see create_admin command.
    role = models.CharField(max_length=20, choices=[(r, r) for r in ROLES], default=MEMBER_ROLE)
    # Job/profession, chosen by the person (added by apps/core/schema_upgrades.py).
    profession = models.CharField(max_length=40, null=True, blank=True, default=None)
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    # The table has no last_login column — removing the inherited field
    # also stops Django from trying to write it on every login.
    last_login = None
    is_active = True

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name', 'phone']

    objects = UserManager()

    class Meta:
        managed = False
        db_table = 'users'

    # ---- PHP-compatible password handling -----------------------------
    def set_password(self, raw_password: str | None) -> None:
        self.password = hash_password(raw_password or '')
        self._password = raw_password

    def check_password(self, raw_password: str) -> bool:
        return verify_password(raw_password, self.password)

    def set_unusable_password(self) -> None:
        self.password = '!'

    def has_usable_password(self) -> bool:
        return self.password.startswith(('$2y$', '$2b$', '$2a$'))

    @property
    def is_admin(self) -> bool:
        return self.role == ADMIN

    @property
    def access_level(self) -> str:
        return ACCESS_ADMIN if self.is_admin else ACCESS_MEMBER

    def to_dict(self) -> dict:
        """Same shape as User::sanitize() plus `profession` — never includes the hash.

        `role` is now the access level: 'Admin' or 'Member'.
        """
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'role': self.access_level,
            'profession': self.profession,
            # False for Google-only accounts: Settings then offers "set a password".
            'hasPassword': self.has_usable_password(),
            'created_at': fmt_datetime(self.created_at),
            'updated_at': fmt_datetime(self.updated_at),
        }

    def __str__(self) -> str:
        return f'{self.name} <{self.email}>'
