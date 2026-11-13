import { useEffect, useRef, useState } from 'react'
import { measurementsApi } from '../../api/resources/records'
import { FALLBACK_OBJECT_TYPES, visionApi, type PlannedObjectType } from '../../api/resources/vision'
import { ActiveProjectPicker } from '../../components/ProjectPicker'
import { useToast } from '../../components/Toast'
import { useActiveProjectId } from '../../lib/activeProject'

/**
 * Port of pages/modules/scanner.php + js/modules/scanner.js.
 * Camera → capture → vision service (honestly "not connected") → manual
 * confirmation → saved as a measurement. The camera is ALWAYS released
 * when you leave this page (React unmount), not only on sidebar clicks.
 */
type Badge = { text: string; cls: string }
type Result = { object: string; measurement: string; confidence: string; message: string }
const NOTE = 'Captured via the Camera Scanner. Computer vision detection is not yet connected — this value was entered manually after capture.'
const TIMBER_SECTION: Record<string, string> = { timber_2x2: '2 x 2', timber_2x3: '2 x 3', timber_2x4: '2 x 4', timber_2x6: '2 x 6', timber_4x4: '4 x 4' }

function describeCameraError(err: unknown): string {
  const e = err as { name?: string; message?: string }
  if (e?.name === 'NotAllowedError') return 'Camera permission was denied. Allow camera access and try again.'
  if (e?.name === 'NotFoundError') return 'No camera was found on this device.'
  if (!navigator.mediaDevices?.getUserMedia) return 'This browser cannot open the camera here. The camera only works on HTTPS pages (or localhost).'
  return `Could not start the camera (${e?.message || 'unknown error'}).`
}

