import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isAdmin } from '../../api/resources/auth'
import { projectsApi, type Project } from '../../api/resources/projects'
import { useAuth } from '../../auth/AuthContext'
import { ProjectSelect } from '../../components/ProjectPicker'
import { projectLabel } from '../../lib/linkableProjects'
import { BOQ_CATEGORIES, boqApi, formatCurrency, formatQty, type BoqInput, type BoqItem } from '../../api/resources/boq'
import { useConfirm } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { getContingencyPercent, setContingencyPercent } from '../../lib/preferences'

/** Port of js/modules/boq.js + boq-form.js + pages/modules/boq.php. */
const CATEGORY_BADGE: Record<string, string> = {
  Cement: 'badge-neutral', Sand: 'badge-warning', Aggregate: 'badge-neutral', Blocks: 'badge-primary', Rebar: 'badge-info',
  Timber: 'badge-success', Roofing: 'badge-danger', Underlay: 'badge-neutral', Other: 'badge-neutral',
}
type Editable = 'quantity' | 'wastePercent' | 'unitPrice'
type Drafts = Record<string, Partial<Record<Editable, string>>>
type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; items: BoqItem[] }

const num = (v: string | number | undefined) => parseFloat(String(v ?? '')) || 0
const adjusted = (qty: number, waste: number) => qty * (1 + waste / 100)
const cellText = (v: string) => (v ? <span className="boq-cell-wrap" title={v}>{v}</span> : <span className="text-muted">—</span>)

/* ------------------------------------------------------------------ form */
type FormField = 'item' | 'category' | 'description' | 'specification' | 'unit' | 'quantity' | 'wastePercent' | 'unitPrice' | 'notes'
type FormValues = Record<FormField, string>
const FORM_FIELDS: FormField[] = ['item', 'category', 'description', 'specification', 'unit', 'quantity', 'wastePercent', 'unitPrice', 'notes']
const EMPTY: FormValues = { item: '', category: '', description: '', specification: '', unit: '', quantity: '', wastePercent: '', unitPrice: '', notes: '' }

function numberRule(label: string, required = false) {
  return (v: string) => {
    if (!v) return required ? `${label} is required.` : ''
    const cleaned = v.replace(/,/g, '')
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return `${label} must be a number.`
    return parseFloat(cleaned) < 0 ? `${label} must be 0 or more.` : ''
  }
}
const RULES: Partial<Record<FormField, (v: string) => string>> = {
  item: (v) => (!v ? 'Item name is required.' : v.length < 2 ? 'Item name must be at least 2 characters.' : ''),
  category: (v) => (!v ? 'Select a category.' : ''),
  unit: (v) => (!v ? 'Unit is required.' : ''),
  quantity: numberRule('Quantity', true),
  wastePercent: numberRule('Waste %'),
  unitPrice: numberRule('Unit price'),
}

