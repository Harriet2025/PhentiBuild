/* Types for ./roofStudioCanvas.js (2D roof drawing engine). */
export type Tool = 'select' | 'line' | 'rectangle' | 'polygon' | 'pan'
export type CanvasStatus = Record<string, unknown>
export type RoofCanvasApi = {
  setTool: (tool: Tool) => void
  getTool: () => Tool
  setSnapEnabled: (on: boolean) => void
  getSnapEnabled: () => boolean
  zoomIn: () => void
  zoomOut: () => void
  zoomFit: () => void
  getZoom: () => number
  deleteSelected: () => void
  getSelectedShapeId: () => string | null
  cancelDrawing: () => void
  finalizePolygon: () => void
  destroy: () => void
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare const roofStudioCanvas: { init: (canvas: HTMLCanvasElement, options?: Record<string, any>) => RoofCanvasApi }
