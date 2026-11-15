import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

/** Unknown address: say so, and offer the two useful ways forward. */
export function NotFoundPage() {
  const { status } = useAuth()
  useEffect(() => { document.title = 'Page not found — PhentiBuild' }, [])
  return (
    <section className="ps-pagehero ps-grid-dark ps-404">
      <div className="ps-container">
        <p className="ps-sheet-tag ps-sheet-tag--light" style={{ justifyContent: 'center' }}><span className="ps-sheet-no">404</span><span className="ps-sheet-rule" /><span>Sheet missing</span></p>
        <h1 className="ps-pagehero-title">This sheet isn’t in the drawing set.</h1>
        <p className="ps-pagehero-lead">The page you asked for doesn’t exist or has moved.</p>
        <p style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
          <Link to="/" className="btn btn-primary btn-lg">Go to the home page</Link>
          {status === 'authenticated' && <Link to="/dashboard" className="btn ps-btn-ghost btn-lg">Open your dashboard</Link>}
        </p>
      </div>
    </section>
  )
}
