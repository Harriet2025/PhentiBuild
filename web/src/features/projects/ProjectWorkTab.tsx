import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseDate, request } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import { boqApi, formatCurrency, formatQty, type BoqItem } from '../../api/resources/boq'
import type { Project } from '../../api/resources/projects'
import { calculationsApi, historyApi, measurementsApi, type Calculation, type HistoryEntry, type Measurement } from '../../api/resources/records'
import { reportsApi, type Report } from '../../api/resources/reports'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/Toast'
import { setActiveProjectId } from '../../lib/activeProject'
import { ACTION_BADGE, capitalize, relativeTime } from '../../lib/format'

/**
 * The work linked to one project, one tab at a time (project detail page).
 * Every list comes from the API filtered with ?projectId=, so it only ever
 * shows records the server says this person may see.
 */
export type WorkTab = 'measurements' | 'calculations' | 'boq' | 'reports' | 'history' | 'materials' | 'roof'

type Load<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; rows: T[] }

function useRows<T>(fetcher: () => Promise<{ ok: true; data: T[] } | { ok: false; error: string }>, key: string): [Load<T>, () => void] {
  const [state, setState] = useState<Load<T>>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    let alive = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' })
    void fetcher().then((r) => {
      if (alive) setState(r.ok ? { status: 'ready', rows: r.data } : { status: 'error', message: r.error })
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])
  return [state, () => setNonce((n) => n + 1)]
}

