import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Logo } from '../components/Logo'
import '../styles/site/site.css'
import { Glyph } from './drawing'
import { FOOTER_SHEETS, NAV, prettyPhone, SITE, telLink, waLink } from './siteConfig'

/**
 * The public website frame: header + footer around every marketing page.
 * Deliberately a different layout from the app (no sidebar) but the same
 * colours, font and logo, so the two feel related.
 */
export function SiteLayout() {
  const { status } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const signedIn = status === 'authenticated'

  // New page: close the mobile menu and start at the top (or at #anchor).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock page scroll behind the open mobile menu.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const actions = signedIn ? (
    <Link to="/dashboard" className="btn btn-primary ps-nav-cta">Open Dashboard</Link>
  ) : (
    <>
      <Link to="/login" className="ps-nav-login">Log in</Link>
      <Link to="/register" className="btn btn-primary ps-nav-cta">Get Started</Link>
    </>
  )

  return (
    <div className="ps-site">
      <a href="#ps-main" className="ps-skip">Skip to content</a>
      <header className={`ps-header${scrolled ? ' is-scrolled' : ''}${menuOpen ? ' is-open' : ''}`}>
        <div className="ps-container ps-header-inner">
          <Link to="/" className="ps-brand" aria-label="PhentiBuild home">
            <Logo size={34} />
            <span>Phenti<b>Build</b></span>
          </Link>
          <nav className="ps-nav" aria-label="Main">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `ps-nav-link${isActive ? ' is-active' : ''}`}>{n.label}</NavLink>)}
          </nav>
          <div className="ps-nav-actions">{actions}</div>
          <button type="button" className="ps-burger" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            <span /><span /><span />
          </button>
        </div>
        <div className="ps-mobile" hidden={!menuOpen}>
          <nav aria-label="Main (mobile)">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `ps-mobile-link${isActive ? ' is-active' : ''}`}>{n.label}</NavLink>)}
            <NavLink to="/how-it-works" className="ps-mobile-link">How it works</NavLink>
            <NavLink to="/faq" className="ps-mobile-link">FAQ</NavLink>
          </nav>
          <div className="ps-mobile-actions">{actions}</div>
        </div>
      </header>

      <main id="ps-main" className="ps-main"><Outlet /></main>

      <footer className="ps-footer">
        <div className="ps-container">
          <div className="ps-titleblock">
            <div className="ps-tb-cell ps-tb-brand">
              <Link to="/" className="ps-brand ps-brand--light"><Logo size={38} /><span>Phenti<b>Build</b></span></Link>
              <p>{SITE.tagline} Construction measuring, estimating and planning in one connected platform.</p>
            </div>
            {FOOTER_SHEETS.map((g) => (
              <div key={g.group} className="ps-tb-cell">
                <p className="ps-tb-label">{g.group}</p>
                <ul>{g.links.map((l) => <li key={l.to}><Link to={l.to}>{l.label}</Link></li>)}</ul>
              </div>
            ))}
            <div className="ps-tb-cell">
              <p className="ps-tb-label">Contact</p>
              <ul>
                <li><a href={`mailto:${SITE.email}`}><Glyph name="mail" />{SITE.email}</a></li>
                <li><a href={waLink(SITE.whatsapp)} target="_blank" rel="noopener noreferrer"><Glyph name="chat" />WhatsApp {prettyPhone(SITE.whatsapp)}</a></li>
                <li><a href={telLink(SITE.phoneAlt)}><Glyph name="phone" />{prettyPhone(SITE.phoneAlt)}</a></li>
              </ul>
            </div>
          </div>
          <div className="ps-tb-strip">
            <span><b>PROJECT</b> PhentiBuild Platform</span>
            <span><b>SHEET</b> {sheetFor(location.pathname)}</span>
            <span><b>SCALE</b> 1 : 1</span>
            <span><b>©</b> {YEAR} PhentiBuild. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

const YEAR = new Date().getFullYear()

const SHEETS: Record<string, string> = {
  '/': 'A-00 Home', '/features': 'A-01 Features', '/how-it-works': 'A-02 How it works', '/solutions': 'A-03 Solutions',
  '/about': 'A-04 About', '/pricing': 'A-05 Pricing', '/faq': 'A-06 FAQ', '/contact': 'A-07 Contact',
}
function sheetFor(path: string) {
  return SHEETS[path] ?? (path.startsWith('/legal') ? 'L-01 Legal' : 'A-00')
}
