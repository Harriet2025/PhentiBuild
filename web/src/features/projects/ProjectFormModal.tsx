import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PROJECT_TYPES, projectsApi, type Project, type ProjectInput } from '../../api/resources/projects'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'

/**
 * Port of js/modules/project-form.js + the form markup in projects.php.
 * Same client-side rules and messages; the server stays the authority and
 * its field errors land on the same inputs.
 */
type Field = 'name' | 'client' | 'contact' | 'location' | 'type' | 'startDate' | 'endDate' | 'description'
type Values = Record<Field, string>

const FIELD_ORDER: Field[] = ['name', 'client', 'contact', 'location', 'type', 'startDate', 'endDate', 'description']
const MAX_DESCRIPTION = 1000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
const EMPTY: Values = { name: '', client: '', contact: '', location: '', type: '', startDate: '', endDate: '', description: '' }

const RULES: Record<Field, (v: string, all: Values) => string> = {
  name: (v) => (!v ? 'Project name is required.' : v.length < 3 ? 'Project name must be at least 3 characters.' : ''),
  client: (v) => (!v ? 'Client name is required.' : v.length < 2 ? 'Client name must be at least 2 characters.' : ''),
  contact: (v) => {
    if (!v) return 'A client phone number or email address is required.'
    if (v.includes('@')) return EMAIL_PATTERN.test(v) ? '' : 'Enter a valid email address, e.g. name@company.com'
    return /^\+?\d{7,15}$/.test(v.replace(/[\s\-().]/g, '')) ? '' : 'Enter a valid phone number (7–15 digits) or an email address.'
  },
  location: (v) => (!v ? 'Project location is required.' : ''),
  type: (v) => (!v ? 'Select a project type.' : ''),
  startDate: (v) => (!v ? 'Start date is required.' : isNaN(Date.parse(v)) ? 'Enter a valid start date.' : ''),
  endDate: (v, all) => {
    if (!v) return 'Expected completion date is required.'
    if (isNaN(Date.parse(v))) return 'Enter a valid completion date.'
    if (all.startDate && Date.parse(v) < Date.parse(all.startDate)) return 'Completion date cannot be before the start date.'
    return ''
  },
  description: (v) => (v.length > MAX_DESCRIPTION ? `Description must be ${MAX_DESCRIPTION} characters or fewer.` : ''),
}

function trimmed(values: Values): Values {
  return Object.fromEntries(FIELD_ORDER.map((f) => [f, values[f].trim()])) as Values
}

function validateAll(values: Values): Partial<Record<Field, string>> {
  const v = trimmed(values)
  const errors: Partial<Record<Field, string>> = {}
  FIELD_ORDER.forEach((f) => {
    const message = RULES[f](v[f], v)
    if (message) errors[f] = message
  })
  return errors
}

