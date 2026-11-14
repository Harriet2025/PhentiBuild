import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { measurementsApi } from '../../api/resources/records'
import {
  FALLBACK_OBJECT_TYPES, FALLBACK_REFERENCES, visionApi,
  type Detection, type PlannedObjectType, type ReferenceId, type ReferenceOption,
} from '../../api/resources/vision'
import { ActiveProjectPicker } from '../../components/ProjectPicker'
import { useToast } from '../../components/Toast'
import { useActiveProjectId } from '../../lib/activeProject'

/**
 * Camera Scanner: photo (camera or upload) → measured on the server by
 * Claude vision against a reference object of known size → the person
 * checks / corrects the values → saved as a measurement.
 *
 * Nothing is ever saved without the person confirming it, and when the
 * server can't measure (no key, no reference, not recognised) the page
 * says so and falls back to manual entry. The camera is always released
 * when you leave the page.
 */
type Badge = { text: string; cls: string }
type Result = { object: string; measurement: string; confidence: string; reference: string; message: string }
const TIMBER_SECTION: Record<string, string> = { timber_2x2: '2 x 2', timber_2x3: '2 x 3', timber_2x4: '2 x 4', timber_2x6: '2 x 6', timber_4x4: '4 x 4' }
const MAX_SIDE = 1600 // px: enough detail to find the reference card, well under the 5 MB limit
const MANUAL_NOTE = 'Captured via the Camera Scanner; values entered manually after capture.'

function describeCameraError(err: unknown): string {
  const e = err as { name?: string; message?: string }
  if (e?.name === 'NotAllowedError') return 'Camera permission was denied. Allow camera access and try again, or upload a photo instead.'
  if (e?.name === 'NotFoundError') return 'No camera was found on this device. Upload a photo instead.'
  if (!navigator.mediaDevices?.getUserMedia) return 'This browser cannot open the camera here (the camera only works on HTTPS pages or localhost). Upload a photo instead.'
  return `Could not start the camera (${e?.message || 'unknown error'}). Upload a photo instead.`
}

