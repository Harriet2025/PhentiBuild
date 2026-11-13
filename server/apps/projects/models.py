"""The existing `projects` table (managed = False)."""
from __future__ import annotations

from django.db import models
from django.db.models.functions import Now

from apps.core.utils import fmt_date, fmt_datetime

TYPES = ['Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Institutional']
STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Archived']


def project_ref(project_id: int) -> str:
    """PHB-0001 from the row's own id (never reissued after a delete)."""
    return f'PHB-{project_id:04d}'


class Project(models.Model):
    id = models.AutoField(primary_key=True)
    # users.id of the person who created the row (apps/core/ownership.py).
    owner_id = models.IntegerField(null=True, blank=True, default=None)
    ref = models.CharField(max_length=20, unique=True, null=True)
    name = models.CharField(max_length=255)
    client = models.CharField(max_length=255)
    contact = models.CharField(max_length=255, null=True)
    location = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=[(t, t) for t in TYPES])
    description = models.TextField(null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    progress = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=20, choices=[(s, s) for s in STATUSES], default='Planning')
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = 'projects'

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'ownerId': self.owner_id,
            'ref': self.ref,
            'name': self.name,
            'client': self.client,
            'contact': self.contact,
            'location': self.location,
            'type': self.type,
            'description': self.description,
            'start_date': fmt_date(self.start_date),
            'end_date': fmt_date(self.end_date),
            'progress': int(self.progress),
            'status': self.status,
            'created_at': fmt_datetime(self.created_at),
            'updated_at': fmt_datetime(self.updated_at),
        }
