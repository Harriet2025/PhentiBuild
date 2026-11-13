"""The existing append-only `history` audit table (managed = False)."""
from __future__ import annotations

from django.db import models
from django.db.models.functions import Now

ENTITY_TYPES = ['project', 'material', 'boq_item', 'measurement', 'calculation', 'roof_design', 'report', 'account', 'company_profile']
ACTIONS = ['created', 'updated', 'deleted', 'deactivated', 'reactivated']
MODULE_LABELS = {
    'project': 'Projects',
    'material': 'Materials',
    'boq_item': 'BOQ',
    'measurement': 'Measurements',
    'calculation': 'Calculations',
    'roof_design': 'Roof Designs',
    'report': 'Reports',
    'account': 'Settings',
    'company_profile': 'Settings',
}


def valid_modules() -> list[str]:
    """Same as History::validModules() (array_values keeps duplicates)."""
    return list(MODULE_LABELS.values())


class History(models.Model):
    id = models.AutoField(primary_key=True)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=50)
    # Plain integer columns: the database itself owns the foreign keys
    # (ON DELETE SET NULL), Django only reads/writes the ids.
    user_id = models.IntegerField(null=True)
    project_id = models.IntegerField(null=True)
    module = models.CharField(max_length=50, null=True)
    action = models.CharField(max_length=20, choices=[(a, a) for a in ACTIONS])
    summary = models.CharField(max_length=500)
    details = models.JSONField(null=True, db_column='details_json')
    created_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = 'history'