function BoqFormModal({ open, editing, onClose, onSaved, projects, defaultProjectId }: {
  open: boolean; editing: BoqItem | null; onClose: () => void; onSaved: () => void
  /** Projects this item may be linked to (same owner as the item). */
  projects: Project[] | null
  defaultProjectId: number | null
}) {
  const toast = useToast()
  const [v, setV] = useState<FormValues>(EMPTY)
  const [projectId, setProjectId] = useState<number | null>(null)
  const [touched, setTouched] = useState<Partial<Record<FormField, boolean>>>({})
  const [attempted, setAttempted] = useState(false)
  const [serverErrors, setServerErrors] = useState<Partial<Record<FormField, string>>>({})
  const [summary, setSummary] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setV(editing ? {
      item: editing.item, category: editing.category, description: editing.description, specification: editing.specification,
      unit: editing.unit, quantity: String(editing.quantity), wastePercent: String(editing.wastePercent),
      unitPrice: String(editing.unitPrice), notes: editing.notes,
    } : EMPTY)
    setProjectId(editing ? editing.projectId : defaultProjectId)
    setTouched({}); setAttempted(false); setServerErrors({}); setSummary(null)
  }, [open, editing, defaultProjectId])

  const clean = Object.fromEntries(FORM_FIELDS.map((f) => [f, v[f].trim()])) as FormValues
  const clientErrors = Object.fromEntries(FORM_FIELDS.map((f) => [f, RULES[f]?.(clean[f]) || '']).filter(([, m]) => m)) as Partial<Record<FormField, string>>
  const errorFor = (f: FormField) => serverErrors[f] || ((attempted || touched[f]) ? clientErrors[f] : undefined)
  const props = (f: FormField) => ({
    id: `bf-${f}`, name: f, className: `form-control${errorFor(f) ? ' is-invalid' : ''}`, value: v[f],
    onChange: (e: { target: { value: string } }) => { setV({ ...v, [f]: e.target.value }); setServerErrors({ ...serverErrors, [f]: undefined }) },
    onBlur: () => setTouched({ ...touched, [f]: true }),
  })
  const err = (f: FormField) => (errorFor(f) ? <span className="form-error">{errorFor(f)}</span> : null)

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
    const toNum = (s: string) => (s ? parseFloat(s.replace(/,/g, '')) : 0)
    const payload: BoqInput = {
      item: clean.item, category: clean.category, description: clean.description, specification: clean.specification,
      unit: clean.unit, quantity: toNum(clean.quantity), wastePercent: toNum(clean.wastePercent), unitPrice: toNum(clean.unitPrice), notes: clean.notes,
      projectId,
    }
    const saved = editing ? await boqApi.update(editing.id, payload) : await boqApi.add(payload)
    setSubmitting(false)
    if (!saved.ok) {
      if (saved.errors) setServerErrors(saved.errors as Partial<Record<FormField, string>>)
      setSummary(saved.errors?.projectId || saved.error)
      return
    }
    onClose()
    toast(editing ? `"${saved.data.item}" has been updated.` : `"${saved.data.item}" added to the Bill of Quantities.`, 'success')
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} locked={submitting} size="lg" titleId="boqFormTitle" title={editing ? 'Edit Item' : 'Add Item'}>
      <form noValidate onSubmit={submit}>
        <div className="modal-body">
          {summary && (
            <div className="alert alert-danger">
              <span className="alert-icon">!</span>
              <div className="alert-body"><span className="alert-title">Please check the form</span><span>{summary}</span></div>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="bf-item">Item <span className="required">*</span></label>
              <input type="text" placeholder="e.g. Portland Cement" autoComplete="off" {...props('item')} />{err('item')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bf-category">Category <span className="required">*</span></label>
              <select {...props('category')}>
                <option value="">Select a category…</option>
                {BOQ_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>{err('category')}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="bf-project">Project</label>
            <ProjectSelect id="bf-project" value={projectId} onChange={setProjectId} projects={projects} noneLabel="Not linked to a project" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="bf-description">Description</label>
            <textarea rows={2} placeholder="What this item is for…" {...props('description')} />{err('description')}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="bf-specification">Specification</label>
              <input type="text" placeholder="e.g. 16mm diameter, Grade 25" autoComplete="off" {...props('specification')} />{err('specification')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bf-unit">Unit <span className="required">*</span></label>
              <input type="text" placeholder="e.g. piece, m³, kg, bag" autoComplete="off" {...props('unit')} />{err('unit')}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="bf-quantity">Quantity <span className="required">*</span></label>
              <input type="text" inputMode="decimal" placeholder="e.g. 120" autoComplete="off" {...props('quantity')} />{err('quantity')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bf-wastePercent">Waste %</label>
              <input type="text" inputMode="decimal" placeholder="e.g. 5" autoComplete="off" {...props('wastePercent')} />{err('wastePercent')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bf-unitPrice">Unit Price (GH₵)</label>
              <input type="text" inputMode="decimal" placeholder="e.g. 65.00" autoComplete="off" {...props('unitPrice')} />{err('unitPrice')}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="bf-notes">Notes</label>
            <textarea rows={2} placeholder="Supplier, lead time, site notes…" {...props('notes')} />{err('notes')}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={() => !submitting && onClose()}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Save Changes' : 'Save Item'}</button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ page */
export function BoqPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const { user } = useAuth()
  const admin = isAdmin(user)
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [term, setTerm] = useState('')
  const [category, setCategory] = useState('')
  // '' = all, 'none' = not linked to a project, '<id>' = that project. ?project=<id> pre-selects one.
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project') ?? '')
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [drafts, setDrafts] = useState<Drafts>({})
  const [contingency, setContingency] = useState(String(getContingencyPercent()))
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BoqItem | null>(null)
  const loadToken = useRef(0)

  const load = useCallback(async () => {
    const token = ++loadToken.current
    setState({ status: 'loading' })
    const r = await boqApi.getAll()
    if (token !== loadToken.current) return
    setDrafts({})
    setState(r.ok ? { status: 'ready', items: r.data } : { status: 'error', message: r.error })
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  useEffect(() => {
    let alive = true
    void projectsApi.getAll().then((r) => { if (alive) setProjects(r.ok ? r.data : []) })
    return () => { alive = false }
  }, [])
  const projectById = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects])

  const items = useMemo(() => (state.status === 'ready' ? state.items : []), [state])
  const visible = useMemo(() => {
    const t = term.trim().toLowerCase()
    const inProject = (m: BoqItem) => !projectFilter || (projectFilter === 'none' ? m.projectId === null : m.projectId === Number(projectFilter))
    return items.filter((m) => (!t || [m.item, m.description, m.specification, m.notes].some((x) => x.toLowerCase().includes(t))) && (!category || m.category === category) && inProject(m))
  }, [items, term, category, projectFilter])

  // Live values: what's typed in a cell counts immediately, before it's saved.
  const value = (m: BoqItem, f: Editable) => drafts[m.id]?.[f] ?? String(m[f])
  const lineTotal = (m: BoqItem) => adjusted(num(value(m, 'quantity')), num(value(m, 'wastePercent'))) * num(value(m, 'unitPrice'))

  const groups = BOQ_CATEGORIES.map((cat) => ({ cat, rows: visible.filter((m) => m.category === cat) })).filter((g) => g.rows.length)
  const base = visible.reduce((sum, m) => sum + lineTotal(m), 0)
  const contingencyAmount = base * (num(contingency) / 100)

  async function saveCell(m: BoqItem, f: Editable) {
    let parsed = parseFloat(value(m, f))
    if (!isFinite(parsed) || parsed < 0) parsed = 0
    setDrafts((d) => ({ ...d, [m.id]: { ...d[m.id], [f]: String(parsed) } }))
    if (parsed === m[f]) return
    const r = await boqApi.update(m.id, { [f]: parsed })
    if (!r.ok) {
      toast(r.error, 'danger')
      return
    }
    // Keep the saved row; the draft already shows the right value.
    setState((s) => (s.status === 'ready' ? { ...s, items: s.items.map((x) => (x.id === m.id ? r.data : x)) } : s))
  }

  const askDelete = (m: BoqItem) => confirm({
    title: 'Delete item?',
    message: `This removes "${m.item}" from the Bill of Quantities. This cannot be undone.`,
    acceptLabel: 'Delete',
    danger: true,
    onAccept: async () => {
      const r = await boqApi.remove(m.id)
      toast(r.ok ? 'Item removed from the Bill of Quantities.' : r.error, r.ok ? 'success' : 'danger')
      if (r.ok) void load()
    },
  })

  const hasFilters = !!(term.trim() || category || projectFilter)
  const clear = () => { setTerm(''); setCategory(''); setProjectFilter('') }
  // Extra columns: Project (always) and Owner (Admins, who see everyone's items).
  const extraCols = admin ? 2 : 1
  const projectCell = (m: BoqItem) => {
    const p = m.projectId ? projectById.get(m.projectId) : undefined
    return p ? <span className="boq-cell-wrap" title={projectLabel(p)}>{p.ref}</span> : <span className="text-muted">—</span>
  }
  // In the form: only projects belonging to the item's owner can be chosen.
  const formOwner = editing ? editing.ownerId : user?.id
  const formProjects = projects && projects.filter((p) => p.ownerId === undefined || p.ownerId === formOwner)
  const defaultProjectId = /^\d+$/.test(projectFilter) ? Number(projectFilter) : null
  const ready = state.status === 'ready'
  const noneAtAll = ready && items.length === 0
  const noMatches = ready && !noneAtAll && visible.length === 0
  const openForm = (m: BoqItem | null) => { setEditing(m); setFormOpen(true) }
  const cellInput = (m: BoqItem, f: Editable) => (
    <input type="text" inputMode="decimal" className="boq-cell-input" aria-label={`${f} for ${m.item}`}
      value={value(m, f)}
      onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: { ...d[m.id], [f]: e.target.value } }))}
      onBlur={() => void saveCell(m, f)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
  )

  return (
    <div className="boq-module">
      <div className="module-header">
        <div>
          <span className="eyebrow">Documents</span>
          <h1>Bill of Quantities</h1>
          <p className="text-secondary">A live schedule of materials and costs, priced from your own quantities and unit rates.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Item
        </button>
      </div>

      <div className="boq-toolbar">
        <div className="boq-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="search" className="form-control" placeholder="Search items, descriptions or notes…" aria-label="Search BOQ items" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <select className="form-control" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {BOQ_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-control" aria-label="Filter by project" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="">All projects</option>
          <option value="none">Not linked to a project</option>
          {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{projectLabel(p)}{admin && p.ownerName ? ` (${p.ownerName})` : ''}</option>)}
        </select>
      </div>

      {ready && (
        <div className="boq-meta">
          <span className="text-sm text-muted">{noneAtAll ? '' : `Showing ${visible.length} of ${items.length} items`}</span>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clear}>Clear filters</button>}
        </div>
      )}

      {state.status === 'loading' && (
        <div className="projects-loading"><span className="spinner spinner-lg" /><p className="text-secondary">Loading Bill of Quantities…</p></div>
      )}
      {state.status === 'error' && (
        <div className="alert alert-danger">
          <span className="alert-icon">!</span>
          <div className="alert-body">
            <span className="alert-title">Couldn’t load the Bill of Quantities</span>
            <span>{state.message}</span>
            <div className="mt-3"><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => void load()}>Retry</button></div>
          </div>
        </div>
      )}

      {ready && visible.length > 0 && (
        <>
          <div className="card boq-table-wrap">
            <div className="table-responsive">
              <table className="table boq-table table-stack">
                <thead>
                  <tr>
                    <th>Item</th><th>Project</th>{admin && <th>Owner</th>}<th>Category</th><th className="col-desc">Description</th><th className="col-spec">Specification</th><th>Unit</th>
                    <th className="text-right">Quantity</th><th className="text-right">Waste %</th><th className="text-right">Adjusted Qty</th>
                    <th className="text-right">Unit Price</th><th className="text-right">Total</th><th className="col-notes">Notes</th><th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(({ cat, rows }) => (
                    <Fragment key={cat}>
                      <tr className="boq-group-row"><td colSpan={12 + extraCols}>{cat}</td></tr>
                      {rows.map((m) => (
                        <tr key={m.id}>
                          <td className="font-medium stack-title">{m.item}<span className="boq-item-id">{m.id}</span></td>
                          <td data-label="Project">{projectCell(m)}</td>
                          {admin && <td data-label="Owner">{m.ownerName ?? <span className="text-muted">No owner</span>}</td>}
                          <td data-label="Category"><span className={`badge ${CATEGORY_BADGE[m.category] || 'badge-neutral'}`}>{m.category}</span></td>
                          <td data-label="Description" className="col-desc">{cellText(m.description)}</td>
                          <td data-label="Specification" className="col-spec">{cellText(m.specification)}</td>
                          <td data-label="Unit">{m.unit}</td>
                          <td data-label="Quantity" className="text-right">{cellInput(m, 'quantity')}</td>
                          <td data-label="Waste %" className="text-right">{cellInput(m, 'wastePercent')}</td>
                          <td data-label="Adjusted Qty" className="text-right cell-numeric">{formatQty(adjusted(num(value(m, 'quantity')), num(value(m, 'wastePercent'))))}</td>
                          <td data-label="Unit Price" className="text-right">
                            <div className="boq-price-input-group"><span className="boq-price-prefix">GH₵</span>{cellInput(m, 'unitPrice')}</div>
                          </td>
                          <td data-label="Total" className="text-right cell-numeric font-semibold">{formatCurrency(lineTotal(m))}</td>
                          <td data-label="Notes" className="col-notes">{cellText(m.notes)}</td>
                          <td className="stack-actions">
                            <div className="row-actions">
                              <button className="icon-action" onClick={() => openForm(m)} aria-label={`Edit ${m.item}`} title="Edit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z" /></svg>
                              </button>
                              <button className="icon-action is-danger" onClick={() => askDelete(m)} aria-label={`Delete ${m.item}`} title="Delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="boq-subtotal-row">
                        <td colSpan={2 + extraCols} className="boq-subtotal-label">Subtotal — {cat}</td>
                        <td className="col-desc" /><td className="col-spec" /><td colSpan={5} />
                        <td className="text-right cell-numeric">{formatCurrency(rows.reduce((s, m) => s + lineTotal(m), 0))}</td>
                        <td className="col-notes" /><td />
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card boq-summary">
            <div className="card-body">
              <div className="boq-summary-row">
                <span className="boq-summary-label">Total <span className="text-muted">({hasFilters ? 'items shown' : 'all items'}, waste-adjusted)</span></span>
                <span className="boq-summary-value">{formatCurrency(base)}</span>
              </div>
              <div className="boq-summary-row boq-summary-contingency">
                <label className="boq-summary-label" htmlFor="boq-contingency">
                  Contingency
                  <span className="boq-contingency-input">
                    <input type="text" id="boq-contingency" className="form-control" inputMode="decimal" value={contingency}
                      onChange={(e) => setContingency(e.target.value)}
                      onBlur={() => setContingency(String(setContingencyPercent(contingency)))} />
                    <span className="boq-contingency-suffix">%</span>
                  </span>
                </label>
                <span className="boq-summary-value">{formatCurrency(contingencyAmount)}</span>
              </div>
              <div className="boq-summary-row boq-summary-grand">
                <span className="boq-summary-label">Grand Total</span>
                <span className="boq-summary-value">{formatCurrency(base + contingencyAmount)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {noMatches && (
        <div className="boq-empty">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <h3>No items match your search</h3>
          <p className="text-secondary">Try a different search term, or clear the filters to see the full bill.</p>
          <button className="btn btn-outline" onClick={clear}>Clear filters</button>
        </div>
      )}
      {noneAtAll && (
        <div className="boq-empty">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="15" y2="16" /></svg>
          <h3>No items in the Bill of Quantities yet</h3>
          <p className="text-secondary">Add an item manually, or run a calculator in Manual Input and use "Add to BOQ" on its results.</p>
          <button className="btn btn-primary" onClick={() => openForm(null)}>Add your first item</button>
        </div>
      )}

      <BoqFormModal open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSaved={() => void load()}
        projects={formProjects} defaultProjectId={defaultProjectId} />
    </div>
  )
}
