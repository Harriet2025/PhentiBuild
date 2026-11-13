"""
Excel workbook builder — port of backend/services/ExcelExportService.php
(PhpSpreadsheet → openpyxl). Same sheets, headers, number formats and
brand styling:

  Project Information · BOQ · Materials · Cement/Rebar/Timber/Roofing
  Schedule · Cost Summary
"""
from __future__ import annotations

from datetime import datetime
from io import BytesIO

from django.conf import settings
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet

BRAND_ORANGE = 'FF6600'
BRAND_DARK = '2B2B2B'
HEADER_TEXT = 'FFFFFF'
STRIPE = 'F8F9FA'
BORDER_COLOR = 'D7D9DC'
TOTAL_FILL = 'FFEDE0'
SCHEDULE_CATEGORIES = ['Cement', 'Rebar', 'Timber', 'Roofing']


def _solid(color: str) -> PatternFill:
    return PatternFill(fill_type='solid', start_color=color, end_color=color)


def _page_title(ws: Worksheet, last_col: str, title: str) -> None:
    ws.merge_cells(f'A1:{last_col}1')
    cell = ws['A1']
    cell.value = title
    cell.font = Font(bold=True, size=15, color=BRAND_DARK)
    cell.alignment = Alignment(vertical='center')
    ws.row_dimensions[1].height = 26
    for col in range(1, ord(last_col) - ord('A') + 2):
        ws.cell(row=1, column=col).border = Border(bottom=Side(style='medium', color=BRAND_ORANGE))


def _header_row(ws: Worksheet, row: int, headers: list[str]) -> None:
    for idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=row, column=idx, value=header)
        cell.font = Font(bold=True, color=HEADER_TEXT)
        cell.fill = _solid(BRAND_DARK)
        cell.alignment = Alignment(horizontal='left', vertical='center')
    ws.row_dimensions[row].height = 20


def _total_row(ws: Worksheet, row: int, from_col: str, to_col: str) -> None:
    for col in range(ord(from_col) - ord('A') + 1, ord(to_col) - ord('A') + 2):
        cell = ws.cell(row=row, column=col)
        cell.font = Font(bold=True)
        cell.border = Border(top=Side(style='thin', color=BRAND_DARK))
        cell.fill = _solid(TOTAL_FILL)


def _table_borders(ws: Worksheet, header_row: int, last_row: int, col_count: int) -> None:
    if last_row < header_row:
        return
    side = Side(style='thin', color=BORDER_COLOR)
    for r in range(header_row, last_row + 1):
        for c in range(1, col_count + 1):
            ws.cell(row=r, column=c).border = Border(left=side, right=side, top=side, bottom=side)
        if r > header_row and (r - header_row) % 2 == 0:
            for c in range(1, col_count + 1):
                ws.cell(row=r, column=c).fill = _solid(STRIPE)


def _auto_size(ws: Worksheet, col_count: int, start_row: int = 3) -> None:
    """openpyxl has no true auto-size; approximate it from cell text length."""
    for c in range(1, col_count + 1):
        width = 10
        for r in range(start_row, ws.max_row + 1):
            value = ws.cell(row=r, column=c).value
            if value is not None:
                width = max(width, min(60, len(str(value)) + 2))
        ws.column_dimensions[get_column_letter(c)].width = width


def _number_format(ws: Worksheet, col: str, first: int, last: int, fmt: str) -> None:
    for r in range(first, last + 1):
        ws[f'{col}{r}'].number_format = fmt


