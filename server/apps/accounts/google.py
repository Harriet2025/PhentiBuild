"""
"Sign in with Google" — checking the token Google gives the browser.

How it works (no Google password ever touches PhentiBuild):
  1. The browser shows Google's own button (Google Identity Services).
  2. After the person picks their Google account, Google hands the browser
     a signed "ID token" (a JWT) that says: this is <email>, verified.
  3. The browser sends that token to POST /api/auth/google/.
  4. HERE we check it with Google's official library: the signature must be
     Google's, it must be issued for OUR client id, and not expired. Only
     then do we trust the email inside it.

Turned on by setting GOOGLE_CLIENT_ID (see docs/DEPLOYMENT.md). Without it
the endpoint answers 503 and the frontend hides the button.
"""
from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings


class GoogleUnavailable(Exception):
    """Google's key server could not be reached — try again later."""


class InvalidGoogleToken(Exception):
    """The token is forged, expired, for another app, or the email isn't verified."""


@dataclass(frozen=True)
class GoogleIdentity:
    email: str
    name: str
    subject: str  # Google's permanent id for the account


def is_enabled() -> bool:
    return bool(settings.GOOGLE_CLIENT_ID)


def verify_credential(credential: str) -> GoogleIdentity:
    from google.auth import exceptions as google_exceptions
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    try:
        info = id_token.verify_oauth2_token(credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
    except google_exceptions.TransportError as exc:
        raise GoogleUnavailable() from exc
    except (ValueError, google_exceptions.GoogleAuthError) as exc:
        raise InvalidGoogleToken() from exc

    email = str(info.get('email') or '').strip().lower()
    if not email or info.get('email_verified') is not True:
        raise InvalidGoogleToken()
    name = str(info.get('name') or '').strip() or email.split('@')[0]
    return GoogleIdentity(email=email, name=name[:255], subject=str(info.get('sub') or ''))
