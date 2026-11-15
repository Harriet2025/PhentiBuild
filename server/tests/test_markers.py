"""Marker measuring (OpenCV ArUco): free, exact scale - and Claude + marker together."""
from __future__ import annotations

import base64
import json
from types import SimpleNamespace
from unittest import mock

import cv2
import numpy as np
from django.test import SimpleTestCase, override_settings

from apps.vision import markers, service

from .base import ApiTestCase

PX = 3.0  # pixels per mm in the flat test scene


def scene(marker_id=7, size_mm=36.0, paper=(85.6, 54.0), offset=(4, 9), px=PX, surface=(600, 400), at=(40, 40)):
    """A grey surface (timber / wall) with a printed card or sheet on it, at px pixels per mm."""
    PX = px  # noqa: N806 - local scale for this scene
    img = np.full((int(surface[1] * PX), int(surface[0] * PX)), 150, np.uint8)
    sx, sy = at
    img[int(sy * PX):int((sy + paper[1]) * PX), int(sx * PX):int((sx + paper[0]) * PX)] = 250
    m = cv2.aruco.getPredefinedDictionary(markers.DICTIONARY).generateImageMarker(marker_id, int(size_mm * PX))
    ox, oy = int((sx + offset[0]) * PX), int((sy + offset[1]) * PX)
    img[oy:oy + m.shape[0], ox:ox + m.shape[1]] = np.where(m == 0, 20, 250)
    return img


def photograph(img, corners_jitter=(0, 0, 0, 0, 0, 0, 0, 0), px=PX):
    """Simulate a camera at an angle: warp, shrink to 1600 px like the app, blur."""
    h, w = img.shape
    j = np.array(corners_jitter, dtype=np.float32).reshape(4, 2) * [w, h]
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = (src + j).astype(np.float32)
    dst -= dst.min(axis=0)
    dst += 20
    warp = cv2.getPerspectiveTransform(src, dst)
    photo = cv2.warpPerspective(img, warp, (int(dst[:, 0].max() + 20), int(dst[:, 1].max() + 20)), borderValue=90)
    s = 1600 / max(photo.shape)
    photo = cv2.GaussianBlur(cv2.resize(photo, None, fx=s, fy=s, interpolation=cv2.INTER_AREA), (3, 3), 0)
    to_photo = lambda mm_xy: tuple(float(v) for v in cv2.perspectiveTransform(np.float32([[[mm_xy[0] * px, mm_xy[1] * px]]]), warp)[0, 0] * s)
    return photo, to_photo


def jpeg_b64(gray) -> str:
    ok, buf = cv2.imencode('.jpg', gray, [cv2.IMWRITE_JPEG_QUALITY, 90])
    assert ok
    return base64.b64encode(buf.tobytes()).decode()


TILTED = (0.05, -0.03, -0.04, 0.06, 0.03, -0.05, -0.06, 0.02)


