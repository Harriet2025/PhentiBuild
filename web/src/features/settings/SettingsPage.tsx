import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { accountApi } from '../../api/resources/account'
import { isAdmin, PROFESSIONS } from '../../api/resources/auth'
import type { ApiResult } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/Toast'
import { getContingencyPercent, getUnitSystem, setContingencyPercent, setUnitSystem, type UnitSystem } from '../../lib/preferences'

/** Port of js/modules/settings.js + pages/modules/settings.php. */
type Tab = 'account' | 'company' | 'preferences'
type FormState = { errors: Record<string, string>; success: boolean; submitting: boolean }
const IDLE: FormState = { errors: {}, success: false, submitting: false }

function useServerForm() {
  const toast = useToast()
  const [state, setState] = useState<FormState>(IDLE)
  async function submit<T>(call: () => Promise<ApiResult<T>>, successToast: string): Promise<T | null> {
    setState({ errors: {}, success: false, submitting: true })
    const result = await call()
    if (!result.ok) {
      setState({ errors: result.errors || {}, success: false, submitting: false })
      if (!result.errors) toast(result.error, 'danger')
      return null
    }
    setState({ errors: {}, success: true, submitting: false })
    toast(successToast, 'success')
    return result.data
  }
  return { state, submit }
}

function Alerts({ state, successText }: { state: FormState; successText: string }) {
  const count = Object.keys(state.errors).length
  return (
    <>
      {count > 0 && (
        <div className="alert alert-danger">
          <span className="alert-icon">!</span>
          <div className="alert-body"><span>{count === 1 ? 'There is 1 entry that needs your attention.' : `There are ${count} entries that need your attention.`}</span></div>
        </div>
      )}
      {state.success && (
        <div className="alert alert-success">
          <span className="alert-icon">&#10003;</span>
          <div className="alert-body">{successText}</div>
        </div>
      )}
    </>
  )
}

function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label} {required && <span className="required">*</span>}</label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}

const cls = (error?: string) => `form-control${error ? ' is-invalid' : ''}`

function ProfileForm() {
  const { user, setUser } = useAuth()
  const { state, submit } = useServerForm()
  const [v, setV] = useState({ name: '', email: '', phone: '', profession: '' })
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) setV({ name: user.name, email: user.email, phone: user.phone, profession: user.profession ?? '' })
  }, [user])
  const admin = isAdmin(user)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const saved = await submit(() => accountApi.updateProfile({ name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), profession: v.profession }), 'Profile updated.')
    if (saved) setUser(saved) // topbar name/role/avatar update instantly
  }

  return (
    <form noValidate className="card settings-card" onSubmit={onSubmit}>
      <div className="card-header"><h4>Profile Information</h4></div>
      <div className="card-body">
        <Alerts state={state} successText="Profile updated." />
        <div className="form-row">
          <Field id="set-name" label="Full Name" required error={state.errors.name}>
            <input type="text" id="set-name" className={cls(state.errors.name)} autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <Field id="set-email" label="Email" required error={state.errors.email}>
            <input type="email" id="set-email" className={cls(state.errors.email)} autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
          </Field>
        </div>
        <div className="form-row">
          <Field id="set-phone" label="Phone" required error={state.errors.phone}>
            <input type="text" id="set-phone" className={cls(state.errors.phone)} autoComplete="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          </Field>
          <Field id="set-profession" label="Profession" required error={state.errors.profession}>
            <select id="set-profession" className={cls(state.errors.profession)} value={v.profession} onChange={(e) => setV({ ...v, profession: e.target.value })}>
              <option value="" disabled>Select your profession</option>
              {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field id="set-access" label="Access Level">
            <input type="text" id="set-access" className="form-control" value={admin ? 'Admin' : 'Member'} readOnly disabled />
            <span className="form-hint">
              {admin ? 'You are an administrator.' : 'Admin access can only be granted by the system administrator on the server.'}
            </span>
          </Field>
        </div>
      </div>
      <div className="card-footer">
        <button type="submit" className="btn btn-primary" disabled={state.submitting}>{state.submitting ? 'Saving…' : 'Save Changes'}</button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const { state, submit } = useServerForm()
  const { user, refresh } = useAuth()
  // Accounts created with Google have no password yet: they SET one (no "current password").
  const settingFirst = user?.hasPassword === false
  const empty = { currentPassword: '', newPassword: '', confirmNewPassword: '' }
  const [v, setV] = useState(empty)
  const doneText = settingFirst ? 'Password set. You can now also log in with your email and password.' : 'Password changed.'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = await submit(() => accountApi.changePassword(v), doneText)
    if (ok) {
      setV(empty)
      if (settingFirst) void refresh() // hasPassword is now true -> normal "change password" form
    }
  }

  return (
    <form noValidate className="card settings-card" onSubmit={onSubmit}>
      <div className="card-header"><h4>{settingFirst ? 'Set a Password' : 'Change Password'}</h4></div>
      <div className="card-body">
        <Alerts state={state} successText={doneText} />
        {settingFirst ? (
          <p className="text-secondary">You signed up with Google. Set a password if you also want to log in with your email and password.</p>
        ) : (
          <Field id="set-current-password" label="Current Password" required error={state.errors.currentPassword}>
            <input type="password" id="set-current-password" className={cls(state.errors.currentPassword)} autoComplete="current-password"
              value={v.currentPassword} onChange={(e) => setV({ ...v, currentPassword: e.target.value })} />
          </Field>
        )}
        <div className="form-row">
          <Field id="set-new-password" label="New Password" required error={state.errors.newPassword}>
            <input type="password" id="set-new-password" className={cls(state.errors.newPassword)} placeholder="At least 8 characters" autoComplete="new-password"
              value={v.newPassword} onChange={(e) => setV({ ...v, newPassword: e.target.value })} />
          </Field>
          <Field id="set-confirm-password" label="Confirm New Password" required error={state.errors.confirmNewPassword}>
            <input type="password" id="set-confirm-password" className={cls(state.errors.confirmNewPassword)} autoComplete="new-password"
              value={v.confirmNewPassword} onChange={(e) => setV({ ...v, confirmNewPassword: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="card-footer">
        <button type="submit" className="btn btn-primary" disabled={state.submitting}>{state.submitting ? 'Saving…' : settingFirst ? 'Set Password' : 'Change Password'}</button>
      </div>
    </form>
  )
}

function CompanyForm() {
  const { state, submit } = useServerForm()
  const [v, setV] = useState({ companyName: '', address: '', phone: '', email: '', registrationNumber: '' })
  useEffect(() => {
    accountApi.getCompany().then((r) => {
      if (r.ok) setV({ companyName: r.data.companyName, address: r.data.address, phone: r.data.phone, email: r.data.email, registrationNumber: r.data.registrationNumber })
    })
  }, [])
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val.trim()])) as typeof v
    await submit(() => accountApi.saveCompany(trimmed), 'Company profile updated.')
  }

  return (
    <form noValidate className="card settings-card" onSubmit={onSubmit}>
      <div className="card-header"><h4>Company Profile</h4></div>
      <div className="card-body">
        <p className="text-secondary text-sm settings-panel-intro">Identifies your business within PhentiBuild. Not yet included on exported reports or Excel workbooks.</p>
        <Alerts state={state} successText="Company profile updated." />
        <Field id="set-company-name" label="Company Name" error={state.errors.companyName}>
          <input type="text" id="set-company-name" className={cls(state.errors.companyName)} value={v.companyName} onChange={set('companyName')} />
        </Field>
        <Field id="set-company-address" label="Address" error={state.errors.address}>
          <input type="text" id="set-company-address" className={cls(state.errors.address)} value={v.address} onChange={set('address')} />
        </Field>
        <div className="form-row">
          <Field id="set-company-phone" label="Phone" error={state.errors.phone}>
            <input type="text" id="set-company-phone" className={cls(state.errors.phone)} value={v.phone} onChange={set('phone')} />
          </Field>
          <Field id="set-company-email" label="Email" error={state.errors.email}>
            <input type="email" id="set-company-email" className={cls(state.errors.email)} value={v.email} onChange={set('email')} />
          </Field>
        </div>
        <Field id="set-company-reg" label="Registration Number" error={state.errors.registrationNumber}>
          <input type="text" id="set-company-reg" className={cls(state.errors.registrationNumber)} value={v.registrationNumber} onChange={set('registrationNumber')} />
        </Field>
      </div>
      <div className="card-footer">
        <button type="submit" className="btn btn-primary" disabled={state.submitting}>{state.submitting ? 'Saving…' : 'Save Company Profile'}</button>
      </div>
    </form>
  )
}

