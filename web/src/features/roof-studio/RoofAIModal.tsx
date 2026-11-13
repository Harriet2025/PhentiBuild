import { useState } from 'react'
import { roofAiApi, type RoofProposal } from '../../api/resources/roofAi'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { roofGeometry as geo } from '../../domain/engines/roofGeometry.js'
import type { Shape } from '../../domain/engines/roofGeometry'
import { roofStudioStore as store, type RoofProperties } from '../../domain/engines/roofStudioStore'

/**
 * Port of js/modules/roof-ai.js. Never fabricates a design: if the backend
 * says AI isn't configured (the default), that message is shown as-is.
 */
type View = { kind: 'idle' } | { kind: 'loading' } | { kind: 'notice'; message: string } | { kind: 'result'; proposal: RoofProposal; edit: boolean }
type EditKey = 'length' | 'width' | 'pitch' | 'rafterSpacing' | 'purlinSpacing'
const ROOF_TYPES = ['Gable Roof', 'Hip Roof', 'Hidden/Flat Roof']
const LIMITS: Record<EditKey, [string, number, number]> = {
  length: ['Length', 1, 200], width: ['Width', 1, 200], pitch: ['Pitch', 0, 80],
  rafterSpacing: ['Rafter spacing', 100, 1200], purlinSpacing: ['Purlin spacing', 100, 1200],
}

/** A drawn area shape's bounding box wins over the typed Length/Width (same as the 3D builder). */
function deriveFootprint(shapes: Shape[], props: RoofProperties) {
  const areas = shapes.filter((s) => s.type === 'rectangle' || s.type === 'polygon')
  if (areas.length) {
    const box = geo.boundingBoxOfShapes([areas[areas.length - 1]])
    const length = box.maxX - box.minX
    const width = box.maxY - box.minY
    if (length >= 1 && width >= 1) return { length, width }
  }
  const l = parseFloat(props.length)
  const w = parseFloat(props.width)
  return { length: isFinite(l) && l > 0 ? l : null, width: isFinite(w) && w > 0 ? w : null }
}

const show = (v: number | null, unit: string) => (v != null ? `${v}${unit}` : 'Not specified')

