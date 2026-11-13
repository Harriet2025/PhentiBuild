import { Link, Navigate, useParams } from 'react-router-dom'
import { ActiveProjectPicker } from '../../components/ProjectPicker'
import { CalculatorForm } from './CalculatorForm'
import { CALCULATORS } from './config'

/** Port of the calculators module: #/calculators (chooser) and #/calculators/<type> (a form). */
export function CalculatorsPage() {
  const { type } = useParams()
  const def = type ? CALCULATORS.find((c) => c.id === type) : undefined

  if (type && !def) return <Navigate to="/calculators" replace />

  if (!def) {
    return (
      <div className="calculators-module">
        <div className="module-header">
          <div>
            <span className="eyebrow">Tools</span>
            <h1>Calculators</h1>
            <p className="text-secondary">Block, cement, sand, aggregate, concrete, rebar and timber calculators.</p>
          </div>
        </div>
        <div className="mi-chooser-grid">
          {CALCULATORS.map((c) => (
            <Link key={c.id} to={`/calculators/${c.id}`} className="mi-type-card">
              <span className="mi-type-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                  dangerouslySetInnerHTML={{ __html: c.icon }} />
              </span>
              <span className="mi-type-body">
                <span className="mi-type-title">{c.label}</span>
                <span className="mi-type-desc">{c.desc}</span>
                <span className="mi-type-meta">{c.fields.length} inputs</span>
              </span>
              <svg className="mi-type-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 5 16 12 9 19" /></svg>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="calculators-module">
      <div className="mi-form-view">
        <nav className="breadcrumb">
          <Link to="/calculators">Calculators</Link>
          <span className="separator">/</span>
          <span className="is-current">{def.label}</span>
        </nav>
        <div className="module-header">
          <div>
            <span className="eyebrow">Calculator</span>
            <h1>{def.label}</h1>
            <p className="text-secondary">{def.desc}</p>
          </div>
          <div className="module-header-actions">
            <ActiveProjectPicker />
            <Link to="/calculators" className="btn btn-outline-secondary btn-sm">Change calculator</Link>
          </div>
        </div>
        {/* key resets the form when switching calculators */}
        <CalculatorForm key={def.id} section={{ id: def.id, label: def.label, desc: def.desc, fields: def.fields, calc: def }} mode="calculator" />
      </div>
    </div>
  )
}
