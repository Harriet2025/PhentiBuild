import { request } from '../client'
import { endpoints } from '../endpoints'

/** Port of js/modules/roof-ai-service.js — normalises the AI endpoint's reply. */
export type RoofProposal = {
  status: string
  roofType: string | null
  footprint: { length: number | null; width: number | null }
  pitch: number | null
  rafterSpacing: number | null
  purlinSpacing: number | null
  roofingMaterial: string | null
  notes: string | null
  message: string
}

export type RoofAIRequest = {
  footprint: { length: number | null; width: number | null }
  roofType?: string; pitch?: number; rafterSpacing?: number; purlinSpacing?: number; roofingMaterial?: string
}

const num = (v: unknown) => (typeof v === 'number' ? v : null)

export const roofAiApi = {
  async generate(req: RoofAIRequest): Promise<{ ok: true; proposal: RoofProposal } | { ok: false; error: string }> {
    const r = await request<Partial<RoofProposal>>('POST', endpoints.roofAi, { body: req })
    if (!r.ok) return { ok: false, error: r.network ? 'Could not reach the AI service. Check your connection and try again.' : r.error }
    const d = r.data || {}
    return {
      ok: true,
      proposal: {
        status: d.status || 'not_configured',
        roofType: d.roofType || null,
        footprint: { length: num(d.footprint?.length), width: num(d.footprint?.width) },
        pitch: num(d.pitch), rafterSpacing: num(d.rafterSpacing), purlinSpacing: num(d.purlinSpacing),
        roofingMaterial: d.roofingMaterial || null, notes: d.notes || null, message: d.message || '',
      },
    }
  },
}