export function ProjectFormModal({
  open, editing, onClose, onSaved,
}: {
  open: boolean
  editing: Project | null
  onClose: () => void
  onSaved: (project: Project) => void
}) {
  const toast = useToast()
  const [values, setValues] = useState<Values>(EMPTY)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({})
  const [summary, setSummary] = useState<{ title: string; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // Reset (or fill for editing) every time the dialog opens.
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(editing ? {
      name: editing.name, client: editing.client, contact: editing.contact, location: editing.location,
      type: editing.type, startDate: editing.startDate, endDate: editing.endDate, description: editing.description,
    } : EMPTY)
    setTouched({})
    setSubmitAttempted(false)
    setServerErrors({})
    setSummary(null)
    window.setTimeout(() => nameRef.current?.focus(), 50)
  }, [open, editing])

  const clientErrors = validateAll(values)
  const errorFor = (f: Field) => serverErrors[f] || ((submitAttempted || touched[f]) ? clientErrors[f] : undefined)

  const update = (f: Field) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [f]: e.target.value }))
    setServerErrors((s) => ({ ...s, [f]: undefined }))
  }
  const touch = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }))
  const inputProps = (f: Field) => ({
    id: `pf-${f === 'startDate' ? 'start' : f === 'endDate' ? 'end' : f}`,
    name: f,
    className: `form-control${errorFor(f) ? ' is-invalid' : ''}`,
    'aria-invalid': errorFor(f) ? true : undefined,
    value: values[f],
    onChange: update(f),
    onBlur: touch(f),
  })
  const fieldError = (f: Field) => (errorFor(f) ? <span className="form-error">{errorFor(f)}</span> : null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitAttempted(true)
    const errorFields = Object.keys(clientErrors)
    if (errorFields.length) {
      setSummary({
        title: 'Please check the form',
        text: errorFields.length === 1 ? 'There is 1 field that needs your attention.' : `There are ${errorFields.length} fields that need your attention.`,
      })
      document.getElementsByName(errorFields[0])[0]?.focus()
      return
    }
    setSummary(null)
    setSubmitting(true)
    const payload = trimmed(values) as ProjectInput & Values
    const saved = editing ? await projectsApi.update(editing.id, payload) : await projectsApi.add({ ...payload, progress: 0, status: 'Planning' })
    setSubmitting(false)

    if (!saved.ok) {
      if (saved.errors) {
        setServerErrors(saved.errors as Partial<Record<Field, string>>)
        setSummary({ title: 'Please check the form', text: `The server found ${Object.keys(saved.errors).length} problem(s) with this project.` })
      } else {
        setSummary({ title: saved.network ? 'Couldn’t save this project' : 'Something went wrong', text: saved.error })
      }
      return
    }
    onClose()
    toast(editing ? `Project "${saved.data.name}" has been updated.` : `Project "${saved.data.name}" saved as ${saved.data.ref}.`, 'success')
    onSaved(saved.data)
  }

  return (
    <Modal open={open} onClose={onClose} locked={submitting} size="lg" titleId="projectFormTitle"
      title={editing ? 'Edit Project' : 'New Project'}>
      <form noValidate onSubmit={handleSubmit}>
        <div className="modal-body">
          {summary && (
            <div className="alert alert-danger">
              <span className="alert-icon">!</span>
              <div className="alert-body">
                <span className="alert-title">{summary.title}</span>
                <span>{summary.text}</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="pf-name">Project Name <span className="required">*</span></label>
            <input type="text" ref={nameRef} placeholder="e.g. East Legon Hills Residential Estate" autoComplete="off" {...inputProps('name')} />
            {fieldError('name')}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="pf-client">Client Name <span className="required">*</span></label>
              <input type="text" placeholder="e.g. Mensah Properties Ltd" autoComplete="off" {...inputProps('client')} />
              {fieldError('client')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pf-contact">Client Phone or Email <span className="required">*</span></label>
              <input type="text" placeholder="e.g. 024 123 4567 or name@company.com.gh" autoComplete="off" {...inputProps('contact')} />
              <span className="form-hint">Enter either a phone number or an email address.</span>
              {fieldError('contact')}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="pf-location">Project Location <span className="required">*</span></label>
              <input type="text" placeholder="e.g. East Legon, Accra" autoComplete="off" {...inputProps('location')} />
              {fieldError('location')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pf-type">Project Type <span className="required">*</span></label>
              <select {...inputProps('type')} onChange={(e) => { update('type')(e); touch('type')() }}>
                <option value="">Select a project type…</option>
                {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {fieldError('type')}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="pf-start">Start Date <span className="required">*</span></label>
              <input type="date" {...inputProps('startDate')} onChange={(e) => { update('startDate')(e); touch('startDate')() }} />
              {fieldError('startDate')}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pf-end">Expected Completion Date <span className="required">*</span></label>
              <input type="date" {...inputProps('endDate')} onChange={(e) => { update('endDate')(e); touch('endDate')() }} />
              {fieldError('endDate')}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pf-description">Project Description</label>
            <textarea rows={3} placeholder="Scope of works, structure type, number of blocks, any site notes…" {...inputProps('description')} />
            <span className="form-hint">Optional. {values.description.trim().length}/{MAX_DESCRIPTION} characters.</span>
            {fieldError('description')}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={() => !submitting && onClose()}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Save Project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