export function RoofAIModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [view, setView] = useState<View>({ kind: 'idle' })
  const [form, setForm] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Partial<Record<EditKey, string>>>({})

  const close = () => { setView({ kind: 'idle' }); setErrors({}); onClose() }

  async function generate() {
    setView({ kind: 'loading' })
    const props = store.getProperties()
    const req: Parameters<typeof roofAiApi.generate>[0] = { footprint: deriveFootprint(store.getShapes(), props) }
    if (props.roofType) req.roofType = props.roofType
    for (const k of ['pitch', 'rafterSpacing', 'purlinSpacing'] as const) {
      const n = parseFloat(props[k])
      if (isFinite(n)) req[k] = n
    }
    if (props.roofingMaterial) req.roofingMaterial = props.roofingMaterial
    const res = await roofAiApi.generate(req)
    if (!res.ok) return setView({ kind: 'notice', message: res.error || 'The AI service returned an unexpected error.' })
    if (res.proposal.status !== 'ok') return setView({ kind: 'notice', message: res.proposal.message || 'AI roof generation is not available right now.' })
    setView({ kind: 'result', proposal: res.proposal, edit: false })
  }

  function startEdit(p: RoofProposal) {
    setForm({
      roofType: p.roofType || store.getProperties().roofType || 'Gable Roof',
      length: p.footprint.length != null ? String(p.footprint.length) : '', width: p.footprint.width != null ? String(p.footprint.width) : '',
      pitch: p.pitch != null ? String(p.pitch) : '', rafterSpacing: p.rafterSpacing != null ? String(p.rafterSpacing) : '',
      purlinSpacing: p.purlinSpacing != null ? String(p.purlinSpacing) : '', roofingMaterial: p.roofingMaterial || '',
    })
    setErrors({})
    setView({ kind: 'result', proposal: p, edit: true })
  }

  function apply(values: RoofProposal) {
    if (values.roofType) store.setProperty('roofType', values.roofType)
    if (values.pitch != null) store.setProperty('pitch', String(values.pitch))
    if (values.rafterSpacing != null) store.setProperty('rafterSpacing', String(values.rafterSpacing))
    if (values.purlinSpacing != null) store.setProperty('purlinSpacing', String(values.purlinSpacing))
    if (values.roofingMaterial) store.setProperty('roofingMaterial', values.roofingMaterial)
    const { length, width } = values.footprint
    if (length != null && width != null) {
      store.setProperty('length', String(length))
      store.setProperty('width', String(width))
      const hasArea = store.getShapes().some((s) => s.type === 'rectangle' || s.type === 'polygon')
      if (!hasArea) {
        store.addShape(geo.createShape('rectangle', [{ x: 0, y: 0 }, { x: length, y: width }]))
      } else {
        toast(`AI properties applied. Your drawn footprint still controls the 3D model — clear it to use the AI-proposed ${length} × ${width} m footprint instead.`, 'success')
        return
      }
    }
    toast('AI-generated roof design applied.', 'success')
  }

  function accept() {
    if (view.kind !== 'result') return
    if (!view.edit) {
      apply(view.proposal)
      return close()
    }
    const errs: Partial<Record<EditKey, string>> = {}
    const parsed: Partial<Record<EditKey, number | null>> = {}
    for (const key of Object.keys(LIMITS) as EditKey[]) {
      const raw = (form[key] || '').trim()
      if (!raw) { parsed[key] = null; continue }
      const n = parseFloat(raw)
      const [label, min, max] = LIMITS[key]
      if (!isFinite(n) || n < min || n > max) errs[key] = `${label} must be a number between ${min} and ${max}.`
      else parsed[key] = n
    }
    if (Object.keys(errs).length) return setErrors(errs)
    apply({
      ...view.proposal, roofType: form.roofType, footprint: { length: parsed.length ?? null, width: parsed.width ?? null },
      pitch: parsed.pitch ?? null, rafterSpacing: parsed.rafterSpacing ?? null, purlinSpacing: parsed.purlinSpacing ?? null,
      roofingMaterial: form.roofingMaterial.trim() || null,
    })
    close()
  }

  const errorCount = Object.keys(errors).length
  const field = (key: EditKey, label: string) => (
    <div className="form-group">
      <label className="form-label" htmlFor={`ai-${key}`}>{label}</label>
      <input type="text" id={`ai-${key}`} className={`form-control form-control-numeric${errors[key] ? ' is-invalid' : ''}`} inputMode="decimal"
        value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      {errors[key] && <span className="form-error">{errors[key]}</span>}
    </div>
  )

  return (
    <Modal open={open} onClose={close} size="lg" titleId="roofAiTitle" title="AI Roof Generation"
      footer={
        <div className="modal-footer">
          {(view.kind === 'idle' || view.kind === 'notice') && <button type="button" className="btn btn-primary" onClick={() => void generate()}>Generate</button>}
          {view.kind === 'result' && (
            <>
              {!view.edit && <button type="button" className="btn btn-outline-secondary" onClick={() => startEdit(view.proposal)}>Edit</button>}
              <button type="button" className="btn btn-primary" onClick={accept}>Accept</button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => setView({ kind: 'idle' })}>Reject</button>
              <button type="button" className="btn btn-ghost" onClick={() => void generate()}>Regenerate</button>
            </>
          )}
        </div>
      }>
      <div className="modal-body">
        {view.kind === 'notice' && (
          <div className="alert alert-warning rs-ai-notice">
            <span className="alert-icon">!</span>
            <div className="alert-body"><span className="alert-title">AI service status</span><span>{view.message}</span></div>
          </div>
        )}
        {view.kind === 'idle' && (
          <p className="text-secondary">
            Send the current roof properties (footprint, roof type, pitch, rafter/purlin spacing, roofing material) to the AI Roof
            Generation service and get back a structured proposal you can review, edit, and accept into the 2D/3D model below — or
            reject and keep your current design.
          </p>
        )}
        {view.kind === 'loading' && <div className="rs-ai-loading"><span className="badge badge-neutral">Generating…</span></div>}
        {view.kind === 'result' && (
          <div>
            <h4>Proposed Roof Design</h4>
            <dl className="rs-ai-facts">
              <dt>Roof Type</dt><dd>{view.proposal.roofType || 'Not specified'}</dd>
              <dt>Footprint</dt><dd>{view.proposal.footprint.length != null && view.proposal.footprint.width != null ? `${view.proposal.footprint.length} m × ${view.proposal.footprint.width} m` : 'Not specified'}</dd>
              <dt>Pitch</dt><dd>{show(view.proposal.pitch, '°')}</dd>
              <dt>Rafter Spacing</dt><dd>{show(view.proposal.rafterSpacing, ' mm')}</dd>
              <dt>Purlin Spacing</dt><dd>{show(view.proposal.purlinSpacing, ' mm')}</dd>
              <dt>Roofing Material</dt><dd>{view.proposal.roofingMaterial || 'Not specified'}</dd>
            </dl>
            {view.proposal.notes && <p className="text-sm text-secondary">{view.proposal.notes}</p>}
            {view.edit && (
              <form noValidate className="rs-ai-edit-form" onSubmit={(e) => e.preventDefault()}>
                {errorCount > 0 && (
                  <div className="alert alert-danger">
                    <span className="alert-icon">!</span>
                    <div className="alert-body"><span>{errorCount === 1 ? 'Fix the highlighted field.' : `Fix the ${errorCount} highlighted fields.`}</span></div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="ai-roofType">Roof Type</label>
                  <select id="ai-roofType" className="form-control" value={form.roofType} onChange={(e) => setForm({ ...form, roofType: e.target.value })}>
                    {ROOF_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-row">{field('length', 'Length (m)')}{field('width', 'Width (m)')}</div>
                <div className="form-row">{field('pitch', 'Pitch (°)')}{field('rafterSpacing', 'Rafter Spacing (mm)')}{field('purlinSpacing', 'Purlin Spacing (mm)')}</div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ai-roofingMaterial">Roofing Material</label>
                  <input type="text" id="ai-roofingMaterial" className="form-control" value={form.roofingMaterial || ''} onChange={(e) => setForm({ ...form, roofingMaterial: e.target.value })} />
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
