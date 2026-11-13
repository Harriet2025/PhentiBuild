"""The existing `measurements` and `calculations` tables (managed = False)."""
from __future__ import annotations

from django.db import models
from django.db.models.functions import Now

from apps.core.utils import fmt_datetime

SECTION_TYPES = ['walls', 'plastering', 'slab', 'column', 'roof', 'concrete', 'rebar', 'timber']
CALCULATION_TYPES = ['walls', 'plastering', 'concrete', 'rebar', 'timber', 'roofing']


class Measurement(models.Model):
    id = models.AutoField(primary_key=True)
    # users.id of the person who created the row (apps/core/ownership.py).
    owner_id = models.IntegerField(null=True, blank=True, default=None)
    # Optional link to a project (NULL = not linked).
    project_id = models.IntegerField(null=True, blank=True, default=None)
    section_type = models.CharField(max_length=20, choices=[(s, s) for s in SECTION_TYPES])
    label = models.CharField(max_length=255, null=True)
    values = models.JSONField(db_column='values_json')
    notes = models.TextField(null=True)
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = 'measurements'

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'ownerId': self.owner_id,
            'projectId': self.project_id,
            'section_type': self.section_type,
            'label': self.label,
            'notes': self.notes,
            'created_at': fmt_datetime(self.created_at),
            'updated_at': fmt_datetime(self.updated_at),
            'values': self.values if self.values is not None else [],
        }


class Calculation(models.Model):
    id = models.AutoField(primary_key=True)
    # users.id of the person who created the row (apps/core/ownership.py).
    owner_id = models.IntegerField(null=True, blank=True, default=None)
    # Optional link to a project (NULL = not linked).
    project_id = models.IntegerField(null=True, blank=True, default=None)
    calculation_type = models.CharField(max_length=20, choices=[(c, c) for c in CALCULATION_TYPES])
    label = models.CharField(max_length=255, null=True)
    input = models.JSONField(db_column='input_json')
    result = models.JSONField(db_column='result_json')
    notes = models.TextField(null=True)
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = 'calculations'

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'ownerId': self.owner_id,
            'projectId': self.project_id,
            'calculation_type': self.calculation_type,
            'label': self.label,
            'notes': self.notes,
            'created_at': fmt_datetime(self.created_at),
            'updated_at': fmt_datetime(self.updated_at),
            'input': self.input if self.input is not None else [],
            'result': self.result if self.result is not None else [],
        }
