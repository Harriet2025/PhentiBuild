"""The existing `materials` catalogue table (managed = False). Text PK: MAT-####."""
from __future__ import annotations

from django.db import models
from django.db.models.functions import Now

from apps.core.utils import fmt_datetime

CATEGORIES = ['Cement', 'Sand', 'Aggregate', 'Blocks', 'Rebar', 'Timber', 'Roofing', 'Underlay']


class Material(models.Model):
    id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=[(c, c) for c in CATEGORIES])
    unit = models.CharField(max_length=100)
    dimensions = models.CharField(max_length=255, null=True)
    overall_dimensions = models.CharField(max_length=255, null=True)
    effective_coverage = models.CharField(max_length=255, null=True)
    standard_length = models.CharField(max_length=255, null=True)
    spacing = models.CharField(max_length=255, null=True)
    description = models.TextField(null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = 'materials'

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'unit': self.unit,
            'dimensions': self.dimensions,
            'overall_dimensions': self.overall_dimensions,
            'effective_coverage': self.effective_coverage,
            'standard_length': self.standard_length,
            'spacing': self.spacing,
            'description': self.description,
            'is_active': bool(self.is_active),
            'created_at': fmt_datetime(self.created_at),
            'updated_at': fmt_datetime(self.updated_at),
        }
