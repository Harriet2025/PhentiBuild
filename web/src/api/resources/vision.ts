import { request } from '../client'
import { endpoints } from '../endpoints'

/**
 * Camera Scanner analysis. The server measures the photo with Claude vision
 * against a reference object of known size, then the person checks and
 * corrects the result before anything is saved. Never invents a detection:
 * 'not_configured' / 'no_reference' / 'not_recognised' are normal answers.
 */
export type PlannedObjectType = { id: string; category: 'timber' | 'wall'; label: string }
export type ReferenceId = 'card' | 'a4' | 'none'
export type ReferenceOption = { id: ReferenceId; label: string; size: string | null }

export const FALLBACK_OBJECT_TYPES: PlannedObjectType[] = [
  { id: 'timber_2x2', category: 'timber', label: '2 × 2 Timber' },
  { id: 'timber_2x3', category: 'timber', label: '2 × 3 Timber' },
  { id: 'timber_2x4', category: 'timber', label: '2 × 4 Timber' },
  { id: 'timber_2x6', category: 'timber', label: '2 × 6 Timber' },
  { id: 'timber_4x4', category: 'timber', label: '4 × 4 Timber' },
  { id: 'exposed_wall', category: 'wall', label: 'Exposed Wall (length, height, surface area)' },
]

export const FALLBACK_REFERENCES: ReferenceOption[] = [
  { id: 'card', label: 'PhentiBuild card or any bank / ID card', size: '85.6 mm x 54.0 mm (ISO/IEC 7810 ID-1)' },
  { id: 'a4', label: 'A4 sheet of paper', size: '210 mm x 297 mm' },
  { id: 'none', label: 'No reference object', size: null },
]

export type DetectionStatus = 'detected' | 'no_reference' | 'not_recognised' | 'not_configured'

/** Result of finding the printed PhentiBuild marker (OpenCV on the server; free, no AI). */
export type Calibration = {
  found: boolean
  message: string
  markerId: number | null
  reference: 'card' | 'a4' | null
  label: string | null
  markerSizeMm: number | null
  /** Marker corners in photo pixels: top-left, top-right, bottom-right, bottom-left. */
  corners: [number, number][] | null
  homography: number[][] | null
  imageWidth: number | null
  imageHeight: number | null
  quality: 'good' | 'fair' | 'poor' | null
}

export type Detection = {
  status: DetectionStatus
  objectType: string | null
  label: string | null
  /** Metres as strings: timber {length}; wall {length, height, surfaceArea}. */
  measurements: { length?: string; height?: string; surfaceArea?: string }
  confidence: number | null
  referenceFound: boolean
  explanation: string
  message: string
  plannedObjectTypes: PlannedObjectType[]
  /** Measuring points Claude placed (photo pixels), when it could. */
  points: [number, number][]
  /** 'marker' = exact, from the printed marker; 'estimate' = Claude's own estimate. */
  measuredBy: 'marker' | 'estimate' | null
}

type Meta = { plannedObjectTypes?: PlannedObjectType[]; references?: ReferenceOption[] }

export const visionApi = {
  /** Is automatic measuring switched on (server has an API key)? */
  async status(): Promise<{ configured: boolean; types: PlannedObjectType[]; references: ReferenceOption[] }> {
    const r = await request<{ configured: boolean }>('GET', endpoints.scannerDetect)
    if (!r.ok) return { configured: false, types: FALLBACK_OBJECT_TYPES, references: FALLBACK_REFERENCES }
    const meta = r.meta as Meta
    return {
      configured: !!r.data?.configured,
      types: meta.plannedObjectTypes || FALLBACK_OBJECT_TYPES,
      references: meta.references || FALLBACK_REFERENCES,
    }
  },

  /** Find the printed marker in the photo (free, works without any AI key). */
  async calibrate(dataUrl: string): Promise<{ ok: true; calibration: Calibration } | { ok: false; error: string }> {
    const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)
    if (!match) return { ok: false, error: 'The captured image could not be read.' }
    const r = await request<Calibration>('POST', endpoints.scannerCalibrate, { body: { image: match[2], mimeType: match[1] } })
    return r.ok ? { ok: true, calibration: r.data } : { ok: false, error: r.error }
  },

  async detect(dataUrl: string, reference: ReferenceId): Promise<{ ok: true; detection: Detection } | { ok: false; error: string }> {
    const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)
    if (!match) return { ok: false, error: 'The captured image could not be read.' }
    const r = await request<Partial<Detection>>('POST', endpoints.scannerDetect, { body: { image: match[2], mimeType: match[1], reference } })
    if (!r.ok) return { ok: false, error: r.error }
    const d = r.data || {}
    return {
      ok: true,
      detection: {
        status: (d.status as DetectionStatus) || 'not_configured',
        objectType: d.objectType ?? null,
        label: d.label ?? null,
        measurements: d.measurements && !Array.isArray(d.measurements) ? d.measurements : {},
        confidence: typeof d.confidence === 'number' ? d.confidence : null,
        referenceFound: d.referenceFound === true,
        explanation: d.explanation || '',
        message: d.message || '',
        plannedObjectTypes: (r.meta as Meta).plannedObjectTypes || FALLBACK_OBJECT_TYPES,
        points: Array.isArray(d.points) ? d.points : [],
        measuredBy: d.measuredBy ?? null,
      },
    }
  },
}
