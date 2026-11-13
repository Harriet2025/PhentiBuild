import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { projectsApi, type Project } from '../../api/resources/projects'
import { useConfirm } from '../../components/ConfirmDialog'
import { ProgressBar } from '../../components/ProgressBar'
import { useToast } from '../../components/Toast'
import { STATUS_BADGE } from '../../lib/format'
import { ProjectFormModal } from './ProjectFormModal'
import { ProjectWorkTab, type WorkTab } from './ProjectWorkTab'

/** Port of js/modules/project-detail.js + the detail half of projects.php (#projects/PHB-XXXX). */
type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; project: Project }

const TABS: { id: 'overview' | WorkTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'measurements', label: 'Measurements' },
  { id: 'calculations', label: 'Calculations' },
  { id: 'materials', label: 'Materials' },
  { id: 'boq', label: 'BOQ' },
  { id: 'roof', label: 'Roof Design' },
  { id: 'reports', label: 'Reports' },
  { id: 'history', label: 'History' },
]

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function durationBetween(start: string, end: string): string | null {
  const a = new Date(start)
  const b = new Date(end)
  if (!start || !end || isNaN(a.getTime()) || isNaN(b.getTime())) return null
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (months < 1) return 'Under a month'
  if (months === 1) return '1 month'
  if (months < 12) return `${months} months`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return `${years}${years === 1 ? ' year' : ' years'}${rest ? ` ${rest}${rest === 1 ? ' month' : ' months'}` : ''}`
}

const orNotRecorded = (value: ReactNode) => (value ? value : <span className="text-muted">Not recorded</span>)

export function ProjectDetailPage() {
  const { ref = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [tab, setTab] = useState('overview')
  const [formOpen, setFormOpen] = useState(false)
  const loadToken = useRef(0)

  const load = useCallback(async (showSpinner = true) => {
    const token = ++loadToken.current
    if (showSpinner) setState({ status: 'loading' })
    const result = await projectsApi.getByRef(ref)
    if (token !== loadToken.current) return
    if (!result.ok) {
      if (result.notFound) {
        toast('That project could not be found.')
        navigate('/projects', { replace: true })
        return
      }
      setState({ status: 'error', message: result.error })
      return
    }
    setState({ status: 'ready', project: result.data })
  }, [ref, navigate, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab('overview')
    void load()
  }, [load])

  if (state.status === 'loading') {
    return (
      <div className="projects-module">
        <div className="projects-loading">
          <span className="spinner spinner-lg" />
          <p className="text-secondary">Loading project…</p>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="projects-module">
        <div className="alert alert-danger">
          <span className="alert-icon">!</span>
          <div className="alert-body">
            <span className="alert-title">Couldn’t load this project</span>
            <span>{state.message}</span>
            <div className="mt-3">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => void load()}>Retry</button>{' '}
              <Link to="/projects" className="btn btn-outline-secondary btn-sm">Back to Projects</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const project = state.project
  const badge = <span className={`badge ${STATUS_BADGE[project.status] || 'badge-neutral'}`}>{project.status}</span>

  const archive = () => {
    if (project.status === 'Archived') {
      toast(`${project.ref} is already archived.`)
      return
    }
    confirm({
      title: 'Archive project?',
      message: `Archiving "${project.name}" marks it as no longer active. It stays in the project list and its data is kept.`,
      acceptLabel: 'Archive',
      onAccept: async () => {
        const result = await projectsApi.archive(project.id)
        if (result.ok) setState({ status: 'ready', project: result.data })
        toast(result.ok ? `${project.ref} has been archived.` : result.error, result.ok ? 'success' : 'danger')
      },
    })
  }

  const remove = () => confirm({
    title: 'Delete project?',
    message: `This removes "${project.name}" and all of its details. This cannot be undone.`,
    acceptLabel: 'Delete',
    danger: true,
    onAccept: async () => {
      const result = await projectsApi.remove(project.id)
      if (!result.ok) {
        toast(result.error, 'danger')
        return
      }
      navigate('/projects')
      toast(`${project.ref} has been deleted.`, 'success')
    },
  })

  const facts: [string, ReactNode][] = [
    ['Project Name', project.name],
    ['Reference', <span key="ref" className="font-mono">{project.ref}</span>],
    ['Client', project.client],
    ['Client Contact', orNotRecorded(project.contact)],
    ['Location', project.location],
    ['Project Type', project.type],
    ['Status', badge],
    ['Start Date', orNotRecorded(formatDate(project.startDate))],
    ['Expected Completion', orNotRecorded(formatDate(project.endDate))],
    ['Planned Duration', orNotRecorded(durationBetween(project.startDate, project.endDate))],
    ['Last Updated', formatDate(project.updatedAt) || '—'],
  ]

  return (
    <div className="projects-module">
      <nav className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span className="separator">/</span>
        <span className="is-current">{project.name}</span>
      </nav>

      <div className="detail-header">
        <div className="detail-heading">
          <span className="eyebrow">{project.ref}</span>
          <h1>{project.name}</h1>
          <p className="text-secondary">{project.client} · {project.location}</p>
        </div>
        <div className="detail-actions">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setFormOpen(true)}>Edit</button>
          <button className="btn btn-outline-secondary btn-sm" onClick={archive}>Archive</button>
          <button className="btn btn-danger btn-sm" onClick={remove}>Delete</button>
        </div>
      </div>

      <div className="detail-summary">
        <div className="card detail-tile"><span className="tile-label">Status</span><span className="tile-value">{badge}</span></div>
        <div className="card detail-tile"><span className="tile-label">Progress</span><span className="tile-value"><ProgressBar value={project.progress} /></span></div>
        <div className="card detail-tile"><span className="tile-label">Start Date</span><span className="tile-value">{orNotRecorded(formatDate(project.startDate))}</span></div>
        <div className="card detail-tile"><span className="tile-label">Expected Completion</span><span className="tile-value">{orNotRecorded(formatDate(project.endDate))}</span></div>
      </div>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <a key={t.id} href="#" role="tab" className={`tab-link${tab === t.id ? ' is-active' : ''}`}
            onClick={(e) => { e.preventDefault(); setTab(t.id) }}>{t.label}</a>
        ))}
      </nav>

      <div className="detail-tab-panels">
        {tab === 'overview' ? (
          <section role="tabpanel">
            <div className="detail-overview-grid">
              <div className="card">
                <div className="card-header"><h4>Project Details</h4></div>
                <div className="card-body">
                  <dl className="detail-list">
                    {facts.map(([label, value]) => (
                      <div key={label} style={{ display: 'contents' }}><dt>{label}</dt><dd>{value}</dd></div>
                    ))}
                  </dl>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><h4>Description</h4></div>
                <div className="card-body">
                  <p>{project.description || <span className="text-muted">No description was recorded for this project.</span>}</p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section role="tabpanel">
            <ProjectWorkTab project={project} tab={tab as WorkTab} />
          </section>
        )}
      </div>

      <ProjectFormModal open={formOpen} editing={project} onClose={() => setFormOpen(false)}
        onSaved={(p) => setState({ status: 'ready', project: p })} />
    </div>
  )
}
