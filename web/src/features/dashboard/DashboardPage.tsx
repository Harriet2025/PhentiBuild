import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { projectsApi, type Project } from '../../api/resources/projects'
import { calculationsApi, historyApi, measurementsApi, type HistoryEntry, type Measurement } from '../../api/resources/records'
import { parseDate } from '../../api/client'
import { ProgressBar } from '../../components/ProgressBar'
import { ACTION_BADGE, capitalize, relativeTime, STATUS_BADGE } from '../../lib/format'

/**
 * Port of pages/modules/dashboard.php + js/modules/dashboard.js.
 * Read-only aggregation of real backend data (projects, measurements,
 * calculations, history) — nothing is invented or stored here.
 */

type Section<T> = { loading: boolean; error: string | null; items: T[] }
const initial = <T,>(): Section<T> => ({ loading: true, error: null, items: [] })

const FolderPath = 'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z'
const CameraIcon = ({ sw = 1.6, className }: { sw?: number; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8a1 1 0 0 1 1-1h2l1.5-2h7L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z" /><circle cx="12" cy="13" r="3.2" />
  </svg>
)
const ClockIcon = ({ sw = 1.6, className }: { sw?: number; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />
  </svg>
)
const FolderIcon = ({ sw = 1.5, className }: { sw?: number; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={FolderPath} /></svg>
)
const TimberIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="5" rx="1" /><rect x="3" y="13" width="18" height="5" rx="1" />
  </svg>
)
const WallIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="1" /><line x1="3" y1="12" x2="21" y2="12" />
    <line x1="9" y1="5" x2="9" y2="12" /><line x1="15" y1="12" x2="15" y2="19" />
  </svg>
)

function StatCard({ variant, label, value, icon }: { variant: string; label: string; value: number | null; icon: ReactNode }) {
  return (
    <div className={`dash-stat-card dash-stat-${variant}`}>
      <span className="dash-stat-icon">{icon}</span>
      <span className="dash-stat-body">
        <span className="dash-stat-label">{label}</span>
        <span className="dash-stat-value">{value ?? '—'}</span>
      </span>
    </div>
  )
}

function SectionState({ section, emptyIcon, empty }: { section: Section<unknown>; emptyIcon: ReactNode; empty: ReactNode }) {
  if (section.loading) return <p className="dash-loading">Loading…</p>
  if (section.error || !section.items.length) {
    return (
      <div className="dash-empty">
        {emptyIcon}
        <span>{section.error ?? empty}</span>
      </div>
    )
  }
  return null
}

const QUICK_ACTIONS: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/scanner', label: 'Camera Scanner', icon: <CameraIcon /> },
  { to: '/manual-input', label: 'Manual Input', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z" /></svg> },
  { to: '/calculators', label: 'Calculators', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="1.5" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="15" x2="8" y2="15" /><line x1="12" y1="15" x2="12" y2="15" /><line x1="16" y1="15" x2="16" y2="17.5" /></svg> },
  { to: '/roof-studio', label: 'Roof Studio', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11L12 4l9 7" /><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" /></svg> },
  { to: '/boq', label: 'Bill of Quantities', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="15" y2="16" /></svg> },
  { to: '/reports', label: 'Export Center', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="20" x2="5" y2="12" /><line x1="12" y1="20" x2="12" y2="6" /><line x1="19" y1="20" x2="19" y2="15" /></svg> },
]

export function DashboardPage() {
  const [stats, setStats] = useState<{ active: number | null; total: number | null; measurements: number | null; calculations: number | null }>(
    { active: null, total: null, measurements: null, calculations: null },
  )
  const [projects, setProjects] = useState<Section<Project>>(initial)
  const [scans, setScans] = useState<Section<Measurement>>(initial)
  const [history, setHistory] = useState<Section<HistoryEntry>>(initial)

  useEffect(() => {
    let cancelled = false

    projectsApi.getAll().then((r) => {
      if (cancelled) return
      if (!r.ok) return setProjects({ loading: false, error: r.error || 'Could not load projects.', items: [] })
      const active = r.data
        .filter((p) => p.status !== 'Completed' && p.status !== 'Archived')
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      setStats((s) => ({ ...s, total: r.data.length, active: active.length }))
      setProjects({ loading: false, error: null, items: active.slice(0, 5) })
    })

    measurementsApi.getAll().then((r) => {
      if (cancelled) return
      if (!r.ok) return setScans({ loading: false, error: r.error || 'Could not load measurements.', items: [] })
      setStats((s) => ({ ...s, measurements: r.data.length }))
      // "Recent scans" = measurements saved by the Camera Scanner (values.source === 'scanner').
      setScans({ loading: false, error: null, items: r.data.filter((m) => m.values?.source === 'scanner').slice(0, 5) })
    })

    calculationsApi.getAll().then((r) => {
      if (!cancelled && r.ok) setStats((s) => ({ ...s, calculations: r.data.length }))
    })

    historyApi.list({ limit: 5 }).then((r) => {
      if (cancelled) return
      if (!r.ok) return setHistory({ loading: false, error: r.network ? 'Could not reach the server.' : r.error || 'Could not load recent activity.', items: [] })
      setHistory({ loading: false, error: null, items: r.data || [] })
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="dashboard-module">
      <div className="module-header">
        <div>
          <span className="eyebrow">Overview</span>
          <h1>Dashboard</h1>
          <p className="text-secondary">Active projects, recent scans, recent activity and quick access to every tool.</p>
        </div>
      </div>

      <div className="dash-stats-grid">
        <StatCard variant="primary" label="Active Projects" value={stats.active}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={FolderPath} /></svg>} />
        <StatCard variant="info" label="Total Projects" value={stats.total}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>} />
        <StatCard variant="slate" label="Measurements Recorded" value={stats.measurements}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z" /></svg>} />
        <StatCard variant="success" label="Calculations Saved" value={stats.calculations}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="1.5" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="15" x2="8" y2="15" /><line x1="12" y1="15" x2="12" y2="15" /><line x1="16" y1="15" x2="16" y2="17.5" /></svg>} />
      </div>

      <div className="card dash-section">
        <div className="card-header"><h4>Quick Actions</h4></div>
        <div className="card-body">
          <div className="dash-quick-actions">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.to} to={a.to} className="dash-action-card">
                <span className="dash-action-icon">{a.icon}</span>
                <span className="dash-action-label">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="dash-columns">
        <div className="card dash-section">
          <div className="card-header">
            <h4><FolderIcon sw={1.8} className="dash-header-icon" />Active Projects</h4>
            <Link to="/projects" className="dash-see-all">See all</Link>
          </div>
          <div className="card-body">
            <SectionState section={projects} emptyIcon={<FolderIcon />}
              empty={<>No active projects yet. <Link to="/projects">Create your first project</Link>.</>} />
            {!projects.loading && projects.items.length > 0 && (
              <ul className="dash-project-list">
                {projects.items.map((p) => (
                  <li key={p.id} className="dash-project-item">
                    <Link to={`/projects/${p.ref}`} className="dash-project-link">
                      <span className="dash-project-name-row">
                        <span className="dash-project-name">{p.name}</span>
                        <span className={`badge ${STATUS_BADGE[p.status] || 'badge-neutral'}`}>{p.status}</span>
                      </span>
                      <span className="dash-project-ref">{p.ref} · {p.client}</span>
                      <ProgressBar value={p.progress} className="dash-project-progress" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card dash-section">
          <div className="card-header">
            <h4><CameraIcon sw={1.8} className="dash-header-icon" />Recent Scans</h4>
            <Link to="/scanner" className="dash-see-all">Open Scanner</Link>
          </div>
          <div className="card-body">
            <SectionState section={scans} emptyIcon={<CameraIcon sw={1.5} />} empty="No camera scans saved yet." />
            {!scans.loading && scans.items.length > 0 && (
              <ul className="dash-list">
                {scans.items.map((m) => (
                  <li key={m.id} className="dash-list-item">
                    <span className="dash-list-icon">{m.sectionType === 'walls' ? <WallIcon /> : <TimberIcon />}</span>
                    <span className="dash-list-text">
                      <span className="dash-list-title">{m.label || m.sectionType}</span>
                      <span className="dash-list-meta">{relativeTime(m.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card dash-section">
          <div className="card-header">
            <h4><ClockIcon sw={1.8} className="dash-header-icon" />Recent Activity</h4>
            <Link to="/history" className="dash-see-all">View full history</Link>
          </div>
          <div className="card-body">
            <SectionState section={history} emptyIcon={<ClockIcon sw={1.5} />} empty="No activity recorded yet." />
            {!history.loading && history.items.length > 0 && (
              <ul className="dash-list">
                {history.items.map((row) => (
                  <li key={row.id} className="dash-list-item">
                    <span className={`dash-list-icon dash-list-icon-${row.action}`}><ClockIcon /></span>
                    <span className="dash-list-text">
                      <span className="dash-list-title">{row.summary}</span>
                      <span className="dash-list-meta">
                        <span className={`badge ${ACTION_BADGE[row.action] || 'badge-neutral'}`}>{capitalize(row.action)}</span>
                        {relativeTime(parseDate(row.created_at))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