class MarkerAccuracyTests(SimpleTestCase):
    def test_card_measures_300mm_within_2_percent_straight_4_percent_tilted(self):
        # The small card is precise straight on; at an angle, measuring far from it
        # magnifies corner error (the app shows a ± margin for exactly this reason).
        for jitter, tolerance in [((0,) * 8, 0.02), (TILTED, 0.04)]:
            with self.subTest(tilted=jitter != (0,) * 8):
                photo, to_photo = photograph(scene(), jitter)
                cal = markers.calibrate_image(photo)
                self.assertTrue(cal.found)
                self.assertEqual((cal.reference, cal.marker_size_mm, cal.marker_id), ('card', 36.0, 7))
                m = markers.distance_m(cal.homography, to_photo((280, 360)), to_photo((580, 360)))
                self.assertAlmostEqual(m, 0.300, delta=0.300 * tolerance)

    def test_a4_sheet_is_even_more_precise(self):
        photo, to_photo = photograph(scene(9, 150.0, paper=(210.0, 297.0), offset=(30, 25)), TILTED)
        cal = markers.calibrate_image(photo)
        self.assertEqual((cal.found, cal.reference, cal.quality), (True, 'a4', 'good'))
        m = markers.distance_m(cal.homography, to_photo((280, 360)), to_photo((580, 360)))
        self.assertAlmostEqual(m, 0.300, delta=0.300 * 0.005)

    def test_no_marker(self):
        cal = markers.calibrate_image(np.full((600, 800), 150, np.uint8))
        self.assertFalse(cal.found)
        self.assertIn('No PhentiBuild marker', cal.message)

    def test_foreign_marker_is_not_trusted(self):
        cal = markers.calibrate_image(photograph(scene(marker_id=3))[0])
        self.assertFalse(cal.found)
        self.assertIn('not a PhentiBuild marker', cal.message)

    def test_tiny_marker_is_flagged_poor(self):
        small = cv2.resize(photograph(scene())[0], None, fx=0.3, fy=0.3, interpolation=cv2.INTER_AREA)
        cal = markers.calibrate_image(small)
        if cal.found:  # it may be too small to detect at all - both are honest outcomes
            self.assertEqual(cal.quality, 'poor')
            self.assertIn('too small', cal.message)

    def test_printable_svg_matches_the_detector(self):
        svg = markers.marker_svg(7, 36.0)
        self.assertIn('width="36.0mm"', svg)
        self.assertEqual(svg.count('<rect'), 1 + int((cv2.aruco.getPredefinedDictionary(markers.DICTIONARY)
                                                      .generateImageMarker(7, 6) == 0).sum()))


class CalibrateEndpointTests(ApiTestCase):
    URL = '/api/scanner/calibrate/'

    def setUp(self):
        super().setUp()
        self.login()

    def test_finds_marker_and_returns_mapping(self):
        photo, to_photo = photograph(scene(), TILTED)
        data = self.assertSuccess(self.post(self.URL, {'image': jpeg_b64(photo), 'mimeType': 'image/jpeg'}))
        self.assertTrue(data['found'])
        self.assertEqual((data['reference'], data['markerSizeMm'], data['imageWidth']), ('card', 36.0, photo.shape[1]))
        self.assertEqual(len(data['corners']), 4)
        m = markers.distance_m(data['homography'], to_photo((280, 360)), to_photo((580, 360)))
        self.assertAlmostEqual(m, 0.300, delta=0.012)  # tilted card: within 4%

    def test_works_without_any_ai_key(self):
        self.assertFalse(service.is_configured())
        self.assertTrue(self.assertSuccess(self.post(self.URL, {'image': jpeg_b64(photograph(scene())[0])}))['found'])

    def test_no_marker_is_a_normal_answer(self):
        data = self.assertSuccess(self.post(self.URL, {'image': jpeg_b64(np.full((600, 800), 150, np.uint8))}))
        self.assertFalse(data['found'])

    def test_bad_input(self):
        self.assertError(self.post(self.URL, {}), 422, field='image')
        self.assertError(self.post(self.URL, {'image': 'not base64 !!!'}), 422, field='image')
        self.assertError(self.post(self.URL, {'image': 'a' * (8 * 1024 * 1024 + 1)}), 413)
        broken = base64.b64encode(b'\xff\xd8\xff\xe0' + b'\x00' * 400).decode()  # JPEG header, no picture
        self.assertError(self.post(self.URL, {'image': broken}), 422, field='image')

    def test_login_required(self):
        self.client.logout()
        self.assertEqual(self.post(self.URL, {'image': 'x'}).status_code, 401)


