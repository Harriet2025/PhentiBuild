"""Camera Scanner measuring (apps/vision). Claude is replaced by a fake client:
these tests never call the real (paid) API."""
from __future__ import annotations

import base64
import json
from types import SimpleNamespace
from unittest import mock

import anthropic
import httpx2
from django.core.cache import cache
from django.test import override_settings

from apps.vision import service

from .base import ApiTestCase

URL = '/api/scanner/detect/'
JPEG = base64.b64encode(b'\xff\xd8\xff\xe0' + b'\x00' * 400).decode()
PNG = base64.b64encode(b'\x89PNG\r\n\x1a\n' + b'\x00' * 400).decode()
WEBP = base64.b64encode(b'RIFF\x00\x00\x00\x00WEBP' + b'\x00' * 400).decode()
FAKE_KEY = 'sk-ant-test-not-a-real-key'


def reply(stop_reason='end_turn', **fields):
    """A fake Claude response whose text block is the JSON answer."""
    data = {'objectType': 'timber_2x4', 'referenceFound': True, 'lengthM': 3.6, 'heightM': None,
            'confidence': 0.82, 'explanation': 'A 2x4 timber with a bank card on it.'}
    data.update(fields)
    return SimpleNamespace(stop_reason=stop_reason, content=[SimpleNamespace(type='text', text=json.dumps(data))])


def api_error(cls, status):
    request = httpx2.Request('POST', 'https://api.anthropic.com/v1/messages')
    return cls(message='boom', response=httpx2.Response(status, request=request), body=None)


