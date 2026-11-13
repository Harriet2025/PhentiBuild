import { Fragment, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { findModule, MODULES, SETTINGS_MODULE, type ModuleDef } from '../../app/modules'
import { useAuth } from '../../auth/AuthContext'
import { userTitle } from '../../api/resources/auth'
import { Icon } from '../Icon'
import { Logo } from '../Logo'

/**
 * Port of frontend/pages/app.php + frontend/js/app-shell.js.
 * Same markup and class names (shell, shell-sidebar, sidebar-link,
 * is-active, is-open …), so components/app-shell.css and
 * components/navigation.css style it exactly as before.
 */
const DESKTOP_BREAKPOINT = 1024

const linkClass = (base: string) => ({ isActive }: { isActive: boolean }) => (isActive ? `${base} is-active` : base)

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<'notifications' | 'profile' | null>(null)

  const moduleId = location.pathname.split('/')[1] || 'dashboard'
  const current = findModule(moduleId)
  const label = current?.label ?? 'Dashboard'

  // Page title, same format as app-shell.js: "Projects · PhentiBuild"
  useEffect(() => {
    document.title = `${label} · PhentiBuild`
  }, [label])

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false)
    setOpenDropdown(null)
  }, [location.pathname])

  // Lock page scroll while the drawer is open (body.style.overflow in app-shell.js).
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  // Resize to desktop closes the drawer; Escape closes drawer + dropdowns;
  // any click outside closes dropdowns.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= DESKTOP_BREAKPOINT) setSidebarOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false)
        setOpenDropdown(null)
      }
    }
    const onDocClick = () => setOpenDropdown(null)
    window.addEventListener('resize', onResize)
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onDocClick)
    return () => {
      window.removeEventListener('resize', onResize)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onDocClick)
    }
  }, [])

  const toggleDropdown = (e: React.MouseEvent, which: 'notifications' | 'profile') => {
    e.stopPropagation()
    setOpenDropdown((open) => (open === which ? null : which))
  }

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    await logout()
    navigate('/login', { replace: true })
  }

  const groups = MODULES.reduce<Record<string, ModuleDef[]>>((acc, m) => {
    ;(acc[m.group] ||= []).push(m)
    return acc
  }, {})

  const initial = (user?.name ?? '?').charAt(0).toUpperCase()

  return (
    <div className="shell">
      <div className={`shell-overlay${sidebarOpen ? ' is-open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`shell-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="shell-sidebar-header">
          <div className="shell-brand">
            <Logo className="brand-logo" size={48} />
            <span>PhentiBuild</span>
          </div>
          <button className="shell-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            &times;
          </button>
        </div>

        <nav className="shell-nav">
          {Object.entries(groups).map(([groupName, items]) => (
            <Fragment key={groupName}>
              <span className="sidebar-section-label">{groupName}</span>
              {items.map((m) => (
                <NavLink key={m.id} to={`/${m.id}`} className={linkClass('sidebar-link')}>
                  <span className="icon"><Icon name={m.icon} /></span>
                  {m.label}
                </NavLink>
              ))}
            </Fragment>
          ))}
        </nav>

        <div className="shell-sidebar-footer">
          <NavLink to={`/${SETTINGS_MODULE.id}`} className={linkClass('sidebar-link')}>
            <span className="icon"><Icon name={SETTINGS_MODULE.icon} /></span>
            {SETTINGS_MODULE.label}
          </NavLink>
        </div>
      </aside>

      <div className="shell-content">
        <header className="topbar shell-topbar">
          <div className="shell-topbar-left">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen((o) => !o)} aria-label="Open navigation">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 className="shell-page-title hide-mobile">{label}</h1>
          </div>

          <div className="shell-mode-switch" role="group" aria-label="Data capture mode">
            <NavLink to="/scanner" className={linkClass('shell-mode-btn')}>
              <Icon name="scanner" />
              <span className="shell-mode-btn-label">Camera Scanner</span>
            </NavLink>
            <NavLink to="/manual-input" className={linkClass('shell-mode-btn')}>
              <Icon name="edit" />
              <span className="shell-mode-btn-label">Manual Input</span>
            </NavLink>
          </div>

          {/* Same as the PHP app: the search box is present but not wired up yet. */}
          <div className="shell-topbar-search hide-mobile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="search" placeholder="Search projects, materials, BOQ items…" />
          </div>

          <div className="shell-topbar-actions">
            <div className="shell-dropdown">
              <button className="shell-icon-btn" onClick={(e) => toggleDropdown(e, 'notifications')} aria-label="Notifications">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
                  <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" /><path d="M10 19a2 2 0 0 0 4 0" />
                </svg>
              </button>
              <div className={`shell-dropdown-panel${openDropdown === 'notifications' ? ' is-open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="shell-dropdown-header">Notifications</div>
                <div className="shell-dropdown-empty">You're all caught up. Notifications will appear here once available.</div>
              </div>
            </div>

            <div className="shell-dropdown">
              <button className="shell-icon-btn shell-user-btn" onClick={(e) => toggleDropdown(e, 'profile')}>
                <span className="shell-avatar">{initial}</span>
                <span className="shell-user-meta hide-mobile">
                  <span className="shell-user-name">{user?.name}</span>
                  <span className="shell-user-role">{userTitle(user)}</span>
                </span>
              </button>
              <div className={`shell-dropdown-panel${openDropdown === 'profile' ? ' is-open' : ''}`}>
                <div className="shell-dropdown-header">Account</div>
                <Link className="shell-dropdown-item" to="/settings">Profile Settings</Link>
                <a className="shell-dropdown-item" href="#" onClick={handleLogout}>Log Out</a>
              </div>
            </div>
          </div>
        </header>

        <main className="shell-main">
          <section className="module-panel">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  )
}