/** Draw a video frame or an uploaded image onto a canvas, scaled down, as JPEG. */
function toJpeg(canvas: HTMLCanvasElement, source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function ScannerPage() {
  const projectId = useActiveProjectId()
  const toast = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [references, setReferences] = useState<ReferenceOption[]>(FALLBACK_REFERENCES)
  const [reference, setReference] = useState<ReferenceId>('card')
  const [cameraOn, setCameraOn] = useState(false)
  const [still, setStill] = useState<string | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [badge, setBadge] = useState<Badge>({ text: 'Camera off', cls: 'badge-neutral' })
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [types, setTypes] = useState<PlannedObjectType[]>(FALLBACK_OBJECT_TYPES)
  const [result, setResult] = useState<Result | null>(null)
  const [detection, setDetection] = useState<Detection | null>(null)
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

  // Is automatic measuring switched on for this server?
  useEffect(() => {
    let alive = true
    void visionApi.status().then((s) => {
      if (!alive) return
      setConfigured(s.configured)
      setTypes(s.types)
      setReferences(s.references)
    })
    return () => { alive = false }
  }, [])

  async function startCamera() {
    setCameraError(null)
    setBadge({ text: 'Starting camera…', cls: 'badge-info' })
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false })
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
    setCameraOn(false); setStill(null); setResult(null); setDetection(null)
    setBadge({ text: 'Camera off', cls: 'badge-neutral' })
  }

  function resetForm() {
    setErrors({}); setFormSummary(null)
    setObjectType(''); setTimberLength(''); setWallLength(''); setWallHeight('')
  }

  /** Send the photo for measuring, then fill the confirm form with the result. */
  async function analyse(dataUrl: string) {
    setStill(dataUrl)
    resetForm()
    setDetection(null)
    setAnalysing(true)
    setBadge({ text: configured ? 'Measuring the photo…' : 'Photo captured', cls: 'badge-info' })
    const response = await visionApi.detect(dataUrl, reference)
    setAnalysing(false)

    if (!response.ok) {
      setBadge({ text: 'Measuring unavailable', cls: 'badge-danger' })
      setResult({ object: '—', measurement: '—', confidence: '—', reference: '—', message: `${response.error}` })
      setFormOpen(true)
      return
    }
    const d = response.detection
    setDetection(d)
    setTypes(d.plannedObjectTypes)
    if (d.objectType) setObjectType(d.objectType)
    if (d.measurements.length && d.objectType?.startsWith('timber_')) setTimberLength(d.measurements.length)
    if (d.objectType === 'exposed_wall') {
      if (d.measurements.length) setWallLength(d.measurements.length)
      if (d.measurements.height) setWallHeight(d.measurements.height)
    }

    const m = d.measurements
    const measurement = d.objectType === 'exposed_wall'
      ? [m.length && `Length ${m.length} m`, m.height && `Height ${m.height} m`, m.surfaceArea && `Area ${m.surfaceArea} m²`].filter(Boolean).join(' · ')
      : m.length ? `Length ${m.length} m` : ''
    const badges: Record<string, Badge> = {
      detected: { text: 'Measured — please check', cls: 'badge-success' },
      no_reference: { text: 'No reference found', cls: 'badge-warning' },
      not_recognised: { text: 'Not recognised', cls: 'badge-warning' },
      not_configured: { text: 'Manual entry required', cls: 'badge-warning' },
    }
    setBadge(badges[d.status] ?? badges.not_configured)
    setResult({
      object: d.label || (d.status === 'not_configured' ? 'Not detected — automatic measuring is off' : 'Not recognised'),
      measurement: measurement || '— (enter below)',
      confidence: d.confidence !== null ? `${Math.round(d.confidence * 100)}%` : '—',
      reference: d.status === 'not_configured' ? '—' : d.referenceFound ? 'Found' : 'Not found',
      message: d.message,
    })
    setFormOpen(true) // always review before saving
  }

  async function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    await analyse(toJpeg(canvas, video, video.videoWidth, video.videoHeight))
  }

  function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // the same file can be chosen again
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('Choose a photo (JPEG, PNG or WebP).', 'danger')
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = canvasRef.current
      if (canvas) void analyse(toJpeg(canvas, img, img.naturalWidth, img.naturalHeight))
    }
    img.onerror = () => { URL.revokeObjectURL(url); toast('That photo could not be opened.', 'danger') }
    img.src = url
  }

  function discard() {
    setResult(null); setDetection(null); setFormOpen(false); resetForm()
    setStill(null)
    setBadge(streamRef.current ? { text: 'Camera ready', cls: 'badge-success' } : { text: 'Camera off', cls: 'badge-neutral' })
  }

  async function confirmScan() {
    setErrors({}); setFormSummary(null)
    const errs: Record<string, string> = {}
    let payload: Parameters<typeof measurementsApi.add>[0] | null = null
    const label = types.find((t) => t.id === objectType)?.label ?? objectType
    // Record honestly where the numbers came from.
    const measured = detection?.status === 'detected'
    const refLabel = references.find((r) => r.id === reference)?.label ?? reference
    const note = measured
      ? `Measured from a photo by the Camera Scanner (reference: ${refLabel}${detection?.confidence != null ? `, confidence ${Math.round(detection.confidence * 100)}%` : ''}), then checked and confirmed by the user.`
      : MANUAL_NOTE
    const extra = measured ? { source: 'scanner-ai', confidence: detection?.confidence ?? null, reference } : { source: 'scanner' }

    if (!objectType) errs.objectType = 'Select the object you captured.'
    if (objectType.startsWith('timber_')) {
      const length = parseFloat(timberLength)
      if (!timberLength.trim()) errs.timberLength = 'Length is required.'
      else if (!isFinite(length) || length <= 0) errs.timberLength = 'Enter a valid length.'
      if (!Object.keys(errs).length) {
        payload = { sectionType: 'timber', label: `Scanned — ${label}`, notes: note,
          values: { timberType: TIMBER_SECTION[objectType] ?? null, timberLength: String(length), ...extra } }
      }
    } else if (objectType === 'exposed_wall') {
      const l = parseFloat(wallLength)
      const h = parseFloat(wallHeight)
      if (!wallLength.trim()) errs.wallLength = 'Length is required.'
      else if (!isFinite(l) || l <= 0) errs.wallLength = 'Enter a valid length.'
      if (!wallHeight.trim()) errs.wallHeight = 'Height is required.'
      else if (!isFinite(h) || h <= 0) errs.wallHeight = 'Enter a valid height.'
      if (!Object.keys(errs).length) {
        payload = { sectionType: 'walls', label: 'Scanned — Exposed Wall', notes: note,
          values: { length: String(l), height: String(h), surfaceArea: (l * h).toFixed(2), ...extra } }
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
  const selectedRef = references.find((r) => r.id === reference)

  return (
    <div className="scanner-module">
      <div className="module-header">
        <div>
          <span className="eyebrow">Data Capture</span>
          <h1>Camera Scanner</h1>
          <p className="text-secondary">Photograph timber or a wall next to a reference card, check the measured values, then save.</p>
        </div>
        <div className="module-header-actions">
          <ActiveProjectPicker />
        </div>
      </div>

      {configured === false && (
        <div className="alert alert-warning scanner-cv-notice">
          <span className="alert-icon">!</span>
          <div className="alert-body">
            <span className="alert-title">Automatic measuring is not switched on</span>
            <span>The camera, capture and confirmation steps below all work, but this server has no photo-analysis key set up, so every capture goes to manual entry. Nothing on this page invents a measurement.</span>
          </div>
        </div>
      )}
      {configured && (
        <div className="alert alert-info scanner-cv-notice">
          <span className="alert-icon">i</span>
          <div className="alert-body">
            <span className="alert-title">How to get a good measurement</span>
            <span>
              Place the reference flat against the object: the <a href="/reference-card.html" target="_blank" rel="noopener">PhentiBuild reference card</a> (or
              any bank / ID card — they are all the same size) for timber, or an A4 sheet for walls. Fit the whole piece or wall in the frame, shoot
              straight on in good light. The measured values are estimates — you check and correct them before saving.
            </span>
          </div>
        </div>
      )}

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
            <span className={`badge ${badge.cls}`}>{analysing && <span className="spinner scanner-badge-spinner" aria-hidden="true" />}{badge.text}</span>
          </div>
          {configured && (
            <div className="form-group scanner-reference">
              <label className="form-label" htmlFor="sc-reference">Reference object in the photo</label>
              <select id="sc-reference" className="form-control" value={reference} disabled={analysing} onChange={(e) => setReference(e.target.value as ReferenceId)}>
                {references.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <span className="form-hint">{selectedRef?.size ? `Real size used for measuring: ${selectedRef.size}.` : 'Without a reference the scanner can only identify the object, not measure it.'}</span>
            </div>
          )}
          {cameraError && (
            <div className="alert alert-danger">
              <span className="alert-icon">!</span>
              <div className="alert-body"><span className="alert-title">Camera unavailable</span><span>{cameraError}</span></div>
            </div>
          )}
          <div className="scanner-camera-actions">
            {!cameraOn && <button type="button" className="btn btn-primary" disabled={analysing} onClick={() => void startCamera()}>Start Camera</button>}
            {cameraOn && !still && <button type="button" className="btn btn-primary" disabled={analysing} onClick={() => void capture()}>Capture</button>}
            <button type="button" className="btn btn-outline-secondary" disabled={analysing} onClick={() => fileRef.current?.click()}>Upload a Photo</button>
            {cameraOn && <button type="button" className="btn btn-outline-secondary" disabled={analysing} onClick={stopCamera}>Stop Camera</button>}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={onUpload} />
          </div>
        </div>

        {result && (
          <div className="card scanner-result-card">
            <h3>Scan Result</h3>
            <dl className="scanner-result-facts">
              <dt>Detected Object</dt><dd>{result.object}</dd>
              <dt>Measurement</dt><dd>{result.measurement}</dd>
              <dt>Confidence</dt><dd>{result.confidence}</dd>
              <dt>Reference</dt><dd>{result.reference}</dd>
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
              <button type="button" className="btn btn-primary" disabled={saving || analysing} onClick={() => void confirmScan()}>{saving ? 'Saving…' : 'Confirm & Save'}</button>
              <button type="button" className="btn btn-outline-secondary" onClick={discard}>Reject</button>
              <button type="button" className="btn btn-ghost" onClick={discard}>Rescan</button>
            </div>
          </div>
        )}
      </div>

      <div className="card scanner-roadmap-card">
        <h3>What the Scanner Recognises</h3>
        <p className="text-secondary">
          {configured ? 'Photograph one of these with a reference object in the shot:' : 'Once automatic measuring is switched on, the scanner recognises:'}
        </p>
        <ul className="scanner-roadmap-list">{types.map((t) => <li key={t.id}>{t.label}</li>)}</ul>
      </div>
    </div>
  )
}
