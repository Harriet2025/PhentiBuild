import { parseDate, request, type ApiResult } from '../client'
import { endpoints } from '../endpoints'

/* ------------------------------------------------------------------
   Measurements (measurements-store.js)
   ------------------------------------------------------------------ */
export type Measurement = {
  id: number
  sectionType: string
  label: string | null
  values: Record<string, unknown>
  notes: string | null
  createdAt: Date | null
  updatedAt: Date
  projectId: number | null
}

type MeasurementRow = {
  id: number; section_type: string; label: string | null; values: Record<string, unknown> | null
  notes: string | null; created_at: string | null; updated_at: string | null; projectId?: number | null
}

const hydrateMeasurement = (row: MeasurementRow): Measurement => ({
  id: row.id,
  sectionType: row.section_type,
  label: row.label,
  values: row.values || {},
  notes: row.notes,
  createdAt: parseDate(row.created_at),
  updatedAt: parseDate(row.updated_at) ?? new Date(),
  projectId: row.projectId ?? null,
})

export const measurementsApi = {
  async getAll(filter: { projectId?: number | 'none' } = {}): Promise<ApiResult<Measurement[]>> {
    const r = await request<MeasurementRow[]>('GET', endpoints.measurements.list, { query: filter })
    return r.ok ? { ...r, data: r.data.map(hydrateMeasurement) } : r
  },
  async add(data: { sectionType: string; label?: string; values: Record<string, unknown>; notes?: string; projectId?: number | null }) {
    const r = await request<MeasurementRow>('POST', endpoints.measurements.list, { body: data })
    return r.ok ? { ...r, data: hydrateMeasurement(r.data) } : r
  },
  remove: (id: number) => request<null>('DELETE', endpoints.measurements.item(id)),
}

/* ------------------------------------------------------------------
   Calculations (calculations-store.js)
   ------------------------------------------------------------------ */
export type Calculation = {
  id: number
  calculationType: string
  label: string | null
  input: Record<string, unknown>
  result: Record<string, unknown>
  notes: string | null
  createdAt: Date | null
  updatedAt: Date
  projectId: number | null
}

type CalculationRow = {
  id: number; calculation_type: string; label: string | null
  input: Record<string, unknown> | null; result: Record<string, unknown> | null
  notes: string | null; created_at: string | null; updated_at: string | null; projectId?: number | null
}

const hydrateCalculation = (row: CalculationRow): Calculation => ({
  id: row.id,
  calculationType: row.calculation_type,
  label: row.label,
  input: row.input || {},
  result: row.result || {},
  notes: row.notes,
  createdAt: parseDate(row.created_at),
  updatedAt: parseDate(row.updated_at) ?? new Date(),
  projectId: row.projectId ?? null,
})

export const calculationsApi = {
  async getAll(filter: { projectId?: number | 'none' } = {}): Promise<ApiResult<Calculation[]>> {
    const r = await request<CalculationRow[]>('GET', endpoints.calculations.list, { query: filter })
    return r.ok ? { ...r, data: r.data.map(hydrateCalculation) } : r
  },
  async add(data: { calculationType: string; label?: string; input: unknown; result: unknown; notes?: string; projectId?: number | null }) {
    const r = await request<CalculationRow>('POST', endpoints.calculations.list, { body: data })
    return r.ok ? { ...r, data: hydrateCalculation(r.data) } : r
  },
  remove: (id: number) => request<null>('DELETE', endpoints.calculations.item(id)),
}

/* ------------------------------------------------------------------
   History (history/index.php) — read-only audit trail
   ------------------------------------------------------------------ */
export type HistoryAction = 'created' | 'updated' | 'deleted' | 'deactivated' | 'reactivated'

export type HistoryEntry = {
  id: number
  entity_type: string
  entity_id: string
  user_id: number | null
  project_id: number | null
  module: string | null
  action: HistoryAction
  summary: string
  details: Record<string, unknown> | null
  created_at: string
  user_name: string | null
  project_ref: string | null
  project_name: string | null
}

export type HistoryFilters = {
  entityType?: string
  entityId?: string
  module?: string
  userId?: string
  projectId?: number
  date?: string
  q?: string
  limit?: number
}

export const historyApi = {
  list: (filters: HistoryFilters = {}) => request<HistoryEntry[]>('GET', endpoints.history.list, { query: filters }),
}
