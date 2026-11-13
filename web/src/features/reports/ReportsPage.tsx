import { useCallback, useEffect, useState } from 'react'
import { projectsApi, type Project } from '../../api/resources/projects'
import { reportsApi, type Report } from '../../api/resources/reports'
import { parseDate } from '../../api/client'
import { useToast } from '../../components/Toast'
import { isAdmin } from '../../api/resources/auth'
import { useAuth } from '../../auth/AuthContext'
import { BACKEND } from '../../config/env'

/** Port of js/modules/reports.js + pages/modules/reports.php — the Excel Export Center. */
const SHEETS = ['Project Information', 'Bill of Quantities', 'Materials Catalog', 'Cement Schedule',
  'Rebar Schedule', 'Timber Schedule', 'Roofing Schedule', 'Cost Summary']

const formatDate = (value: string) =>
  parseDate(value)?.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? value

const DownloadIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" />
  </svg>
)

export function ReportsPage() {
  const toast = useToast()
  const admin = isAdmin(useAuth().user)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [busy, setBusy] = useState<number | 'main' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<{ loading: boolean; rows: Report[] }>({ loading: true, rows: [] })

  const loadRecent = useCallback(async () => {
    setRecent((r) => ({ ...r, loading: true }))
    const result = await reportsApi.list()
    setRecent({ loading: false, rows: result.ok ? result.data.filter((r) => r.type === 'xlsx') : [] })
  }, [])

  useEffect(() => {
    projectsApi.getAll().then((r) => { if (r.ok) setProjects(r.data) })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRecent()
  }, [loadRecent])

  const projectsById = new Map(projects.map((p) => [p.id, p]))

  async function exportExcel(id: number | null, source: number | 'main') {
    setError(null)
    setBusy(source)
    const result = await reportsApi.downloadExcel(id)
    setBusy(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast(`${result.filename} downloaded.`, 'success')
    void loadRecent()
  }

  return (
    <div className="reports-module">
      <div className="module-header">
        <div>
          <span className="eyebrow">Documents</span>
          <h1>Excel Export Center</h1>
          <p className="text-secondary">Generate a real, editable .xlsx workbook from your current BOQ, materials and project data.</p>
        </div>
      </div>

      <div className="reports-export-card card">
        <div className="reports-export-main">
          <div className="form-group reports-project-select">
            <label className="form-label" htmlFor="rp-project">Project <span className="text-muted">(optional)</span></label>
            <select id="rp-project" className="form-control" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">No project — general BOQ &amp; Materials export</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.ref} — {p.name}</option>)}
            </select>
            <span className="form-hint">{BACKEND === 'django'
              ? 'With a project chosen, the BOQ and category schedules contain only the items linked to that project. With no project, they contain your whole BOQ. Materials is always the shared catalogue.'
              : 'BOQ, Materials and the category schedules always reflect the current data; a project only fills in the Project Information sheet.'}</span>
          </div>
          <button type="button" className="btn btn-primary reports-export-btn" disabled={busy !== null}
            onClick={() => void exportExcel(projectId ? Number(projectId) : null, 'main')}>
            <DownloadIcon />
            <span>{busy === 'main' ? 'Generating…' : 'Export to Excel'}</span>
          </button>
        </div>
        <ul className="reports-sheet-list">
          {SHEETS.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="alert-icon">!</span>
          <div className="alert-body">
            <span className="alert-title">Couldn’t generate the export</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="reports-recent">
        <div className="reports-recent-header">
          <h2>Recent Exports</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadRecent()}>Refresh</button>
        </div>

        {recent.loading && (
          <div className="projects-loading">
            <span className="spinner spinner-lg" />
            <p className="text-secondary">Loading recent exports…</p>
          </div>
        )}

        {!recent.loading && recent.rows.length > 0 && (
          <div className="card reports-table-wrap">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr><th>Generated</th><th>Title</th><th>Project</th>{admin && <th>Owner</th>}<th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {recent.rows.map((r) => {
                    const project = r.project_id ? projectsById.get(r.project_id) : undefined
                    return (
                      <tr key={r.id}>
                        <td className="text-sm">{formatDate(r.created_at)}</td>
                        <td>{r.title}</td>
                        <td>{project ? `${project.ref} — ${project.name}` : <span className="text-muted">General</span>}</td>
                        {admin && <td className="text-sm">{r.ownerName ?? <span className="text-muted">No owner</span>}</td>}
                        <td className="text-right">
                          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={busy !== null}
                            onClick={() => void exportExcel(r.project_id, r.id)}>
                            {busy === r.id ? 'Generating…' : 'Regenerate'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!recent.loading && recent.rows.length === 0 && (
          <div className="reports-empty">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></svg>
            <h3>No exports yet</h3>
            <p className="text-secondary">Generate your first Excel workbook using the button above.</p>
          </div>
        )}
      </div>
    </div>
  )
}
