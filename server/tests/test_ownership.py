"""Data ownership: members see only their own records, Admins see everyone's."""
from __future__ import annotations

import io

from django.core.management import CommandError, call_command
from rest_framework.test import APIClient

from apps.boq.models import BoqItem
from apps.history.models import History
from apps.projects.models import Project
from apps.records.models import Calculation, Measurement
from apps.reports.models import Report
from apps.roofing.models import RoofDesign

from .base import ApiTestCase

PROJECT = {'name': 'Ama Villa', 'client': 'Kofi', 'contact': '0241234567', 'location': 'Kumasi', 'type': 'Residential',
           'startDate': '2026-11-13', 'endDate': '2027-02-01'}
BOQ = {'item': 'Cement', 'category': 'Cement', 'unit': 'bag', 'quantity': 10, 'unitPrice': 12.5}


class OwnershipTests(ApiTestCase):
    """`self.user` (owner@) is Ama; `bob` is another member; `boss` is an Admin."""

    def setUp(self):
        super().setUp()
        self.bob = self.make_user('bob@example.com', name='Bob')
        self.boss = self.make_user('boss@example.com', role='Admin', name='Boss')
        self.ama = APIClient(); self.ama.force_login(self.user)
        self.bob_client = APIClient(); self.bob_client.force_login(self.bob)
        self.boss_client = APIClient(); self.boss_client.force_login(self.boss)

    def as_(self, client, method, url, body=None):
        return getattr(client, method)(url, body, format='json')

    def make_all(self, client):
        """Creates one of every owned record through the API, as `client`."""
        ids = {
            'project': self.assertSuccess(self.as_(client, 'post', '/api/projects/', PROJECT), 201)['id'],
            'boq': self.assertSuccess(self.as_(client, 'post', '/api/boq/', BOQ), 201)['id'],
            'measurement': self.assertSuccess(self.as_(client, 'post', '/api/measurements/', {'sectionType': 'walls', 'values': {'length': '4'}}), 201)['id'],
            'calculation': self.assertSuccess(self.as_(client, 'post', '/api/calculations/', {'calculationType': 'walls', 'input': {'a': 1}, 'result': {'b': 2}}), 201)['id'],
        }
        ids['report'] = self.assertSuccess(self.as_(client, 'post', '/api/reports/', {'title': 'Mine', 'projectId': ids['project']}), 201)['id']
        return ids

    def urls(self, ids):
        return {
            'project': f"/api/projects/{ids['project']}/", 'boq': f"/api/boq/{ids['boq']}/",
            'measurement': f"/api/measurements/{ids['measurement']}/", 'calculation': f"/api/calculations/{ids['calculation']}/",
            'report': f"/api/reports/{ids['report']}/",
        }

    LISTS = ['/api/projects/', '/api/boq/', '/api/measurements/', '/api/calculations/', '/api/reports/']

    def test_new_records_are_stamped_with_their_creator(self):
        ids = self.make_all(self.ama)
        self.assertEqual(Project.objects.get(pk=ids['project']).owner_id, self.user.id)
        self.assertEqual(BoqItem.objects.get(ref=ids['boq']).owner_id, self.user.id)
        self.assertEqual(Measurement.objects.get(pk=ids['measurement']).owner_id, self.user.id)
        self.assertEqual(Calculation.objects.get(pk=ids['calculation']).owner_id, self.user.id)
        self.assertEqual(Report.objects.get(pk=ids['report']).owner_id, self.user.id)
        self.assertEqual(self.assertSuccess(self.ama.get(self.urls(ids)['project']))['ownerId'], self.user.id)

    def test_members_only_see_their_own_lists(self):
        self.make_all(self.ama)
        for url in self.LISTS:
            with self.subTest(url=url):
                self.assertEqual(len(self.assertSuccess(self.ama.get(url))), 1)
                self.assertEqual(self.assertSuccess(self.bob_client.get(url)), [])

    def test_other_peoples_records_are_404_for_read_update_delete(self):
        ids = self.make_all(self.ama)
        for name, url in self.urls(ids).items():
            with self.subTest(record=name):
                self.assertEqual(self.bob_client.get(url).status_code, 404)
                self.assertEqual(self.as_(self.bob_client, 'put', url, {'notes': 'hacked', 'name': 'hacked', 'title': 'hacked', 'label': 'hacked'}).status_code, 404)
                self.assertEqual(self.bob_client.delete(url).status_code, 404)
                self.assertSuccess(self.ama.get(url))  # still there, unchanged, for the owner
        self.assertEqual(Project.objects.get(pk=ids['project']).name, 'Ama Villa')

    def test_admin_sees_and_manages_everyone(self):
        ids = self.make_all(self.ama)
        self.make_all(self.bob_client)
        for url in self.LISTS:
            with self.subTest(url=url):
                rows = self.assertSuccess(self.boss_client.get(url))
                self.assertEqual(len(rows), 2)
                self.assertEqual({r['ownerName'] for r in rows}, {'Test User', 'Bob'})
        data = self.assertSuccess(self.as_(self.boss_client, 'put', self.urls(ids)['project'], {'status': 'Archived'}))
        self.assertEqual((data['status'], data['ownerId']), ('Archived', self.user.id))  # owner unchanged
        self.assertSuccess(self.boss_client.delete(self.urls(ids)['boq']))

    def test_unowned_old_records_are_admin_only(self):
        Project.objects.create(ref='PHB-9999', name='Old', client='C', contact='0241234567', location='L', type='Residential',
                               start_date='2026-01-01', end_date='2026-02-01', progress=0, status='Planning')
        self.assertEqual(self.assertSuccess(self.ama.get('/api/projects/')), [])
        self.assertEqual(len(self.assertSuccess(self.boss_client.get('/api/projects/'))), 1)

    def test_reports_cannot_link_or_export_someone_elses_project(self):
        ids = self.make_all(self.ama)
        r = self.as_(self.bob_client, 'post', '/api/reports/', {'title': 'Sneaky', 'projectId': ids['project']})
        self.assertError(r, 422, field='projectId')
        self.assertEqual(self.bob_client.get(f"/api/export/excel/?projectId={ids['project']}").status_code, 404)

    def test_excel_export_contains_only_my_boq(self):
        self.make_all(self.ama)
        self.make_all(self.bob_client)
        self.assertEqual(self.bob_client.get('/api/export/excel/').status_code, 200)
        report = Report.objects.filter(owner_id=self.bob.id, type='xlsx').get()
        self.assertEqual(report.content['boqItemCount'], 1)
        self.boss_client.get('/api/export/excel/')
        self.assertEqual(Report.objects.filter(owner_id=self.boss.id, type='xlsx').get().content['boqItemCount'], 2)

    def test_each_person_has_their_own_roof_design(self):
        self.assertSuccess(self.as_(self.ama, 'put', '/api/roof-designs/', {'properties': {'pitch': '30'}}))
        bob = self.assertSuccess(self.bob_client.get('/api/roof-designs/'))
        self.assertEqual(bob['properties']['pitch'], '')
        self.assertEqual(self.assertSuccess(self.ama.get('/api/roof-designs/'))['properties']['pitch'], '30')
        self.assertEqual(RoofDesign.objects.count(), 2)

    def test_history_members_see_only_their_own_actions(self):
        self.make_all(self.ama)
        self.make_all(self.bob_client)
        r = self.bob_client.get('/api/history/')
        rows = self.assertSuccess(r)
        self.assertTrue(rows and all(h['user_id'] == self.bob.id for h in rows))
        self.assertEqual(r.json()['users'], [{'id': self.bob.id, 'name': 'Bob'}])
        ama_entry = History.objects.filter(user_id=self.user.id).first()
        self.assertEqual(self.bob_client.get(f'/api/history/{ama_entry.id}/').status_code, 404)
        self.assertEqual(len(self.assertSuccess(self.boss_client.get('/api/history/'))), History.objects.count())


