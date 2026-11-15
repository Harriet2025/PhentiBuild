import { useRef, useState, type PointerEvent } from 'react'
import { formatM, POINTS_NEEDED, type Measurement, type Pt, type Shape } from '../../lib/measure'
import '../../styles/react/photo-measure.css'

/**
 * The captured photo with a measuring layer on top:
 *  - the printed marker found by the server is outlined (so you can see the
 *    scale came from the right place);
 *  - tap to place the points (timber: 2 ends; wall: 4 corners), drag to
 *    adjust; lengths update live.
 * Coordinates are always in the photo's own pixels, whatever size it is shown at.
 */
const CORNER_NAMES = ['top-left', 'top-right', 'bottom-right', 'bottom-left']

export function PhotoMeasure({ src, width, height, markerCorners, markerLabel, shape, points, onChange, measurement }: {
  src: string
  width: number
  height: number
  markerCorners: [number, number][] | null
  markerLabel: string | null
  shape: Shape | null
  points: Pt[]
  onChange: (points: Pt[]) => void
  measurement: Measurement | null
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const needed = shape ? POINTS_NEEDED[shape] : 0
  const unit = Math.max(width, height) / 100 // scales handles and text with the photo
  const r = unit * 1.6

  /** Screen position -> photo pixel. */
  function toPhoto(e: PointerEvent): Pt {
    const box = svgRef.current!.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * width
    const y = ((e.clientY - box.top) / box.height) * height
    return { x: Math.min(width, Math.max(0, x)), y: Math.min(height, Math.max(0, y)) }
  }

  function onSurfaceDown(e: PointerEvent<SVGSVGElement>) {
    if (!shape || dragging !== null || points.length >= needed) return
    onChange([...points, toPhoto(e)])
  }

  function onHandleDown(i: number, e: PointerEvent<SVGCircleElement>) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(i)
  }

  function onHandleMove(i: number, e: PointerEvent<SVGCircleElement>) {
    if (dragging !== i) return
    const p = toPhoto(e)
    onChange(points.map((q, k) => (k === i ? p : q)))
  }

  const label = (text: string, at: Pt, key: string) => (
    <text key={key} x={at.x} y={at.y} className="pm-label" fontSize={unit * 2.6} strokeWidth={unit * 0.7} textAnchor="middle" dominantBaseline="central">{text}</text>
  )
  const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

  let hint = ''
  if (shape === 'timber') hint = points.length < 2 ? `Tap ${points.length === 0 ? 'one end' : 'the other end'} of the timber.` : 'Drag the points onto the exact ends if needed.'
  if (shape === 'wall') hint = points.length < 4 ? `Tap the wall's ${CORNER_NAMES[points.length]} corner.` : 'Drag the corners onto the exact wall edges if needed.'
  if (!shape) hint = 'Choose the object type below to start measuring.'

  return (
    <div className="pm">
      <div className="pm-hint">
        <span>{hint}</span>
        {shape && points.length > 0 && (
          <span className="pm-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(points.slice(0, -1))}>Undo point</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([])}>Clear</button>
          </span>
        )}
      </div>
      <div className="pm-stage">
        <img src={src} alt="Captured photo" draggable={false} />
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
          className={`pm-overlay${shape && points.length < needed ? ' is-placing' : ''}`}
          onPointerDown={onSurfaceDown} role="img" aria-label="Measuring layer">
          {markerCorners && (
            <>
              <polygon className="pm-marker" points={markerCorners.map(([x, y]) => `${x},${y}`).join(' ')} strokeWidth={unit * 0.5} />
              {markerLabel && label(markerLabel, { x: markerCorners[0][0] + (markerCorners[1][0] - markerCorners[0][0]) / 2, y: Math.min(...markerCorners.map((c) => c[1])) - unit * 3 }, 'marker')}
            </>
          )}
          {shape === 'timber' && points.length === 2 && (
            <>
              <line className="pm-line" x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y} strokeWidth={unit * 0.6} />
              {measurement && label(formatM(measurement.length), { ...mid(points[0], points[1]), y: mid(points[0], points[1]).y - unit * 3.5 }, 'len')}
            </>
          )}
          {shape === 'wall' && points.length >= 2 && (
            <polyline className="pm-line" points={[...points, ...(points.length === 4 ? [points[0]] : [])].map((p) => `${p.x},${p.y}`).join(' ')} strokeWidth={unit * 0.6} fill="none" />
          )}
          {shape === 'wall' && points.length === 4 && measurement && (
            <>
              {label(`Length ${formatM(measurement.length)}`, { ...mid(points[0], points[1]), y: mid(points[0], points[1]).y - unit * 3.5 }, 'wl')}
              {measurement.height !== null && label(`Height ${formatM(measurement.height)}`, { x: mid(points[0], points[3]).x + unit * 14, y: mid(points[0], points[3]).y }, 'wh')}
            </>
          )}
          {points.map((p, i) => (
            <g key={i}>
              <circle className="pm-handle-hit" cx={p.x} cy={p.y} r={r * 2.2}
                onPointerDown={(e) => onHandleDown(i, e)} onPointerMove={(e) => onHandleMove(i, e)}
                onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)} />
              <circle className={`pm-handle${dragging === i ? ' is-dragging' : ''}`} cx={p.x} cy={p.y} r={r} strokeWidth={unit * 0.5} />
              <text x={p.x} y={p.y} className="pm-handle-num" fontSize={unit * 1.7} textAnchor="middle" dominantBaseline="central">{i + 1}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
