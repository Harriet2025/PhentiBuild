import { parseDate, request, type ApiResult } from '../client'
import { endpoints } from '../endpoints'

export const PROJECT_TYPES = ['Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Institutional'] as const
export const PROJECT_STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Archived'] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export type Project = {
  id: number
  ref: string
  name: string
  client: string
  contact: string
  location: string
  type: ProjectType
  description: string
  startDate: string
  endDate: string
  progress: number
  status: ProjectStatus
  createdAt: Date | null
  updatedAt: Date
  /** Django only: the owner's user id, and (list responses) their name. */
  ownerId?: number | null
  ownerName?: string | null
}

/** Payload shape the PHP API accepts (camelCase, same as projects-store.js). */
export type ProjectInput = {
  name: string
  client: string
  contact: string
  location: string
  type: string
  description: string
  startDate: string
  endDate: string
  progress: number
  status: string
}

type ProjectRow = {
  id: number; ref: string; name: string; client: string; contact: string | null
  location: string; type: ProjectType; description: string | null
  start_date: string; end_date: string; progress: number; status: ProjectStatus
  created_at: string | null; updated_at: string | null
  ownerId?: number | null
  ownerName?: string | null
}

/** snake_case backend row → camelCase frontend shape (same as the old hydrate()). */
function hydrate(row: ProjectRow): Project {
  return {
    id: row.id,
    ref: row.ref,
    name: row.name,
    client: row.client,
    contact: row.contact || '',
    location: row.location,
    type: row.type,
    description: row.description || '',
    startDate: row.start_date,
    endDate: row.end_date,
    progress: Number(row.progress),
    status: row.status,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at) ?? new Date(),
    ownerId: row.ownerId,
    ownerName: row.ownerName,
  }
}

function mapOne(result: ApiResult<ProjectRow>): ApiResult<Project> {
  return result.ok ? { ...result, data: hydrate(result.data) } : result
}

export const projectsApi = {
  async getAll(): Promise<ApiResult<Project[]>> {
    const result = await request<ProjectRow[]>('GET', endpoints.projects.list)
    return result.ok ? { ...result, data: result.data.map(hydrate) } : result
  },

  async getById(id: number) {
    return mapOne(await request<ProjectRow>('GET', endpoints.projects.item(id)))
  },

  /** The URL carries the human ref (#projects/PHB-0001); the API takes
   *  the numeric id, so — exactly like the old store — resolve via the list. */
  async getByRef(ref: string): Promise<ApiResult<Project>> {
    const all = await projectsApi.getAll()
    if (!all.ok) return all
    const match = all.data.find((p) => p.ref === ref)
    return match
      ? { ok: true, status: 200, data: match, meta: {} }
      : { ok: false, notFound: true, status: 404, error: 'That project could not be found.' }
  },

  async add(data: ProjectInput) {
    return mapOne(await request<ProjectRow>('POST', endpoints.projects.list, { body: data }))
  },

  async update(id: number, data: Partial<ProjectInput>) {
    return mapOne(await request<ProjectRow>('PUT', endpoints.projects.item(id), { body: data }))
  },

  archive(id: number) {
    return projectsApi.update(id, { status: 'Archived' })
  },

  remove(id: number) {
    return request<null>('DELETE', endpoints.projects.item(id))
  },
}