def _project_info(ws: Worksheet, project: dict | None, boq: list[dict], materials: list[dict], now: datetime) -> None:
    ws.title = 'Project Information'
    _page_title(ws, 'D', f'{settings.APP_NAME} — Project Information')
    if project is not None:
        facts = [
            ('Project Reference', project['ref']), ('Project Name', project['name']),
            ('Client', project['client']), ('Contact', project['contact']),
            ('Location', project['location']), ('Project Type', project['type']),
            ('Status', project['status']), ('Progress', f"{int(project['progress'])}%"),
            ('Start Date', project['start_date']), ('Expected Completion', project['end_date']),
            ('Description', project['description'] or '—'),
        ]
    else:
        facts = [
            ('Project Reference', 'General Export — no project selected'),
            ('Note', 'This workbook covers the current BOQ and Materials catalog, not a specific project.'),
        ]
    row = 3
    for label, value in facts:
        ws[f'A{row}'] = label
        ws[f'B{row}'] = value
        ws[f'A{row}'].font = Font(bold=True, color=BRAND_DARK)
        row += 1
    row += 1
    ws[f'A{row}'] = 'Export Summary'
    ws[f'A{row}'].font = Font(bold=True, size=12)
    row += 1
    summary = [
        ('BOQ Line Items', len(boq)),
        ('Materials in Catalog', len(materials)),
        ('Total Estimated Cost', sum(i['total'] for i in boq)),
        ('Report Generated', now.strftime('%Y-%m-%d %H:%M')),
    ]
    for label, value in summary:
        ws[f'A{row}'] = label
        ws[f'B{row}'] = value
        ws[f'A{row}'].font = Font(bold=True)
        if label == 'Total Estimated Cost':
            ws[f'B{row}'].number_format = '#,##0.00'
        row += 1
    for col, width in (('A', 26), ('B', 46), ('C', 18), ('D', 18)):
        ws.column_dimensions[col].width = width


def _boq_sheet(ws: Worksheet, boq: list[dict]) -> None:
    ws.title = 'BOQ'
    _page_title(ws, 'J', 'Bill of Quantities')
    headers = ['ID', 'Item', 'Category', 'Description', 'Specification', 'Unit', 'Quantity', 'Waste %', 'Unit Price', 'Total']
    header_row = 3
    _header_row(ws, header_row, headers)
    row = header_row + 1
    for i in boq:
        for col, key in zip('ABCDEFGHIJ', ['id', 'item', 'category', 'description', 'specification', 'unit',
                                            'quantity', 'waste_percent', 'unit_price', 'total']):
            ws[f'{col}{row}'] = i[key]
        row += 1
    last = row - 1
    if last >= header_row + 1:
        _number_format(ws, 'G', header_row + 1, last, '#,##0.000')
        _number_format(ws, 'H', header_row + 1, last, '0.00"%"')
        _number_format(ws, 'I', header_row + 1, last, '#,##0.00')
        _number_format(ws, 'J', header_row + 1, last, '#,##0.00')
    row += 1
    ws[f'I{row}'] = 'Grand Total'
    ws[f'J{row}'] = sum(i['total'] for i in boq)
    ws[f'J{row}'].number_format = '#,##0.00'
    _total_row(ws, row, 'I', 'J')
    _table_borders(ws, header_row, last, len(headers))
    if not boq:
        # (The PHP version wrote this to A31 by mistake; it belongs in the first data row.)
        ws[f'A{header_row + 1}'] = 'No BOQ items have been added yet.'
    _auto_size(ws, len(headers))
    ws.freeze_panes = f'A{header_row + 1}'


def _materials_sheet(ws: Worksheet, materials: list[dict]) -> None:
    ws.title = 'Materials'
    _page_title(ws, 'H', 'Materials Catalog')
    headers = ['ID', 'Name', 'Category', 'Unit', 'Dimensions', 'Overall Dimensions', 'Effective Coverage', 'Standard Length']
    header_row = 3
    _header_row(ws, header_row, headers)
    row = header_row + 1
    for m in materials:
        for col, key in zip('ABCDEFGH', ['id', 'name', 'category', 'unit', 'dimensions', 'overall_dimensions',
                                          'effective_coverage', 'standard_length']):
            ws[f'{col}{row}'] = m[key]
        row += 1
    _table_borders(ws, header_row, row - 1, len(headers))
    _auto_size(ws, len(headers))
    ws.freeze_panes = f'A{header_row + 1}'


