import { useMemo, useState, type FormEvent } from 'react'
import { boqApi } from '../../api/resources/boq'
import { calculationsApi, measurementsApi } from '../../api/resources/records'
import { boqRowsFor } from '../../domain/calculators/boqMappers'
import type { EngineInput, EngineResult } from '../../domain/engines/types'
import { useToast } from '../../components/Toast'
import { useActiveProjectId } from '../../lib/activeProject'
import { LENGTH_UNITS, PITCH_UNITS, fieldError, type CalculatorDef, type FieldDef, type LengthUnit } from './config'

/**
 * One measurement/calculator form + its results panel.
 *
 *  mode="calculator"  → port of a Calculators form (calculators.php / .js)
 *  mode="manual"      → port of a Manual Input form (manual-input.php / .js):
 *                       adds "Save Measurement" and a note; calculates only
 *                       when the form has an engine, otherwise just checks.
 *
 * Same markup classes, validation timing and messages as the originals.
 */
export type FormSection = {
  id: string
  label: string
  desc: string
  fields: FieldDef[]
  note?: string
  /** Present when submitting runs a calculation. */
  calc?: CalculatorDef
}

type Calc = { input: EngineInput; result: EngineResult; values: Record<string, string>; units: Record<string, string> }

const resolve = <T,>(specOrFn: T | ((r: EngineResult) => T), result: EngineResult): T =>
  typeof specOrFn === 'function' ? (specOrFn as (r: EngineResult) => T)(result) : specOrFn
const sentence = (label: string) => label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
const entriesMessage = (n: number) => (n === 1 ? 'There is 1 entry that needs your attention.' : `There are ${n} entries that need your attention.`)

