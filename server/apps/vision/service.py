"""
Camera Scanner measuring with Claude (Anthropic) vision.

How it works
------------
A single photo has no scale: a far-away wall looks like a near small one.
So the person puts a REFERENCE OBJECT of known size in the shot:

  * "card" - the PhentiBuild reference card, or any bank / ID card
             (they are all the same ISO size: 85.6 mm x 54.0 mm)
  * "a4"   - a sheet of A4 paper (210 mm x 297 mm), better for walls
  * "none" - identify the object only; no measurements are possible

Claude looks at the photo, says what the object is (one of the scanner's
object types), finds the reference, and estimates the sizes from it.

Nothing here is trusted blindly. The server:
  * only sends photos that really are JPEG / PNG / WebP, under 5 MB;
  * forces Claude's answer into a fixed JSON shape (structured outputs);
  * drops sizes when no reference was found, or when they are outside
    what is physically plausible for that object;
  * never invents a result: "not recognised" / "no reference" are normal
    answers, and every result is shown to the person to check and correct
    before anything is saved.

The API key is read from settings (server .env) and never leaves the server.
Photos are sent to Anthropic for analysis and are not stored by PhentiBuild.
"""
from __future__ import annotations

import base64
import binascii
import json
import logging
from dataclasses import dataclass
from functools import lru_cache

from django.conf import settings

logger = logging.getLogger('phentibuild.vision')

OBJECT_TYPES = [
    {'id': 'timber_2x2', 'category': 'timber', 'label': '2 × 2 Timber'},
    {'id': 'timber_2x3', 'category': 'timber', 'label': '2 × 3 Timber'},
    {'id': 'timber_2x4', 'category': 'timber', 'label': '2 × 4 Timber'},
    {'id': 'timber_2x6', 'category': 'timber', 'label': '2 × 6 Timber'},
    {'id': 'timber_4x4', 'category': 'timber', 'label': '4 × 4 Timber'},
    {'id': 'exposed_wall', 'category': 'wall', 'label': 'Exposed Wall (length, height, surface area)'},
]
LABELS = {t['id']: t['label'] for t in OBJECT_TYPES}

REFERENCES = {
    'card': {'label': 'PhentiBuild card or any bank / ID card', 'size': '85.6 mm x 54.0 mm (ISO/IEC 7810 ID-1)'},
    'a4': {'label': 'A4 sheet of paper', 'size': '210 mm x 297 mm'},
    'none': {'label': 'No reference object', 'size': None},
}

# Plausible real-world ranges, in metres. Anything outside is dropped.
TIMBER_LENGTH_RANGE = (0.1, 12.0)
WALL_LENGTH_RANGE = (0.3, 60.0)
WALL_HEIGHT_RANGE = (0.3, 15.0)

ALLOWED_MEDIA_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # the Claude API's per-image limit
LOW_CONFIDENCE = 0.5

# Claude must answer in exactly this shape (structured outputs).
RESULT_SCHEMA = {
    'type': 'object',
    'properties': {
        'objectType': {'type': 'string', 'enum': [t['id'] for t in OBJECT_TYPES] + ['unknown']},
        'referenceFound': {'type': 'boolean'},
        'lengthM': {'anyOf': [{'type': 'number'}, {'type': 'null'}]},
        'heightM': {'anyOf': [{'type': 'number'}, {'type': 'null'}]},
        'confidence': {'type': 'number'},
        'explanation': {'type': 'string'},
    },
    'required': ['objectType', 'referenceFound', 'lengthM', 'heightM', 'confidence', 'explanation'],
    'additionalProperties': False,
}

SYSTEM_PROMPT = """You measure construction materials from a single site photo for PhentiBuild, a construction estimating app used in Ghana.

Classify the main object as exactly one of:
- timber_2x2, timber_2x3, timber_2x4, timber_2x6, timber_4x4: a piece of sawn timber. Nominal cross-sections: 2x2 = 50x50 mm, 2x3 = 50x75 mm, 2x4 = 50x100 mm, 2x6 = 50x150 mm, 4x4 = 100x100 mm. Decide the section from the visible end or faces compared with the reference object.
- exposed_wall: a wall face (blockwork, brick or plastered).
- unknown: anything else, several candidate objects, or a photo too unclear to judge.

Measuring:
- Sizes can only be measured from the reference object described in the user message. Find it first and set referenceFound accordingly.
- If the reference is not clearly visible, or none was used, set referenceFound to false and lengthM and heightM to null. Never estimate sizes from experience or typical dimensions.
- Timber: lengthM is the visible length of the piece; heightM is null. If the whole length is not in the photo, set lengthM to null and say so.
- Wall: lengthM is the horizontal length and heightM the vertical height of the wall face.
- Report metres. Account for perspective: the reference is only a reliable scale near its own plane.

confidence is 0 to 1: how sure you are of the classification and sizes together. Be conservative; use below 0.5 when the reference is small, far away, tilted, or partly hidden.
explanation: one or two plain sentences for a site worker, saying what you saw and how you measured it."""