class MaterialPermissionTests(ApiTestCase):
    def test_members_read_admins_write(self):
        self.login()
        self.assertSuccess(self.client.get('/api/materials/'))
        body = {'name': 'Sandcrete Block', 'category': 'Blocks', 'unit': 'piece'}
        self.assertError(self.post('/api/materials/', body), 403, message='Only an administrator can change the materials library.')
        self.login(self.make_user('boss@example.com', role='Admin'))
        mid = self.assertSuccess(self.post('/api/materials/', body), 201)['id']
        self.login()
        self.assertError(self.put(f'/api/materials/{mid}/', {'name': 'Changed'}), 403)
        self.assertError(self.delete(f'/api/materials/{mid}/'), 403)


class AssignUnownedTests(ApiTestCase):
    def test_gives_only_unowned_records_and_is_repeatable(self):
        other = self.make_user('other@example.com')
        Project.objects.create(ref='PHB-9001', name='Old', client='C', contact='0241234567', location='L', type='Residential',
                               start_date='2026-01-01', end_date='2026-02-01', progress=0, status='Planning')
        Project.objects.create(ref='PHB-9002', name='Theirs', client='C', contact='0241234567', location='L', type='Residential',
                               start_date='2026-01-01', end_date='2026-02-01', progress=0, status='Planning', owner_id=other.id)
        Measurement.objects.create(section_type='walls', values={'a': 1})

        out = io.StringIO()
        call_command('assign_unowned', '--email', 'owner@example.com', '--dry-run', stdout=out)
        self.assertIn('would give', out.getvalue())
        self.assertEqual(Project.objects.filter(owner_id__isnull=True).count(), 1)  # dry run changed nothing

        call_command('assign_unowned', '--email', 'OWNER@example.com', stdout=io.StringIO())
        self.assertEqual(Project.objects.get(ref='PHB-9001').owner_id, self.user.id)
        self.assertEqual(Project.objects.get(ref='PHB-9002').owner_id, other.id)  # never re-assigned
        self.assertEqual(Measurement.objects.get().owner_id, self.user.id)

        out = io.StringIO()
        call_command('assign_unowned', '--email', 'owner@example.com', stdout=out)
        self.assertIn('nothing', out.getvalue())
        with self.assertRaises(CommandError):
            call_command('assign_unowned', '--email', 'nobody@example.com', stdout=io.StringIO())
