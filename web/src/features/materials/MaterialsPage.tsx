import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { isAdmin } from '../../api/resources/auth'
import { useAuth } from '../../auth/AuthContext'
import { BACKEND } from '../../config/env'
import { MATERIAL_CATEGORIES, materialsApi, type Material, type MaterialInput } from '../../api/resources/materials'
import { useConfirm } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { relativeTime } from '../../lib/format'

/** Port of js/modules/materials.js + materials-form.js + pages/modules/materials.php. */
const CATEGORY_BADGE: Record<string, string> = {
  Cement: 'badge-neutral', Sand: 'badge-warning', Aggregate: 'badge-neutral', Blocks: 'badge-primary',
  Rebar: 'badge-info', Timber: 'badge-success', Roofing: 'badge-danger', Underlay: 'badge-neutral',
}

const CATEGORY_ICON: Record<string, ReactNode> = {
  Cement: <><path d="M6 4h12v3l2 13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L6 7V4z" /><line x1="6" y1="9" x2="18" y2="9" /></>,
  Sand: <><path d="M4 20l8-14 8 14z" /><line x1="9" y1="14" x2="15" y2="14" /></>,
  Aggregate: <><circle cx="8" cy="15" r="3" /><circle cx="15" cy="10" r="3.5" /><circle cx="17" cy="17" r="2.5" /></>,
  Blocks: <><rect x="3" y="5" width="8" height="6" rx="0.5" /><rect x="13" y="5" width="8" height="6" rx="0.5" /><rect x="3" y="13" width="8" height="6" rx="0.5" /><rect x="13" y="13" width="8" height="6" rx="0.5" /></>,
  Rebar: <><line x1="6" y1="3" x2="6" y2="21" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="18" y1="3" x2="18" y2="21" /></>,
  Timber: <><rect x="3" y="9" width="18" height="6" rx="1" /><line x1="7" y1="9" x2="7" y2="15" /><line x1="12" y1="9" x2="12" y2="15" /><line x1="17" y1="9" x2="17" y2="15" /></>,
  Roofing: <><path d="M2 12L12 4l10 8" /><path d="M5 12v7h14v-7" /></>,
  Underlay: <><rect x="3" y="6" width="18" height="4" rx="1" /><rect x="3" y="12" width="18" height="4" rx="1" /><rect x="3" y="18" width="18" height="2" rx="1" /></>,
}

type Sort = 'name-asc' | 'name-desc' | 'category-asc' | 'updated-desc'
type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; materials: Material[] }
type Field = keyof MaterialInput

const FIELDS: Field[] = ['name', 'category', 'unit', 'dimensions', 'overallDimensions', 'effectiveCoverage', 'standardLength', 'spacing', 'description']
const EMPTY: MaterialInput = { name: '', category: '', unit: '', dimensions: '', overallDimensions: '', effectiveCoverage: '', standardLength: '', spacing: '', description: '' }
const MAX_DESCRIPTION = 500
const RULES: Partial<Record<Field, (v: string) => string>> = {
  name: (v) => (!v ? 'Material name is required.' : v.length < 2 ? 'Material name must be at least 2 characters.' : ''),
  category: (v) => (!v ? 'Select a category.' : ''),
  unit: (v) => (!v ? 'Unit is required.' : ''),
  description: (v) => (v.length > MAX_DESCRIPTION ? `Description must be ${MAX_DESCRIPTION} characters or fewer.` : ''),
}

const Badge = ({ category }: { category: string }) => <span className={`badge ${CATEGORY_BADGE[category] || 'badge-neutral'}`}>{category}</span>
const keySpec = (m: Material) => m.dimensions || m.overallDimensions || m.standardLength || m.effectiveCoverage || m.spacing
const notSpecified = (v: string | null) => v || <span className="text-muted">Not specified</span>