@override_settings(ANTHROPIC_API_KEY='sk-ant-test-not-a-real-key')
class ClaudePlusMarkerTests(ApiTestCase):
    """Claude places the points; the marker gives the exact size."""

    def setUp(self):
        super().setUp()
        self.login()
        self.fake = mock.MagicMock()
        patcher = mock.patch.object(service, '_client', return_value=self.fake)
        patcher.start()
        self.addCleanup(patcher.stop)

    def reply(self, **fields):
        data = {'objectType': 'timber_2x4', 'referenceFound': True, 'lengthM': 9.9, 'heightM': None, 'confidence': 0.8,
                'explanation': 'A 2x4 with the card on it.', 'points': []}
        data.update(fields)
        self.fake.beta.messages.create.return_value = SimpleNamespace(
            stop_reason='end_turn', content=[SimpleNamespace(type='text', text=json.dumps(data))])

    def test_length_comes_from_marker_not_from_claudes_guess(self):
        photo, to_photo = photograph(scene(), TILTED)
        a, b = to_photo((280, 360)), to_photo((580, 360))
        self.reply(points=[{'x': a[0], 'y': a[1]}, {'x': b[0], 'y': b[1]}])
        data = self.assertSuccess(self.post('/api/scanner/detect/', {'image': jpeg_b64(photo), 'mimeType': 'image/jpeg'}))
        self.assertEqual((data['status'], data['measuredBy']), ('detected', 'marker'))
        self.assertAlmostEqual(float(data['measurements']['length']), 0.30, delta=0.012)  # not Claude's 9.9
        self.assertEqual(len(data['points']), 2)
        self.assertEqual(data['calibration']['reference'], 'card')
        prompt = self.fake.beta.messages.create.call_args.kwargs['messages'][0]['content'][1]['text']
        self.assertIn('36 mm per side', prompt)
        self.assertIn(f'The image is {photo.shape[1]} x {photo.shape[0]} pixels', prompt)

    def test_wall_from_four_corners(self):
        # A 5 m x 3 m wall surface photographed whole, with the A4 marker sheet taped on it.
        wall = scene(9, 150.0, paper=(210.0, 297.0), offset=(30, 25), px=0.6, surface=(5000, 3000), at=(2000, 1200))
        photo, to_photo = photograph(wall, (0.03, -0.02, -0.02, 0.03, 0.02, -0.03, -0.03, 0.01), px=0.6)
        corners = [to_photo(p) for p in [(1000, 400), (4000, 400), (4000, 2600), (1000, 2600)]]  # 3.0 m x 2.2 m
        self.reply(objectType='exposed_wall', points=[{'x': x, 'y': y} for x, y in corners], lengthM=9, heightM=9)
        data = self.assertSuccess(self.post('/api/scanner/detect/', {'image': jpeg_b64(photo)}))
        self.assertEqual(data['measuredBy'], 'marker')
        self.assertAlmostEqual(float(data['measurements']['length']), 3.0, delta=0.06)
        self.assertAlmostEqual(float(data['measurements']['height']), 2.2, delta=0.05)

    def test_sizes_outside_the_realistic_range_are_ignored_even_from_the_marker(self):
        photo, to_photo = photograph(scene(9, 150.0, paper=(210.0, 297.0), offset=(30, 25)), TILTED)
        corners = [to_photo(p) for p in [(260, 20), (560, 20), (560, 220), (260, 220)]]  # a 0.3 m x 0.2 m "wall"
        self.reply(objectType='exposed_wall', points=[{'x': x, 'y': y} for x, y in corners])
        data = self.assertSuccess(self.post('/api/scanner/detect/', {'image': jpeg_b64(photo)}))
        self.assertEqual(data['measurements'], {})
        self.assertIn('ignored', data['message'])

    def test_bad_points_fall_back_to_estimate(self):
        photo, _ = photograph(scene())
        for points in [[{'x': 1, 'y': 1}], [{'x': -5, 'y': 10}, {'x': 10, 'y': 10}], [{'x': 'a', 'y': 1}, {'x': 2, 'y': 2}]]:
            with self.subTest(points=points):
                self.reply(points=points, lengthM=3.6)
                data = self.assertSuccess(self.post('/api/scanner/detect/', {'image': jpeg_b64(photo)}))
                self.assertEqual((data['points'], data['measuredBy'], data['measurements']), ([], 'estimate', {'length': '3.60'}))
