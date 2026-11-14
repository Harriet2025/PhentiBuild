"""
PhentiBuild — Django settings.

Every environment-specific or secret value comes from environment
variables (a local .env file in development, Coolify's environment
settings in production). Nothing secret is ever written in this file.
See .env.example for the full list.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')  # real environment variables always win


def env(key: str, default: str | None = None) -> str | None:
    value = os.environ.get(key)
    return value if value not in (None, '') else default


def env_bool(key: str, default: bool = False) -> bool:
    value = env(key)
    return default if value is None else value.strip().lower() in ('1', 'true', 'yes', 'on')


def env_list(key: str, default: str = '') -> list[str]:
    return [item.strip() for item in (env(key, default) or '').split(',') if item.strip()]


APP_NAME = 'PhentiBuild'
APP_ENV = env('APP_ENV', 'development')
DEBUG = env_bool('DJANGO_DEBUG', APP_ENV == 'development')
TESTING = 'test' in sys.argv

SECRET_KEY = env('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if DEBUG or TESTING:
        SECRET_KEY = 'dev-only-insecure-key-never-use-in-production'
    else:
        raise RuntimeError('DJANGO_SECRET_KEY must be set in production.')

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1')
CSRF_TRUSTED_ORIGINS = env_list('DJANGO_CSRF_TRUSTED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'rest_framework',
    'apps.core',
    'apps.accounts',
    'apps.history',
    'apps.projects',
    'apps.materials',
    'apps.boq',
    'apps.records',
    'apps.roofing',
    'apps.vision',
    'apps.reports',
    'apps.company',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'apps.core.middleware.BufferRequestBodyMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
TEMPLATES: list = []

# ---------------------------------------------------------------- Database
# MySQL/MariaDB only (MariaDB 10.5+ / MySQL 8.0.11+). The existing tables
# are used as-is (models are managed=False) — Django never alters them.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'HOST': env('DB_HOST', '127.0.0.1'),
        'PORT': env('DB_PORT', '3308'),
        'NAME': env('DB_NAME', 'phentibuild'),
        'USER': env('DB_USER', 'phentibuild_app'),
        'PASSWORD': env('DB_PASSWORD', ''),
        'CONN_MAX_AGE': int(env('DB_CONN_MAX_AGE', '60')),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
        'TEST': {
            'NAME': env('DB_TEST_NAME', 'test_phentibuild'),
            'CHARSET': 'utf8mb4',
            'COLLATION': 'utf8mb4_unicode_ci',
        },
    }
}
DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'
TEST_RUNNER = 'config.test_runner.LegacySchemaTestRunner'

# ------------------------------------------------------------- Auth & users
AUTH_USER_MODEL = 'accounts.User'
AUTHENTICATION_BACKENDS = ['apps.accounts.backends.EmailBcryptBackend']

# Sessions: HttpOnly cookie, same protections as backend/core/session.php.
# Named differently from PHP's phb_session so both backends can run side by
# side on localhost during the migration without clobbering each other.
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_NAME = 'phb_sid'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = env_bool('SESSION_COOKIE_SECURE', not DEBUG)
SESSION_COOKIE_AGE = 30 * 24 * 60 * 60  # used only for "remember me"
REMEMBER_ME_SECONDS = 30 * 24 * 60 * 60

# "Sign in with Google": the OAuth Client ID from Google Cloud Console
# (it is public, not a secret). Empty = Google sign-in switched off.
GOOGLE_CLIENT_ID = env('GOOGLE_CLIENT_ID', '') or ''

# CSRF: the token cookie is readable by JS on purpose (the React app copies
# it into the X-CSRFToken header); the SESSION cookie stays HttpOnly.
CSRF_COOKIE_NAME = 'phb_csrftoken'
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = env_bool('CSRF_COOKIE_SECURE', not DEBUG)
CSRF_FAILURE_VIEW = 'apps.core.exceptions.csrf_failure'

# ------------------------------------------------------- Security (prod)
# Coolify terminates HTTPS at its proxy and forwards X-Forwarded-Proto.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'
if not DEBUG:
    SECURE_HSTS_SECONDS = int(env('SECURE_HSTS_SECONDS', '0'))

# Camera captures arrive as base64 JSON (the scanner caps images at 8 MB).
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# ------------------------------------------------------------------ DRF
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.SessionAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'EXCEPTION_HANDLER': 'apps.core.exceptions.api_exception_handler',
    'DEFAULT_THROTTLE_RATES': {
        'login': env('LOGIN_THROTTLE_RATE', '10/min'),
        'register': env('REGISTER_THROTTLE_RATE', '20/hour'),
        'contact': env('CONTACT_THROTTLE_RATE', '10/hour'),
        # Each scanner analysis is a paid AI call - cap it per user.
        'vision': env('VISION_THROTTLE_RATE', '30/hour'),
    },
    'UNAUTHENTICATED_USER': 'django.contrib.auth.models.AnonymousUser',
}

# --------------------------------------------------------- Time & locale
# The legacy tables store naive local DATETIMEs (MySQL CURRENT_TIMESTAMP),
# exactly as the PHP app wrote them — keep them naive, no UTC conversion.
USE_TZ = False
TIME_ZONE = env('TIME_ZONE', 'Africa/Accra')
LANGUAGE_CODE = 'en-gb'
USE_I18N = False

# ------------------------------------------------------- Integrations
# Camera Scanner measuring (apps/vision/service.py). The key is read ONLY
# on the server and never sent to the browser. Empty = scanner falls back
# to manual entry and says so.
ANTHROPIC_API_KEY = env('ANTHROPIC_API_KEY', '') or ''
VISION_MODEL = env('VISION_MODEL', 'claude-opus-5-5') or 'claude-opus-5-5'

ROOF_AI_API_URL = env('ROOF_AI_API_URL', '') or ''
ROOF_AI_API_KEY = env('ROOF_AI_API_KEY', '') or ''
ROOF_AI_MODEL = env('ROOF_AI_MODEL', 'gpt-4o-mini') or 'gpt-4o-mini'

# ------------------------------------------------------------- Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {'plain': {'format': '[{levelname}] {name}: {message}', 'style': '{'}},
    'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'plain'}},
    'root': {'handlers': ['console'], 'level': env('LOG_LEVEL', 'INFO')},
    'loggers': {'django.request': {'handlers': ['console'], 'level': 'ERROR', 'propagate': False}},
}
