import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, PROFESSIONS } from '../../api/resources/auth'
import { useAuth } from '../../auth/AuthContext'
import { Modal } from '../../components/Modal'
import { BACKEND } from '../../config/env'
import { FieldError } from './AuthHero'
import '../../styles/react/google-signin.css'

/**
 * "Sign up with Google" / "Continue with Google".
 *
 * Uses Google's own button (Google Identity Services script). Google gives
 * the browser a signed ID token; we send it to OUR server, which checks it
 * with Google before trusting the email in it (server/apps/accounts/google.py).
 * We never see or store a Google password.
 *
 * Nothing is shown unless the server has a Google Client ID configured.
 * First-time Google users answer two questions the app needs (phone and
 * profession), then land on the dashboard.
 */
type GoogleId = {
  initialize: (config: Record<string, unknown>) => void
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
  cancel: () => void
}
declare global {
  interface Window { google?: { accounts: { id: GoogleId } } }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
let scriptPromise: Promise<void> | null = null

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => { scriptPromise = null; reject(new Error('Google sign-in could not be loaded.')) }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

type Pending = { credential: string; name: string; email: string }

// Google's script must be initialised ONCE per page; each mounted button
// just points this at its own handler.
type CredentialHandler = (response: { credential?: string }) => void
let activeHandler: CredentialHandler | null = null
let initializedFor: string | null = null

export function GoogleSignIn({ mode, remember = false }: { mode: 'signup' | 'signin'; remember?: boolean }) {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const buttonRef = useRef<HTMLDivElement>(null)
  const rememberRef = useRef(remember)
  const [clientId, setClientId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)

  useEffect(() => { rememberRef.current = remember }, [remember])

  // 1. Ask the server whether Google sign-in is switched on.
  useEffect(() => {
    if (BACKEND !== 'django') return
    let alive = true
    void authApi.providers().then((r) => { if (alive && r.ok && r.data.google) setClientId(r.data.google.clientId) })
    return () => { alive = false }
  }, [])

  // 2. Load Google's script and draw its button.
  useEffect(() => {
    if (!clientId) return
    let alive = true

    async function onCredential(response: { credential?: string }) {
      if (!response.credential) return setError('Google sign-in was cancelled.')
      setError(null)
      setBusy(true)
      const r = await authApi.google({ credential: response.credential, remember: rememberRef.current })
      setBusy(false)
      if (!r.ok) return setError(r.error)
      if (r.data.status === 'signed_in') {
        setUser(r.data.user)
        navigate('/dashboard', { replace: true })
      } else {
        setPending({ credential: response.credential, name: r.data.name, email: r.data.email })
      }
    }

    // Google draws its button at a fixed pixel width, so it is redrawn
    // whenever the space it sits in changes (phone rotated, window resized,
    // DevTools device mode) — otherwise it spills over the form's edge.
    // The OUTER wrapper is measured: its width comes from the form, never
    // from the button itself.
    let renderedWidth = 0
    let resizeTimer: number | undefined
    const outer = buttonRef.current?.parentElement ?? null
    const draw = () => {
      const id = window.google?.accounts.id
      const el = buttonRef.current
      if (!alive || !id || !el || !outer) return
      const width = Math.round(Math.min(400, Math.max(200, outer.clientWidth || 320)))
      if (Math.abs(width - renderedWidth) < 8) return
      renderedWidth = width
      id.renderButton(el, {
        type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular', logo_alignment: 'center',
        text: mode === 'signup' ? 'signup_with' : 'continue_with', width,
      })
    }
    const observer = typeof ResizeObserver !== 'undefined' && outer
      ? new ResizeObserver(() => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(draw, 150) })
      : null

    loadGoogleScript().then(() => {
      const id = window.google?.accounts.id
      if (!alive || !id) return
      activeHandler = onCredential
      if (initializedFor !== clientId) {
        id.initialize({ client_id: clientId, callback: (r: { credential?: string }) => activeHandler?.(r), ux_mode: 'popup' })
        initializedFor = clientId
      }
      draw()
      if (observer && outer) observer.observe(outer)
    }).catch(() => { if (alive) setError('Google sign-in could not be loaded. Check your connection, or use your email instead.') })

    return () => {
      alive = false
      observer?.disconnect()
      window.clearTimeout(resizeTimer)
      if (activeHandler === onCredential) activeHandler = null
      window.google?.accounts.id.cancel()
    }
  }, [clientId, mode, navigate, setUser])

  if (!clientId) return null

  return (
    <div className="google-signin">
      <div className="google-signin-divider"><span>or</span></div>
      <div ref={buttonRef} className="google-signin-button" aria-busy={busy} />
      {busy && <p className="text-sm text-muted google-signin-status">Signing you in…</p>}
      {error && <p className="form-error google-signin-status" role="alert">{error}</p>}
      <CompleteGoogleSignUp pending={pending} remember={remember} onClose={() => setPending(null)} />
    </div>
  )
}

