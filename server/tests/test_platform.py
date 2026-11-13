"""Roof designs, AI, vision, reports/Excel, company profile, contact, history."""
from __future__ import annotations

import io
import json
from unittest import mock

from django.test import SimpleTestCase, override_settings
from openpyxl import load_workbook

from apps.company.models import ContactMessage
from apps.history.models import History
from apps.reports.models import Report
from apps.roofing.ai import HttpRoofAIService, validate_geometry
from apps.roofing.models import RoofDesign

from .base import ApiTestCase


class RoofDesignTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login()

    def test_get_creates_single_default_design_once(self):
        a = self.assertSuccess(self.client.get('/api/roof-designs/'))
        b = self.assertSuccess(self.client.get('/api/roof-designs/'))
        self.assertEqual(a['id'], b['id'])
        self.assertEqual(a['properties']['roofType'], 'Gable Roof')
        self.assertEqual(RoofDesign.objects.count(), 1)
        self.assertEqual(History.objects.filter(entity_type='roof_design', action='created').count(), 1)

    def test_save_merges_properties_and_validates_shapes(self):
        shape = {'id': 's1', 'type': 'rect', 'points': [{'x': 0, 'y': 0}, {'x': 4, 'y': 3}]}
        data = self.assertSuccess(self.put('/api/roof-designs/', {'shapes': [shape], 'properties': {'pitch': '30'}}))
        self.assertEqual(data['shapes'], [shape])
        self.assertEqual((data['properties']['pitch'], data['properties']['roofType']), ('30', 'Gable Roof'))
        self.assertError(self.put('/api/roof-designs/', {'shapes': [{'id': 1}]}), 422, field='shapes',
                         field_message='Each shape needs an id, a type and a points array.')
        self.assertError(self.put('/api/roof-designs/', {'properties': 'x'}), 422, field='properties')
        self.assertError(self.put('/api/roof-designs/', {}), 400, 'At least one of "shapes" or "properties" must be provided.')

    def test_delete_resets_to_blank(self):
        self.put('/api/roof-designs/', {'shapes': [{'id': 's', 'type': 'line', 'points': []}]})
        data = self.assertSuccess(self.delete('/api/roof-designs/'))
        self.assertEqual(data['shapes'], [])
        self.assertEqual(self.last_history().summary, 'Roof design was reset to blank.')


class RoofAITests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login()

    def test_not_configured_never_fabricates(self):
        r = self.post('/api/roof-ai/generate/', {'roofType': 'Hip Roof', 'footprint': {'length': 12, 'width': 'x'}})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body['data']['status'], 'not_configured')
        self.assertIsNone(body['data']['pitch'])
        self.assertEqual(body['allowedRoofTypes'], ['Gable Roof', 'Hip Roof', 'Hidden/Flat Roof'])

    def test_request_validation(self):
        self.assertError(self.post('/api/roof-ai/generate/', {'roofType': 'Dome', 'pitch': -5}), 422)

    @override_settings(ROOF_AI_API_URL='https://ai.invalid/v1/chat', ROOF_AI_API_KEY='k')
    def test_configured_provider_reply_is_validated(self):
        reply = {'choices': [{'message': {'content': '```json\n' + json.dumps({
            'roofType': 'Hip Roof', 'footprint': {'length': 12, 'width': 9}, 'pitch': 25,
            'rafterSpacing': 600, 'purlinSpacing': 900, 'roofingMaterial': ' IBR sheet ', 'notes': 'Good wind resistance.',
        }) + '\n```'}}]}
        fake = mock.MagicMock()
        fake.__enter__.return_value.read.return_value = json.dumps(reply).encode()
        with mock.patch('urllib.request.urlopen', return_value=fake):
            data = self.assertSuccess(self.post('/api/roof-ai/generate/', {}))
        self.assertEqual((data['status'], data['pitch'], data['roofingMaterial']), ('ok', 25.0, 'IBR sheet'))


