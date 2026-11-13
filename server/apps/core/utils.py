"""Small shared helpers: request body parsing, formatting, PHP-compatible rounding."""
from __future__ import annotations

import json
import re
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.core.exceptions import RequestDataTooBig

from .responses import ApiError


def _reject_constant(name: str):
    # json.loads accepts NaN/Infinity by default; PHP's json_decode does not.
    raise ValueError(f'invalid JSON constant {name}')


def json_input(request) -> dict[str, Any]:
    """
    Port of phb_json_input(): reads the raw body regardless of
    Content-Type. Empty body → {}. Malformed JSON, or JSON that is not an
    object → 400 "Request body must be valid JSON.".
    """
    try:
        raw = request.body
    except RequestDataTooBig:
        raise ApiError('Request body is too large.', 413)
    if not raw or not raw.strip():
        return {}
    try:
        decoded = json.loads(raw.decode('utf-8'), parse_constant=_reject_constant)
    except (ValueError, UnicodeDecodeError):
        raise ApiError('Request body must be valid JSON.', 400)
    if not isinstance(decoded, dict):
        raise ApiError('Request body must be valid JSON.', 400)
    return decoded


def fmt_datetime(value: datetime | None) -> str | None:
    """MySQL DATETIME text format, exactly what PDO returned to PHP."""
    return value.strftime('%Y-%m-%d %H:%M:%S') if value else None


def fmt_date(value: date | None) -> str | None:
    return value.strftime('%Y-%m-%d') if value else None


def php_round(value: float | Decimal, places: int) -> float:
    """PHP round(): halves round AWAY from zero (Python's round() would
    round 2.5 to 2). Decimal(str(x)) mirrors PHP's pre-rounding of floats."""
    quant = Decimal(1).scaleb(-places)
    return float(Decimal(str(value)).quantize(quant, rounding=ROUND_HALF_UP))


def to_decimal(value: Any, places: int) -> Decimal:
    """Value as MySQL would store it in a DECIMAL(_, places) column
    (MySQL also rounds half away from zero)."""
    return Decimal(str(value).strip()).quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP)


_TAGS = re.compile(r'<[^>]*>')


def strip_tags(value: str) -> str:
    """Close equivalent of PHP strip_tags() for plain text fields."""
    return _TAGS.sub('', value)


def flag(request, name: str) -> bool:
    """PHP !empty($_GET[name]) — present and not '' / '0'."""
    value = request.query_params.get(name)
    return value not in (None, '', '0')