@override_settings(ANTHROPIC_API_KEY=FAKE_KEY, VISION_MODEL='claude-opus-5-5')
class VisionMeasuringTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login()
        service._client.cache_clear()
        self.fake = mock.MagicMock()
        patcher = mock.patch.object(service, '_client', return_value=self.fake)
        patcher.start()
        self.addCleanup(patcher.stop)

    def detect(self, response=None, side_effect=None, **body):
        self.fake.beta.messages.create.reset_mock()
        if side_effect is not None:
            self.fake.beta.messages.create.side_effect = side_effect
        else:
            self.fake.beta.messages.create.side_effect = None
            self.fake.beta.messages.create.return_value = response or reply()
        return self.post(URL, {'image': JPEG, 'mimeType': 'image/jpeg', 'reference': 'card', **body})

    # ---------------------------------------------------------- happy paths
    def test_timber_measured_with_card(self):
        r = self.detect()
        data = self.assertSuccess(r)
        self.assertEqual((data['status'], data['objectType'], data['label']), ('detected', 'timber_2x4', '2 × 4 Timber'))
        self.assertEqual(data['measurements'], {'length': '3.60'})
        self.assertEqual(data['confidence'], 0.82)
        self.assertIn('Check the values', data['message'])
        self.assertEqual(len(r.json()['plannedObjectTypes']), 6)

    def test_wall_gets_length_height_and_area(self):
        data = self.assertSuccess(self.detect(reply(objectType='exposed_wall', lengthM=4.5, heightM=2.7)))
        self.assertEqual(data['measurements'], {'length': '4.50', 'height': '2.70', 'surfaceArea': '12.15'})

    def test_what_is_sent_to_claude(self):
        self.detect(reference='a4')
        kwargs = self.fake.beta.messages.create.call_args.kwargs
        self.assertEqual(kwargs['model'], 'claude-opus-5-5')
        image, text = kwargs['messages'][0]['content']
        self.assertEqual(image['source'], {'type': 'base64', 'media_type': 'image/jpeg', 'data': JPEG})
        self.assertIn('210 mm x 297 mm', text['text'])
        self.assertEqual(kwargs['output_config']['format']['type'], 'json_schema')
        self.assertEqual(kwargs['fallbacks'], 'default')
        self.assertIn('server-side-fallback-2026-07-01', kwargs['betas'])
        self.assertNotIn('temperature', kwargs)
        self.assertNotIn('thinking', kwargs)  # Opus 5.5: thinking is always on; never send 'disabled'

    def test_key_never_reaches_the_browser(self):
        r = self.detect()
        self.assertNotIn(FAKE_KEY, r.content.decode())
        self.assertNotIn(FAKE_KEY, self.client.get(URL).content.decode())

    # ---------------------------------------------------------- honesty checks
    def test_no_reference_found_means_no_sizes(self):
        data = self.assertSuccess(self.detect(reply(referenceFound=False, lengthM=3.6)))
        self.assertEqual((data['status'], data['objectType'], data['measurements']), ('no_reference', 'timber_2x4', {}))
        self.assertIn('reference card was not found', data['message'])

    def test_reference_none_never_measures_even_if_model_claims_sizes(self):
        data = self.assertSuccess(self.detect(reply(referenceFound=True, lengthM=3.6), reference='none'))
        self.assertEqual((data['status'], data['measurements']), ('no_reference', {}))
        self.assertIn('No reference object was used', data['message'])
        self.assertIn('identify the object only', self.fake.beta.messages.create.call_args.kwargs['messages'][0]['content'][1]['text'])

    def test_unknown_object_is_not_recognised(self):
        data = self.assertSuccess(self.detect(reply(objectType='unknown', lengthM=None)))
        self.assertEqual((data['status'], data['objectType'], data['measurements'], data['confidence']), ('not_recognised', None, {}, None))

    def test_implausible_sizes_are_dropped(self):
        cases = [
            (reply(lengthM=55.0), {}),                                                   # 55 m timber
            (reply(lengthM=-1), {}),
            (reply(objectType='exposed_wall', lengthM=4.0, heightM=40.0), {'length': '4.00'}),  # 40 m wall height
            (reply(objectType='exposed_wall', lengthM=0.01, heightM=2.5), {'height': '2.50'}),
        ]
        for response, expected in cases:
            with self.subTest(response=response.content[0].text):
                data = self.assertSuccess(self.detect(response))
                self.assertEqual(data['measurements'], expected)
                self.assertIn('ignored', data['message'])

    def test_garbage_values_from_the_model_are_handled(self):
        for fields in [{'lengthM': 'three'}, {'lengthM': True}, {'confidence': 7}, {'confidence': -2}, {'confidence': 'high'},
                       {'objectType': 'timber_9x9'}, {'explanation': 'x' * 5000}]:
            with self.subTest(fields=fields):
                data = self.assertSuccess(self.detect(reply(**fields)))
                self.assertIn(data['status'], ('detected', 'not_recognised'))
                if data['confidence'] is not None:
                    self.assertTrue(0 <= data['confidence'] <= 1)
                self.assertLessEqual(len(data['explanation']), 400)

    def test_low_confidence_is_flagged(self):
        data = self.assertSuccess(self.detect(reply(confidence=0.3)))
        self.assertIn('Low confidence', data['message'])

    def test_refusal_is_reported_as_not_recognised(self):
        data = self.assertSuccess(self.detect(SimpleNamespace(stop_reason='refusal', content=[])))
        self.assertEqual(data['status'], 'not_recognised')

    def test_unreadable_or_cut_off_reply_is_a_503_not_a_crash(self):
        for response in [SimpleNamespace(stop_reason='end_turn', content=[SimpleNamespace(type='text', text='not json')]),
                         SimpleNamespace(stop_reason='end_turn', content=[SimpleNamespace(type='text', text='[1, 2]')]),
                         SimpleNamespace(stop_reason='end_turn', content=[]),
                         SimpleNamespace(stop_reason='max_tokens', content=[])]:
            with self.subTest(response=response):
                self.assertError(self.detect(response), 503)

    # ---------------------------------------------------------- API failures
    def test_api_failures_become_friendly_503s(self):
        cases = [
            (api_error(anthropic.RateLimitError, 429), 'busy'),
            (api_error(anthropic.AuthenticationError, 401), 'not set up correctly'),
            (api_error(anthropic.PermissionDeniedError, 403), 'not set up correctly'),
            (api_error(anthropic.BadRequestError, 400), 'could not be analysed'),
            (api_error(anthropic.InternalServerError, 500), 'had a problem'),
            (anthropic.APIConnectionError(request=httpx2.Request('POST', 'https://api.anthropic.com')), 'Could not reach'),
        ]
        for exc, text in cases:
            with self.subTest(exc=type(exc).__name__):
                body = self.assertError(self.detect(side_effect=exc), 503)
                self.assertIn(text, body['error'])
                self.assertNotIn(FAKE_KEY, json.dumps(body))

    # ---------------------------------------------------------- input checks
    def test_bad_images_are_rejected_before_any_api_call(self):
        cases = [
            ({'image': 'not base64 !!!'}, 422),
            ({'image': base64.b64encode(b'GIF89a' + b'\x00' * 400).decode(), 'mimeType': 'image/gif'}, 422),
            ({'image': base64.b64encode(b'%PDF-1.7' + b'\x00' * 400).decode()}, 422),       # says jpeg, is a PDF
            ({'image': PNG, 'mimeType': 'image/jpeg'}, 422),                                # wrong type claimed
            ({'image': base64.b64encode(b'\xff\xd8\xff').decode()}, 422),                   # too small to be a photo
            ({'image': base64.b64encode(b'\xff\xd8\xff' + b'\x00' * (5 * 1024 * 1024)).decode()}, 413),
            ({'image': 12345}, 422),
            ({'reference': 'banana'}, 422),
        ]
        for body, status in cases:
            with self.subTest(body={k: str(v)[:30] for k, v in body.items()}):
                self.assertError(self.detect(**body), status)
                self.fake.beta.messages.create.assert_not_called()

    def test_png_and_webp_are_accepted(self):
        for image, media in [(PNG, 'image/png'), (WEBP, 'image/webp')]:
            with self.subTest(media=media):
                self.assertSuccess(self.detect(image=image, mimeType=media))
                self.assertEqual(self.fake.beta.messages.create.call_args.kwargs['messages'][0]['content'][0]['source']['media_type'], media)

    def test_status_endpoint(self):
        data = self.client.get(URL).json()
        self.assertEqual(data['data'], {'configured': True})
        self.assertEqual([r['id'] for r in data['references']], ['card', 'a4', 'none'])

    def test_scans_are_rate_limited_per_user_but_status_is_not(self):
        cache.clear()
        with mock.patch('apps.vision.views.VisionThrottle.THROTTLE_RATES', {'vision': '3/hour'}):
            for _ in range(3):
                self.assertSuccess(self.detect())
            self.assertEqual(self.detect().status_code, 429)
            self.assertEqual(self.client.get(URL).status_code, 200)

    def test_login_required(self):
        self.client.logout()
        self.assertEqual(self.post(URL, {'image': JPEG}).status_code, 401)
        self.assertEqual(self.client.get(URL).status_code, 401)


class VisionNotConfiguredTests(ApiTestCase):
    """No ANTHROPIC_API_KEY (the test runner always clears it)."""

    def setUp(self):
        super().setUp()
        self.login()

    def test_honestly_not_configured_and_nothing_called(self):
        with mock.patch.object(service, '_client') as client:
            r = self.post(URL, {'image': JPEG, 'mimeType': 'image/jpeg'})
            client.assert_not_called()
        self.assertEqual(r.json()['data']['status'], 'not_configured')
        self.assertEqual(r.json()['data']['measurements'], {})
        self.assertEqual(self.client.get(URL).json()['data'], {'configured': False})
