import { useCallback, useEffect, useRef, useState } from 'react'
import { materialsApi } from '../../api/resources/materials'
import { useAuth } from '../../auth/AuthContext'
import { ActiveProjectPicker } from '../../components/ProjectPicker'
import { useToast } from '../../components/Toast'
import { useActiveProjectId } from '../../lib/activeProject'
import { roof3DBuilder } from '../../domain/engines/roof3DBuilder.js'
import { roof3DViewer, type Roof3DViewerApi } from '../../domain/engines/roof3DViewer.js'
import { roofStudioCanvas, type RoofCanvasApi, type Tool } from '../../domain/engines/roofStudioCanvas.js'
import { roofStudioStore as store, type RoofProperties } from '../../domain/engines/roofStudioStore'
import { RoofAIModal } from './RoofAIModal'

/**
 * Port of pages/modules/roof-studio.php + roof-studio.js + roof-3d.js.
 * The drawing engine (2D canvas) and the Three.js viewer are the original
 * code (converted to modules); this component wires them to React and —
 * new — tears them down properly when you leave the page.
 */
type Status = {
  tool: Tool; zoom: number; snapEnabled: boolean; selectedShapeId: string | null; shapeCount: number
  canUndo: boolean; canRedo: boolean; cursorWorld: { x: number; y: number } | null; isDrawingPolygon: boolean
}
const TOOL_LABELS: Record<string, string> = { select: 'Select', line: 'Line', rectangle: 'Rectangle', polygon: 'Polygon', pan: 'Pan' }
const FALLBACK_ROOFING_MATERIALS = ['IBR Long Span Roofing Sheet', 'Self-Lock Long Span Roofing Sheet', 'Eurotile Roofing Sheet', 'Milano Roof Tile', 'Asphalt Shingles']
const COMPONENTS: [string, string][] = [['roofPlanes', 'Roof Planes'], ['rafters', 'Rafters'], ['purlins', 'Purlins'], ['battens', 'Battens'], ['ridge', 'Ridge'], ['hipStructures', 'Hip Structures']]

const TOOLS: { id: Tool; label: string; title: string; icon: React.ReactNode }[] = [
  { id: 'select', label: 'Select', title: 'Select (V)', icon: <path d="M5 3l14 8-6 1.5L11 19z" /> },
  { id: 'line', label: 'Line', title: 'Line (L)', icon: <><line x1="5" y1="19" x2="19" y2="5" /><circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="5" r="1.6" fill="currentColor" stroke="none" /></> },
  { id: 'rectangle', label: 'Rectangle', title: 'Rectangle (R)', icon: <rect x="4" y="6" width="16" height="12" rx="1" /> },
  { id: 'polygon', label: 'Polygon', title: 'Polygon (P)', icon: <path d="M12 3l8 6-3 10H7L4 9z" /> },
  { id: 'pan', label: 'Pan', title: 'Pan (H, or hold Space)', icon: <><path d="M9 11V6a1.5 1.5 0 0 1 3 0v5" /><path d="M12 10.5V5a1.5 1.5 0 0 1 3 0v6" /><path d="M15 10.5V7a1.5 1.5 0 0 1 3 0v7c0 3.5-2 6-5.5 6h-1C8 20 6 18 6 15v-3a1.4 1.4 0 0 1 2.8-.3" /></> },
]

const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