export function CalculatorForm({ section, mode, initialValues }: {
  section: FormSection
  mode: 'calculator' | 'manual'
  /** Pre-filled values (e.g. sizes measured by the Camera Scanner), in each field's default unit. */
  initialValues?: Record<string, string>
}) {
  const toast = useToast()
  const projectId = useActiveProjectId() // chosen in the page header's "Save to project"
  const def = section.calc
  const prefix = mode === 'manual' ? 'mi' : 'calc'
  const initialUnits = useMemo(
    () => Object.fromEntries(section.fields.filter((f) => f.kind === 'length' || f.kind === 'pitch').map((f) => [f.name, (f as { unit: string }).unit])),
    [section],
  )
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {})
  const [units, setUnits] = useState<Record<string, string>>(initialUnits)
  const [unitAll, setUnitAll] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [attempted, setAttempted] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [valid, setValid] = useState(false)
  const [calc, setCalc] = useState<Calc | null>(null)
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [busy, setBusy] = useState<'save' | 'boq' | 'measure' | null>(null)

  const errors = Object.fromEntries(section.fields.map((f) => [f.name, fieldError(f, values[f.name] || '', units[f.name] as never)]))
  const visibleError = (name: string) => ((attempted || touched[name]) ? errors[name] : '')
  const trimmedValues = () => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]))

  /** Validate everything; show the summary + focus the first bad field. */
  function checkAll(): boolean {
    setAttempted(true)
    const invalid = section.fields.filter((f) => errors[f.name])
    if (invalid.length) {
      setSummary(entriesMessage(invalid.length))
      setValid(false)
      document.getElementById(`${prefix}-${section.id}-${invalid[0].name}`)?.focus()
      return false
    }
    setSummary(null)
    return true
  }

  function setAllUnits(unit: string) {
    setUnitAll(unit)
    if (!unit) return
    const lengthFields = section.fields.filter((f) => f.kind === 'length').map((f) => f.name)
    setUnits((u) => ({ ...u, ...Object.fromEntries(lengthFields.map((k) => [k, unit])) }))
    setTouched((t) => ({ ...t, ...Object.fromEntries(section.fields.filter((f) => (values[f.name] || '').trim()).map((f) => [f.name, true])) }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setValid(false)
    if (!checkAll()) return
    if (!def) {
      setValid(true)
      toast('All entries are valid.', 'success')
      return
    }
    const v = trimmedValues()
    const input = def.buildInput(v, units as Record<string, LengthUnit>)
    const result = def.engine.calculate(input)
    setCalc({ input, result, values: v, units })
    toast(resolve(def.successToast, result), 'success')
  }

  function reset() {
    setValues({}); setUnits(initialUnits); setUnitAll(''); setTouched({}); setAttempted(false)
    setSummary(null); setValid(false); setCalc(null)
  }

  async function saveMeasurement() {
    if (!checkAll()) return
    const v = Object.fromEntries(Object.entries(trimmedValues()).filter(([, x]) => x))
    setBusy('measure')
    const r = await measurementsApi.add({ sectionType: section.id, values: v, projectId })
    setBusy(null)
    toast(r.ok ? 'Measurement saved.' : r.error, r.ok ? 'success' : 'danger')
  }

  async function saveCalculation() {
    if (!calc) return
    setBusy('save')
    const r = await calculationsApi.add({ calculationType: section.id, input: calc.input, result: calc.result, projectId })
    setBusy(null)
    toast(r.ok ? 'Calculation saved.' : r.error, r.ok ? 'success' : 'danger')
  }

  async function addToBoq() {
    if (!calc) return
    const rows = boqRowsFor(section.id, calc.input, calc.result)
    if (!rows) return toast('This calculator is not connected to the Bill of Quantities.', 'danger')
    setBusy('boq')
    const outcome = await boqApi.addMany(rows.map((row) => ({ ...row, projectId })))
    setBusy(null)
    if (!outcome.ok) return toast(outcome.error, 'danger')
    const count = outcome.items.length
    toast(`${count} ${count === 1 ? 'item' : 'items'} added to the Bill of Quantities.`, 'success')
  }

  const renderField = (field: FieldDef) => {
    const id = `${prefix}-${section.id}-${field.name}`
    const error = visibleError(field.name)
    const markTouched = () => setTouched((t) => ({ ...t, [field.name]: true }))
    const common = {
      id, name: field.name, value: values[field.name] || '', 'aria-invalid': error ? true : undefined,
      onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [field.name]: e.target.value })),
      onBlur: markTouched,
    }
    const unitOptions = field.kind === 'length' ? LENGTH_UNITS : field.kind === 'pitch' ? PITCH_UNITS : null
    return (
      <div className="form-group" key={field.name}>
        <label className="form-label" htmlFor={id}>{field.label}{!field.optional && <> <span className="required">*</span></>}</label>
        {field.kind === 'select' ? (
          <select className={`form-control${error ? ' is-invalid' : ''}`} {...common} onChange={(e) => { common.onChange(e); markTouched() }}>
            <option value="">Select {field.label.toLowerCase()}…</option>
            {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <div className="measure-input">
            <input type="text" className={`form-control form-control-numeric${error ? ' is-invalid' : ''}`}
              inputMode={field.kind === 'count' ? 'numeric' : 'decimal'} placeholder={field.placeholder} autoComplete="off" {...common} />
            {unitOptions ? (
              <select className="unit-select" aria-label={`Unit for ${sentence(field.label)}`} value={units[field.name]}
                onChange={(e) => { setUnits((u) => ({ ...u, [field.name]: e.target.value })); if ((values[field.name] || '').trim()) markTouched() }}>
                {unitOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : <span className="unit-static">{(field as { suffix: string }).suffix}</span>}
          </div>
        )}
        {field.hint && <span className="form-hint">{field.hint}</span>}
        {error && <span className="form-error">{error}</span>}
      </div>
    )
  }

  const results = calc && def ? resolve(def.results, calc.result) : []
  const assumptions = calc && def ? (resolve(def.assumptions, calc.result) || []).filter((a) => calc.result.assumptions?.[a.key] !== undefined) : []

  return (
    <>
      <form className="card mi-form" noValidate onSubmit={submit} onReset={reset}>
        <div className="card-body">
          {summary && (
            <div className="alert alert-danger">
              <span className="alert-icon">!</span>
              <div className="alert-body"><span className="alert-title">Please check your entries</span><span>{summary}</span></div>
            </div>
          )}
          {valid && (
            <div className="alert alert-success">
              <span className="alert-icon">&#10003;</span>
              <div className="alert-body">
                <span className="alert-title">All entries are valid</span>
                <span>These measurements are complete. Use “Save Measurement” to keep them; this form has no calculator of its own yet.</span>
              </div>
            </div>
          )}
          <div className="mi-unitbar">
            <label className="form-label" htmlFor={`${prefix}-${section.id}-unit-all`}>Set all length units to</label>
            <select className="form-control" id={`${prefix}-${section.id}-unit-all`} value={unitAll} onChange={(e) => setAllUnits(e.target.value)}>
              <option value="">Keep each field's own unit</option>
              {LENGTH_UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span className="form-hint">A shortcut only. Any field can still be switched to its own unit afterwards.</span>
          </div>
          <div className="mi-grid">{section.fields.map(renderField)}</div>
          {section.note && <p className="mi-note">{section.note}</p>}
        </div>
        <div className="card-footer mi-actions">
          <span className="mi-actions-note">
            {mode === 'calculator' ? 'Values stay on this page until you save.' : def ? 'Entries are checked, then calculated.' : 'Entries are checked, not calculated.'}
          </span>
          <div className="mi-actions-buttons">
            <button type="reset" className="btn btn-outline-secondary">Clear</button>
            {mode === 'manual' && (
              <button type="button" className="btn btn-outline-secondary" disabled={busy !== null} onClick={() => void saveMeasurement()}>
                {busy === 'measure' ? 'Saving…' : 'Save Measurement'}
              </button>
            )}
            <button type="submit" className="btn btn-primary">{mode === 'calculator' ? 'Calculate' : 'Check Entries'}</button>
          </div>
        </div>
      </form>

      {calc && def && (
        <div className="mi-calc-results card">
          <div className="card-header"><h4>{resolve(def.title, calc.result)}</h4></div>
          <div className="card-body">
            <div className="mi-result-grid">
              {results.map((spec) => (
                <div key={spec.key} className={`mi-result-row${spec.highlight ? ' mi-result-highlight' : ''}`}>
                  <span className="mi-result-label">{spec.label}</span>
                  <span className="mi-result-value">{def.engine.formatNumber(calc.result[spec.key], spec.decimals)}</span>
                  <span className="mi-result-unit">{spec.unit || ''}</span>
                </div>
              ))}
            </div>
            {def.schedule && (
              <div className="mi-schedule-wrapper">
                <table className="mi-schedule-table">
                  <thead><tr>{def.schedule.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>
                    {def.schedule.rows(calc.result, calc.input, calc.values, calc.units as Record<string, LengthUnit>).map((cells, i) => (
                      <tr key={i}>{cells.map((c, j) => <td key={j}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mi-assumptions">
              <summary className="mi-assumptions-toggle" onClick={(e) => { e.preventDefault(); setShowAssumptions((s) => !s) }}>View assumptions</summary>
              {showAssumptions && (
                <div className="mi-assumptions-body">
                  <ul>
                    {assumptions.map((a) => (
                      <li key={a.key}><strong>{a.label}:</strong> {String(calc.result.assumptions[a.key])}{a.suffix || ''}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="card-footer">
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={busy !== null} onClick={() => void saveCalculation()}>
              {busy === 'save' ? 'Saving…' : 'Save Calculation'}
            </button>{' '}
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={busy !== null} onClick={() => void addToBoq()}>
              {busy === 'boq' ? 'Adding…' : 'Add to Bill of Quantities'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
