/**
 * Roof Studio store — TypeScript port of frontend/js/modules/roof-studio-store.js.
 *
 * Same behaviour: the current drawing (shapes) and roof properties live in
 * memory, every drawing change is ONE undoable step (max 100), edits are
 * saved to the backend in the background (debounced 500 ms) so drawing never
 * waits on the network.
 *
 * Changes for React:
 *  - saving/loading goes through the shared API client (adds the CSRF token
 *    Django requires; the old version sent raw fetch() calls)
 *  - subscribe() returns an unsubscribe function
 *  - flush() sends a pending save immediately (used when leaving the page)
 *  - one design per project: load(projectId) switches design; null = your
 *    own design, not tied to a project. A pending edit is saved to the
 *    design it was made on BEFORE switching.
 */
import { request } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import { roofGeometry } from './roofGeometry.js'
import type { Shape } from './roofGeometry'

export type RoofProperties = {
  roofType: string; length: string; width: string; pitch: string
  rafterSpacing: string; purlinSpacing: string; roofingMaterial: string
}

const SAVE_DEBOUNCE_MS = 500
const MAX_HISTORY = 100
export const DEFAULT_PROPERTIES: RoofProperties = {
  roofType: 'Gable Roof', length: '', width: '', pitch: '', rafterSpacing: '', purlinSpacing: '', roofingMaterial: '',
}

let subscribers: (() => void)[] = []
let shapes: Shape[] = []
let properties: RoofProperties = { ...DEFAULT_PROPERTIES }
let history: Shape[][] = [[]]
let historyIndex = 0
let saveTimer: number | undefined
let pendingSave = false
let loaded = false
/** Which design is in memory: `${userId}:${projectId ?? 'own'}` (null = none yet). */
let loadedKey: string | null = null
let currentProjectId: number | null = null
let loadToken = 0
let notifyError: (message: string) => void = () => {}

const cloneShapes = (list: Shape[]): Shape[] =>
  list.map((s) => ({ id: s.id, type: s.type, points: s.points.map((p) => ({ x: p.x, y: p.y })) }))

function notify() {
  subscribers.forEach((fn) => fn())
}

async function save() {
  pendingSave = false
  const query = currentProjectId ? { projectId: currentProjectId } : undefined
  const r = await request('PUT', endpoints.roofDesigns, { query, body: { shapes, properties } })
  if (!r.ok) notifyError('Roof design changes could not be saved to the server. Check your connection.')
}

function scheduleSave() {
  // Never save before the design has loaded: that would overwrite the
  // saved design with a blank one.
  if (!loaded) return
  window.clearTimeout(saveTimer)
  pendingSave = true
  saveTimer = window.setTimeout(() => void save(), SAVE_DEBOUNCE_MS)
}

function commitShapes(newShapes: Shape[]) {
  shapes = cloneShapes(newShapes)
  history = history.slice(0, historyIndex + 1)
  history.push(cloneShapes(shapes))
  if (history.length > MAX_HISTORY) history.shift()
  historyIndex = history.length - 1
  scheduleSave()
  notify()
}

export const roofStudioStore = {
  /**
   * Load a design: a project's (projectId) or the person's own (null).
   * Loading the design that is already in memory is a no-op. `userId`
   * makes sure a different person logging in on the same tab never sees
   * the previous person's drawing.
   */
  async load(projectId: number | null, userId: number | undefined, onError: (message: string) => void): Promise<void> {
    notifyError = onError
    const key = `${userId ?? '?'}:${projectId ?? 'own'}`
    if (loaded && loadedKey === key) return
    roofStudioStore.flush() // an unsaved edit goes to the design it was made on
    const token = ++loadToken
    loaded = false
    loadedKey = key
    currentProjectId = projectId
    shapes = []; properties = { ...DEFAULT_PROPERTIES }; history = [[]]; historyIndex = 0
    notify()
    const r = await request<{ shapes: Shape[]; properties: Partial<RoofProperties> }>('GET', endpoints.roofDesigns, {
      query: projectId ? { projectId } : undefined,
    })
    if (token !== loadToken) return // another design was chosen meanwhile
    if (!r.ok) {
      loadedKey = null
      // 404 = a remembered project that is gone; the picker clears it and the own design loads.
      if (r.status !== 401 && r.status !== 404) onError(projectId ? 'Could not load this project’s roof design.' : 'Could not load the saved roof design from the server.')
      return
    }
    loaded = true
    shapes = Array.isArray(r.data.shapes) ? r.data.shapes : []
    properties = { ...DEFAULT_PROPERTIES, ...(r.data.properties || {}) }
    roofGeometry.seedShapeIdCounter(shapes)
    history = [cloneShapes(shapes)]
    historyIndex = 0
    notify()
  },
  /** Send any not-yet-saved change right now (e.g. when leaving the page). */
  flush(): void {
    if (!pendingSave) return
    window.clearTimeout(saveTimer)
    void save()
  },
  isLoaded: () => loaded,
  getShapes: (): Shape[] => cloneShapes(shapes),
  getProperties: (): RoofProperties => ({ ...properties }),
  addShape: (shape: Shape) => commitShapes(shapes.concat([shape])),
  removeShape: (id: string) => commitShapes(shapes.filter((s) => s.id !== id)),
  clearShapes: () => commitShapes([]),
  /** Replace the whole design at once (used by an accepted AI proposal). */
  setProperty(key: keyof RoofProperties, value: string) {
    if (!(key in DEFAULT_PROPERTIES)) return
    properties[key] = value
    scheduleSave()
    notify()
  },
  canUndo: () => historyIndex > 0,
  canRedo: () => historyIndex < history.length - 1,
  undo() {
    if (historyIndex <= 0) return
    historyIndex -= 1
    shapes = cloneShapes(history[historyIndex])
    scheduleSave()
    notify()
  },
  redo() {
    if (historyIndex >= history.length - 1) return
    historyIndex += 1
    shapes = cloneShapes(history[historyIndex])
    scheduleSave()
    notify()
  },
  subscribe(fn: () => void): () => void {
    subscribers.push(fn)
    return () => { subscribers = subscribers.filter((s) => s !== fn) }
  },
  /** Test helper: forget everything (not used by the app). */
  _reset() {
    subscribers = []; shapes = []; properties = { ...DEFAULT_PROPERTIES }; history = [[]]; historyIndex = 0; loaded = false
    loadedKey = null; currentProjectId = null
  },
}
