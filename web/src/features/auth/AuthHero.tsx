import type { ReactNode } from 'react'
import { Logo } from '../../components/Logo'

/** Port of backend/components/auth-hero.php — the branded side panel. */
const EstimateIcon = ({ full = true }: { full?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 16 16 4l4 4L8 20H4v-4z" /><path d="M13 7l4 4" />
    {full && (<><path d="M9 11l1.5 1.5" /><path d="M6.5 13.5 8 15" /></>)}
  </svg>
)
const ProjectIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3h6v3H9z" /><path d="M8 12.5 10.5 15 16 9.5" />
  </svg>
)
const ReportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="20" x2="20" y2="20" /><rect x="6" y="12" width="3.2" height="8" />
    <rect x="11" y="7" width="3.2" height="13" /><rect x="16" y="3" width="3.2" height="17" />
  </svg>
)

export function AuthHero({
  eyebrow = 'Welcome to',
  title = <>Phenti<span className="accent">Build</span></>,
  lead = 'Your all-in-one construction estimation & management platform.',
}: { eyebrow?: string; title?: ReactNode; lead?: string }) {
  return (
    <aside className="auth-hero-pane">
      <div className="auth-hero-overlay" />
      <div className="auth-hero-content">
        <div className="auth-hero-brand">
          <Logo className="auth-hero-logo" size={40} />
          <span>PhentiBuild</span>
        </div>

        <p className="auth-hero-eyebrow">{eyebrow}</p>
        <h1 className="auth-hero-title">{title}</h1>
        <p className="auth-hero-lead">{lead}</p>

        <ul className="auth-feature-list">
          <li>
            <span className="auth-feature-icon"><EstimateIcon /></span>
            <span className="auth-feature-text">
              <strong>Smart Estimation</strong>
              Accurate calculations for materials, labor &amp; costs.
            </span>
          </li>
          <li>
            <span className="auth-feature-icon"><ProjectIcon /></span>
            <span className="auth-feature-text">
              <strong>Project Management</strong>
              Organize, track and manage all your construction projects.
            </span>
          </li>
          <li>
            <span className="auth-feature-icon"><ReportIcon /></span>
            <span className="auth-feature-text">
              <strong>Real-Time Reports</strong>
              Get real-time insights &amp; professional reports.
            </span>
          </li>
        </ul>

        <div className="auth-feature-row" aria-hidden="true">
          <span className="auth-feature-icon"><EstimateIcon full={false} /></span>
          <span className="auth-feature-icon"><ProjectIcon /></span>
          <span className="auth-feature-icon"><ReportIcon /></span>
        </div>
      </div>
    </aside>
  )
}

/** The red summary alert at the top of each auth form. */
export function FormSummary({ summary }: { summary: { title: string; text: string } | null }) {
  if (!summary) return null
  return (
    <div className="alert alert-danger">
      <span className="alert-icon">!</span>
      <div className="alert-body">
        <span className="alert-title">{summary.title}</span>
        <span>{summary.text}</span>
      </div>
    </div>
  )
}

/** A per-field error message (span.form-error), hidden when empty. */
export function FieldError({ message }: { message?: string }) {
  return message ? <span className="form-error">{message}</span> : null
}