/** First Google sign-in: the two things Google doesn't tell us. */
function CompleteGoogleSignUp({ pending, remember, onClose }: { pending: Pending | null; remember: boolean; onClose: () => void }) {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [profession, setProfession] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [summary, setSummary] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!pending || submitting) return
    const next: Record<string, string> = {}
    if (!phone.trim()) next.phone = 'Phone is required.'
    else if (!/^\+?\d{7,15}$/.test(phone.replace(/[\s\-().]/g, ''))) next.phone = 'Enter a valid phone number (7–15 digits).'
    if (!profession) next.profession = 'Select your profession.'
    if (!acceptTerms) next.acceptTerms = 'You must agree to the Terms & Conditions and Privacy Policy.'
    setErrors(next)
    setSummary(null)
    if (Object.keys(next).length) return

    setSubmitting(true)
    const r = await authApi.google({ credential: pending.credential, remember, phone: phone.trim(), profession })
    setSubmitting(false)
    if (!r.ok) {
      if (r.errors) setErrors(r.errors)
      // A Google token only lives about an hour; after that, start again.
      setSummary(r.status === 401 ? 'Your Google sign-in expired. Close this and choose “Sign up with Google” again.' : r.error)
      return
    }
    if (r.data.status === 'signed_in') {
      setUser(r.data.user)
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <Modal open={pending !== null} onClose={onClose} locked={submitting} titleId="googleCompleteTitle" title="Finish creating your account">
      <form noValidate onSubmit={submit}>
        <div className="modal-body">
          {summary && (
            <div className="alert alert-danger">
              <span className="alert-icon">!</span>
              <div className="alert-body"><span className="alert-title">Couldn’t create your account</span><span>{summary}</span></div>
            </div>
          )}
          <p className="text-secondary">
            Signing up as <strong>{pending?.name}</strong> ({pending?.email}) with Google. Two more details and you’re in.
          </p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="gs-phone">Phone Number <span className="required">*</span></label>
              <input type="text" id="gs-phone" className={`form-control${errors.phone ? ' is-invalid' : ''}`} placeholder="e.g. 024 123 4567"
                autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <FieldError message={errors.phone} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gs-profession">I am a… <span className="required">*</span></label>
              <select id="gs-profession" className={`form-control${errors.profession ? ' is-invalid' : ''}`} value={profession} onChange={(e) => setProfession(e.target.value)}>
                <option value="" disabled>Select your profession</option>
                {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <FieldError message={errors.profession} />
            </div>
          </div>
          <div className="form-check auth-terms-check">
            <input type="checkbox" id="gs-terms" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
            <label htmlFor="gs-terms">I agree to the Terms &amp; Conditions and Privacy Policy</label>
          </div>
          <FieldError message={errors.acceptTerms} />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline-secondary" disabled={submitting} onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating account…' : 'Create Account'}</button>
        </div>
      </form>
    </Modal>
  )
}
