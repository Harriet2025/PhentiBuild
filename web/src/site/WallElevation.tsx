import { masonry } from '../domain/engines/masonry.js'

/**
 * Hero drawing: a 4.50 m x 2.70 m blockwork wall elevation that builds
 * itself course by course, gets dimensioned, and is then priced out.
 * The figures in the callout come from PhentiBuild's real masonry engine
 * (the same one the Block & Mortar calculator uses) - nothing is made up.
 */
const WALL = { length: 4.5, height: 2.7, block: [450, 225] as const, waste: 5 }
const SCALE = 104 // px per metre in the drawing
const X0 = 70
const Y0 = 28
const W = WALL.length * SCALE
const H = WALL.height * SCALE
const BW = (WALL.block[0] / 1000) * SCALE
const BH = (WALL.block[1] / 1000) * SCALE
const COURSES = Math.round(WALL.height / (WALL.block[1] / 1000))
// The real PhentiBuild A4 wall marker (ArUco DICT_4X4_50, id 9) - drawn as on the printed sheet.
const MARKER = ['111111', '100111', '100001', '110101', '110011', '111111']

const result = masonry.calculate({
  wallLength: WALL.length, wallHeight: WALL.height, wallThickness: 150,
  blockLength: WALL.block[0], blockHeight: WALL.block[1], blockLengthUnit: 'mm', blockHeightUnit: 'mm',
  mortarAllowance: 10, mortarAllowanceUnit: 'mm', wastePercent: WALL.waste,
}) as { wallAreaM2: number; blockCountFinal: number; mortarVolumeM3: number }

export function WallElevation() {
  const courses = Array.from({ length: COURSES }, (_, c) => {
    const y = Y0 + H - (c + 1) * BH
    const offset = c % 2 === 0 ? 0 : BW / 2
    const blocks: { x: number; w: number }[] = []
    for (let x = -offset; x < W - 0.01; x += BW) {
      const left = Math.max(0, x)
      const right = Math.min(W, x + BW)
      if (right - left > 0.5) blocks.push({ x: X0 + left, w: right - left })
    }
    return { y, blocks }
  })
  const markerSize = 0.15 * SCALE // the 150 mm marker
  const mx = X0 + W * 0.62
  const my = Y0 + H * 0.36

  return (
    <figure className="ps-elevation" aria-label={`Drawing: a ${WALL.length.toFixed(2)} m by ${WALL.height.toFixed(2)} m blockwork wall, ${result.wallAreaM2} square metres, needing ${result.blockCountFinal} blocks`}>
      <svg viewBox={`0 0 ${X0 + W + 40} ${Y0 + H + 86}`} role="img">
        <defs>
          <pattern id="ps-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="ps-el-hatch" />
          </pattern>
        </defs>
        {/* ground line + footing */}
        <rect x={X0 - 14} y={Y0 + H} width={W + 28} height="14" fill="url(#ps-hatch)" className="ps-el-footing" />
        <line x1={X0 - 40} y1={Y0 + H} x2={X0 + W + 30} y2={Y0 + H} className="ps-el-ground" />
        {/* courses, laid bottom-up */}
        {courses.map((course, i) => (
          <g key={i} className="ps-el-course" style={{ animationDelay: `${0.25 + i * 0.11}s` }}>
            {course.blocks.map((b, k) => <rect key={k} x={b.x + 0.8} y={course.y + 0.8} width={b.w - 1.6} height={BH - 1.6} rx="0.6" className="ps-el-block" />)}
          </g>
        ))}
        {/* the printed marker sheet taped on the wall */}
        <g className="ps-el-marker" style={{ animationDelay: `${0.25 + COURSES * 0.11 + 0.2}s` }}>
          <rect x={mx - 6} y={my - 6} width={markerSize + 12} height={markerSize * 1.6} className="ps-el-sheet" />
          {MARKER.flatMap((row, r) => [...row].map((bit, c) => bit === '1'
            ? <rect key={`${r}-${c}`} x={mx + (c * markerSize) / 6} y={my + (r * markerSize) / 6} width={markerSize / 6 + 0.2} height={markerSize / 6 + 0.2} className="ps-el-bit" />
            : null))}
        </g>
        {/* dimension lines */}
        <g className="ps-el-dims" style={{ animationDelay: `${0.25 + COURSES * 0.11 + 0.4}s` }}>
          <line x1={X0} y1={Y0 + H + 44} x2={X0 + W} y2={Y0 + H + 44} className="ps-el-dim" />
          <line x1={X0} y1={Y0 + H + 22} x2={X0} y2={Y0 + H + 54} className="ps-el-ext" />
          <line x1={X0 + W} y1={Y0 + H + 22} x2={X0 + W} y2={Y0 + H + 54} className="ps-el-ext" />
          <path d={`M${X0 - 5} ${Y0 + H + 49} l10 -10 M${X0 + W - 5} ${Y0 + H + 49} l10 -10`} className="ps-el-tick" />
          <text x={X0 + W / 2} y={Y0 + H + 38} className="ps-el-dimtext" textAnchor="middle">{WALL.length.toFixed(2)} m</text>

          <line x1={X0 - 40} y1={Y0} x2={X0 - 40} y2={Y0 + H} className="ps-el-dim" />
          <line x1={X0 - 50} y1={Y0} x2={X0 - 6} y2={Y0} className="ps-el-ext" />
          <path d={`M${X0 - 45} ${Y0 + 5} l10 -10 M${X0 - 45} ${Y0 + H + 5} l10 -10`} className="ps-el-tick" />
          <text x={X0 - 48} y={Y0 + H / 2} className="ps-el-dimtext" textAnchor="middle" transform={`rotate(-90 ${X0 - 48} ${Y0 + H / 2})`}>{WALL.height.toFixed(2)} m</text>
        </g>
      </svg>
      <figcaption className="ps-elevation-calc" style={{ animationDelay: `${0.25 + COURSES * 0.11 + 0.8}s` }}>
        <span className="ps-calc-row"><span>Wall area</span><b>{result.wallAreaM2.toFixed(2)} m²</b></span>
        <span className="ps-calc-row"><span>Blocks 450 × 225 (+{WALL.waste}%)</span><b>{result.blockCountFinal} pcs</b></span>
        <span className="ps-calc-row"><span>Mortar</span><b>{result.mortarVolumeM3.toFixed(3)} m³</b></span>
        <span className="ps-calc-foot">Calculated by PhentiBuild’s masonry engine</span>
      </figcaption>
    </figure>
  )
}
