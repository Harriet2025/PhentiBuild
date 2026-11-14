import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, PROFESSIONS } from '../../api/resources/auth'
import { useAuth } from '../../auth/AuthContext'
import { BACKEND } from '../../config/env'
import { GoogleSignIn } from './GoogleSignIn'
import { AuthHero, FieldError, FormSummary } from './AuthHero'

/**
 * Port of frontend/pages/register.php + the register half of auth.js.
 * Client-side rules mirror the server's (backend/api/auth/register.php);
 * the server stays the authority and its errors map onto the same fields.
 */
type Values = {
  name: string; email: string; phone: string; profession: string
  password: string; confirmPassword: string; acceptTerms: boolean
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

function validate(v: Values): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!v.name) errors.name = 'Name is required.'
  else if (v.name.length < 2) errors.name = 'Name must be at least 2 characters.'

  if (!v.email) errors.email = 'Email is required.'
  else if (!EMAIL_PATTERN.test(v.email)) errors.email = 'Enter a valid email address.'

  if (!v.phone) errors.phone = 'Phone is required.'
  else if (!/^\+?\d{7,15}$/.test(v.phone.replace(/[\s\-().]/g, ''))) errors.phone = 'Enter a valid phone number (7–15 digits).'

  if (!v.profession) errors.profession = 'Select your profession.'

  if (!v.password) errors.password = 'Password is required.'
  else if (v.password.length < 8) errors.password = 'Password must be at least 8 characters.'

  if (!v.confirmPassword) errors.confirmPassword = 'Confirm your password.'
  else if (v.confirmPassword !== v.password) errors.confirmPassword = 'Passwords do not match.'

  if (!v.acceptTerms) errors.acceptTerms = 'You must agree to the Terms & Conditions and Privacy Policy.'
  return errors
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [values, setValues] = useState<Values>({
    name: '', email: '', phone: '', profession: '', password: '', confirmPassword: '', acceptTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [summary, setSummary] = useState<{ title: string; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Create Account · PhentiBuild'
  }, [])

  const set = <K extends keyof Values>(key: K) => (value: Values[K]) => setValues((v) => ({ ...v, [key]: value }))
  const cls = (field: string) => `form-control${errors[field] ? ' is-invalid' : ''}`

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSummary(null)

    const trimmed = { ...values, name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() }
    const nextErrors = validate(trimmed)
    setErrors(nextErrors)
    const count = Object.keys(nextErrors).length
    if (count) {
      setSummary({ title: 'Please check the form', text: `There ${count === 1 ? 'is 1 field' : `are ${count} fields`} that need your attention.` })
      return
    }

    setSubmitting(true)
    const result = await authApi.register({
      name: trimmed.name, email: trimmed.email, phone: trimmed.phone, profession: trimmed.profession, password: trimmed.password,
    })
    setSubmitting(false)

    if (!result.ok) {
      if (result.errors) setErrors(result.errors)
      setSummary({ title: result.network ? 'Couldn’t reach the server' : 'Please check the form', text: result.error })
      return
    }
    // The Django API signs the new account in straight away -> dashboard.
    // (The classic PHP API doesn't, so it still goes to the login page.)
    if (BACKEND === 'django') {
      setUser(result.data)
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/login?registered=1', { replace: true })
    }
  }

  return (
    <div className="auth-page auth-page--fullscreen">
      <div className="auth-page-inner">
        <div className="auth-card auth-card--login">
          <AuthHero eyebrow="Join" lead="Create your account to start estimating, managing projects and building smarter." />

          <div className="auth-form-pane">
          <div className="auth-form-float auth-form-float--wide">
          <div className="auth-form-heading">
            <h1><span className="accent">Create</span> your account</h1>
            <p>Join PhentiBuild and start building smarter.</p>
          </div>

          <FormSummary summary={summary} />

          <form noValidate onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="rf-name">Full Name <span className="required">*</span></label>
                <input type="text" id="rf-name" className={cls('name')} placeholder="e.g. Patrick Nkansah" autoComplete="name"
                  value={values.name} onChange={(e) => set('name')(e.target.value)} />
                <FieldError message={errors.name} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="rf-email">Email Address <span className="required">*</span></label>
                <input type="text" id="rf-email" className={cls('email')} placeholder="you@company.com" autoComplete="email"
                  value={values.email} onChange={(e) => set('email')(e.target.value)} />
                <FieldError message={errors.email} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="rf-phone">Phone Number <span className="required">*</span></label>
                <input type="text" id="rf-phone" className={cls('phone')} placeholder="e.g. 024 123 4567" autoComplete="tel"
                  value={values.phone} onChange={(e) => set('phone')(e.target.value)} />
                <FieldError message={errors.phone} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="rf-profession">I am a… <span className="required">*</span></label>
                <select id="rf-profession" className={cls('profession')} value={values.profession} onChange={(e) => set('profession')(e.target.value)}>
                  <option value="" disabled>Select your profession</option>
                  {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <FieldError message={errors.profession} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="rf-password">Password <span className="required">*</span></label>
                <input type="password" id="rf-password" className={cls('password')} placeholder="At least 8 characters" autoComplete="new-password"
                  value={values.password} onChange={(e) => set('password')(e.target.value)} />
                <FieldError message={errors.password} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="rf-confirm">Confirm Password <span className="required">*</span></label>
                <input type="password" id="rf-confirm" className={cls('confirmPassword')} placeholder="Re-enter your password" autoComplete="new-password"
                  value={values.confirmPassword} onChange={(e) => set('confirmPassword')(e.target.value)} />
                <FieldError message={errors.confirmPassword} />
              </div>
            </div>

            <div className="form-check auth-terms-check">
              <input type="checkbox" id="rf-terms" checked={values.acceptTerms} onChange={(e) => set('acceptTerms')(e.target.checked)} />
              <label htmlFor="rf-terms">I agree to the <a href="#">Terms &amp; Conditions</a> and <a href="#">Privacy Policy</a></label>
            </div>
            <FieldError message={errors.acceptTerms} />

            <button type="submit" className="btn btn-primary w-full" disabled={submitting} style={{ marginTop: 'var(--phb-space-5)' }}>
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <GoogleSignIn mode="signup" />

          <p className="auth-footer-note">Already have an account? <Link to="/login">Log in</Link></p>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
