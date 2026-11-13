"""
The existing `boq_items` table (managed = False).

Real primary key is the numeric `seq`; the public id (BOQ-0007) lives in
the `id` column. Django reserves the attribute name `id` for primary
keys, so that column is exposed here as `ref` (db_column='id').
"""
from __future__ import annotations

from django.db import models
from django.db.models.functions import Now

from apps.core.utils import fmt_datetime, php_round

CATEGORIES = ['Cement', 'Sand', 'Aggregate', 'Blocks', 'Rebar', 'Timber', 'Roofing', 'Underlay', 'Other']


def boq_ref(seq: int) -> str:
    return f'BOQ-{seq:04d}'


def adjusted_quantity(quantity: float, waste_percent: float) -> float:
    """BoqItem::cast — round(quantity * (1 + waste/100), 4), PHP rounding."""
    return php_round(quantity * (1 + waste_percent / 100), 4)


def line_total(adjusted: float, unit_price: float) -> float:
    """BoqItem::cast — round(adjusted_quantity * unit_price, 2), PHP rounding."""
    return php_round(adjusted * unit_price, 2)


class BoqItem(models.Model):
    seq = models.AutoField(primary_key=True)
    # users.id of the person who created the row (apps/core/ownership.py).
    owner_id = models.IntegerField(null=True, blank=True, default=None)
    # Optional link to a project (NULL = not linked).
    project_id = models.IntegerField(null=True, blank=True, default=None)
    ref = models.CharField(max_length=20, unique=True, null=True, db_column='id')
    item = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=[(c, c) for c in CATEGORIES])
    description = models.TextField(null=True)
    specification = models.CharField(max_length=255, null=True)
    unit = models.CharField(max_length=100)
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    waste_percent = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(null=True)
    source = models.CharField(max_length=20, default='manual')
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = 'boq_items'

    def to_dict(self) -> dict:
        quantity = float(self.quantity)
        waste = float(self.waste_percent)
        price = float(self.unit_price)
        adjusted = adjusted_quantity(quantity, waste)
        return {
            'id': self.ref,
            'ownerId': self.owner_id,
            'projectId': self.project_id,
            'item': self.item,
            'category': self.category,
            'description': self.description,
            'specification': self.specification,
            'unit': self.unit,
            'quantity': quantity,
            'waste_percent': waste,
            'unit_price': price,
            'notes': self.notes,
            'source': self.source,
            'created_at': fmt_datetime(self.created_at),
            'updated_at': fmt_datetime(self.updated_at),
            'adjusted_quantity': adjusted,
            'total': line_total(adjusted, price),
        }
