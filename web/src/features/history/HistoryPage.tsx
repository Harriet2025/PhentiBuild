import { useCallback, useEffect, useRef, useState } from 'react'
import { historyApi, type HistoryEntry } from '../../api/resources/records'
import { parseDate } from '../../api/client'
import { ACTION_BADGE, capitalize } from '../../lib/format'

/** Port of js/modules/history.js + pages/modules/history.php — the read-only audit log. */
type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; rows: HistoryEntry[] }

function initials(name: string | null): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function HistoryPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [date, setDate] = useState('')
  const [userId, setUserId] = useState('')
  const [module, setModule] = useState('')
  const [users, setUsers] = useState<{ id: number; name: string }[]>([])
  const [modules, setModules] = useState<string[]>([])
  const loadToken = useRef(0)

  // Debounce the search box (300 ms), like the original.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => window.clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    const token = ++loadToken.current
    setState({ status: 'loading' })
    const result = await historyApi.list({ q: debouncedQ, date, userId, module })
    if (token !== loadToken.current) return
    if (!result.ok) {
      setState({ status: 'error', message: result.error })
      return
    }
    // Filter options come from the first response's meta (users + modules).
    setUsers((u) => (u.length ? u : (result.meta.users as { id: number; name: string }[]) || []))
    setModules((m) => (m.length ? m : [...new Set((result.meta.modules as string[]) || [])]))
    setState({ status: 'ready', rows: result.data || [] })
  }, [debouncedQ, date, userId, module])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const hasFilters = !!(q.trim() || date || userId || module)
  const clear = () => { setQ(''); setDebouncedQ(''); setDate(''); setUserId(''); setModule('') }
  const rows = state.status === 'ready' ? state.rows : []

  return (
    <div className="history-module">
      <div className="module-header">
        <div>
          <span className="eyebrow">Documents</span>
          <h1>History &amp; Audit Log</h1>
          <p className="text-secondary">A complete, read-only trail of every create, update and delete across PhentiBuild.</p>
        </div>
      </div>

      <div className="history-toolbar">
        <div className="history-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="search" className="form-control" placeholder="Search by summary, user or project…" aria-label="Search history"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="history-filters">
          <input type="date" className="form-control" aria-label="Filter by date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select className="form-control" aria-label="Filter by user" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">All users</option>
            {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
          </select>
          <select className="form-control" aria-label="Filter by module" value={module} onChange={(e) => setModule(e.target.value)}>
            <option value="">All modules</option>
            {modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {state.status === 'ready' && (
        <div className="history-meta">
          <span className="text-sm text-muted">
            {rows.length ? `Showing ${rows.length} most recent ${rows.length === 1 ? 'entry' : 'entries'}` : ''}
          </span>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clear}>Clear filters</button>}
        </div>
      )}

      {state.status === 'loading' && (
        <div className="projects-loading">
          <span className="spinner spinner-lg" />
          <p className="text-secondary">Loading history…</p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="alert alert-danger">
          <span className="alert-icon">!</span>
          <div className="alert-body">
            <span className="alert-title">Couldn’t load history</span>
            <span>{state.message}</span>
            <div className="mt-3"><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => void load()}>Retry</button></div>
          </div>
        </div>
      )}

      {state.status === 'ready' && rows.length > 0 && (
        <div className="card history-table-wrap">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr><th>Date</th><th>Time</th><th>User</th><th>Module</th><th>Project</th><th>Action</th><th>Details</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const when = parseDate(row.created_at)
                  return (
                    <tr key={row.id}>
                      <td className="text-sm">{when ? when.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : row.created_at}</td>
                      <td className="text-sm text-muted">{when ? when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                      <td>
                        {row.user_id && row.user_name ? (
                          <div className="history-user-cell">
                            <span className="history-user-avatar">{initials(row.user_name)}</span>
                            <span>{row.user_name}</span>
                          </div>
                        ) : <span className="text-muted">System</span>}
                      </td>
                      <td><span className="badge badge-neutral">{row.module || row.entity_type}</span></td>
                      <td>
                        {row.project_id && row.project_ref ? (
                          <div className="history-project-cell">
                            <span className="history-project-ref">{row.project_ref}</span>
                            <span className="history-project-name">{row.project_name || ''}</span>
                          </div>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td><span className={`badge ${ACTION_BADGE[row.action] || 'badge-neutral'}`}>{capitalize(row.action)}</span></td>
                      <td className="text-sm">{row.summary}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {state.status === 'ready' && rows.length === 0 && hasFilters && (
        <div className="history-empty">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <h3>No history entries match</h3>
          <p className="text-secondary">Try a different search term, or clear the filters to see the full trail.</p>
          <button className="btn btn-outline" onClick={clear}>Clear filters</button>
        </div>
      )}

      {state.status === 'ready' && rows.length === 0 && !hasFilters && (
        <div className="history-empty">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
          <h3>No activity recorded yet</h3>
          <p className="text-secondary">Actions across Projects, Materials, BOQ, Measurements, Calculations, Roof Designs and Reports will appear here as they happen.</p>
        </div>
      )}
    </div>
  )
}
