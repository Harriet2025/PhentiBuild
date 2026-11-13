import { Navigate, useLocation } from 'react-router-dom'
import { findModule } from '../app/modules'
import { CLASSIC_APP_URL } from '../config/env'
import { Icon } from '../components/Icon'

/**
 * Shown for modules that have not been converted to React YET.
 * It does not pretend the module works here — it says so plainly and
 * links to the fully working PHP version (same login session), using the
 * same .module-placeholder design app.php uses.
 */
export function NotYetMigratedPage() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  const module = findModule(segments[0])
  // Unknown module id → dashboard, same fallback as app-shell.js.
  if (!module) return <Navigate to="/dashboard" replace />


  const classicHash = segments.join('/')

  return (
    <>
      <span className="eyebrow">{module.group}</span>
      <h1>{module.label}</h1>
      <p className="text-secondary">{module.desc}</p>
      <div className="module-placeholder">
        <span className="placeholder-icon"><Icon name="wrench" /></span>
        <h3>{module.label} is still being migrated to the new interface</h3>
        {CLASSIC_APP_URL ? (
          <p>
            This module works fully in the classic PhentiBuild app while it is converted.{' '}
            <a href={`${CLASSIC_APP_URL}#${classicHash}`}>Open {module.label} in the classic app</a>.
          </p>
        ) : (
          <p>This module will be available here in an upcoming release.</p>
        )}
      </div>
    </>
  )
}
