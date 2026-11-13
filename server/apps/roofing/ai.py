"""
AI roof generation — port of backend/services/RoofAIService.php.

Never fabricates a result: with no ROOF_AI_API_URL / ROOF_AI_API_KEY set,
the "unavailable" service answers status='not_configured' and nothing is
generated. Any configured provider's reply is validated against strict
geometry bounds before it can reach the frontend.
"""
from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings

from apps.core.validator import is_php_numeric

logger = logging.getLogger('phentibuild.roof_ai')

ALLOWED_ROOF_TYPES = ['Gable Roof', 'Hip Roof', 'Hidden/Flat Roof']
BOUNDS = {
    'length': (1.0, 200.0),
    'width': (1.0, 200.0),
    'pitch': (0.0, 80.0),
    'rafterSpacing': (100.0, 1200.0),
    'purlinSpacing': (100.0, 1200.0),
}


def empty_result(status: str, message: str) -> dict[str, Any]:
    return {
        'status': status, 'roofType': None, 'footprint': {'length': None, 'width': None},
        'pitch': None, 'rafterSpacing': None, 'purlinSpacing': None,
        'roofingMaterial': None, 'notes': None, 'message': message,
    }


def _fmt(n: float) -> str:
    return str(int(n)) if float(n).is_integer() else str(n)


def validate_geometry(data: dict[str, Any]) -> dict[str, Any]:
    """RoofGeometryValidator::validate"""
    errors: list[str] = []
    clean: dict[str, Any] = {
        'roofType': None, 'footprint': {'length': None, 'width': None}, 'pitch': None,
        'rafterSpacing': None, 'purlinSpacing': None, 'roofingMaterial': None, 'notes': None,
    }

    def check(value: Any, label: str) -> float | None:
        if not is_php_numeric(value):
            errors.append(f'{label} must be a number.')
            return None
        num = float(value)
        low, high = BOUNDS[label]
        if num < low or num > high:
            errors.append(f'{label} must be between {_fmt(low)} and {_fmt(high)}.')
            return None
        return num

    if data.get('roofType') is not None:
        if isinstance(data['roofType'], str) and data['roofType'] in ALLOWED_ROOF_TYPES:
            clean['roofType'] = data['roofType']
        else:
            errors.append(f"roofType must be one of: {', '.join(ALLOWED_ROOF_TYPES)}.")

    footprint = data.get('footprint') if isinstance(data.get('footprint'), dict) else {}
    for dim in ('length', 'width'):
        if footprint.get(dim) is not None:
            clean['footprint'][dim] = check(footprint[dim], dim)

    for field in ('pitch', 'rafterSpacing', 'purlinSpacing'):
        if data.get(field) is not None:
            clean[field] = check(data[field], field)

    if data.get('roofingMaterial') is not None:
        material = data['roofingMaterial']
        if isinstance(material, str) and len(material) <= 120:
            clean['roofingMaterial'] = material.strip() or None
        else:
            errors.append('roofingMaterial must be text of 120 characters or fewer.')

    if isinstance(data.get('notes'), str):
        clean['notes'] = data['notes'].strip()[:500] or None

    return {'ok': not errors, 'errors': errors, 'clean': clean}


class UnavailableRoofAIService:
    def generate(self, request: dict) -> dict:
        return empty_result(
            'not_configured',
            'AI roof generation is not connected yet. No external AI service has been configured '
            '(ROOF_AI_API_URL / ROOF_AI_API_KEY), so nothing was generated — set the roof properties '
            'manually in the panel on the right.',
        )


_SCHEMA = '''{
  "roofType": one of "Gable Roof" | "Hip Roof" | "Hidden/Flat Roof",
  "footprint": { "length": metres, "width": metres },
  "pitch": degrees (0-80),
  "rafterSpacing": millimetres,
  "purlinSpacing": millimetres,
  "roofingMaterial": short product name,
  "notes": one short sentence explaining the choice
}'''
_FENCE = re.compile(r'^```[a-zA-Z]*\n|\n```$')


class HttpRoofAIService:
    """Any OpenAI-compatible Chat Completions endpoint."""

    def __init__(self, api_url: str, api_key: str, model: str):
        self.api_url, self.api_key, self.model = api_url, api_key, model

    def _prompt(self, request: dict) -> str:
        context = json.dumps(request, indent=4)
        return (
            f'Propose a structurally sensible roof design as a single JSON object matching this schema:\n{_SCHEMA}\n\n'
            'Current known project inputs (any field may be blank — fill in a sensible value, keep any that are '
            f'already set unless a different value is clearly better):\n{context}'
        )

    def generate(self, request: dict) -> dict:
        body = json.dumps({
            'model': self.model,
            'messages': [
                {'role': 'system', 'content': 'You are a structural roofing assistant. Reply with ONLY a single JSON '
                                              'object matching the requested schema — no prose, no markdown fences.'},
                {'role': 'user', 'content': self._prompt(request)},
            ],
            'temperature': 0.2,
        }).encode()
        req = urllib.request.Request(self.api_url, data=body, method='POST', headers={
            'Content-Type': 'application/json', 'Authorization': f'Bearer {self.api_key}',
        })
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                raw = resp.read()
        except urllib.error.HTTPError as exc:
            logger.error('Roof AI upstream returned HTTP %s', exc.code)
            return empty_result('upstream_error', f'The AI service returned an error (HTTP {exc.code}).')
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            logger.error('Roof AI upstream call failed: %s', exc)
            return empty_result('upstream_error', 'Could not reach the AI service. Try again shortly.')

        try:
            content = json.loads(raw)['choices'][0]['message']['content']
        except (ValueError, KeyError, IndexError, TypeError):
            content = None
        if not isinstance(content, str):
            return empty_result('invalid_response', 'The AI service response was not in the expected format.')

        text = content.strip()
        if text.startswith('```'):
            text = _FENCE.sub('', text)
        try:
            decoded = json.loads(text)
        except ValueError:
            decoded = None
        if not isinstance(decoded, dict):
            return empty_result('invalid_response', 'The AI service reply could not be parsed as JSON.')

        checked = validate_geometry(decoded)
        if not checked['ok']:
            return empty_result('invalid_response', 'The AI proposal failed validation: ' + ' '.join(checked['errors']))
        c = checked['clean']
        return {
            'status': 'ok', 'roofType': c['roofType'], 'footprint': c['footprint'], 'pitch': c['pitch'],
            'rafterSpacing': c['rafterSpacing'], 'purlinSpacing': c['purlinSpacing'],
            'roofingMaterial': c['roofingMaterial'], 'notes': c['notes'],
            'message': 'AI-generated roof layout proposal — review before accepting.',
        }


def roof_ai_service():
    url, key = settings.ROOF_AI_API_URL.strip(), settings.ROOF_AI_API_KEY.strip()
    if not url or not key:
        return UnavailableRoofAIService()
    return HttpRoofAIService(url, key, settings.ROOF_AI_MODEL.strip() or 'gpt-4o-mini')
