import { describe, expect, it } from 'vitest'
import { apply, dimensions, distanceM, measure, precisionOf, solveHomography, type Pt } from './measure'

// A known camera: plane mm -> photo px, with perspective.
const CAMERA = [[2.8, 0.35, 120], [0.12, 2.6, 80], [0.0004, 0.0003, 1]]
const toPhoto = (p: Pt): Pt => apply(CAMERA, p)
const marker = (size: number, at: Pt) => [at, { x: at.x + size, y: at.y }, { x: at.x + size, y: at.y + size }, { x: at.x, y: at.y + size }]

describe('photo measuring maths', () => {
  it('recovers an exact homography from 4 points', () => {
    const plane = marker(150, { x: 0, y: 0 })
    const photo = plane.map(toPhoto)
    const H = solveHomography(photo, plane)!
    for (const p of [{ x: 10, y: 20 }, { x: 700, y: 400 }, { x: -50, y: 900 }]) {
      const back = apply(H, toPhoto(p))
      expect(back.x).toBeCloseTo(p.x, 6)
      expect(back.y).toBeCloseTo(p.y, 6)
    }
  })

  it('measures real distances through perspective', () => {
    const H = solveHomography(marker(36, { x: 50, y: 50 }).map(toPhoto), marker(36, { x: 0, y: 0 }))!
    expect(distanceM(H, toPhoto({ x: 100, y: 300 }), toPhoto({ x: 400, y: 300 }))).toBeCloseTo(0.3, 6)
  })

  it('wall = average of opposite edges', () => {
    const H = solveHomography(marker(150, { x: 0, y: 0 }).map(toPhoto), marker(150, { x: 0, y: 0 }))!
    const corners = [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 2200 }, { x: 0, y: 2200 }].map(toPhoto)
    const d = dimensions(H, 'wall', corners)!
    expect(d.length).toBeCloseTo(3.0, 6)
    expect(d.height).toBeCloseTo(2.2, 6)
    expect(dimensions(H, 'wall', corners.slice(0, 3))).toBeNull()
  })

  it('rates precision by marker size and reach', () => {
    const a = toPhoto({ x: 100, y: 400 })
    const b = toPhoto({ x: 1600, y: 400 })
    const card = measure(marker(36, { x: 0, y: 0 }).map(toPhoto), 36, 'timber', [a, b])!
    const sheet = measure(marker(150, { x: 0, y: 0 }).map(toPhoto), 150, 'timber', [a, b])!
    expect(card.length).toBeCloseTo(1.5, 6)
    expect(sheet.length).toBeCloseTo(1.5, 6)
    expect(['medium', 'low']).toContain(card.precision) // small marker, far reach
    const big = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }, { x: 0, y: 200 }]
    expect(precisionOf(big, [{ x: 0, y: 0 }, { x: 1000, y: 0 }]).level).toBe('high')   // 200 px marker, reach 5
    expect(precisionOf(big, [{ x: 0, y: 0 }, { x: 4000, y: 0 }]).level).toBe('medium') // reach 20
    const tiny = big.map((p) => ({ x: p.x / 10, y: p.y / 10 }))
    expect(precisionOf(tiny, [{ x: 0, y: 0 }, { x: 100, y: 0 }]).level).toBe('low')    // 20 px marker
  })

  it('rejects degenerate input', () => {
    const p = { x: 1, y: 1 }
    expect(solveHomography([p, p, p, p], marker(36, { x: 0, y: 0 }))).toBeNull()
    expect(measure([p, p, p, p], 36, 'timber', [p, p])).toBeNull()
  })
})
