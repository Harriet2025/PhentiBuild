"""The existing `roof_designs` table — a person's own design, plus one design per project."""
from __future__ import annotations

from django.db import models
from django.db.models.functions import Now

from apps.core.utils import fmt_datetime

DEFAULT_PROPERTIES = {
    'roofType': 'Gable Roof', 'length': '', 'width': '', 'pitch': '',
    'rafterSpacing': '', 'purlinSpacing': '', 'roofingMaterial': '',
}


class RoofDesign(models.Model):
    id = models.AutoField(primary_key=True)
    # users.id of the person who created the row (apps/core/ownership.py).
    owner_id = models.IntegerField(null=True, blank=True, default=None)
    # NULL = the owner's own design; otherwise the design of that project (one per project).
    project_id = models.IntegerField(null=True, blank=True, default=None)
    shapes = models.JSONField(db_column='shapes_json')
    properties = models.JSONField(db_column='properties_json')
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = 'roof_designs'

    def to_dict(self) -> dict:
        props = self.properties if isinstance(self.properties, dict) else {}
        return {
            'id': self.id,
            'ownerId': self.owner_id,
            'projectId': self.project_id,
            'shapes': self.shapes if self.shapes is not None else [],
            'properties': {**DEFAULT_PROPERTIES, **props},
            'created_at': fmt_datetime(self.created_at),
            'updated_at': fmt_datetime(self.updated_at),
        }