const dateText = (d: Date | string | null) => {
  const date = d instanceof Date ? d : d ? new Date(d) : null
  return date && !isNaN(date.getTime()) ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

function Placeholder({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="module-placeholder">
      <span className="placeholder-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /></svg>
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

function Rows<T>({ state, retry, empty, children }: { state: Load<T>; retry: () => void; empty: ReactNode; children: (rows: T[]) => ReactNode }) {
  if (state.status === 'loading') return <div className="projects-loading"><span className="spinner spinner-lg" /><p className="text-secondary">Loading…</p></div>
  if (state.status === 'error') {
    return (
      <div className="alert alert-danger">
        <span className="alert-icon">!</span>
        <div className="alert-body">
          <span className="alert-title">Couldn’t load this list</span><span>{state.message}</span>
          <div className="mt-3"><button type="button" className="btn btn-outline-secondary btn-sm" onClick={retry}>Retry</button></div>
        </div>
      </div>
    )
  }
  return state.rows.length ? <>{children(state.rows)}</> : <>{empty}</>
}

const saveHint = 'Choose this project under "Save to project" in Calculators, Manual Input or the Scanner, and new work is linked here automatically.'

function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="card">
      <div className="table-responsive">
        <table className="table table-stack"><thead><tr>{head}</tr></thead><tbody>{children}</tbody></table>
      </div>
    </div>
  )
}

function MeasurementsTab({ project }: { project: Project }) {
  const [state, retry] = useRows<Measurement>(() => measurementsApi.getAll({ projectId: project.id }), `m${project.id}`)
  return (
    <Rows state={state} retry={retry} empty={<Placeholder title="No measurements linked yet">{saveHint}</Placeholder>}>
      {(rows) => (
        <Table head={<><th>Saved</th><th>Type</th><th>Label</th><th>Values</th></>}>
          {rows.map((m) => (
            <tr key={m.id}>
              <td data-label="Saved" className="text-sm">{dateText(m.createdAt)}</td>
              <td data-label="Type">{capitalize(m.sectionType)}</td>
              <td data-label="Label">{m.label || <span className="text-muted">—</span>}</td>
              <td data-label="Values" className="text-sm stack-wide">{Object.entries(m.values).filter(([k]) => k !== 'source').map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</td>
            </tr>
          ))}
        </Table>
      )}
    </Rows>
  )
}

function CalculationsTab({ project }: { project: Project }) {
  const [state, retry] = useRows<Calculation>(() => calculationsApi.getAll({ projectId: project.id }), `c${project.id}`)
  return (
    <Rows state={state} retry={retry} empty={<Placeholder title="No calculations linked yet">{saveHint}</Placeholder>}>
      {(rows) => (
        <Table head={<><th>Saved</th><th>Calculator</th><th>Label</th><th>Notes</th></>}>
          {rows.map((c) => (
            <tr key={c.id}>
              <td data-label="Saved" className="text-sm">{dateText(c.createdAt)}</td>
              <td data-label="Calculator">{capitalize(c.calculationType)}</td>
              <td data-label="Label">{c.label || <span className="text-muted">—</span>}</td>
              <td data-label="Notes" className="text-sm">{c.notes || <span className="text-muted">—</span>}</td>
            </tr>
          ))}
        </Table>
      )}
    </Rows>
  )
}

function BoqTab({ project }: { project: Project }) {
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  const [state, retry] = useRows<BoqItem>(() => boqApi.getAll({ projectId: project.id }), `b${project.id}`)
  const openLink = <Link to={`/boq?project=${project.id}`} className="btn btn-outline-secondary btn-sm">Open in Bill of Quantities</Link>

  async function exportExcel() {
    setExporting(true)
    const r = await reportsApi.downloadExcel(project.id)
    setExporting(false)
    toast(r.ok ? `Downloaded ${r.filename}` : r.error, r.ok ? 'success' : 'danger')
  }

  return (
    <Rows state={state} retry={retry}
      empty={<Placeholder title="No BOQ items linked yet" action={openLink}>Add items on the Bill of Quantities page with this project selected, or use “Add to BOQ” on a calculator result. {saveHint}</Placeholder>}>
      {(rows) => (
        <>
          <div className="detail-actions mb-3">
            {openLink}
            <button type="button" className="btn btn-primary btn-sm" disabled={exporting} onClick={() => void exportExcel()}>{exporting ? 'Preparing…' : 'Export to Excel'}</button>
          </div>
          <Table head={<><th>Item</th><th>Category</th><th className="text-right">Adjusted Qty</th><th>Unit</th><th className="text-right">Unit Price</th><th className="text-right">Total</th></>}>
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="font-medium stack-title">{m.item}</td>
                <td data-label="Category">{m.category}</td>
                <td data-label="Adjusted Qty" className="text-right cell-numeric">{formatQty(m.adjustedQuantity)}</td>
                <td data-label="Unit">{m.unit}</td>
                <td data-label="Unit Price" className="text-right cell-numeric">{formatCurrency(m.unitPrice)}</td>
                <td data-label="Total" className="text-right cell-numeric font-semibold">{formatCurrency(m.total)}</td>
              </tr>
            ))}
            <tr className="boq-subtotal-row">
              <td colSpan={5} className="boq-subtotal-label">Total — {rows.length} {rows.length === 1 ? 'item' : 'items'} (waste-adjusted, before contingency)</td>
              <td className="text-right cell-numeric">{formatCurrency(rows.reduce((s, m) => s + m.total, 0))}</td>
            </tr>
          </Table>
        </>
      )}
    </Rows>
  )
}

function ReportsTab({ project }: { project: Project }) {
  const [state, retry] = useRows<Report>(() => reportsApi.list({ projectId: project.id }), `r${project.id}`)
  return (
    <Rows state={state} retry={retry} empty={<Placeholder title="No reports for this project yet">Use “Export to Excel” on the BOQ tab — each export is recorded here.</Placeholder>}>
      {(rows) => (
        <Table head={<><th>Created</th><th>Title</th><th>Type</th></>}>
          {rows.map((r) => (
            <tr key={r.id}><td data-label="Created" className="text-sm">{dateText(r.created_at)}</td><td data-label="Title">{r.title}</td><td data-label="Type">{r.type.toUpperCase()}</td></tr>
          ))}
        </Table>
      )}
    </Rows>
  )
}

