import { parseDate, request, type ApiResult } from '../client'
import { endpoints } from '../endpoints'

export const BOQ_CATEGORIES = ['Cement', 'Sand', 'Aggregate', 'Blocks', 'Rebar', 'Timber', 'Roofing', 'Underlay', 'Other'] as const

export type BoqItem = {
  id: string
  item: string
  category: string
  description: string
  specification: string
  unit: string
  quantity: number
  wastePercent: number
  unitPrice: number
  adjustedQuantity: number
  total: number
  notes: string
  source: string
  updatedAt: Date
  /** Django only: the linked project (null = not linked) and the owner. */
  projectId: number | null
  ownerId: number | null
  ownerName?: string | null
}

export type BoqInput = {
  item: string; category: string; description: string; specification: string; unit: string
  quantity: number; wastePercent: number; unitPrice: number; notes: string; source?: string
  /** Omit to leave unchanged; null = not linked to a project. */
  projectId?: number | null
}

type Row = {
  id: string; item: string; category: string; description: string | null; specification: string | null
  unit: string; quantity: number; waste_percent: number; unit_price: number; adjusted_quantity: number
  total: number; notes: string | null; source: string | null; updated_at: string | null
  projectId?: number | null; ownerId?: number | null; ownerName?: string | null
}

const hydrate = (row: Row): BoqItem => ({
  id: row.id,
  item: row.item,
  category: row.category,
  description: row.description || '',
  specification: row.specification || '',
  unit: row.unit,
  quantity: Number(row.quantity),
  wastePercent: Number(row.waste_percent),
  unitPrice: Number(row.unit_price),
  adjustedQuantity: Number(row.adjusted_quantity),
  total: Number(row.total),
  notes: row.notes || '',
  source: row.source || 'manual',
  updatedAt: parseDate(row.updated_at) ?? new Date(),
  projectId: row.projectId ?? null,
  ownerId: row.ownerId ?? null,
  ownerName: row.ownerName,
})

const one = (r: ApiResult<Row>): ApiResult<BoqItem> => (r.ok ? { ...r, data: hydrate(r.data) } : r)

export const boqApi = {
  /** projectId: a project's items only; 'none' = items not linked to a project. */
  async getAll(filter: { projectId?: number | 'none' } = {}): Promise<ApiResult<BoqItem[]>> {
    const r = await request<Row[]>('GET', endpoints.boq.list, { query: filter })
    return r.ok ? { ...r, data: r.data.map(hydrate) } : r
  },
  getById: async (id: string) => one(await request<Row>('GET', endpoints.boq.item(id))),
  add: async (data: BoqInput) => one(await request<Row>('POST', endpoints.boq.list, { body: data })),
  update: async (id: string, data: Partial<BoqInput>) => one(await request<Row>('PUT', endpoints.boq.item(id), { body: data })),
  remove: (id: string) => request<null>('DELETE', endpoints.boq.item(id)),

  /** "Add to BOQ" from a calculator pushes a few rows one by one (no
   *  batch endpoint, same as boq-store.js). Stops at the first failure. */
  async addMany(rows: BoqInput[]): Promise<{ ok: true; items: BoqItem[] } | { ok: false; error: string; items: BoqItem[] }> {
    const added: BoqItem[] = []
    for (const row of rows) {
      const r = await boqApi.add(row)
      if (!r.ok) return { ok: false, error: r.error, items: added }
      added.push(r.data)
    }
    return { ok: true, items: added }
  },
}

/** Display helpers shared by the BOQ page (same formats as boq.js). */
export function formatQty(value: number): string {
  if (!isFinite(value)) return '0'
  const [whole, frac] = String(Math.round(value * 100) / 100).split('.')
  return [whole.replace(/\B(?=(\d{3})+(?!\d))/g, ','), frac].filter(Boolean).join('.')
}

export function formatCurrency(value: number): string {
  const [whole, frac] = (isFinite(value) ? value : 0).toFixed(2).split('.')
  return `GH₵ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}`
}