export function RoofStudioPage() {
  const toast = useToast()
  const { user } = useAuth()
  const projectId = useActiveProjectId() // which design: a project's, or your own (null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvas3dRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<RoofCanvasApi | null>(null)
  const viewerRef = useRef<Roof3DViewerApi | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [props, setProps] = useState<RoofProperties>(store.getProperties())
  const [materials, setMaterials] = useState<string[]>([])
  const [view, setView] = useState<'2d' | '3d'>('2d')
  const [visible, setVisible] = useState<Record<string, boolean>>(Object.fromEntries(COMPONENTS.map(([k]) => [k, true])))
  const [savedFlash, setSavedFlash] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [webglFailed, setWebglFailed] = useState(false)
  const flashTimer = useRef<number | undefined>(undefined)
  const visibleRef = useRef(visible)
  useEffect(() => { visibleRef.current = visible }, [visible])

  const flashSaved = useCallback(() => {
    setSavedFlash(true)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setSavedFlash(false), 600)
  }, [])

  /** (Re)build the 3D model from the current drawing + properties. */
  const rebuild3D = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const built = roof3DBuilder.build(store.getShapes(), store.getProperties())
    if (!built) return
    viewer.setModel(built)
    Object.entries(visibleRef.current).forEach(([name, on]) => viewer.setComponentVisible(name, on))
  }, [])

  // 2D engine + store: created once on mount, destroyed on unmount.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = roofStudioCanvas.init(canvas, { onStatusChange: (s: Status) => setStatus({ ...s }) })
    engineRef.current = engine
    const unsubscribe = store.subscribe(() => {
      setProps(store.getProperties())
      flashSaved()
      rebuild3D()
    })
    return () => {
      unsubscribe()
      engine.destroy()
      engineRef.current = null
      store.flush() // don't lose an edit made in the last half-second
      viewerRef.current?.dispose()
      viewerRef.current = null
      window.clearTimeout(flashTimer.current)
    }
  }, [toast, flashSaved, rebuild3D])

  // Load the chosen design (and switch when the project changes). The 2D
  // canvas and the 3D model follow the store, so they redraw by themselves.
  useEffect(() => {
    void store.load(projectId, user?.id, (msg) => toast(msg, 'danger'))
  }, [projectId, user?.id, toast])

  // Roofing material options come from the Materials Catalog (fallback list if empty/unavailable).
  useEffect(() => {
    materialsApi.getAll().then((r) => {
      const names = r.ok ? r.data.filter((m) => m.category === 'Roofing').map((m) => m.name) : []
      setMaterials(names.length ? names : FALLBACK_ROOFING_MATERIALS)
    })
  }, [])

  function showView(next: '2d' | '3d') {
    setView(next)
    if (next !== '3d') return
    // Wait one frame so the 3D panel is visible (and has a size) before the viewer measures it.
    requestAnimationFrame(() => {
      if (!viewerRef.current && canvas3dRef.current) {
        const viewer = roof3DViewer.init(canvas3dRef.current)
        if (!viewer) return setWebglFailed(true)
        viewerRef.current = viewer
      }
      rebuild3D()
      viewerRef.current?.resize()
    })
  }

  const setProperty = (key: keyof RoofProperties, value: string) => {
    store.setProperty(key, value)
    flashSaved()
  }
  const isFlat = /flat|hidden/i.test(props.roofType || '')

  const textProp = (key: keyof RoofProperties, label: string, placeholder: string, hint?: string) => (
    <div className="form-group">
      <label className="form-label" htmlFor={`rs-${key}`}>{label}</label>
      <input type="text" id={`rs-${key}`} className="form-control form-control-numeric" inputMode="decimal" placeholder={placeholder}
        autoComplete="off" value={props[key] || ''} onChange={(e) => setProperty(key, e.target.value)} />
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  )

  return (
    <div className="roof-studio-module">
      <div className="module-header">
        <div>
          <span className="eyebrow">Tools</span>
          <h1>Roof Studio</h1>
          <p className="text-secondary">Draw a roof plan, record its structural parameters and preview the structure in 3D.</p>
        </div>
        <div className="rs-header-actions">
          <ActiveProjectPicker label="Roof design for" noneLabel="My own design (no project)" />
          <span className={`text-sm text-muted${savedFlash ? ' is-flash' : ''}`}>Saved</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setAiOpen(true)}>Generate with AI</button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => {
            if (!store.getShapes().length) return
            store.clearShapes()
            toast('Drawing cleared. Press Ctrl+Z to undo.', 'success')
          }}>Clear Drawing</button>
        </div>
      </div>

      <div className="rs-view-tabs" role="tablist" aria-label="Roof view">
        {(['2d', '3d'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} className={`rs-view-tab${view === v ? ' is-active' : ''}`} onClick={() => showView(v)}>
            {v === '2d' ? '2D Plan' : '3D View'}
          </button>
        ))}
      </div>

      <div className="rs-workspace">
        <div className="rs-view-panels">
          {/* 2D stays mounted while the 3D tab is shown, so the drawing engine keeps its state. */}
          <div className="rs-view-panel" hidden={view !== '2d'}>
            <div className="rs-toolbar" role="toolbar" aria-label="Drawing tools">
              <div className="rs-tool-group">
                {TOOLS.map((t) => (
                  <button key={t.id} type="button" title={t.title} className={`rs-tool-btn${status?.tool === t.id ? ' is-active' : ''}`} onClick={() => engineRef.current?.setTool(t.id)}>
                    <Svg>{t.icon}</Svg><span>{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="rs-tool-divider" />
              <div className="rs-tool-group">
                <button type="button" className="rs-tool-btn" title="Delete selected (Del)" disabled={!status?.selectedShapeId} onClick={() => engineRef.current?.deleteSelected()}>
                  <Svg><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg><span>Delete</span>
                </button>
                <button type="button" className="rs-tool-btn" title="Undo (Ctrl+Z)" disabled={!status?.canUndo} onClick={() => store.undo()}>
                  <Svg><path d="M7 8L3 12l4 4" /><path d="M3 12h11a5 5 0 0 1 0 10h-1" /></Svg><span>Undo</span>
                </button>
                <button type="button" className="rs-tool-btn" title="Redo (Ctrl+Y)" disabled={!status?.canRedo} onClick={() => store.redo()}>
                  <Svg><path d="M17 8l4 4-4 4" /><path d="M21 12H10a5 5 0 0 0 0 10h1" /></Svg><span>Redo</span>
                </button>
              </div>
              <div className="rs-tool-divider" />
              <div className="rs-tool-group">
                <button type="button" className="rs-tool-btn rs-tool-btn-icon" title="Zoom out" onClick={() => engineRef.current?.zoomOut()}>
                  <Svg><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></Svg>
                </button>
                <span className="rs-zoom-readout">{Math.round((status?.zoom ?? 1) * 100)}%</span>
                <button type="button" className="rs-tool-btn rs-tool-btn-icon" title="Zoom in" onClick={() => engineRef.current?.zoomIn()}>
                  <Svg><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></Svg>
                </button>
                <button type="button" className="rs-tool-btn" title="Fit drawing to view" onClick={() => engineRef.current?.zoomFit()}>
                  <Svg><path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" /></Svg><span>Fit</span>
                </button>
              </div>
              <div className="rs-tool-divider" />
              <label className="rs-snap-toggle">
                <input type="checkbox" checked={status?.snapEnabled ?? true} onChange={(e) => engineRef.current?.setSnapEnabled(e.target.checked)} />
                Snap to grid
              </label>
            </div>
            <div className="rs-canvas-wrap">
              <canvas ref={canvasRef} />
              {status?.isDrawingPolygon && <div className="rs-hint">Click to add points. Double-click, or press Enter, to finish. Esc to cancel.</div>}
            </div>
            <div className="rs-statusbar">
              <span>{TOOL_LABELS[status?.tool ?? 'select']}</span>
              <span>{status?.cursorWorld ? `x: ${status.cursorWorld.x.toFixed(2)} m, y: ${status.cursorWorld.y.toFixed(2)} m` : 'x: 0.00 m, y: 0.00 m'}</span>
              <span>{status?.selectedShapeId ? `Selected: ${status.selectedShapeId}` : 'No selection'}</span>
            </div>
          </div>

          <div className="rs-view-panel" hidden={view !== '3d'}>
            <div className="rs-toolbar" role="toolbar" aria-label="3D view controls">
              <div className="rs-tool-group">
                <button type="button" className="rs-tool-btn" title="Reset view" onClick={() => viewerRef.current?.resetView()}>
                  <Svg><path d="M3 12a9 9 0 1 1 2.6 6.4" /><path d="M3 21v-6h6" /></Svg><span>Reset View</span>
                </button>
              </div>
              <div className="rs-tool-divider" />
              <div className="rs-toggle-group" role="group" aria-label="Toggle structural components">
                {COMPONENTS.map(([key, label]) => {
                  const disabled = isFlat && (key === 'ridge' || key === 'hipStructures')
                  return (
                    <label key={key} className={`rs-toggle-item${disabled ? ' is-disabled' : ''}`}>
                      <input type="checkbox" checked={visible[key]} disabled={disabled} onChange={(e) => {
                        setVisible((v) => ({ ...v, [key]: e.target.checked }))
                        viewerRef.current?.setComponentVisible(key, e.target.checked)
                      }} />
                      {label}
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="rs-canvas-wrap">
              <canvas ref={canvas3dRef} />
              <div className="rs-hint">Drag to rotate · Scroll to zoom · Right-drag or Shift+drag to pan</div>
              {webglFailed && <div className="rs-3d-unsupported">3D preview isn’t available on this device — WebGL could not be started. Try another browser or device.</div>}
            </div>
          </div>
        </div>

        <aside className="rs-properties card">
          <div className="card-header"><h4>Roof Properties</h4></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label" htmlFor="rs-roofType">Roof Type</label>
              <select id="rs-roofType" className="form-control" value={props.roofType} onChange={(e) => setProperty('roofType', e.target.value)}>
                <option>Gable Roof</option><option>Hip Roof</option><option>Hidden/Flat Roof</option>
              </select>
            </div>
            <div className="form-row">{textProp('length', 'Length (m)', 'e.g. 12')}{textProp('width', 'Width (m)', 'e.g. 9')}</div>
            {textProp('pitch', 'Pitch (°)', 'e.g. 30', 'Typical: 0–5° for flat roofs, 15–45° for pitched roofs.')}
            <div className="form-row">{textProp('rafterSpacing', 'Rafter Spacing (mm)', 'e.g. 600')}{textProp('purlinSpacing', 'Purlin Spacing (mm)', 'e.g. 900')}</div>
            <div className="form-group">
              <label className="form-label" htmlFor="rs-roofingMaterial">Roofing Material</label>
              <select id="rs-roofingMaterial" className="form-control" value={props.roofingMaterial} onChange={(e) => setProperty('roofingMaterial', e.target.value)}>
                <option value="">Select a roofing material…</option>
                {props.roofingMaterial && !materials.includes(props.roofingMaterial) && <option value={props.roofingMaterial}>{props.roofingMaterial}</option>}
                {materials.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className="form-hint">Sourced from the Materials Catalog.</span>
            </div>
          </div>
          <div className="card-footer">
            <span className="text-xs text-muted">{status?.shapeCount ?? 0} {(status?.shapeCount ?? 0) === 1 ? 'shape' : 'shapes'}</span>
          </div>
        </aside>
      </div>

      <RoofAIModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  )
}