function HistoryTab({ project }: { project: Project }) {
  const [state, retry] = useRows<HistoryEntry>(() => historyApi.list({ projectId: project.id, limit: 100 }), `h${project.id}`)
  return (
    <Rows state={state} retry={retry} empty={<Placeholder title="No history for this project yet">Changes to this project and its linked work will appear here.</Placeholder>}>
      {(rows) => (
        <Table head={<><th>When</th><th>Action</th><th>Summary</th><th>By</th></>}>
          {rows.map((h) => (
            <tr key={h.id}>
              <td data-label="When" className="text-sm">{relativeTime(parseDate(h.created_at))}</td>
              <td data-label="Action"><span className={`badge ${ACTION_BADGE[h.action] || 'badge-neutral'}`}>{capitalize(h.action)}</span></td>
              <td data-label="Summary" className="stack-wide">{h.summary}</td>
              <td data-label="By" className="text-sm">{h.user_name || <span className="text-muted">—</span>}</td>
            </tr>
          ))}
        </Table>
      )}
    </Rows>
  )
}

function RoofTab({ project }: { project: Project }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [state, retry] = useRows<RoofDesignRow>(async () => {
    const r = await request<RoofDesignRow>('GET', endpoints.roofDesigns, { query: { projectId: project.id } })
    return r.ok ? { ok: true as const, data: [r.data] } : { ok: false as const, error: r.error }
  }, `roof${project.id}`)
  // Roof Studio edits the design of the project picked in its header, so
  // opening it from here just picks this project. Only the owner does that;
  // an Admin viewing someone else's project sees the summary.
  const isOwner = project.ownerId === undefined || project.ownerId === user?.id
  const open = () => { setActiveProjectId(project.id); navigate('/roof-studio') }
  const openBtn = isOwner && <button type="button" className="btn btn-primary btn-sm" onClick={open}>Open in Roof Studio</button>

  return (
    <Rows state={state} retry={retry} empty={null}>
      {([d]) => {
        const p = d.properties || {}
        const drawn = Array.isArray(d.shapes) ? d.shapes.length : 0
        if (!drawn && !p.length && !p.width && !p.pitch) {
          return <Placeholder title="No roof drawn for this project yet" action={openBtn}>Each project has its own roof design. Open Roof Studio with this project selected to draw the plan and preview it in 3D.</Placeholder>
        }
        const facts: [string, string][] = [
          ['Roof type', p.roofType || '—'],
          ['Footprint', p.length && p.width ? `${p.length} m × ${p.width} m` : '—'],
          ['Pitch', p.pitch ? `${p.pitch}°` : '—'],
          ['Roofing material', p.roofingMaterial || '—'],
          ['Shapes drawn', String(drawn)],
          ['Last saved', dateText(parseDate(d.updated_at))],
        ]
        return (
          <div className="card">
            <div className="card-header"><h4>Roof Design</h4>{openBtn}</div>
            <div className="card-body">
              <dl className="detail-list">
                {facts.map(([label, value]) => <div key={label} style={{ display: 'contents' }}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
            </div>
          </div>
        )
      }}
    </Rows>
  )
}

type RoofDesignRow = { shapes: unknown[]; properties: Record<string, string>; updated_at: string | null }

export function ProjectWorkTab({ project, tab }: { project: Project; tab: WorkTab }) {
  switch (tab) {
    case 'measurements': return <MeasurementsTab project={project} />
    case 'calculations': return <CalculationsTab project={project} />
    case 'boq': return <BoqTab project={project} />
    case 'reports': return <ReportsTab project={project} />
    case 'history': return <HistoryTab project={project} />
    case 'materials':
      return (
        <Placeholder title="Materials come from the shared library" action={<Link to="/materials" className="btn btn-outline-secondary btn-sm">Open Materials Catalog</Link>}>
          Every project uses the same materials catalogue, which administrators maintain. This project’s quantities and prices are on the BOQ tab.
        </Placeholder>
      )
    case 'roof': return <RoofTab project={project} />
  }
}