class GeometryValidatorTests(SimpleTestCase):
    def test_bounds_and_types(self):
        result = validate_geometry({'roofType': 'Dome', 'pitch': 95, 'footprint': {'length': 0.5}, 'rafterSpacing': 'wide'})
        self.assertFalse(result['ok'])
        self.assertIn('pitch must be between 0 and 80.', result['errors'])
        self.assertIn('length must be between 1 and 200.', result['errors'])
        self.assertIn('rafterSpacing must be a number.', result['errors'])

    def test_upstream_failures_are_reported_honestly(self):
        import urllib.error
        service = HttpRoofAIService('https://ai.invalid', 'k', 'm')
        with mock.patch('urllib.request.urlopen', side_effect=urllib.error.URLError('down')):
            self.assertEqual(service.generate({})['status'], 'upstream_error')
        fake = mock.MagicMock()
        fake.__enter__.return_value.read.return_value = b'{"choices": [{"message": {"content": "not json"}}]}'
        with mock.patch('urllib.request.urlopen', return_value=fake):
            self.assertEqual(service.generate({})['status'], 'invalid_response')


class VisionTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login()

    def test_detect_is_honestly_not_configured(self):
        r = self.post('/api/scanner/detect/', {'image': 'aGVsbG8=', 'mimeType': 'image/jpeg'})
        self.assertEqual(r.json()['data']['status'], 'not_configured')
        self.assertEqual(len(r.json()['plannedObjectTypes']), 6)

    def test_image_required_and_size_capped(self):
        self.assertError(self.post('/api/scanner/detect/', {}), 422, field='image', field_message='Image is required.')
        self.assertError(self.post('/api/scanner/detect/', {'image': 'a' * (8 * 1024 * 1024 + 1)}), 413, 'Captured image is too large.')


class ReportsAndExportTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login()

    def test_report_crud_and_project_check(self):
        self.assertError(self.post('/api/reports/', {'title': 'X', 'projectId': 999999}), 422, field='projectId',
                         field_message='That project does not exist.')
        r = self.assertSuccess(self.post('/api/reports/', {'title': 'Weekly', 'content': {'a': 1}}), 201)
        self.assertEqual((r['type'], r['content']), ('custom', {'a': 1}))
        url = f"/api/reports/{r['id']}/"
        self.assertEqual(self.assertSuccess(self.put(url, {'notes': 'n', 'projectId': ''}))['project_id'], None)
        self.assertError(self.client.get('/api/reports/', {'projectId': 'x'}), 400, 'Invalid projectId filter.')
        self.assertSuccess(self.delete(url))

    def test_excel_export_general(self):
        self.post('/api/boq/', {'item': 'Cement', 'category': 'Cement', 'unit': 'bag', 'quantity': 10, 'wastePercent': 5, 'unitPrice': 12.5})
        r = self.client.get('/api/export/excel/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        self.assertRegex(r['Content-Disposition'], r'attachment; filename="PhentiBuild-Export-General-\d{8}-\d{6}\.xlsx"')
        wb = load_workbook(io.BytesIO(r.content))
        self.assertEqual(wb.sheetnames, ['Project Information', 'BOQ', 'Materials', 'Cement Schedule', 'Rebar Schedule',
                                         'Timber Schedule', 'Roofing Schedule', 'Cost Summary'])
        boq = wb['BOQ']
        self.assertEqual(boq['A3'].value, 'ID')
        self.assertEqual(boq['J4'].value, 131.25)
        self.assertEqual(wb['Rebar Schedule']['A4'].value, 'No Rebar items are in the current BOQ.')
        report = Report.objects.get(type='xlsx')
        self.assertEqual(report.content['boqItemCount'], 1)
        self.assertEqual(self.last_history().summary, 'Report "Excel export — General" was exported.')

    def test_excel_export_for_project_and_errors(self):
        p = self.post('/api/projects/', {'name': 'Ridge Villa', 'client': 'Kofi', 'contact': '0241234567', 'location': 'Accra',
                                         'type': 'Residential', 'startDate': '2026-01-01', 'endDate': '2026-02-01'}).json()['data']
        r = self.client.get('/api/export/excel/', {'projectId': p['id']})
        self.assertIn(f"PhentiBuild-Export-{p['ref']}-Ridge-Villa-", r['Content-Disposition'])
        wb = load_workbook(io.BytesIO(r.content))
        self.assertEqual(wb['Project Information']['B3'].value, p['ref'])
        self.assertEqual(wb['BOQ']['A4'].value, 'No BOQ items have been added yet.')
        self.assertError(self.client.get('/api/export/excel/', {'projectId': 'abc'}), 400, 'Invalid projectId.')
        self.assertError(self.client.get('/api/export/excel/', {'projectId': 999999}), 404, 'Project 999999 was not found.')


class CompanyAndContactTests(ApiTestCase):
    def test_company_profile(self):
        self.login()
        profile = self.assertSuccess(self.client.get('/api/company-profile/'))
        self.assertEqual(profile['companyName'], '')
        data = self.assertSuccess(self.put('/api/company-profile/', {'companyName': ' PhB Ltd ', 'phone': ''}))
        self.assertEqual(data['companyName'], 'PhB Ltd')
        self.assertError(self.put('/api/company-profile/', {'phone': '12', 'email': 'bad'}), 422)
        self.assertError(self.put('/api/company-profile/', {}), 400, 'At least one field must be provided.')

    def test_contact_form_is_public_and_sanitised(self):
        r = self.post('/api/contact/', {'name': '<b>Yaw</b>', 'email': 'yaw@example.com', 'subject': 'Quote please',
                                        'message': '<script>x</script>I need an estimate for a house.'})
        data = self.assertSuccess(r, 201)
        msg = ContactMessage.objects.get(pk=data['id'])
        self.assertEqual((msg.name, msg.status), ('Yaw', 'new'))
        self.assertNotIn('<script>', msg.message)

    def test_contact_honeypot_drops_bots_silently(self):
        r = self.post('/api/contact/', {'website': 'http://spam', 'name': 'Bot'})
        self.assertEqual(r.json()['data']['id'], None)
        self.assertEqual(ContactMessage.objects.count(), 0)

    def test_contact_validation(self):
        body = self.assertError(self.post('/api/contact/', {'name': 'Y', 'email': 'x', 'subject': 'Hi', 'message': 'short'}), 422)
        self.assertEqual(body['errors']['message'], 'Message must be at least 10 characters.')


class HistoryTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.project = self.post('/api/projects/', {'name': 'Ridge Villa', 'client': 'Kofi', 'contact': '0241234567',
                                                    'location': 'Accra', 'type': 'Residential',
                                                    'startDate': '2026-01-01', 'endDate': '2026-02-01'}).json()['data']

    def test_list_includes_joined_names_and_meta(self):
        body = self.client.get('/api/history/').json()
        row = body['data'][0]
        self.assertEqual((row['user_name'], row['project_ref']), ('Test User', self.project['ref']))
        self.assertIn('Settings', body['modules'])
        self.assertEqual(body['users'][0]['name'], 'Test User')

    def test_filters(self):
        self.assertEqual(len(self.assertSuccess(self.client.get('/api/history/', {'q': 'ridge'}))), 1)
        self.assertEqual(len(self.assertSuccess(self.client.get('/api/history/', {'module': 'Projects'}))), 1)
        self.assertError(self.client.get('/api/history/', {'entityType': 'spaceship'}), 400, 'Invalid entityType filter.')
        self.assertError(self.client.get('/api/history/', {'date': '2026-13-01'}), 400, 'Invalid date filter — expected YYYY-MM-DD.')
        self.assertError(self.client.get('/api/history/', {'userId': 'me'}), 400, 'Invalid userId filter.')
        self.assertEqual(len(self.assertSuccess(self.client.get('/api/history/', {'limit': '0'}))), 1)  # clamped to >= 1

    def test_detail(self):
        row_id = History.objects.order_by('-id').first().id
        self.assertEqual(self.assertSuccess(self.client.get(f'/api/history/{row_id}/'))['id'], row_id)
        self.assertError(self.client.get('/api/history/999999/'), 404, 'History entry 999999 was not found.')
