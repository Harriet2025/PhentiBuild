"""BOQ items, measurements and calculations linked to a project."""
from __future__ import annotations

from rest_framework.test import APIClient

from apps.boq.models import BoqItem
from apps.history.models import History
from apps.records.models import Calculation, Measurement
from apps.reports.models import Report
from apps.roofing.models import RoofDesign

from .base import ApiTestCase

PROJECT = {'name': 'Ama Villa', 'client': 'Kofi', 'contact': '0241234567', 'location': 'Kumasi', 'type': 'Residential',
           'startDate': '2026-11-13', 'endDate': '2027-02-01'}
BOQ = {'item': 'Cement', 'category': 'Cement', 'unit': 'bag', 'quantity': 10, 'unitPrice': 12.5}
MEASUREMENT = {'sectionType': 'walls', 'values': {'length': '4'}}
CALCULATION = {'calculationType': 'walls', 'input': {'a': 1}, 'result': {'b': 2}}


class ProjectLinkTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.pid = self.assertSuccess(self.post('/api/projects/', PROJECT), 201)['id']
        self.other_pid = self.assertSuccess(self.post('/api/projects/', {**PROJECT, 'name': 'Second Job'}), 201)['id']

    def test_create_linked_records_and_filter_by_project(self):
        for url, body in [('/api/boq/', BOQ), ('/api/measurements/', MEASUREMENT), ('/api/calculations/', CALCULATION)]:
            with self.subTest(url=url):
                linked = self.assertSuccess(self.post(url, {**body, 'projectId': self.pid}), 201)
                self.assertEqual(linked['projectId'], self.pid)
                loose = self.assertSuccess(self.post(url, body), 201)
                self.assertIsNone(loose['projectId'])
                self.assertEqual([r['id'] for r in self.assertSuccess(self.get(url, projectId=self.pid))], [linked['id']])
                self.assertEqual([r['id'] for r in self.assertSuccess(self.get(url, projectId='none'))], [loose['id']])
                self.assertEqual(len(self.assertSuccess(self.get(url))), 2)
                self.assertError(self.get(url, projectId='abc'), 400)
        self.assertTrue(History.objects.filter(entity_type='boq_item', action='created', project_id=self.pid).exists())

    def test_move_between_projects_and_unlink(self):
        ref = self.assertSuccess(self.post('/api/boq/', {**BOQ, 'projectId': self.pid}), 201)['id']
        self.assertEqual(self.assertSuccess(self.put(f'/api/boq/{ref}/', {'projectId': self.other_pid}))['projectId'], self.other_pid)
        self.assertIsNone(self.assertSuccess(self.put(f'/api/boq/{ref}/', {'projectId': None}))['projectId'])
        mid = self.assertSuccess(self.post('/api/measurements/', MEASUREMENT), 201)['id']
        self.assertEqual(self.assertSuccess(self.put(f'/api/measurements/{mid}/', {'projectId': self.pid}))['projectId'], self.pid)
        cid = self.assertSuccess(self.post('/api/calculations/', CALCULATION), 201)['id']
        self.assertEqual(self.assertSuccess(self.put(f'/api/calculations/{cid}/', {'projectId': self.pid}))['projectId'], self.pid)

    def test_bad_project_ids_are_refused(self):
        for bad in [999999, 'abc', -1, 1.5, True]:
            with self.subTest(projectId=bad):
                self.assertError(self.post('/api/boq/', {**BOQ, 'projectId': bad}), 422, field='projectId')
        self.assertEqual(BoqItem.objects.count(), 0)

    def test_cannot_link_to_someone_elses_project(self):
        bob = APIClient()
        bob.force_login(self.make_user('bob@example.com', name='Bob'))
        for url, body in [('/api/boq/', BOQ), ('/api/measurements/', MEASUREMENT), ('/api/calculations/', CALCULATION)]:
            with self.subTest(url=url):
                r = bob.post(url, {**body, 'projectId': self.pid}, format='json')
                self.assertError(r, 422, field='projectId', field_message='That project does not exist.')

    def test_admin_cannot_cross_link_peoples_records(self):
        ref = self.assertSuccess(self.post('/api/boq/', BOQ), 201)['id']
        admin = self.make_user('boss@example.com', role='Admin')
        self.login(admin)
        admins_project = self.assertSuccess(self.post('/api/projects/', PROJECT), 201)['id']
        r = self.put(f'/api/boq/{ref}/', {'projectId': admins_project})
        self.assertError(r, 422, field='projectId', field_message='That project belongs to someone else.')
        self.assertEqual(self.assertSuccess(self.put(f'/api/boq/{ref}/', {'projectId': self.pid}))['projectId'], self.pid)

    def test_deleting_a_project_unlinks_but_keeps_records(self):
        ref = self.assertSuccess(self.post('/api/boq/', {**BOQ, 'projectId': self.pid}), 201)['id']
        mid = self.assertSuccess(self.post('/api/measurements/', {**MEASUREMENT, 'projectId': self.pid}), 201)['id']
        cid = self.assertSuccess(self.post('/api/calculations/', {**CALCULATION, 'projectId': self.pid}), 201)['id']
        self.assertSuccess(self.delete(f'/api/projects/{self.pid}/'))
        self.assertIsNone(BoqItem.objects.get(ref=ref).project_id)
        self.assertIsNone(Measurement.objects.get(pk=mid).project_id)
        self.assertIsNone(Calculation.objects.get(pk=cid).project_id)

    def test_project_excel_export_has_only_that_projects_boq(self):
        self.post('/api/boq/', {**BOQ, 'projectId': self.pid})
        self.post('/api/boq/', {**BOQ, 'item': 'Sand', 'category': 'Sand'})
        self.post('/api/boq/', {**BOQ, 'item': 'Block', 'category': 'Blocks', 'projectId': self.other_pid})
        self.assertEqual(self.client.get(f'/api/export/excel/?projectId={self.pid}').status_code, 200)
        self.assertEqual(Report.objects.get(project_id=self.pid).content['boqItemCount'], 1)
        self.assertEqual(self.client.get('/api/export/excel/').status_code, 200)
        self.assertEqual(Report.objects.get(project_id__isnull=True, type='xlsx').content['boqItemCount'], 3)

    def test_history_can_be_filtered_by_project(self):
        self.post('/api/boq/', {**BOQ, 'projectId': self.pid})
        self.post('/api/boq/', BOQ)
        rows = self.assertSuccess(self.get('/api/history/', projectId=self.pid))
        self.assertTrue(rows and all(r['project_id'] == self.pid for r in rows))
        self.assertError(self.get('/api/history/', projectId='x'), 400)


class RoofDesignPerProjectTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.pid = self.assertSuccess(self.post('/api/projects/', PROJECT), 201)['id']

    def test_project_design_is_separate_from_personal_design(self):
        self.assertSuccess(self.put('/api/roof-designs/', {'properties': {'pitch': '20'}}))
        self.assertSuccess(self.put(f'/api/roof-designs/?projectId={self.pid}', {'properties': {'pitch': '35'}}))
        personal = self.assertSuccess(self.get('/api/roof-designs/'))
        project = self.assertSuccess(self.get('/api/roof-designs/', projectId=self.pid))
        self.assertEqual((personal['properties']['pitch'], personal['projectId']), ('20', None))
        self.assertEqual((project['properties']['pitch'], project['projectId']), ('35', self.pid))
        self.assertEqual(project['ownerId'], self.user.id)
        self.get('/api/roof-designs/', projectId=self.pid)
        self.assertEqual(RoofDesign.objects.filter(project_id=self.pid).count(), 1)  # one per project
        self.assertTrue(History.objects.filter(entity_type='roof_design', project_id=self.pid).exists())

    def test_reset_only_clears_that_projects_design(self):
        self.put('/api/roof-designs/', {'properties': {'pitch': '20'}})
        self.put(f'/api/roof-designs/?projectId={self.pid}', {'properties': {'pitch': '35'}})
        self.assertEqual(self.delete(f'/api/roof-designs/?projectId={self.pid}').status_code, 200)
        self.assertEqual(self.assertSuccess(self.get('/api/roof-designs/', projectId=self.pid))['properties']['pitch'], '')
        self.assertEqual(self.assertSuccess(self.get('/api/roof-designs/'))['properties']['pitch'], '20')

    def test_other_members_cannot_open_the_project_design(self):
        bob = APIClient()
        bob.force_login(self.make_user('bob@example.com', name='Bob'))
        self.assertEqual(bob.get(f'/api/roof-designs/?projectId={self.pid}').status_code, 404)
        self.assertEqual(bob.put(f'/api/roof-designs/?projectId={self.pid}', {'properties': {'pitch': '1'}}, format='json').status_code, 404)
        self.assertError(self.get('/api/roof-designs/', projectId='abc'), 400)
        self.assertEqual(self.get('/api/roof-designs/', projectId=999999).status_code, 404)

    def test_admin_edits_the_owners_project_design(self):
        self.put(f'/api/roof-designs/?projectId={self.pid}', {'properties': {'pitch': '35'}})
        self.login(self.make_user('boss@example.com', role='Admin'))
        data = self.assertSuccess(self.put(f'/api/roof-designs/?projectId={self.pid}', {'properties': {'pitch': '40'}}))
        self.assertEqual((data['properties']['pitch'], data['ownerId']), ('40', self.user.id))

    def test_deleting_the_project_keeps_its_design(self):
        design_id = self.assertSuccess(self.put(f'/api/roof-designs/?projectId={self.pid}', {'properties': {'pitch': '35'}}))['id']
        self.assertSuccess(self.delete(f'/api/projects/{self.pid}/'))
        design = RoofDesign.objects.get(pk=design_id)
        self.assertEqual((design.project_id, design.properties['pitch']), (None, '35'))
