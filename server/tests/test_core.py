"""Validator parity with Validator.php, PHP rounding, JSON envelope & error handling."""
from __future__ import annotations

from django.test import SimpleTestCase

from apps.core.utils import php_round, strip_tags, to_decimal
from apps.core.validator import Validator, is_php_numeric

from .base import ApiTestCase


class ValidatorParityTests(SimpleTestCase):
    def test_required_message_and_presence_rules(self):
        v = Validator({'a': '', 'b': None, 'c': 0, 'd': False})
        v.required('a', 'Alpha').required('b', 'Beta').required('c', 'Gamma').required('d', 'Delta')
        self.assertEqual(v.errors(), {'a': 'Alpha is required.', 'b': 'Beta is required.'})

    def test_first_error_per_field_wins(self):
        v = Validator({'name': 'x'})
        v.required('name', 'Name').min_length('name', 2, 'Name').max_length('name', 0, 'Name')
        self.assertEqual(v.errors(), {'name': 'Name must be at least 2 characters.'})

    def test_optional_rules_skip_absent_fields(self):
        v = Validator({})
        v.optional('email').email('email').optional('n').numeric('n')
        self.assertFalse(v.fails())

    def test_default_label_is_ucfirst_field(self):
        v = Validator({'description': 'x' * 1001})
        v.optional('description').max_length('description', 1000)
        self.assertEqual(v.errors()['description'], 'Description must be 1000 characters or fewer.')

    def test_in_message_lists_allowed_values(self):
        v = Validator({'type': 'Bungalow'})
        v.required('type', 'Project type').in_('type', ['Residential', 'Commercial'], 'Project type')
        self.assertEqual(v.errors()['type'], 'Project type must be one of: Residential, Commercial.')

    def test_dates(self):
        for bad in ('2026-02-30', '2026-2-3', '03/04/2026', 'tomorrow'):
            v = Validator({'d': bad})
            v.required('d', 'Start date').date('d', 'Start date')
            self.assertEqual(v.errors()['d'], 'Start date must be a valid date (YYYY-MM-DD).', bad)
        v = Validator({'start': '2026-05-10', 'end': '2026-05-09'})
        v.date_not_before('end', 'start', 'Expected completion date')
        self.assertEqual(v.errors()['end'], 'Expected completion date cannot be before the start date.')
        v = Validator({'start': '2026-05-10', 'end': '2026-05-10'})
        self.assertFalse(v.date_not_before('end', 'start').fails())

    def test_integer_between(self):
        for ok in (0, 100, '55', '5.0', 5.0):
            self.assertFalse(Validator({'p': ok}).integer_between('p', 0, 100).fails(), ok)
        for bad in (-1, 101, '5.5', 'ten', True):
            v = Validator({'p': bad}).integer_between('p', 0, 100, 'Progress')
            self.assertEqual(v.errors()['p'], 'Progress must be a whole number between 0 and 100.', bad)

    def test_numeric_matches_php_is_numeric(self):
        for ok in ('1', '1.5', '.5', '1e3', ' 2 ', '-3', 7, 2.25):
            self.assertTrue(is_php_numeric(ok), ok)
        for bad in ('abc', '', '1_000', 'inf', 'nan', '0x1A', True, None, [1], float('nan')):
            self.assertFalse(is_php_numeric(bad), bad)
        v = Validator({'q': -1}).numeric('q', 'Quantity', 0)
        self.assertEqual(v.errors()['q'], 'Quantity must be 0 or more.')
        v = Validator({'q': 'x'}).numeric('q', 'Quantity', 0)
        self.assertEqual(v.errors()['q'], 'Quantity must be a number.')

    def test_email_phone_and_phone_or_email(self):
        self.assertEqual(Validator({'e': 'nope'}).email('e', 'Email').errors()['e'], 'Email must be a valid email address.')
        self.assertFalse(Validator({'p': '+233 (24) 123-4567'}).phone('p').fails())
        self.assertEqual(Validator({'p': '12345'}).phone('p', 'Phone').errors()['p'],
                         'Phone must be a valid phone number (7–15 digits).')
        self.assertFalse(Validator({'c': 'a@b.co'}).phone_or_email('c').fails())
        self.assertFalse(Validator({'c': '0241234567'}).phone_or_email('c').fails())
        self.assertEqual(Validator({'c': 'abc'}).phone_or_email('c', 'Client contact').errors()['c'],
                         'Client contact must be a valid phone number or an email address.')
        self.assertEqual(Validator({'c': 'a@b'}).phone_or_email('c', 'Client contact').errors()['c'],
                         'Client contact must be a valid email address.')

    def test_non_text_values_are_rejected_not_crashed(self):
        v = Validator({'name': ['a', 'b']}).required('name', 'Name').min_length('name', 2, 'Name')
        self.assertEqual(v.errors()['name'], 'Name must be text.')

    def test_validated_trims_and_drops_unknown_fields(self):
        v = Validator({'name': '  Site A  ', 'extra': 'sneaky', 'blank': ''})
        v.required('name', 'Name').optional('blank')
        self.assertEqual(v.validated(), {'name': 'Site A'})


class RoundingTests(SimpleTestCase):
    def test_php_round_half_away_from_zero(self):
        self.assertEqual(php_round(2.5, 0), 3.0)
        self.assertEqual(php_round(-2.5, 0), -3.0)
        self.assertEqual(php_round(1.005, 2), 1.01)   # Python's round() gives 1.0
        self.assertEqual(php_round(10.5, 4), 10.5)

    def test_decimal_column_rounding_like_mysql(self):
        self.assertEqual(str(to_decimal('0.125', 2)), '0.13')
        self.assertEqual(str(to_decimal(1.0005, 3)), '1.001')
        self.assertEqual(str(to_decimal('1e3', 3)), '1000.000')

    def test_strip_tags(self):
        self.assertEqual(strip_tags('<b>Hello</b> <script>x</script>world'), 'Hello xworld')


class EnvelopeAndErrorTests(ApiTestCase):
    def test_ping_is_public_and_reports_database(self):
        data = self.assertSuccess(self.client.get('/api/ping/'))
        self.assertEqual(data['database'], 'connected')
        self.assertEqual(data['app'], 'PhentiBuild')

    def test_unknown_url_is_json_404(self):
        self.login()
        self.assertError(self.client.get('/api/nope/'), 404, 'Resource not found.')

    def test_method_not_allowed_is_json_405(self):
        self.login()
        self.assertError(self.client.delete('/api/history/'), 405, 'Method not allowed.')

    def test_malformed_json_bodies(self):
        self.login()
        for body in ('{bad json', '[1, 2]', '"text"', '{"quantity": NaN}'):
            self.assertError(self.raw('post', '/api/boq/', body), 400, 'Request body must be valid JSON.')

    def test_json_read_regardless_of_content_type(self):
        """PHP read php://input whatever the Content-Type said."""
        self.login()
        r = self.raw('post', '/api/measurements/', '{"sectionType": "walls", "values": {"a": 1}}', content_type='text/plain')
        self.assertSuccess(r, 201)

    def test_empty_body_gives_field_errors(self):
        self.login()
        body = self.assertError(self.post('/api/projects/'), 422, 'Validation failed.')
        self.assertEqual(body['errors']['name'], 'Project name is required.')