def _schedule_sheet(ws: Worksheet, title: str, boq: list[dict], category: str) -> None:
    ws.title = title
    _page_title(ws, 'H', title)
    items = [i for i in boq if i['category'] == category]
    headers = ['ID', 'Item', 'Description', 'Specification', 'Unit', 'Quantity', 'Unit Price', 'Total']
    header_row = 3
    _header_row(ws, header_row, headers)
    row = header_row + 1
    for i in items:
        for col, key in zip('ABCDEFGH', ['id', 'item', 'description', 'specification', 'unit', 'quantity', 'unit_price', 'total']):
            ws[f'{col}{row}'] = i[key]
        row += 1
    last = row - 1
    if last >= header_row + 1:
        _number_format(ws, 'F', header_row + 1, last, '#,##0.000')
        _number_format(ws, 'G', header_row + 1, last, '#,##0.00')
        _number_format(ws, 'H', header_row + 1, last, '#,##0.00')
    row += 1
    ws[f'G{row}'] = 'Subtotal'
    ws[f'H{row}'] = sum(i['total'] for i in items)
    ws[f'H{row}'].number_format = '#,##0.00'
    _total_row(ws, row, 'G', 'H')
    _table_borders(ws, header_row, last, len(headers))
    if not items:
        ws[f'A{header_row + 1}'] = f'No {category} items are in the current BOQ.'
    _auto_size(ws, len(headers))
    ws.freeze_panes = f'A{header_row + 1}'


def _cost_summary(ws: Worksheet, boq: list[dict], project: dict | None) -> None:
    ws.title = 'Cost Summary'
    _page_title(ws, 'D', 'Cost Summary' + (f" — {project['name']}" if project else ''))
    headers = ['Category', 'Line Items', 'Total Quantity Value', 'Total Cost']
    header_row = 3
    _header_row(ws, header_row, headers)
    by_category: dict[str, dict] = {}
    for i in boq:
        stats = by_category.setdefault(i['category'], {'count': 0, 'qty': 0.0, 'total': 0.0})
        stats['count'] += 1
        stats['qty'] += i['adjusted_quantity']
        stats['total'] += i['total']
    row = header_row + 1
    for category in sorted(by_category):  # PHP ksort
        s = by_category[category]
        ws[f'A{row}'], ws[f'B{row}'], ws[f'C{row}'], ws[f'D{row}'] = category, s['count'], s['qty'], s['total']
        row += 1
    last = row - 1
    if last >= header_row + 1:
        _number_format(ws, 'C', header_row + 1, last, '#,##0.000')
        _number_format(ws, 'D', header_row + 1, last, '#,##0.00')
    row += 1
    ws[f'A{row}'] = 'GRAND TOTAL'
    ws[f'B{row}'] = len(boq)
    ws[f'D{row}'] = sum(i['total'] for i in boq)
    _total_row(ws, row, 'A', 'D')
    ws[f'D{row}'].number_format = '#,##0.00'
    _table_borders(ws, header_row, last, len(headers))
    if not boq:
        ws[f'A{header_row + 1}'] = 'No BOQ items to summarize yet.'
    _auto_size(ws, len(headers))
    ws.freeze_panes = f'A{header_row + 1}'


def build_workbook(project: dict | None, boq: list[dict], materials: list[dict]) -> bytes:
    now = datetime.now()
    wb = Workbook()
    wb.properties.creator = settings.APP_NAME
    wb.properties.lastModifiedBy = settings.APP_NAME
    wb.properties.title = f"{project['name'] if project else 'General'} - {settings.APP_NAME} Export"
    wb.properties.subject = 'Construction project export'
    wb.properties.description = f"Generated by the {settings.APP_NAME} Excel Export Center on {now.strftime('%Y-%m-%d %H:%M')}"
    wb.properties.category = 'Construction Estimation'

    _project_info(wb.active, project, boq, materials, now)
    _boq_sheet(wb.create_sheet(), boq)
    _materials_sheet(wb.create_sheet(), materials)
    for category in SCHEDULE_CATEGORIES:
        _schedule_sheet(wb.create_sheet(), f'{category} Schedule', boq, category)
    _cost_summary(wb.create_sheet(), boq, project)
    wb.active = 0

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
