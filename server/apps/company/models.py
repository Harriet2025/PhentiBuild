"""The existing `company_profile` (single row) and `contact_messages` tables."""
from __future__ import annotations

from django.db import models
from django.db.models.functions import Now

from apps.core.utils import fmt_datetime

CONTACT_STATUSES = ['new', 'read', 'replied', 'archived']


class CompanyProfile(models.Model):
    id = models.AutoField(primary_key=True)
    company_name = models.CharField(max_length=255, default='')
    address = models.CharField(max_length=500, default='')
    phone = models.CharField(max_length=30, default='')
    email = models.CharField(max_length=255, default='')
    registration_number = models.CharField(max_length=100, default='')
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = 'company_profile'

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'companyName': self.company_name,
            'address': self.address,
            'phone': self.phone,
            'email': self.email,
            'registrationNumber': self.registration_number,
            'created_at': fmt_datetime(self.created_at),
            'updated_at': fmt_datetime(self.updated_at),
        }


class ContactMessage(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.CharField(max_length=255)
    phone = models.CharField(max_length=30, null=True)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=[(s, s) for s in CONTACT_STATUSES], db_default='new')
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = 'contact_messages'