function Preferences() {
  const toast = useToast()
  const [contingency, setContingency] = useState(String(getContingencyPercent()))
  const [units, setUnits] = useState<UnitSystem>(getUnitSystem())
  return (
    <>
      <div className="card settings-card">
        <div className="card-header"><h4>Bill of Quantities</h4></div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label" htmlFor="set-contingency">Default Contingency Percentage</label>
            <div className="measure-input settings-inline-input">
              <input type="text" id="set-contingency" className="form-control form-control-numeric" inputMode="decimal"
                value={contingency} onChange={(e) => setContingency(e.target.value)}
                onBlur={() => { setContingency(String(setContingencyPercent(contingency))); toast('Default contingency percentage saved.', 'success') }} />
              <span className="unit-static">%</span>
            </div>
            <span className="form-hint">Applied to the Bill of Quantities grand total. Saved on this device only — the same value BOQ's own contingency field already uses.</span>
          </div>
        </div>
      </div>
      <div className="card settings-card">
        <div className="card-header"><h4>Units of Measurement</h4></div>
        <div className="card-body">
          <div className="alert alert-warning">
            <span className="alert-icon">!</span>
            <div className="alert-body">
              <span className="alert-title">Not yet connected</span>
              <span>Manual Input and Calculators currently choose a sensible default unit per field regardless of this setting. Saving your preferred system here does not change their behaviour yet.</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="set-unit-system">Preferred Unit System</label>
            <select id="set-unit-system" className="form-control" value={units}
              onChange={(e) => { const next = e.target.value as UnitSystem; setUnits(next); setUnitSystem(next); toast('Preferred unit system saved.', 'success') }}>
              <option value="metric">Metric (m, mm, m², m³)</option>
              <option value="imperial">Imperial (ft, in)</option>
            </select>
            <span className="form-hint">Saved on this device only.</span>
          </div>
        </div>
      </div>
    </>
  )
}

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('account')
  const tabs: [Tab, string][] = [['account', 'Account'], ['company', 'Company Profile'], ['preferences', 'Preferences']]
  return (
    <div className="settings-module">
      <div className="module-header">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Settings</h1>
          <p className="text-secondary">Manage your account, company profile, units of measurement and preferences.</p>
        </div>
      </div>
      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id}
            className={`settings-tab${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'account' && <div className="settings-panel"><ProfileForm /><PasswordForm /></div>}
      {tab === 'company' && <div className="settings-panel"><CompanyForm /></div>}
      {tab === 'preferences' && <div className="settings-panel"><Preferences /></div>}
    </div>
  )
}
