import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { measurementsApi } from '../../api/resources/records'
import {
  FALLBACK_OBJECT_TYPES, FALLBACK_REFERENCES, visionApi,
  type Calibration, type Detection, type PlannedObjectType, type ReferenceId, type ReferenceOption,
} from '../../api/resources/vision'
import { ActiveProjectPicker } from '../../components/ProjectPicker'
import { useToast } from '../../components/Toast'
import { useActiveProjectId } from '../../lib/activeProject'
import { formatM, measure, POINTS_NEEDED, PRECISION_TEXT, type Pt, type Shape } from '../../lib/measure'
import { PhotoMeasure } from './PhotoMeasure'

/**
 * Camera Scanner:  Camera → Vision → Measurement → User Confirmation → Calculation Engine
 *
 *  1. Photo from the camera or an upload.
 *  2. The server looks for the printed PhentiBuild marker (OpenCV, free, no AI).
 *     Found → exact scale: tap the timber ends / wall corners and get real sizes
 *     with a precision rating.
 *  3. If Claude vision is switched on, it recognises the object and places the
 *     points for you (sizes still come from the marker when it is there).
 *  4. The person checks / corrects, saves, and can open the matching
 *     calculator with the sizes filled in.
 * Nothing is saved without the person confirming it. The camera is always
 * released when you leave the page.
 */
type Badge = { text: string; cls: string }
const TIMBER_SECTION: Record<string, string> = { timber_2x2: '2 x 2', timber_2x3: '2 x 3', timber_2x4: '2 x 4', timber_2x6: '2 x 6', timber_4x4: '4 x 4' }
const MAX_SIDE = 2400 // px: keeps the marker big enough for precise corners, still well under the 5 MB limit

const shapeOf = (objectType: string): Shape | null =>
  objectType.startsWith('timber_') ? 'timber' : objectType === 'exposed_wall' ? 'wall' : null

function describeCameraError(err: unknown): string {
  const e = err as { name?: string; message?: string }
  if (e?.name === 'NotAllowedError') return 'Camera permission was denied. Allow camera access and try again, or upload a photo instead.'
  if (e?.name === 'NotFoundError') return 'No camera was found on this device. Upload a photo instead.'
  if (!navigator.mediaDevices?.getUserMedia) return 'This browser cannot open the camera here (the camera only works on HTTPS pages or localhost). Upload a photo instead.'
  return `Could not start the camera (${e?.message || 'unknown error'}). Upload a photo instead.`
}

