import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isAdmin } from '../../api/resources/auth'
import { useAuth } from '../../auth/AuthContext'
import { PROJECT_STATUSES, PROJECT_TYPES, projectsApi, type Project } from '../../api/resources/projects'
import { useConfirm } from '../../components/ConfirmDialog'
import { ProgressBar } from '../../components/ProgressBar'
import { useToast } from '../../components/Toast'
import { relativeTime, STATUS_BADGE } from '../../lib/format'
import { ProjectFormModal } from './ProjectFormModal'

/** Port of js/modules/projects.js + the list half of projects.php. */
type Sort = 'updated-desc' | 'updated-asc' | 'name-asc' | 'name-desc' | 'progress-desc' | 'progress-asc'
type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; projects: Project[] }

const statusSlug = (s: string) => s.toLowerCase().replace(/\s+/g, '-')

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
)
const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z" /></svg>
)
const BinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
)
const Badge = ({ status }: { status: Project['status'] }) => <span className={`badge ${STATUS_BADGE[status]}`}>{status}</span>

export function ProjectsPage() {
  // Admins see everyone's projects, so each one is labelled with its owner.
  const admin = isAdmin(useAuth().user)
  const toast = useToast()
  const confirm = useConfirm()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [term, setTerm] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState<Sort>('updated-desc')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const loadToken = useRef(0)

  const load = useCallback(async () => {
    const token = ++loadToken.current
    setState({ status: 'loading' })
    const result = await projectsApi.getAll()
    if (token !== loadToken.current) return // superseded by a newer load
    setState(result.ok ? { status: 'ready', projects: result.data } : { status: 'error', message: result.error })
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const projects = useMemo(() => (state.status === 'ready' ? state.projects : []), [state])
  const hasFilters = !!(term.trim() || status || type)

  const visible = useMemo(() => {
    const t = term.trim().toLowerCase()
    const list = projects.filter((p) =>
      (!t || [p.name, p.client, p.location, p.ref].some((v) => v.toLowerCase().includes(t)))
      && (!status || p.status === status) && (!type || p.type === type))
    const time = (p: Project) => p.updatedAt.getTime()
    return list.sort((a, b) => {
      switch (sort) {
        case 'updated-asc': return time(a) - time(b)
        case 'name-asc': return a.name.localeCompare(b.name)
        case 'name-desc': return b.name.localeCompare(a.name)
        case 'progress-desc': return b.progress - a.progress
        case 'progress-asc': return a.progress - b.progress
        default: return time(b) - time(a)
      }
    })
  }, [projects, term, status, type, sort])

  const clearFilters = () => { setTerm(''); setStatus(''); setType('') }
  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (p: Project) => { setEditing(p); setFormOpen(true) }
  const askDelete = (p: Project) => confirm({
    title: 'Delete project?',
    message: `This removes "${p.name}" and all of its details. This cannot be undone.`,
    acceptLabel: 'Delete',
    danger: true,
    onAccept: async () => {
      const result = await projectsApi.remove(p.id)
      toast(result.ok ? `${p.name} has been deleted.` : result.error, result.ok ? 'success' : 'danger')
      if (result.ok) void load()
    },
  })

  const actions = (p: Project) => (
    <div className="row-actions">
      <Link className="icon-action" to={`/projects/${p.ref}`} aria-label={`Open ${p.name}`} title="Open project"><EyeIcon /></Link>
      <button className="icon-action" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`} title="Edit"><PencilIcon /></button>
      <button className="icon-action is-danger" onClick={() => askDelete(p)} aria-label={`Delete ${p.name}`} title="Delete"><BinIcon /></button>
    </div>
  )

  const noProjectsAtAll = state.status === 'ready' && projects.length === 0
  const noMatches = state.status === 'ready' && !noProjectsAtAll && visible.length === 0

  return (
    <div className="projects-module">
      <div className="module-header">
        <div>
          <span className="eyebrow">Overview</span>
          <h1>Projects</h1>
          <p className="text-secondary">Browse and manage all construction projects.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Project
        </button>
      </div>

      <div className="projects-toolbar">
        <div className="projects-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="search" className="form-control" placeholder="Search by project, client or location…" aria-label="Search projects"
            value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div className="projects-filters">
          <select className="form-control" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-control" aria-label="Filter by project type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="form-control" aria-label="Sort projects" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="updated-desc">Last updated (newest)</option>
            <option value="updated-asc">Last updated (oldest)</option>
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="progress-desc">Progress (high–low)</option>
            <option value="progress-asc">Progress (low–high)</option>
          </select>
        </div>
      </div>

      {state.status === 'ready' && (
        <div className="projects-meta">
          <span className="text-sm text-muted">{noProjectsAtAll ? '' : `Showing ${visible.length} of ${projects.length} projects`}</span>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear filters</button>}
        </div>
      )}

      {state.status === 'loading' && (
        <div className="projects-loading">
          <span className="spinner spinner-lg" />
          <p className="text-secondary">Loading projects…</p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="alert alert-danger">
          <span className="alert-icon">!</span>
          <div className="alert-body">
            <span className="alert-title">Couldn’t load projects</span>
            <span>{state.message}</span>
            <div className="mt-3"><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => void load()}>Retry</button></div>
          </div>
        </div>
      )}

      {state.status === 'ready' && visible.length > 0 && (
        <>
          <div className="card projects-table-wrap">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Project</th><th>Client</th><th>Location</th><th>Type</th><th>Progress</th><th>Status</th><th>Last Updated</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/projects/${p.ref}`} className="project-name">{p.name}</Link>
                        <span className="project-ref">{p.ref}{admin && ` · ${p.ownerName ?? 'No owner'}`}</span>
                      </td>
                      <td>{p.client}</td>
                      <td>{p.location}</td>
                      <td>{p.type}</td>
                      <td><ProgressBar value={p.progress} /></td>
                      <td><Badge status={p.status} /></td>
                      <td className="text-sm text-muted">{relativeTime(p.updatedAt)}</td>
                      <td>{actions(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="projects-card-list">
            {visible.map((p) => (
              <article key={p.id} className={`project-card status-${statusSlug(p.status)}`}>
                <div className="project-card-head">
                  <div>
                    <Link to={`/projects/${p.ref}`} className="project-name">{p.name}</Link>
                    <span className="project-ref">{p.ref}{admin && ` · ${p.ownerName ?? 'No owner'}`}</span>
                  </div>
                  <Badge status={p.status} />
                </div>
                <dl className="project-card-meta">
                  <dt>Client</dt><dd>{p.client}</dd>
                  <dt>Location</dt><dd>{p.location}</dd>
                  <dt>Type</dt><dd>{p.type}</dd>
                </dl>
                <ProgressBar value={p.progress} />
                <div className="project-card-foot">
                  <span className="project-card-updated">Updated {relativeTime(p.updatedAt).toLowerCase()}</span>
                  {actions(p)}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {noMatches && (
        <div className="projects-empty">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <h3>No projects match your search</h3>
          <p className="text-secondary">Try a different search term, or clear the filters to see all projects.</p>
          <button className="btn btn-outline" onClick={clearFilters}>Clear filters</button>
        </div>
      )}

      {noProjectsAtAll && (
        <div className="projects-empty">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z" /></svg>
          <h3>No projects yet</h3>
          <p className="text-secondary">Create your first project to start capturing measurements and building quantities.</p>
          <button className="btn btn-primary" onClick={openNew}>Create your first project</button>
        </div>
      )}

      <ProjectFormModal open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSaved={() => void load()} />
    </div>
  )
}