export function ScannerPage() {
  const projectId = useActiveProjectId()
  const toast = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [still, setStill] = useState<string | null>(null)
  const [badge, setBadge] = useState<Badge>({ text: 'Camera off', cls: 'badge-neutral' })
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [types, setTypes] = useState<PlannedObjectType[]>(FALLBACK_OBJECT_TYPES)
  const [result, setResult] = useState<Result | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [objectType, setObjectType] = useState('')
  const [timberLength, setTimberLength] = useState('')
  const [wallLength, setWallLength] = useState('')
  const [wallHeight, setWallHeight] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formSummary, setFormSummary] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const releaseCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }
  // Leaving the page (or logging out) always turns the camera off.
  useEffect(() => releaseCamera, [])

  async function startCamera() {
    setCameraError(null)
    setBadge({ text: 'Starting camera…', cls: 'badge-info' })
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
      setStill(null)
      setBadge({ text: 'Camera ready', cls: 'badge-success' })
    } catch (err) {
      releaseCamera()
      setBadge({ text: 'Camera unavailable', cls: 'badge-danger' })
      setCameraError(describeCameraError(err))
    }
  }

  function stopCamera() {
    releaseCamera()
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false); setStill(null); setResult(null)
    setBadge({ text: 'Camera off', cls: 'badge-neutral' })
  }

  async function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    const scale = Math.min(1, 960 / video.videoWidth)
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
    setStill(dataUrl)
    setBadge({ text: 'Frame captured — analyzing…', cls: 'badge-info' })

    const response = await visionApi.detect(dataUrl)
    if (!response.ok) {
      setBadge({ text: 'Vision service error', cls: 'badge-danger' })
      setResult({ object: '—', measurement: '—', confidence: '—', message: response.error || 'The vision service could not be reached.' })
      setFormOpen(true)
      return
    }
    const d = response.detection
    setTypes(d.plannedObjectTypes)
    if (d.status === 'not_configured') {
      setBadge({ text: 'Manual entry required', cls: 'badge-warning' })
      setResult({ object: 'Not detected — no vision model connected', measurement: '—', confidence: 'N/A (manual entry)', message: d.message })
    } else {
      setBadge({ text: 'Object detected', cls: 'badge-success' })
      const keys = Object.keys(d.measurements)
      setResult({
        object: d.label || d.objectType || '—',
        measurement: keys.length ? keys.map((k) => `${k}: ${String(d.measurements[k])}`).join(', ') : '—',
        confidence: d.confidence !== null ? `${Math.round(d.confidence * 100)}%` : '—',
        message: d.message,
      })
    }
    setFormOpen(false)
  }

  function discard() {
    setResult(null); setFormOpen(false); setErrors({}); setFormSummary(null)
    setObjectType(''); setTimberLength(''); setWallLength(''); setWallHeight('')
    setStill(null)
    setBadge(streamRef.current ? { text: 'Camera ready', cls: 'badge-success' } : { text: 'Camera off', cls: 'badge-neutral' })
  }

  async function confirmScan() {
    setErrors({}); setFormSummary(null)
    const errs: Record<string, string> = {}
    let payload: Parameters<typeof measurementsApi.add>[0] | null = null
    const label = types.find((t) => t.id === objectType)?.label ?? objectType
    if (!objectType) errs.objectType = 'Select the object you captured.'
    if (objectType.startsWith('timber_')) {
      const length = parseFloat(timberLength)
      if (!timberLength.trim()) errs.timberLength = 'Length is required.'
      else if (!isFinite(length) || length <= 0) errs.timberLength = 'Enter a valid length.'
      if (!Object.keys(errs).length) {
        payload = { sectionType: 'timber', label: `Scanned — ${label}`, notes: NOTE,
          values: { timberType: TIMBER_SECTION[objectType] ?? null, timberLength: String(length), source: 'scanner' } }
      }
    } else if (objectType === 'exposed_wall') {
      const l = parseFloat(wallLength)
      const h = parseFloat(wallHeight)
      if (!wallLength.trim()) errs.wallLength = 'Length is required.'
      else if (!isFinite(l) || l <= 0) errs.wallLength = 'Enter a valid length.'
      if (!wallHeight.trim()) errs.wallHeight = 'Height is required.'
      else if (!isFinite(h) || h <= 0) errs.wallHeight = 'Enter a valid height.'
      if (!Object.keys(errs).length) {
        payload = { sectionType: 'walls', label: 'Scanned — Exposed Wall', notes: NOTE,
          values: { length: String(l), height: String(h), surfaceArea: (l * h).toFixed(2), source: 'scanner' } }
      }
    }
    if (Object.keys(errs).length || !payload) {
      setErrors(errs)
      setFormSummary(`Please fix the highlighted field${Object.keys(errs).length > 1 ? 's' : ''} before confirming.`)
      setFormOpen(true)
      return
    }
    setSaving(true)
    const r = await measurementsApi.add({ ...payload, projectId })
    setSaving(false)
    if (!r.ok) return setFormSummary(r.error)
    toast('Measurement saved from scanner capture.', 'success')
    setBadge({ text: 'Saved', cls: 'badge-success' })
    setResult((res) => (res ? { ...res, message: 'Saved as a measurement. Start a new scan whenever you’re ready.' } : res))
    setFormOpen(false)
  }

  const l = parseFloat(wallLength)
  const h = parseFloat(wallHeight)
  const wallArea = isFinite(l) && isFinite(h) && l > 0 && h > 0 ? `${(l * h).toFixed(2)} m²` : '—'
  const err = (k: string) => (errors[k] ? <span className="form-error">{errors[k]}</span> : null)

  return (
    <div className="scanner-module">
      <div className="module-header">
        <div>
          <span className="eyebrow">Data Capture</span>
          <h1>Camera Scanner</h1>
          <p className="text-secondary">Capture a site photo, then confirm or enter the object's measurements.</p>
        </div>
        <div className="module-header-actions">
          <ActiveProjectPicker />
        </div>
      </div>

      <div className="alert alert-warning scanner-cv-notice">
        <span className="alert-icon">!</span>
        <div className="alert-body">
          <span className="alert-title">Computer vision is not connected yet</span>
          <span>The camera, capture, and confirmation workflow below are fully functional. Automatic object detection requires a trained vision model that hasn’t been integrated — every capture currently routes to manual entry. Nothing on this page fabricates a detection result.</span>
        </div>
      </div>

      <div className="scanner-layout">
        <div className="card scanner-camera-card">
          <div className="scanner-camera-frame">
            <video ref={videoRef} autoPlay playsInline muted hidden={!cameraOn || !!still} />
            <canvas ref={canvasRef} hidden />
            {still && <img src={still} alt="Captured frame" />}
            {!cameraOn && !still && (
              <div className="scanner-camera-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8a1 1 0 0 1 1-1h2l1.5-2h7L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z" /><circle cx="12" cy="13" r="3.2" /></svg>
                <p>Camera is off</p>
              </div>
            )}
          </div>
          <div className="scanner-status-bar">
            <span className="text-xs text-muted">Scanning status</span>
            <span className={`badge ${badge.cls}`}>{badge.text}</span>
          </div>
          {cameraError && (
            <div className="alert alert-danger">
              <span className="alert-icon">!</span>
              <div className="alert-body"><span className="alert-title">Camera unavailable</span><span>{cameraError}</span></div>
            </div>
          )}
          <div className="scanner-camera-actions">
            {!cameraOn && <button type="button" className="btn btn-primary" onClick={() => void startCamera()}>Start Camera</button>}
            {cameraOn && !still && <button type="button" className="btn btn-primary" onClick={() => void capture()}>Capture</button>}
            {cameraOn && <button type="button" className="btn btn-outline-secondary" onClick={stopCamera}>Stop Camera</button>}
          </div>
        </div>

        {result && (
          <div className="card scanner-result-card">
            <h3>Scan Result</h3>
            <dl className="scanner-result-facts">
              <dt>Detected Object</dt><dd>{result.object}</dd>
              <dt>Measurement</dt><dd>{result.measurement}</dd>
              <dt>Confidence Score</dt><dd>{result.confidence}</dd>
            </dl>
            <p className="text-sm text-secondary">{result.message}</p>
            {formOpen && (
              <form noValidate className="scanner-edit-form" onSubmit={(e) => e.preventDefault()}>
                {formSummary && (
                  <div className="alert alert-danger"><span className="alert-icon">!</span><div className="alert-body"><span>{formSummary}</span></div></div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="sc-object-type">Object Type <span className="required">*</span></label>
                  <select id="sc-object-type" className="form-control" value={objectType} onChange={(e) => setObjectType(e.target.value)}>
                    <option value="">Select the object you captured…</option>
                    <optgroup label="Timber">{types.filter((t) => t.category === 'timber').map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</optgroup>
                    <optgroup label="Wall">{types.filter((t) => t.category === 'wall').map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</optgroup>
                  </select>
                  {err('objectType')}
                </div>
                {objectType.startsWith('timber_') && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="sc-timber-length">Length (m) <span className="required">*</span></label>
                    <input type="text" id="sc-timber-length" className="form-control form-control-numeric" inputMode="decimal" placeholder="e.g. 3.6" value={timberLength} onChange={(e) => setTimberLength(e.target.value)} />
                    {err('timberLength')}
                  </div>
                )}
                {objectType === 'exposed_wall' && (
                  <div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="sc-wall-length">Length (m) <span className="required">*</span></label>
                        <input type="text" id="sc-wall-length" className="form-control form-control-numeric" inputMode="decimal" placeholder="e.g. 4.5" value={wallLength} onChange={(e) => setWallLength(e.target.value)} />
                        {err('wallLength')}
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="sc-wall-height">Height (m) <span className="required">*</span></label>
                        <input type="text" id="sc-wall-height" className="form-control form-control-numeric" inputMode="decimal" placeholder="e.g. 2.7" value={wallHeight} onChange={(e) => setWallHeight(e.target.value)} />
                        {err('wallHeight')}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Surface Area (computed)</label>
                      <input type="text" className="form-control form-control-numeric" readOnly value={wallArea} />
                      <span className="form-hint">Length × Height, calculated automatically as you type.</span>
                    </div>
                  </div>
                )}
              </form>
            )}
            <div className="scanner-result-actions">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'Hide Form' : 'Edit'}</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void confirmScan()}>{saving ? 'Saving…' : 'Confirm & Save'}</button>
              <button type="button" className="btn btn-outline-secondary" onClick={discard}>Reject</button>
              <button type="button" className="btn btn-ghost" onClick={discard}>Rescan</button>
            </div>
          </div>
        )}
      </div>

      <div className="card scanner-roadmap-card">
        <h3>Planned Recognition</h3>
        <p className="text-secondary">Once a vision model is connected, this scanner is built to recognize:</p>
        <ul className="scanner-roadmap-list">{types.map((t) => <li key={t.id}>{t.label}</li>)}</ul>
      </div>
    </div>
  )
}
