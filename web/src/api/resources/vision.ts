import { request } from '../client'
import { endpoints } from '../endpoints'

/** Port of js/modules/vision-service.js. Never invents a detection. */
export type PlannedObjectType = { id: string; category: 'timber' | 'wall'; label: string }

export const FALLBACK_OBJECT_TYPES: PlannedObjectType[] = [
  { id: 'timber_2x2', category: 'timber', label: '2 × 2 Timber' },
  { id: 'timber_2x3', category: 'timber', label: '2 × 3 Timber' },
  { id: 'timber_2x4', category: 'timber', label: '2 × 4 Timber' },
  { id: 'timber_2x6', category: 'timber', label: '2 × 6 Timber' },
  { id: 'timber_4x4', category: 'timber', label: '4 × 4 Timber' },
  { id: 'exposed_wall', category: 'wall', label: 'Exposed Wall (length, height, surface area)' },
]

export type Detection = {
  status: string
  objectType: string | null
  label: string | null
  measurements: Record<string, unknown>
  confidence: number | null
  message: string
  plannedObjectTypes: PlannedObjectType[]
}

export const visionApi = {
  async detect(dataUrl: string): Promise<{ ok: true; detection: Detection } | { ok: false; error: string }> {
    const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)
    if (!match) return { ok: false, error: 'The captured image could not be read.' }
    const r = await request<Partial<Detection>>('POST', endpoints.scannerDetect, { body: { image: match[2], mimeType: match[1] } })
    if (!r.ok) return { ok: false, error: r.error }
    const d = r.data || {}
    return {
      ok: true,
      detection: {
        status: d.status || 'not_configured',
        objectType: d.objectType ?? null,
        label: d.label ?? null,
        measurements: (d.measurements as Record<string, unknown>) || {},
        confidence: typeof d.confidence === 'number' ? d.confidence : null,
        message: d.message || '',
        plannedObjectTypes: (r.meta.plannedObjectTypes as PlannedObjectType[]) || FALLBACK_OBJECT_TYPES,
      },
    }
  },
}