/** Draw a video frame or an uploaded image onto a canvas, scaled down, as JPEG. */
function toJpeg(canvas: HTMLCanvasElement, source: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height)
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height }
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
  const [still, setStill] = useState<{ dataUrl: string; width: number; height: number } | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [badge, setBadge] = useState<Badge>({ text: 'Camera off', cls: 'badge-neutral' })
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [types, setTypes] = useState<PlannedObjectType[]>(FALLBACK_OBJECT_TYPES)
  const [calibration, setCalibration] = useState<Calibration | null>(null)
  const [detection, setDetection] = useState<Detection | null>(null)
  const [points, setPoints] = useState<Pt[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [objectType, setObjectType] = useState('')
  const [timberLength, setTimberLength] = useState('')
  const [wallLength, setWallLength] = useState('')
  const [wallHeight, setWallHeight] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formSummary, setFormSummary] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const releaseCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }
  // Leaving the page (or logging out) always turns the camera off.
  useEffect(() => releaseCamera, [])

  // Is automatic recognition (Claude) switched on for this server?
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

  const shape = shapeOf(objectType)
  const marker = calibration?.found && calibration.corners && calibration.markerSizeMm ? calibration : null

  // Exact measurement from the marker + the points, with a precision rating.
  const measurement = useMemo(() => {
    if (!marker || !shape || points.length !== POINTS_NEEDED[shape]) return null
    const corners = marker.corners!.map(([x, y]) => ({ x, y }))
    return measure(corners, marker.markerSizeMm!, shape, points)
  }, [marker, shape, points])

  // The points drive the form: drag a point and the size updates.
  useEffect(() => {
    if (!measurement) return
    /* eslint-disable react-hooks/set-state-in-effect */
    if (shape === 'timber') setTimberLength(measurement.length.toFixed(2))
    if (shape === 'wall') {
      setWallLength(measurement.length.toFixed(2))
      if (measurement.height !== null) setWallHeight(measurement.height.toFixed(2))
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [measurement, shape])

  const imprecise = measurement?.precision === 'low'

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
    setCameraOn(false)
    discard()
    setBadge({ text: 'Camera off', cls: 'badge-neutral' })
  }

  function resetForm() {
    setErrors({}); setFormSummary(null); setSaved(false)
    setObjectType(''); setTimberLength(''); setWallLength(''); setWallHeight('')
    setPoints([])
  }

  function chooseObject(next: string) {
    // A different kind of object needs different points.
    if (shapeOf(next) !== shape) setPoints([])
    setObjectType(next)
  }

  /** Find the marker (always, free) and - if switched on - let Claude recognise the object. */
  async function analyse(photo: { dataUrl: string; width: number; height: number }) {
    setStill(photo)
    resetForm()
    setDetection(null); setCalibration(null); setMessage(null)
    setAnalysing(true)
    setBadge({ text: 'Analysing the photo…', cls: 'badge-info' })
    const [cal, det] = await Promise.all([
      visionApi.calibrate(photo.dataUrl),
      configured ? visionApi.detect(photo.dataUrl, reference) : Promise.resolve(null),
    ])
    setAnalysing(false)

    const c = cal.ok ? cal.calibration : null
    setCalibration(c)
    const d = det && det.ok ? det.detection : null
    setDetection(d)
    if (d) {
      setTypes(d.plannedObjectTypes)
      if (d.objectType) setObjectType(d.objectType)
      if (d.points.length) setPoints(d.points.map(([x, y]) => ({ x, y })))
      // Claude's own estimate only when there is no marker to measure with.
      if (!c?.found && d.measuredBy === 'estimate') {
        if (d.measurements.length && d.objectType?.startsWith('timber_')) setTimberLength(d.measurements.length)
        if (d.objectType === 'exposed_wall') {
          if (d.measurements.length) setWallLength(d.measurements.length)
          if (d.measurements.height) setWallHeight(d.measurements.height)
        }
      }
    }

    const notes: string[] = []
    if (!cal.ok) notes.push(`Marker check failed: ${cal.error}`)
    else if (c?.found) notes.push(c.message)
    else notes.push('No PhentiBuild marker in this photo, so it cannot be measured exactly. Lay the printed card (timber) or tape the A4 sheet (walls) on the object and retake, or enter the sizes below.')
    if (det && !det.ok) notes.push(det.error)
    if (d && d.status !== 'not_configured') notes.push(d.message)
    setMessage(notes.join(' '))

    if (c?.found) setBadge(c.quality === 'poor' ? { text: 'Marker found — low precision', cls: 'badge-warning' } : { text: 'Marker found — measure', cls: 'badge-success' })
    else if (d?.status === 'detected') setBadge({ text: 'Estimated — please check', cls: 'badge-warning' })
    else setBadge({ text: 'No marker — enter sizes', cls: 'badge-warning' })
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
    resetForm()
    setStill(null); setDetection(null); setCalibration(null); setMessage(null)
    setBadge(streamRef.current ? { text: 'Camera ready', cls: 'badge-success' } : { text: 'Camera off', cls: 'badge-neutral' })
  }

  async function confirmScan() {
    setErrors({}); setFormSummary(null)
    const errs: Record<string, string> = {}
    let payload: Parameters<typeof measurementsApi.add>[0] | null = null
    const label = types.find((t) => t.id === objectType)?.label ?? objectType
    // Record honestly where the numbers came from.
    const source = measurement ? 'scanner-marker' : detection?.measuredBy === 'estimate' ? 'scanner-ai' : 'scanner'
    const note = measurement
      ? `Measured from a photo with the ${marker?.label} (${marker?.markerSizeMm} mm marker, ${PRECISION_TEXT[measurement.precision]}): ${shape === 'wall' ? `length ${formatM(measurement.length)}, height ${formatM(measurement.height ?? 0)}` : formatM(measurement.length)}; checked and confirmed by the user.`
      : source === 'scanner-ai'
        ? `Estimated from a photo by the Camera Scanner AI (confidence ${detection?.confidence != null ? Math.round(detection.confidence * 100) + '%' : 'n/a'}), then checked and confirmed by the user.`
        : 'Captured via the Camera Scanner; values entered manually after capture.'
    const extra = {
      source,
      ...(measurement ? { precision: measurement.precision, marker: marker?.reference } : {}),
    }

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
      return
    }
    setSaving(true)
    const r = await measurementsApi.add({ ...payload, projectId })
    setSaving(false)
    if (!r.ok) return setFormSummary(r.error)
    toast('Measurement saved from scanner capture.', 'success')
    setBadge({ text: 'Saved', cls: 'badge-success' })
    setSaved(true)
  }

  const l = parseFloat(wallLength)
  const h = parseFloat(wallHeight)
  const t = parseFloat(timberLength)
  const wallOk = isFinite(l) && isFinite(h) && l > 0 && h > 0
  const wallArea = wallOk ? `${(l * h).toFixed(2)} m²` : '—'
  const err = (k: string) => (errors[k] ? <span className="form-error">{errors[k]}</span> : null)
  const selectedRef = references.find((r) => r.id === reference)
  const qs = (o: Record<string, string>) => new URLSearchParams({ ...o, from: 'scanner' }).toString()

  return (
    <div className="scanner-module">
      <div className="module-header">
        <div>
          <span className="eyebrow">Data Capture</span>
          <h1>Camera Scanner</h1>
          <p className="text-secondary">Photograph timber or a wall with the PhentiBuild marker on it, tap the points, check the sizes, then save or calculate.</p>
        </div>
        <div className="module-header-actions">
          <ActiveProjectPicker />
        </div>
      </div>

      <div className="alert alert-info scanner-cv-notice">
        <span className="alert-icon">i</span>
        <div className="alert-body">
          <span className="alert-title">How to measure with the camera</span>
          <span>
            Print the <a href="/reference-card.html" target="_blank" rel="noopener">PhentiBuild markers</a>. Lay a card flat on the timber,
            or tape the A4 sheet flat on the wall, and photograph straight on with the whole piece or wall in view. The app finds the marker,
            then you tap the ends (timber) or corners (wall) to get real sizes.
            {configured ? ' Automatic recognition is on: the points are placed for you to check.' : ' Automatic recognition is off on this server, so you place the points yourself — measuring still works.'}
          </span>
        </div>
      </div>

      <div className="scanner-layout">
        <div className="card scanner-camera-card">
          <div className="scanner-camera-frame" style={still ? { display: 'none' } : undefined}>
            <video ref={videoRef} autoPlay playsInline muted hidden={!cameraOn} />
            <canvas ref={canvasRef} hidden />
            {!cameraOn && (
              <div className="scanner-camera-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8a1 1 0 0 1 1-1h2l1.5-2h7L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z" /><circle cx="12" cy="13" r="3.2" /></svg>
                <p>Camera is off</p>
              </div>
            )}
          </div>
          {still && (
            <PhotoMeasure src={still.dataUrl} width={still.width} height={still.height}
              markerCorners={marker?.corners ?? null}
              markerLabel={marker ? `${marker.markerSizeMm} mm marker` : null}
              shape={marker ? shape : null} points={points} onChange={setPoints} measurement={measurement} />
          )}
          <div className="scanner-status-bar">
            <span className="text-xs text-muted">Scanning status</span>
            <span className={`badge ${badge.cls}`}>{analysing && <span className="spinner scanner-badge-spinner" aria-hidden="true" />}{badge.text}</span>
          </div>
          {configured && (
            <div className="form-group scanner-reference">
              <label className="form-label" htmlFor="sc-reference">If there is no printed marker, the reference in the photo is</label>
              <select id="sc-reference" className="form-control" value={reference} disabled={analysing} onChange={(e) => setReference(e.target.value as ReferenceId)}>
                {references.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <span className="form-hint">{selectedRef?.size ? `Used only for an AI estimate (less precise than the marker): ${selectedRef.size}.` : 'Without a reference the scanner can only identify the object, not measure it.'}</span>
            </div>
          )}
          {cameraError && (
            <div className="alert alert-danger">
              <span className="alert-icon">!</span>
              <div className="alert-body"><span className="alert-title">Camera unavailable</span><span>{cameraError}</span></div>
            </div>
          )}
          <div className="scanner-camera-actions">
            {!cameraOn && !still && <button type="button" className="btn btn-primary" disabled={analysing} onClick={() => void startCamera()}>Start Camera</button>}
            {cameraOn && !still && <button type="button" className="btn btn-primary" disabled={analysing} onClick={() => void capture()}>Capture</button>}
            {still && <button type="button" className="btn btn-primary" disabled={analysing} onClick={discard}>New Photo</button>}
            <button type="button" className="btn btn-outline-secondary" disabled={analysing} onClick={() => fileRef.current?.click()}>Upload a Photo</button>
            {cameraOn && <button type="button" className="btn btn-outline-secondary" disabled={analysing} onClick={stopCamera}>Stop Camera</button>}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={onUpload} />
          </div>
        </div>

        {still && !analysing && (
          <div className="card scanner-result-card">
            <h3>Scan Result</h3>
            <dl className="scanner-result-facts">
              <dt>Scale</dt><dd>{marker ? `${marker.label} (${marker.quality} precision)` : 'No marker found'}</dd>
              <dt>Object</dt><dd>{types.find((x) => x.id === objectType)?.label || (detection?.status === 'not_recognised' ? 'Not recognised' : 'Choose below')}</dd>
              <dt>Measurement</dt>
              <dd>
                {measurement
                  ? shape === 'wall'
                    ? `Length ${formatM(measurement.length)} · Height ${formatM(measurement.height ?? 0)}`
                    : `Length ${formatM(measurement.length)}`
                  : marker && shape ? `Tap ${POINTS_NEEDED[shape] - points.length} more point${POINTS_NEEDED[shape] - points.length === 1 ? '' : 's'} on the photo` : '— (enter below)'}
              </dd>
              {measurement && (<><dt>Precision</dt><dd className={`scanner-precision is-${measurement.precision}`}>{PRECISION_TEXT[measurement.precision]}</dd></>)}
              {detection?.confidence != null && (<><dt>AI confidence</dt><dd>{Math.round(detection.confidence * 100)}%</dd></>)}
            </dl>
            {imprecise && (
              <div className="alert alert-warning">
                <span className="alert-icon">!</span>
                <div className="alert-body"><span>Low precision for this shot: the marker is small in the photo or the points are far from it. Move closer, shoot more straight on, or use the A4 marker sheet (it is far more precise than the card).</span></div>
              </div>
            )}
            {message && <p className="text-sm text-secondary">{message}</p>}

            <form noValidate className="scanner-edit-form" onSubmit={(e) => e.preventDefault()}>
              {formSummary && (
                <div className="alert alert-danger"><span className="alert-icon">!</span><div className="alert-body"><span>{formSummary}</span></div></div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="sc-object-type">Object Type <span className="required">*</span></label>
                <select id="sc-object-type" className="form-control" value={objectType} onChange={(e) => chooseObject(e.target.value)}>
                  <option value="">Select the object you captured…</option>
                  <optgroup label="Timber">{types.filter((x) => x.category === 'timber').map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</optgroup>
                  <optgroup label="Wall">{types.filter((x) => x.category === 'wall').map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</optgroup>
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
                  </div>
                </div>
              )}
            </form>

            <div className="scanner-result-actions">
              <button type="button" className="btn btn-primary" disabled={saving || saved} onClick={() => void confirmScan()}>{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Confirm & Save'}</button>
              <button type="button" className="btn btn-outline-secondary" onClick={discard}>Discard</button>
            </div>

            {(shape === 'wall' ? wallOk : shape === 'timber' ? isFinite(t) && t > 0 : false) && (
              <div className="scanner-calc-links">
                <span className="text-sm text-secondary">Calculate materials with these sizes:</span>
                {shape === 'wall' && (
                  <>
                    <Link className="btn btn-outline-secondary btn-sm" to={`/calculators/walls?${qs({ wallLength: String(l), wallHeight: String(h) })}`}>Blocks &amp; Mortar</Link>
                    <Link className="btn btn-outline-secondary btn-sm" to={`/calculators/plastering?${qs({ wallLength: String(l), wallHeight: String(h) })}`}>Plastering</Link>
                  </>
                )}
                {shape === 'timber' && (
                  <Link className="btn btn-outline-secondary btn-sm" to={`/calculators/timber?${qs({ timberType: TIMBER_SECTION[objectType] ?? '', timberLength: String(t) })}`}>Timber</Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card scanner-roadmap-card">
        <h3>What the Scanner Measures</h3>
        <p className="text-secondary">Photograph one of these with a PhentiBuild marker on it:</p>
        <ul className="scanner-roadmap-list">{types.map((x) => <li key={x.id}>{x.label}</li>)}</ul>
      </div>
    </div>
  )
}