/* ------------------------------------------------------------------ form */
function MaterialFormModal({ open, editing, onClose, onSaved }: {
  open: boolean; editing: Material | null; onClose: () => void; onSaved: () => void
}) {
  const toast = useToast()
  const [v, setV] = useState<MaterialInput>(EMPTY)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [attempted, setAttempted] = useState(false)
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({})
  const [summary, setSummary] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setV(editing ? {
      name: editing.name, category: editing.category, unit: editing.unit, dimensions: editing.dimensions || '',
      overallDimensions: editing.overallDimensions || '', effectiveCoverage: editing.effectiveCoverage || '',
      standardLength: editing.standardLength || '', spacing: editing.spacing || '', description: editing.description,
    } : EMPTY)
    setTouched({}); setAttempted(false); setServerErrors({}); setSummary(null)
  }, [open, editing])

  const clean = Object.fromEntries(FIELDS.map((f) => [f, v[f].trim()])) as MaterialInput
  const clientErrors = Object.fromEntries(FIELDS.map((f) => [f, RULES[f]?.(clean[f]) || ''])
    .filter(([, m]) => m)) as Partial<Record<Field, string>>
  const errorFor = (f: Field) => serverErrors[f] || ((attempted || touched[f]) ? clientErrors[f] : undefined)
  const props = (f: Field) => ({
    id: `mf-${f}`, name: f, className: `form-control${errorFor(f) ? ' is-invalid' : ''}`, value: v[f],
    onChange: (e: { target: { value: string } }) => { setV({ ...v, [f]: e.target.value }); setServerErrors({ ...serverErrors, [f]: undefined }) },
    onBlur: () => setTouched({ ...touched, [f]: true }),
  })
  const err = (f: Field) => (errorFor(f) ? <span className="form-error">{errorFor(f)}</span> : null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setAttempted(true)
    const count = Object.keys(clientErrors).length
    if (count) {
      setSummary(count === 1 ? 'There is 1 field that needs your attention.' : `There are ${count} fields that need your attention.`)
      return
    }
    setSummary(null)
    setSubmitting(true)
    const saved = editing ? await materialsApi.update(editing.id, clean) : await materialsApi.add(clean)
    setSubmitting(false)
    if (!saved.ok) {
      if (saved.errors) setServerErrors(saved.errors as Partial<Record<Field, string>>)
      setSummary(saved.error)
      return
    }
    onClose()
    toast(editing ? `"${saved.data.name}" has been updated.` : `"${saved.data.name}" saved as ${saved.data.id}.`, 'success')
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} locked={submitting} size="lg" titleId="materialFormTitle" title={editing ? 'Edit Material' : 'Add Material'}>
      <form noValidate onSubmit={submit}>
        <div className="modal-body">
          {summary && (
            <div className="alert alert-danger">
              <span className="alert-icon">!</span>
              <div className="alert-body"><span className="alert-title">Please check the form</span><span>{summary}</span></div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="mf-name">Material Name <span className="required">*</span></label>
            <input type="text" placeholder="e.g. Sandcrete Block (450 x 225 x 225mm)" autoComplete="off" {...props('name')} />
            {err('name')}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="mf-category">Category <span className="required">*</span></label>
              <select {...props('category')}>
                <option value="">Select a category…</option>
                {MATERIAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {err('category')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="mf-unit">Unit <span className="required">*</span></label>
              <input type="text" placeholder="e.g. 50kg bag, piece, Ton, Roll" autoComplete="off" {...props('unit')} />
              {err('unit')}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="mf-dimensions">Dimensions</label>
              <input type="text" placeholder="e.g. 450 x 225 x 225 mm" autoComplete="off" {...props('dimensions')} />
              <span className="form-hint">Nominal or cut size, if the material has one.</span>
              {err('dimensions')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="mf-overallDimensions">Overall Dimensions</label>
              <input type="text" placeholder="e.g. 460 x 235 x 235 mm with joint" autoComplete="off" {...props('overallDimensions')} />
              <span className="form-hint">Full size including packaging, joints or laps.</span>
              {err('overallDimensions')}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="mf-effectiveCoverage">Effective Coverage</label>
              <input type="text" placeholder="e.g. 9 blocks per m²" autoComplete="off" {...props('effectiveCoverage')} />
              {err('effectiveCoverage')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="mf-standardLength">Standard Length</label>
              <input type="text" placeholder="e.g. 3.6 m, 12 m" autoComplete="off" {...props('standardLength')} />
              {err('standardLength')}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mf-spacing">Spacing</label>
            <input type="text" placeholder="e.g. 600 mm centres" autoComplete="off" {...props('spacing')} />
            <span className="form-hint">Typical fixing or framing spacing, if relevant.</span>
            {err('spacing')}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mf-description">Description</label>
            <textarea rows={3} placeholder="Typical use, notes for site staff…" {...props('description')} />
            <span className="form-hint">Optional. {clean.description.length}/{MAX_DESCRIPTION} characters.</span>
            {err('description')}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={() => !submitting && onClose()}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Save Changes' : 'Save Material'}</button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ page */
export function MaterialsPage() {
  const toast = useToast()
  const { user } = useAuth()
  // The library is shared: everyone uses it, only Admins change it (the
  // Django API enforces this; hiding the buttons just avoids a 403).
  const canEdit = BACKEND === 'php' || isAdmin(user)
  const confirm = useConfirm()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [term, setTerm] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<Sort>('name-asc')
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [viewing, setViewing] = useState<Material | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const loadToken = useRef(0)

  const load = useCallback(async () => {
    const token = ++loadToken.current
    setState({ status: 'loading' })
    const r = await materialsApi.getAll()
    if (token !== loadToken.current) return
    setState(r.ok ? { status: 'ready', materials: r.data } : { status: 'error', message: r.error })
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  // Escape closes the view modal and page scroll is locked while it's open.
  useEffect(() => {
    if (!viewing) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewing(null) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [viewing])

  const materials = useMemo(() => (state.status === 'ready' ? state.materials : []), [state])
  const visible = useMemo(() => {
    const t = term.trim().toLowerCase()
    return materials
      .filter((m) => (!t || [m.name, m.category, m.unit, m.description].some((x) => x.toLowerCase().includes(t))) && (!category || m.category === category))
      .sort((a, b) => {
        switch (sort) {
          case 'name-desc': return b.name.localeCompare(a.name)
          case 'category-asc': return a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
          case 'updated-desc': return b.updatedAt.getTime() - a.updatedAt.getTime()
          default: return a.name.localeCompare(b.name)
        }
      })
  }, [materials, term, category, sort])

  const hasFilters = !!(term.trim() || category)
  const clear = () => { setTerm(''); setCategory('') }
  const openView = async (id: string) => {
    const r = await materialsApi.getById(id)
    if (!r.ok) return toast(r.error, 'danger')
    setViewing(r.data)
  }
  const openForm = (m: Material | null) => { setViewing(null); setEditing(m); setFormOpen(true) }
  const deactivate = (m: Material) => confirm({
    title: 'Deactivate material?',
    message: `Deactivate "${m.name}"? It will be hidden from the active catalog but can be reactivated later.`,
    acceptLabel: 'Deactivate',
    danger: true,
    onAccept: async () => {
      const r = await materialsApi.deactivate(m.id)
      toast(r.ok ? `"${m.name}" has been deactivated.` : r.error, r.ok ? 'success' : 'danger')
      if (r.ok) void load()
    },
  })

  const actions = (m: Material) => (
    <div className="row-actions">
      <button className="icon-action" onClick={() => void openView(m.id)} aria-label={`View ${m.name}`} title="View details">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
      </button>
      {canEdit && (
        <>
          <button className="icon-action" onClick={() => openForm(m)} aria-label={`Edit ${m.name}`} title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z" /></svg>
          </button>
          <button className="icon-action is-danger" onClick={() => deactivate(m)} aria-label={`Deactivate ${m.name}`} title="Deactivate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
          </button>
        </>
      )}
    </div>
  )
  const nameLink = (m: Material) => (
    <a href="#" className="material-name" onClick={(e) => { e.preventDefault(); void openView(m.id) }}>{m.name}</a>
  )

  const ready = state.status === 'ready'
  const noneAtAll = ready && materials.length === 0
  const noMatches = ready && !noneAtAll && visible.length === 0

  return (
    <div className="materials-module">
      <div className="module-header">
        <div>
          <span className="eyebrow">Tools</span>
          <h1>Materials Catalog</h1>
          <p className="text-secondary">Browse, search and manage the standard materials used across every project.</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => openForm(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Material
          </button>
        )}
      </div>

      <div className="materials-toolbar">
        <div className="materials-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="search" className="form-control" placeholder="Search materials by name or description…" aria-label="Search materials" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div className="materials-filters">
          <select className="form-control" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {MATERIAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-control" aria-label="Sort materials" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="category-asc">Category (A–Z)</option>
            <option value="updated-desc">Last updated (newest)</option>
          </select>
          <div className="view-toggle" role="group" aria-label="Change view">
            <button type="button" className={`view-toggle-btn${view === 'cards' ? ' is-active' : ''}`} onClick={() => setView('cards')} aria-label="Card view" title="Card view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>
            </button>
            <button type="button" className={`view-toggle-btn${view === 'table' ? ' is-active' : ''}`} onClick={() => setView('table')} aria-label="Table view" title="Table view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
            </button>
          </div>
        </div>
      </div>

      {ready && (
        <div className="materials-meta">
          <span className="text-sm text-muted">{noneAtAll ? '' : `Showing ${visible.length} of ${materials.length} materials`}</span>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clear}>Clear filters</button>}
        </div>
      )}

      {state.status === 'loading' && (
        <div className="projects-loading"><span className="spinner spinner-lg" /><p className="text-secondary">Loading materials…</p></div>
      )}
      {state.status === 'error' && (
        <div className="alert alert-danger">
          <span className="alert-icon">!</span>
          <div className="alert-body">
            <span className="alert-title">Couldn’t load materials</span>
            <span>{state.message}</span>
            <div className="mt-3"><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => void load()}>Retry</button></div>
          </div>
        </div>
      )}

      {ready && visible.length > 0 && view === 'table' && (
        <div className="card materials-table-wrap">
          <div className="table-responsive">
            <table className="table">
              <thead><tr><th>Material</th><th>Category</th><th>Unit</th><th>Key Spec</th><th>Last Updated</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {visible.map((m) => (
                  <tr key={m.id}>
                    <td>{nameLink(m)}<span className="material-id">{m.id}</span></td>
                    <td><Badge category={m.category} /></td>
                    <td>{m.unit}</td>
                    <td className="text-sm">{notSpecified(keySpec(m))}</td>
                    <td className="text-sm text-muted">{relativeTime(m.updatedAt)}</td>
                    <td>{actions(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ready && visible.length > 0 && view === 'cards' && (
        <div className="materials-card-grid">
          {visible.map((m) => (
            <article key={m.id} className="material-card">
              <div className="material-card-head">
                <span className={`material-card-icon cat-${m.category.toLowerCase()}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {CATEGORY_ICON[m.category] || <circle cx="12" cy="12" r="9" />}
                  </svg>
                </span>
                <div className="material-card-title">{nameLink(m)}<span className="material-id">{m.id}</span></div>
              </div>
              <Badge category={m.category} />
              <dl className="material-card-meta">
                <dt>Unit</dt><dd>{m.unit}</dd>
                <dt>Key Spec</dt><dd>{notSpecified(keySpec(m))}</dd>
              </dl>
              <div className="material-card-foot">
                <span className="material-card-updated">Updated {relativeTime(m.updatedAt).toLowerCase()}</span>
                {actions(m)}
              </div>
            </article>
          ))}
        </div>
      )}

      {noMatches && (
        <div className="materials-empty">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <h3>No materials match your search</h3>
          <p className="text-secondary">Try a different search term, or clear the filters to see the full catalog.</p>
          <button className="btn btn-outline" onClick={clear}>Clear filters</button>
        </div>
      )}
      {noneAtAll && (
        <div className="materials-empty">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z" /></svg>
          <h3>No materials yet</h3>
          <p className="text-secondary">{canEdit ? 'Add your first material to start building the catalog.' : 'An administrator has not added any materials yet.'}</p>
          {canEdit && <button className="btn btn-primary" onClick={() => openForm(null)}>Add your first material</button>}
        </div>
      )}

      {/* View Material modal */}
      <div className={`modal-overlay${viewing ? ' is-open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setViewing(null) }}>
        <div className="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="materialViewTitle">
          <div className="modal-header modal-header-view">
            {viewing && <Badge category={viewing.category} />}
            <h3 id="materialViewTitle">{viewing?.name ?? 'Material'}</h3>
            <button className="modal-close" onClick={() => setViewing(null)} aria-label="Close">&times;</button>
          </div>
          {viewing && (
            <div className="modal-body">
              <dl className="detail-list">
                <dt>Unit</dt><dd>{viewing.unit}</dd>
                <dt>Dimensions</dt><dd>{notSpecified(viewing.dimensions)}</dd>
                <dt>Overall Dimensions</dt><dd>{notSpecified(viewing.overallDimensions)}</dd>
                <dt>Effective Coverage</dt><dd>{notSpecified(viewing.effectiveCoverage)}</dd>
                <dt>Standard Length</dt><dd>{notSpecified(viewing.standardLength)}</dd>
                <dt>Spacing</dt><dd>{notSpecified(viewing.spacing)}</dd>
              </dl>
              <div className="material-view-description">
                <h4>Description</h4>
                <p>{viewing.description || <span className="text-muted">No description was recorded for this material.</span>}</p>
              </div>
              <p className="text-xs text-muted">Last updated {relativeTime(viewing.updatedAt).toLowerCase()}.</p>
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setViewing(null)}>Close</button>
            {canEdit && <button type="button" className="btn btn-primary" onClick={() => viewing && openForm(viewing)}>Edit Material</button>}
          </div>
        </div>
      </div>

      <MaterialFormModal open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSaved={() => void load()} />
    </div>
  )
}
