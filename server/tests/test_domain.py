"""Projects, materials, BOQ, measurements and calculations."""
from __future__ import annotations

from apps.history.models import History
from apps.projects.models import Project

from .base import ApiTestCase

PROJECT = {
    'name': 'Ridge Villa', 'client': 'Kofi Boateng', 'contact': 'kofi@example.com',
    'location': 'Accra', 'type': 'Residential', 'startDate': '2026-01-05', 'endDate': '2026-06-30',
    'description': '  Four-bedroom house  ',
}


class ProjectTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login()

    def create(self, **overrides):
        return self.assertSuccess(self.post('/api/projects/', {**PROJECT, **overrides}), 201)

    def test_create_assigns_ref_and_defaults(self):
        p = self.create()
        self.assertEqual(p['ref'], f"PHB-{p['id']:04d}")
        self.assertEqual((p['status'], p['progress']), ('Planning', 0))
        self.assertEqual(p['description'], 'Four-bedroom house')
        self.assertRegex(p['created_at'], r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$')
        h = self.last_history()
        self.assertEqual((h.action, h.project_id, h.user_id), ('created', p['id'], self.user.id))
        self.assertEqual(h.summary, f'Project {p["ref"]} ("Ridge Villa") was created.')

    def test_ref_is_never_reused_after_delete(self):
        first = self.create()
        self.delete(f"/api/projects/{first['id']}/")
        second = self.create(name='Second Site')
        self.assertNotEqual(first['ref'], second['ref'])

    def test_validation_messages(self):
        body = self.assertError(self.post('/api/projects/', {**PROJECT, 'name': 'AB', 'contact': 'call me', 'type': 'Hut',
                                                             'endDate': '2025-12-31'}), 422)
        self.assertEqual(body['errors'], {
            'name': 'Project name must be at least 3 characters.',
            'contact': 'Client contact must be a valid phone number or an email address.',
            'type': 'Project type must be one of: Residential, Commercial, Industrial, Infrastructure, Institutional.',
            'endDate': 'Expected completion date cannot be before the start date.',
        })

    def test_partial_update_and_rules(self):
        p = self.create()
        url = f"/api/projects/{p['id']}/"
        data = self.assertSuccess(self.patch(url, {'progress': '45', 'status': 'In Progress'}))
        self.assertEqual((data['progress'], data['status']), (45, 'In Progress'))
        self.assertEqual(self.last_history().summary, f"Project #{p['id']} was updated (progress, status).")
        self.assertError(self.put(url, {'progress': 101}), 422, field='progress',
                         field_message='Progress must be a whole number between 0 and 100.')
        self.assertError(self.put(url, {'unknownField': 1}), 400, 'At least one field must be provided to update.')
        self.assertError(self.put(url, {'startDate': '2026-07-01', 'endDate': '2026-06-01'}), 422, field='endDate')

    def test_list_filters_and_404s(self):
        self.create()
        self.create(name='Warehouse', type='Industrial')
        data = self.assertSuccess(self.client.get('/api/projects/', {'type': 'Industrial'}))
        self.assertEqual([p['name'] for p in data], ['Warehouse'])
        self.assertEqual(self.client.get('/api/projects/').json()['count'], 2)
        self.assertError(self.client.get('/api/projects/', {'status': 'Done'}), 400, 'Invalid status filter.')
        self.assertError(self.client.get('/api/projects/999999/'), 404, 'Project 999999 was not found.')
        self.assertError(self.delete('/api/projects/999999/'), 404)
        self.assertError(self.client.get('/api/projects/abc/'), 404)

    def test_delete_keeps_history_but_unlinks_project(self):
        p = self.create()
        self.assertSuccess(self.delete(f"/api/projects/{p['id']}/"))
        self.assertFalse(Project.objects.filter(pk=p['id']).exists())
        created = History.objects.filter(entity_type='project', entity_id=str(p['id']), action='created').get()
        self.assertIsNone(created.project_id)  # ON DELETE SET NULL, owned by the database
        self.assertEqual(self.last_history().action, 'deleted')


class MaterialTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login(self.make_user('admin@example.com', role='Admin'))  # only Admins change the library

    def create(self, **kw):
        return self.assertSuccess(self.post('/api/materials/', {'name': 'Sandcrete Block', 'category': 'Blocks', 'unit': 'piece', **kw}), 201)

    def test_ids_start_at_1001_and_increment(self):
        self.assertEqual(self.create()['id'], 'MAT-1001')
        self.assertEqual(self.create(name='Second')['id'], 'MAT-1002')

    def test_deactivate_hides_reactivate_restores(self):
        m = self.create()
        url = f"/api/materials/{m['id']}/"
        self.assertFalse(self.assertSuccess(self.delete(url))['is_active'])
        self.assertEqual(self.client.get('/api/materials/').json()['count'], 0)
        self.assertEqual(self.client.get('/api/materials/', {'includeInactive': '1'}).json()['count'], 1)
        self.assertEqual(self.last_history().action, 'deactivated')
        self.assertTrue(self.assertSuccess(self.client.delete(url + '?reactivate=1'))['is_active'])
        self.assertEqual(self.last_history().action, 'reactivated')

    def test_ordering_follows_enum_declaration_order(self):
        """ORDER BY on the ENUM column = declaration order (Cement, Sand, Aggregate…), not A–Z."""
        self.create(name='Gravel', category='Aggregate')
        self.create(name='River sand', category='Sand')
        self.create(name='OPC', category='Cement')
        names = [m['category'] for m in self.assertSuccess(self.client.get('/api/materials/'))]
        self.assertEqual(names, ['Cement', 'Sand', 'Aggregate'])

    def test_validation_and_update(self):
        body = self.assertError(self.post('/api/materials/', {'name': 'X', 'category': 'Glass'}), 422)
        self.assertEqual(body['errors'], {'name': 'Material name must be at least 2 characters.',
                                          'category': 'Category must be one of: Cement, Sand, Aggregate, Blocks, Rebar, Timber, Roofing, Underlay.',
                                          'unit': 'Unit is required.'})
        m = self.create()
        data = self.assertSuccess(self.patch(f"/api/materials/{m['id']}/", {'overallDimensions': '450 x 225 x 150 mm'}))
        self.assertEqual(data['overall_dimensions'], '450 x 225 x 150 mm')
        self.assertError(self.client.get('/api/materials/MAT-9999/'), 404, 'Material MAT-9999 was not found.')
        self.assertError(self.client.get('/api/materials/', {'category': 'Glass'}), 400, 'Invalid category filter.')


class BoqTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login()

    def create(self, **kw):
        payload = {'item': 'Portland Cement', 'category': 'Cement', 'unit': 'bag', 'quantity': 10, **kw}
        return self.assertSuccess(self.post('/api/boq/', payload), 201)

    def test_id_and_totals_match_php_math(self):
        item = self.create(wastePercent=5, unitPrice='12.50')
        self.assertRegex(item['id'], r'^BOQ-\d{4}$')
        self.assertEqual((item['adjusted_quantity'], item['total']), (10.5, 131.25))
        self.assertEqual(item['source'], 'manual')
        self.assertEqual(self.last_history().summary, f'BOQ item {item["id"]} ("Portland Cement") was created.')

    def test_half_up_rounding_edge_cases(self):
        item = self.create(quantity='1.005', unitPrice=1)
        self.assertEqual(item['total'], 1.01)          # PHP round(); Python round() would give 1.0
        item = self.create(quantity=1, unitPrice='0.125')
        self.assertEqual(item['unit_price'], 0.13)     # stored like MySQL DECIMAL(14,2)
        item = self.create(quantity='0.0005')
        self.assertEqual(item['quantity'], 0.001)

    def test_numeric_validation(self):
        body = self.assertError(self.post('/api/boq/', {'item': 'X', 'category': 'Cement', 'unit': 'bag', 'quantity': -1,
                                                        'wastePercent': 'lots', 'unitPrice': 1e15}), 422)
        self.assertEqual(body['errors']['quantity'], 'Quantity must be 0 or more.')
        self.assertEqual(body['errors']['wastePercent'], 'Waste % must be a number.')
        self.assertIn('or less', body['errors']['unitPrice'])

    def test_update_delete_and_calculator_source(self):
        item = self.create(source='walls')
        self.assertEqual(item['source'], 'walls')
        url = f"/api/boq/{item['id']}/"
        data = self.assertSuccess(self.patch(url, {'unitPrice': 2, 'wastePercent': 10}))
        self.assertEqual((data['adjusted_quantity'], data['total']), (11.0, 22.0))
        self.assertSuccess(self.delete(url))
        self.assertError(self.client.get(url), 404, f'BOQ item {item["id"]} was not found.')


class RecordsTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login()

    def test_measurement_lifecycle(self):
        m = self.assertSuccess(self.post('/api/measurements/', {'sectionType': 'walls', 'label': 'North wall',
                                                                'values': {'wallLength': '12', 'source': 'manual'}}), 201)
        self.assertEqual(m['values']['wallLength'], '12')
        self.assertEqual(self.last_history().summary, f"Measurement #{m['id']} (walls) was saved.")
        url = f"/api/measurements/{m['id']}/"
        self.assertEqual(self.assertSuccess(self.patch(url, {'values': {'wallLength': '13'}}))['values'], {'wallLength': '13'})
        self.assertError(self.patch(url, {'values': {}}), 422, field='values', field_message='At least one measurement value is required.')
        self.assertSuccess(self.delete(url))

    def test_measurement_validation(self):
        self.assertError(self.post('/api/measurements/', {'sectionType': 'walls'}), 422, field='values')
        self.assertError(self.post('/api/measurements/', {'sectionType': 'garden', 'values': {'a': 1}}), 422, field='sectionType')
        self.assertError(self.client.get('/api/measurements/', {'sectionType': 'garden'}), 400, 'Invalid sectionType filter.')

    def test_calculation_lifecycle(self):
        payload = {'calculationType': 'concrete', 'input': {'length': 4}, 'result': {'totalVolumeM3': 1.2}}
        c = self.assertSuccess(self.post('/api/calculations/', payload), 201)
        self.assertEqual(c['result'], {'totalVolumeM3': 1.2})
        url = f"/api/calculations/{c['id']}/"
        self.assertError(self.put(url, {'input': {}}), 400, 'At least one field (label or notes) must be provided to update.')
        self.assertEqual(self.assertSuccess(self.put(url, {'label': 'Slab A'}))['label'], 'Slab A')
        self.assertError(self.post('/api/calculations/', {**payload, 'result': []}), 422, field='result',
                         field_message='The calculation result is required.')
        listed = self.assertSuccess(self.client.get('/api/calculations/', {'calculationType': 'concrete'}))
        self.assertEqual(len(listed), 1)
