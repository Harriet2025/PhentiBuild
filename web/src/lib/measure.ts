/**
 * Photo measuring maths (runs in the browser, so dragging a point updates
 * the length instantly - no server round-trip).
 *
 * The server finds the printed marker and returns its 4 corners in photo
 * pixels + its real size. From those we solve a "homography": the exact
 * mapping from photo pixels to millimetres on the surface the marker lies
 * on. Distances between tapped points are then real distances.
 *
 * Each measurement carries a precision rating (see precisionOf).
 */
export type Pt = { x: number; y: number }
export type Homography = number[][] // 3x3

/** Solve the 8x8 linear system for the 4-point homography src -> dst. */
export function solveHomography(src: Pt[], dst: Pt[]): Homography | null {
  if (src.length !== 4 || dst.length !== 4) return null
  const A: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]
    const { x: u, y: v } = dst[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v)
  }
  // Gaussian elimination with partial pivoting.
  const n = 8
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r
    if (Math.abs(A[pivot][col]) < 1e-12) return null
    ;[A[col], A[pivot]] = [A[pivot], A[col]]
    ;[b[col], b[pivot]] = [b[pivot], b[col]]
    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / A[col][col]
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c]
      b[r] -= f * b[col]
    }
  }
  const h = new Array(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]
    for (let c = r + 1; c < n; c++) s -= A[r][c] * h[c]
    h[r] = s / A[r][r]
  }
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]]
}

export function apply(H: Homography, p: Pt): Pt {
  const w = H[2][0] * p.x + H[2][1] * p.y + H[2][2]
  return { x: (H[0][0] * p.x + H[0][1] * p.y + H[0][2]) / w, y: (H[1][0] * p.x + H[1][1] * p.y + H[1][2]) / w }
}

/** Real distance in metres between two photo points on the marker's surface. */
export function distanceM(H: Homography, a: Pt, b: Pt): number {
  const A = apply(H, a)
  const B = apply(H, b)
  return Math.hypot(A.x - B.x, A.y - B.y) / 1000
}

export type Shape = 'timber' | 'wall'
export const POINTS_NEEDED: Record<Shape, number> = { timber: 2, wall: 4 }

/** Timber: length between the 2 ends. Wall: average of opposite edges of the 4 corners (TL, TR, BR, BL). */
export function dimensions(H: Homography, shape: Shape, pts: Pt[]): { length: number; height: number | null } | null {
  if (pts.length !== POINTS_NEEDED[shape]) return null
  if (shape === 'timber') return { length: distanceM(H, pts[0], pts[1]), height: null }
  const [tl, tr, br, bl] = pts
  return {
    length: (distanceM(H, tl, tr) + distanceM(H, bl, br)) / 2,
    height: (distanceM(H, tl, bl) + distanceM(H, tr, br)) / 2,
  }
}

export type Precision = 'high' | 'medium' | 'low'

/**
 * How far to trust a photo measurement. Driven by the two things that
 * actually control accuracy (checked in server/tests/test_markers.py and
 * scratch accuracy runs on angled synthetic photos):
 *  - how big the marker is in the photo (side length in pixels), and
 *  - how far the measured points reach beyond it (span / marker side).
 * A numeric ± can't be calibrated honestly without real site photos, so the
 * rating states what the tests showed instead.
 */
export const PRECISION_TEXT: Record<Precision, string> = {
  high: 'high precision — usually within 2%',
  medium: 'medium precision — usually within 5%',
  low: 'low precision — may be off by more than 5%',
}

export function precisionOf(markerCorners: Pt[], pts: Pt[]): { level: Precision; sidePx: number; reach: number } {
  const side = markerCorners.reduce((s, p, i) => {
    const q = markerCorners[(i + 1) % markerCorners.length]
    return s + Math.hypot(p.x - q.x, p.y - q.y)
  }, 0) / markerCorners.length
  let span = 0
  for (const a of pts) for (const b of pts) span = Math.max(span, Math.hypot(a.x - b.x, a.y - b.y))
  const reach = side > 0 ? span / side : Infinity
  const level: Precision = side >= 90 && reach <= 12 ? 'high' : side >= 40 && reach <= 30 ? 'medium' : 'low'
  return { level, sidePx: side, reach }
}

export type Measurement = { length: number; height: number | null; precision: Precision }

/** Measure between the points on the marker's surface, with a precision rating. */
export function measure(markerCorners: Pt[], markerSizeMm: number, shape: Shape, pts: Pt[]): Measurement | null {
  const plane: Pt[] = [{ x: 0, y: 0 }, { x: markerSizeMm, y: 0 }, { x: markerSizeMm, y: markerSizeMm }, { x: 0, y: markerSizeMm }]
  const H = solveHomography(markerCorners, plane)
  if (!H) return null
  const d = dimensions(H, shape, pts)
  if (!d || !isFinite(d.length) || (d.height !== null && !isFinite(d.height))) return null
  return { ...d, precision: precisionOf(markerCorners, pts).level }
}

/** "3.62 m" */
export const formatM = (value: number) => `${value.toFixed(2)} m`
