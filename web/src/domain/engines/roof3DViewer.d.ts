/* Types for ./roof3DViewer.js (Three.js r128 scene + orbit camera). */
export type Roof3DViewerApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setModel: (model: any) => void
  setComponentVisible: (name: string, visible: boolean) => void
  getComponentVisible: (name: string) => boolean
  resetView: () => void
  resize: () => void
  dispose: () => void
  getCameraState: () => { azimuth: number; polar: number; distance: number }
}
export declare const roof3DViewer: { init: (canvas: HTMLCanvasElement) => Roof3DViewerApi | null }