class VisionUnavailable(Exception):
    """The analysis could not be done right now (network, rate limit, bad reply)."""


class InvalidImage(ValueError):
    """The uploaded data is not an acceptable photo."""


@dataclass(frozen=True)
class Photo:
    data_base64: str
    media_type: str
    size_bytes: int


def is_configured() -> bool:
    return bool(settings.ANTHROPIC_API_KEY)


def validate_photo(image_base64: str, media_type: str) -> Photo:
    """Decode and check the photo BEFORE anything is sent anywhere."""
    if media_type not in ALLOWED_MEDIA_TYPES:
        raise InvalidImage('Photos must be JPEG, PNG or WebP.')
    cleaned = ''.join(image_base64.split())
    try:
        raw = base64.b64decode(cleaned, validate=True)
    except (binascii.Error, ValueError):
        raise InvalidImage('The captured image could not be read.')
    if len(raw) > MAX_IMAGE_BYTES:
        raise InvalidImage('too_large')
    signatures = {
        'image/jpeg': raw.startswith(b'\xff\xd8\xff'),
        'image/png': raw.startswith(b'\x89PNG\r\n\x1a\n'),
        'image/webp': raw[:4] == b'RIFF' and raw[8:12] == b'WEBP',
    }
    if len(raw) < 100 or not signatures[media_type]:
        raise InvalidImage('The captured image could not be read.')
    return Photo(data_base64=base64.b64encode(raw).decode('ascii'), media_type=media_type, size_bytes=len(raw))


@lru_cache(maxsize=1)
def _client(api_key: str):
    import anthropic  # imported lazily: the app runs fine without a key

    # The person is waiting on the scanner screen: fail fast, retry once.
    return anthropic.Anthropic(api_key=api_key, timeout=90.0, max_retries=1)


def _ask_claude(photo: Photo, reference: str) -> dict:
    import anthropic

    ref = REFERENCES[reference]
    if ref['size']:
        ref_text = f"Reference object in the photo: {ref['label']}, real size {ref['size']}."
    else:
        ref_text = 'No reference object was placed in the photo: identify the object only and do not measure.'

    try:
        response = _client(settings.ANTHROPIC_API_KEY).beta.messages.create(
            model=settings.VISION_MODEL,
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            messages=[{
                'role': 'user',
                'content': [
                    {'type': 'image', 'source': {'type': 'base64', 'media_type': photo.media_type, 'data': photo.data_base64}},
                    {'type': 'text', 'text': ref_text},
                ],
            }],
            output_config={'effort': 'medium', 'format': {'type': 'json_schema', 'schema': RESULT_SCHEMA}},
            # If a safety classifier declines, retry on Anthropic's recommended model instead of failing.
            betas=['server-side-fallback-2026-07-01'],
            fallbacks='default',
        )
    except anthropic.AuthenticationError:
        logger.error('Vision: the Anthropic API key was rejected (check ANTHROPIC_API_KEY).')
        raise VisionUnavailable('The photo analysis service is not set up correctly. Enter the measurements manually.')
    except anthropic.PermissionDeniedError:
        logger.error('Vision: the Anthropic API key lacks permission for %s.', settings.VISION_MODEL)
        raise VisionUnavailable('The photo analysis service is not set up correctly. Enter the measurements manually.')
    except anthropic.RateLimitError:
        raise VisionUnavailable('The photo analysis service is busy. Wait a minute and try again, or enter the measurements manually.')
    except anthropic.BadRequestError as exc:
        logger.warning('Vision: request rejected: %s', getattr(exc, 'message', exc))
        raise VisionUnavailable('This photo could not be analysed. Try another photo, or enter the measurements manually.')
    except anthropic.APIStatusError as exc:
        logger.warning('Vision: API error %s (request %s).', exc.status_code, getattr(exc, 'request_id', None))
        raise VisionUnavailable('The photo analysis service had a problem. Try again shortly, or enter the measurements manually.')
    except anthropic.APIConnectionError:
        raise VisionUnavailable('Could not reach the photo analysis service. Check the connection, or enter the measurements manually.')

    if response.stop_reason == 'refusal':
        return {'objectType': 'unknown', 'referenceFound': False, 'lengthM': None, 'heightM': None, 'confidence': 0,
                'explanation': 'This photo could not be analysed.'}
    if response.stop_reason == 'max_tokens':
        raise VisionUnavailable('The photo analysis did not finish. Try again, or enter the measurements manually.')
    text = next((b.text for b in response.content if getattr(b, 'type', None) == 'text'), None)
    try:
        data = json.loads(text or '')
    except json.JSONDecodeError:
        logger.warning('Vision: reply was not valid JSON (request %s).', getattr(response, '_request_id', None))
        raise VisionUnavailable('The photo analysis returned an unreadable answer. Try again, or enter the measurements manually.')
    if not isinstance(data, dict):
        raise VisionUnavailable('The photo analysis returned an unreadable answer. Try again, or enter the measurements manually.')
    return data


