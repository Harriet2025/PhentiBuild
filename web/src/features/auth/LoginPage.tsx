import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api/resources/auth'
import { useAuth } from '../../auth/AuthContext'
import { AuthHero, FieldError, FormSummary } from './AuthHero'

/**
 * Port of frontend/pages/login.php + the login half of js/modules/auth.js.
 * The password lives only in the input's own state and goes straight into
 * the request body; the server sets an HttpOnly session cookie that
 * JavaScript can never read.
 */
export function LoginPage() {
  const { setUser, refresh } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [summary, setSummary] = useState<{ title: string; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Log In · PhentiBuild'
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSummary(null)

    const nextErrors: Record<string, string> = {}
    if (!email.trim()) nextErrors.email = 'Email is required.'
    if (!password) nextErrors.password = 'Password is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    const result = await authApi.login(email.trim(), password, remember)
    setSubmitting(false)

    if (!result.ok) {
      if (result.errors) setErrors(result.errors)
      setSummary({ title: result.network ? 'Couldn’t reach the server' : 'Couldn’t log you in', text: result.error })
      return
    }

    setUser(result.data)
    await refresh() // pick up the full profile from auth/me.php
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="auth-page auth-page--fullscreen">
      <div className="auth-page-inner">
        <div className="auth-card auth-card--login">
          <AuthHero eyebrow="Welcome back to" />

          <div className="auth-form-pane">
            <div className="auth-form-float">
              <div className="auth-form-heading">
                <h1>Log in to your account</h1>
                <p>Enter your credentials to continue.</p>
              </div>

              {params.has('registered') && (
                <div className="alert alert-success">
                  <span className="alert-icon">&#10003;</span>
                  <div className="alert-body">
                    <span className="alert-title">Account created</span>
                    <span>Log in with your new account to continue.</span>
                  </div>
                </div>
              )}

              <FormSummary summary={summary} />

              <form noValidate onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="lf-email">Email <span className="required">*</span></label>
                  <input
                    type="text" id="lf-email" name="email" autoComplete="username" placeholder="you@company.com"
                    className={`form-control${errors.email ? ' is-invalid' : ''}`}
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                  <FieldError message={errors.email} />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="lf-password">Password <span className="required">*</span></label>
                  <input
                    type="password" id="lf-password" name="password" autoComplete="current-password" placeholder="••••••••"
                    className={`form-control${errors.password ? ' is-invalid' : ''}`}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <FieldError message={errors.password} />
                </div>

                <div className="auth-form-options">
                  <div className="form-check">
                    <input type="checkbox" id="lf-remember" name="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    <label htmlFor="lf-remember">Remember me</label>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                  {submitting ? 'Logging in…' : 'Log In'}
                </button>
              </form>

              <p className="auth-footer-note">Don’t have an account? <Link to="/register">Create one</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
