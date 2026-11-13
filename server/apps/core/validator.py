"""
Port of backend/core/Validator.php — rule for rule, message for message.

Behaviour kept identical to the PHP version so the frontend keeps showing
exactly the same field errors:
  - a field is "present" when it exists and is neither None nor ''
  - the FIRST error per field wins; later rules on that field are skipped
  - every rule except required() silently skips absent fields
  - validated() returns only fields named by required()/optional() that are
    present, with strings trimmed — anything else the client sent is dropped
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Iterable

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email

# PHP is_numeric(): optional surrounding whitespace, sign, digits/decimal,
# optional exponent. Rejects '', 'abc', '1_000', 'inf', 'nan', '0x1A'.
_PHP_NUMERIC = re.compile(r'^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?\s*$')
_DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
_PHONE_STRIP = re.compile(r'[\s\-().]')
_PHONE = re.compile(r'^\+?\d{7,15}$')


def is_php_numeric(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, (int, float)):
        return value == value and value not in (float('inf'), float('-inf'))
    return isinstance(value, str) and bool(_PHP_NUMERIC.match(value))


def is_valid_email(value: str) -> bool:
    try:
        validate_email(value)
        return True
    except DjangoValidationError:
        return False


def is_valid_phone(value: str) -> bool:
    return bool(_PHONE.match(_PHONE_STRIP.sub('', value)))


def is_valid_date(value: str) -> bool:
    if not _DATE.match(value):
        return False
    try:
        datetime.strptime(value, '%Y-%m-%d')
        return True
    except ValueError:
        return False


def _as_text(value: Any) -> str | None:
    """PHP's (string) cast for scalars; None for arrays/objects."""
    if isinstance(value, bool):
        return '1' if value else ''
    if isinstance(value, (str, int, float)):
        return str(value)
    return None


def _num_label(num: float) -> str:
    """Format a bound the way PHP interpolates it ("0", "0.5", "200")."""
    return str(int(num)) if float(num).is_integer() else str(num)


class Validator:
    def __init__(self, data: dict[str, Any]):
        self.data = data
        self._errors: dict[str, str] = {}
        self._touched: dict[str, bool] = {}

    # ---- helpers -------------------------------------------------------
    def value(self, field: str) -> Any:
        return self.data.get(field)

    def has(self, field: str) -> bool:
        return field in self.data and self.data[field] is not None and self.data[field] != ''

    def _fail(self, field: str, message: str) -> None:
        self._errors.setdefault(field, message)

    def _skip(self, field: str) -> bool:
        return field in self._errors or not self.has(field)

    @staticmethod
    def _label(field: str, label: str | None) -> str:
        return label if label is not None else field[:1].upper() + field[1:]

    # ---- rules ---------------------------------------------------------
    def required(self, field: str, label: str) -> 'Validator':
        self._touched[field] = True
        if not self.has(field):
            self._fail(field, f'{label} is required.')
        return self

    def optional(self, field: str) -> 'Validator':
        self._touched[field] = True
        return self

    def string(self, field: str, label: str) -> 'Validator':
        if not self._skip(field) and not isinstance(self.value(field), str):
            self._fail(field, f'{label} must be text.')
        return self

    def min_length(self, field: str, minimum: int, label: str | None = None) -> 'Validator':
        if self._skip(field):
            return self
        text = _as_text(self.value(field))
        if text is None:
            self._fail(field, f'{self._label(field, label)} must be text.')
        elif len(text) < minimum:
            self._fail(field, f'{self._label(field, label)} must be at least {minimum} characters.')
        return self

    def max_length(self, field: str, maximum: int, label: str | None = None) -> 'Validator':
        if self._skip(field):
            return self
        text = _as_text(self.value(field))
        if text is None:
            self._fail(field, f'{self._label(field, label)} must be text.')
        elif len(text) > maximum:
            self._fail(field, f'{self._label(field, label)} must be {maximum} characters or fewer.')
        return self

    def in_(self, field: str, allowed: Iterable[str], label: str | None = None) -> 'Validator':
        if self._skip(field):
            return self
        allowed = list(allowed)
        if self.value(field) not in allowed or not isinstance(self.value(field), str):
            self._fail(field, f"{self._label(field, label)} must be one of: {', '.join(allowed)}.")
        return self

    def date(self, field: str, label: str | None = None) -> 'Validator':
        if self._skip(field):
            return self
        text = _as_text(self.value(field))
        if text is None or not is_valid_date(text):
            self._fail(field, f'{self._label(field, label)} must be a valid date (YYYY-MM-DD).')
        return self

    def date_not_before(self, field: str, other: str, label: str | None = None) -> 'Validator':
        if self._skip(field) or not self.has(other):
            return self
        a, b = _as_text(self.value(field)), _as_text(self.value(other))
        if a and b and is_valid_date(a) and is_valid_date(b) and a < b:
            self._fail(field, f'{self._label(field, label)} cannot be before the start date.')
        return self

    def integer_between(self, field: str, minimum: int, maximum: int, label: str | None = None) -> 'Validator':
        if self._skip(field):
            return self
        value = self.value(field)
        ok = is_php_numeric(value)
        if ok:
            num = float(value)
            ok = num.is_integer() and minimum <= num <= maximum
        if not ok:
            self._fail(field, f'{self._label(field, label)} must be a whole number between {minimum} and {maximum}.')
        return self

    def numeric(self, field: str, label: str | None = None, minimum: float | None = None,
                maximum: float | None = None) -> 'Validator':
        if self._skip(field):
            return self
        value = self.value(field)
        if not is_php_numeric(value):
            self._fail(field, f'{self._label(field, label)} must be a number.')
            return self
        num = float(value)
        if minimum is not None and num < minimum:
            self._fail(field, f'{self._label(field, label)} must be {_num_label(minimum)} or more.')
        # Not in the PHP version: an upper bound so an over-large value is a
        # clean 422 instead of a database "out of range" 500.
        elif maximum is not None and num > maximum:
            self._fail(field, f'{self._label(field, label)} must be {_num_label(maximum)} or less.')
        return self

    def email(self, field: str, label: str | None = None) -> 'Validator':
        if self._skip(field):
            return self
        text = _as_text(self.value(field))
        if text is None or not is_valid_email(text):
            self._fail(field, f'{self._label(field, label)} must be a valid email address.')
        return self

    def phone(self, field: str, label: str | None = None) -> 'Validator':
        if self._skip(field):
            return self
        text = _as_text(self.value(field))
        if text is None or not is_valid_phone(text):
            self._fail(field, f'{self._label(field, label)} must be a valid phone number (7–15 digits).')
        return self

    def phone_or_email(self, field: str, label: str | None = None) -> 'Validator':
        if self._skip(field):
            return self
        text = _as_text(self.value(field)) or ''
        if '@' in text:
            if not is_valid_email(text):
                self._fail(field, f'{self._label(field, label)} must be a valid email address.')
        elif not is_valid_phone(text):
            self._fail(field, f'{self._label(field, label)} must be a valid phone number or an email address.')
        return self

    def fail(self, field: str, message: str) -> 'Validator':
        """Add a custom error (first error per field still wins)."""
        self._fail(field, message)
        return self

    # ---- results -------------------------------------------------------
    def fails(self) -> bool:
        return bool(self._errors)

    def errors(self) -> dict[str, str]:
        return dict(self._errors)

    def validated(self) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for key in self._touched:
            if self.has(key):
                value = self.data[key]
                out[key] = value.strip() if isinstance(value, str) else value
        return out
