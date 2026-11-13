"""The existing `reports` table (managed = False)."""
from __future__ import annotations

from django.db import models
from django.db.models.functions import Now

from apps.core.utils import fmt_datetime


class Report(models.Model):
    id = models.AutoField(primary_key=True)
    # users.id of the person who created the row (apps/core/ownership.py).
    owner_id = models.IntegerField(null=True, blank=True, default=None)
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=50, default='custom')
    project_id = models.IntegerField(null=True)  # FK owned by the DB (ON DELETE SET NULL)
    content = models.JSONField(null=True, db_column='content_json')
    notes = models.TextField(null=True)
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = 'reports'

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'ownerId': self.owner_id,
            'title': self.title,
            'type': self.type,
            'project_id': self.project_id,
            'notes': self.notes,
            'created_at': fmt_datetime(self.created_at),
            'updated_at': fmt_datetime(self.updated_at),
            'content': self.content,
        }