def _number(value) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    value = float(value)
    return value if value == value and abs(value) != float('inf') else None  # rejects NaN / inf


def _in_range(value: float | None, bounds: tuple[float, float]) -> float | None:
    return value if value is not None and bounds[0] <= value <= bounds[1] else None


def interpret(raw: dict, reference: str) -> dict:
    """Turn Claude's answer into the scanner's result - with every check applied."""
    object_type = raw.get('objectType') if raw.get('objectType') in LABELS else None
    reference_found = raw.get('referenceFound') is True and reference != 'none'
    confidence = _number(raw.get('confidence'))
    confidence = round(min(1.0, max(0.0, confidence)), 2) if confidence is not None else None
    explanation = str(raw.get('explanation') or '').strip()[:400]

    base = {'objectType': object_type, 'label': LABELS.get(object_type), 'measurements': {}, 'confidence': confidence,
            'referenceFound': reference_found, 'explanation': explanation}

    if object_type is None:
        return {**base, 'status': 'not_recognised', 'confidence': None,
                'message': 'No timber piece or wall could be recognised in this photo. Retake it with the object filling '
                           'most of the frame, or enter the details manually.'}

    if not reference_found:
        hint = ('No reference object was used, so sizes cannot be measured from the photo.' if reference == 'none'
                else 'The reference card was not found in the photo, so sizes cannot be measured. Hold it flat against '
                     'the object, in good light, and retake.')
        return {**base, 'status': 'no_reference', 'message': f'{hint} Enter the sizes manually below.'}

    length = _number(raw.get('lengthM'))
    height = _number(raw.get('heightM'))
    dropped = False
    if object_type.startswith('timber_'):
        checked = _in_range(length, TIMBER_LENGTH_RANGE)
        dropped = length is not None and checked is None
        measurements = {'length': f'{checked:.2f}'} if checked is not None else {}
    else:
        checked_l = _in_range(length, WALL_LENGTH_RANGE)
        checked_h = _in_range(height, WALL_HEIGHT_RANGE)
        dropped = (length is not None and checked_l is None) or (height is not None and checked_h is None)
        measurements = {}
        if checked_l is not None:
            measurements['length'] = f'{checked_l:.2f}'
        if checked_h is not None:
            measurements['height'] = f'{checked_h:.2f}'
        if checked_l is not None and checked_h is not None:
            measurements['surfaceArea'] = f'{checked_l * checked_h:.2f}'

    notes = []
    if dropped:
        notes.append('A size outside the realistic range for this object was ignored.')
    if not measurements:
        notes.append('The sizes could not be measured reliably; enter them manually.')
    if confidence is not None and confidence < LOW_CONFIDENCE:
        notes.append('Low confidence: check every value carefully.')
    message = ' '.join([explanation or 'Object identified from the photo.'] + notes + ['Check the values, correct them if needed, then confirm.'])
    return {**base, 'status': 'detected', 'measurements': measurements, 'message': message}


def analyse(photo: Photo, reference: str) -> dict:
    return interpret(_ask_claude(photo, reference), reference)


NOT_CONFIGURED = {
    'status': 'not_configured', 'objectType': None, 'label': None, 'measurements': {}, 'confidence': None,
    'referenceFound': False, 'explanation': '',
    'message': 'Automatic measuring is not switched on for this server, so nothing was detected. Enter the object type '
               'and measurements manually below.',
}
