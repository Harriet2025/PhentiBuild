import { parseDate, request, type ApiResult } from '../client'
import { endpoints } from '../endpoints'

export const MATERIAL_CATEGORIES = ['Cement', 'Sand', 'Aggregate', 'Blocks', 'Rebar', 'Timber', 'Roofing', 'Underlay'] as const
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number]

export type Material = {
  id: string
  name: string
  category: MaterialCategory
  unit: string
  dimensions: string | null
  overallDimensions: string | null
  effectiveCoverage: string | null
  standardLength: string | null
  spacing: string | null
  description: string
  isActive: boolean
  updatedAt: Date
}

export type MaterialInput = {
  name: string; category: string; unit: string; dimensions: string; overallDimensions: string
  effectiveCoverage: string; standardLength: string; spacing: string; description: string
}

type Row = {
  id: string; name: string; category: MaterialCategory; unit: string; dimensions: string | null
  overall_dimensions: string | null; effective_coverage: string | null; standard_length: string | null
  spacing: string | null; description: string | null; is_active: boolean; updated_at: string | null
}

const hydrate = (row: Row): Material => ({
  id: row.id,
  name: row.name,
  category: row.category,
  unit: row.unit,
  dimensions: row.dimensions,
  overallDimensions: row.overall_dimensions,
  effectiveCoverage: row.effective_coverage,
  standardLength: row.standard_length,
  spacing: row.spacing,
  description: row.description || '',
  isActive: !!row.is_active,
  updatedAt: parseDate(row.updated_at) ?? new Date(),
})

const one = (r: ApiResult<Row>): ApiResult<Material> => (r.ok ? { ...r, data: hydrate(r.data) } : r)

export const materialsApi = {
  async getAll(includeInactive = false): Promise<ApiResult<Material[]>> {
    const r = await request<Row[]>('GET', endpoints.materials.list, { query: includeInactive ? { includeInactive: 1 } : undefined })
    return r.ok ? { ...r, data: r.data.map(hydrate) } : r
  },
  getById: async (id: string) => one(await request<Row>('GET', endpoints.materials.item(id))),
  add: async (data: MaterialInput) => one(await request<Row>('POST', endpoints.materials.list, { body: data })),
  update: async (id: string, data: MaterialInput) => one(await request<Row>('PUT', endpoints.materials.item(id), { body: data })),
  /** Soft delete — the material is hidden from the active catalogue, not erased. */
  deactivate: async (id: string) => one(await request<Row>('DELETE', endpoints.materials.item(id))),
}
