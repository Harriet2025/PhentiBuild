/**
 * PARITY TEST — proves the converted engines produce exactly the same
 * results as the ORIGINAL vanilla-JS files the PHP app runs today.
 *
 * Each original file (frontend/js/modules/*-calcs.js) is executed as-is
 * inside a fake `window`, then both versions get the same inputs —
 * typical values and edge cases (zero, decimals, huge, unit conversions,
 * every material/member/element variant) — and must return deep-equal
 * output.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { concrete } from './concrete.js'
import { masonry } from './masonry.js'
import { plaster } from './plaster.js'
import { rebar } from './rebar.js'
import { roofGeometry } from './roofGeometry.js'
import { roofing } from './roofing.js'
import { timber } from './timber.js'
import type { EngineInput } from './types'

const LEGACY_DIR = resolve(import.meta.dirname, '../../../../frontend/js/modules')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadOriginal(file: string, name: string): any {
  const code = readFileSync(resolve(LEGACY_DIR, file), 'utf8')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeWindow: any = { PhB: {} }
  new Function('window', code)(fakeWindow)
  return fakeWindow.PhB[name]
}

/** Every combination of the given option lists (a small cartesian product). */
function combos(options: Record<string, unknown[]>): EngineInput[] {
  return Object.entries(options).reduce<EngineInput[]>(
    (acc, [key, values]) => acc.flatMap((row) => values.map((v) => ({ ...row, [key]: v as number | string }))),
    [{}],
  )
}

const engines = [
  {
    name: 'masonry', file: 'masonry-calcs.js', converted: masonry,
    inputs: combos({
      wallLength: [0, 1, 12.5, 1000], wallHeight: [0.3, 3], wallThickness: [150, 225],
      blockLength: [450, 45], blockLengthUnit: ['mm', 'cm'], blockHeight: [225], blockHeightUnit: ['mm'],
      mortarAllowance: [0, 10], mortarAllowanceUnit: ['mm'], wastePercent: [0, 5, 12.5],
    }),
  },
  {
    name: 'plaster', file: 'plaster-calcs.js', converted: plaster,
    inputs: combos({
      wallLength: [0, 4, 37.25], wallHeight: [3], numberOfWalls: [1, 4], plasterThickness: [12, 1.5, 0.5],
      plasterThicknessUnit: ['mm', 'cm', 'in'], mixRatioCement: [1], mixRatioSand: [4, 6], wastePercent: [0, 10],
    }),
  },
  {
    name: 'concrete', file: 'concrete-calcs.js', converted: concrete,
    inputs: [
      ...combos({ elementType: ['slab'], length: [0, 5, 12.3], width: [4], thickness: [150, 0.5], thicknessUnit: ['mm', 'ft'],
        cementParts: [1], sandParts: [2, 1.5], aggregateParts: [4, 3], wastePercent: [0, 5] }),
      ...combos({ elementType: ['column'], height: [3, 0], length: [230, 9], lengthUnit: ['mm', 'in'], width: [230], widthUnit: ['mm'],
        quantity: [1, 12], cementParts: [1], sandParts: [2], aggregateParts: [4], wastePercent: [0, 7.5] }),
    ],
  },
  {
    name: 'rebar', file: 'rebar-calcs.js', converted: rebar,
    inputs: combos({
      columnHeight: [3, 0.5], columnLength: [230, 23], columnLengthUnit: ['mm', 'cm'], columnWidth: [230], columnWidthUnit: ['mm'],
      columnQuantity: [1, 8], mainBarDiameter: [12, 16], numberOfMainBars: [4, 6], mainBarLength: [12],
      stirrupDiameter: [8], stirrupSpacing: [150, 0.2], stirrupSpacingUnit: ['mm', 'm'], stirrupOverlap: [75], steelDensity: [7850],
    }),
  },
  {
    name: 'timber', file: 'timber-calcs.js', converted: timber,
    inputs: combos({
      memberType: ['Rafters', 'Purlins', 'Battens', 'rafters', undefined], timberType: ['2 x 2', '2 x 4', '4 x 4', undefined],
      structureLength: [10, 0], structureWidth: [8.5], spacing: [600, 0.45], spacingUnit: ['mm', 'm'], timberLength: [3.6, 4.8], wastePercent: [0, 10],
    }),
  },
  {
    name: 'roofing', file: 'roofing-calcs.js', converted: roofing,
    inputs: combos({
      materialType: ['ibr', 'selflock', 'eurotile', 'shingles'], roofWidth: [10, 0, 7.3], roofSlopeLength: [5, 12.6],
      effectiveCoverMm: [undefined, 300], wastePercent: [0, 5],
    }),
  },
]

describe('calculation engines are identical to the original PHP-app JavaScript', () => {
  for (const engine of engines) {
    it(`${engine.name}: ${engine.inputs.length} input combinations give identical results`, () => {
      const original = loadOriginal(engine.file, engine.name)
      expect(typeof original.calculate).toBe('function')
      for (const input of engine.inputs) {
        expect(engine.converted.calculate({ ...input })).toEqual(original.calculate({ ...input }))
      }
      for (const [value, decimals] of [[1234567.891, 2], [0.0005, 3], [-1500, 0], [12.345, 1]] as const) {
        expect(engine.converted.formatNumber(value, decimals)).toBe(original.formatNumber(value, decimals))
      }
    })
  }

  it('roofing exposes the same material catalogue, timber the same section sizes', () => {
    expect(roofing.MATERIALS).toEqual(loadOriginal('roofing-calcs.js', 'roofing').MATERIALS)
    expect(timber.sectionSizes).toEqual(loadOriginal('timber-calcs.js', 'timber').sectionSizes)
  })

  it('roof geometry helpers match (area, perimeter, snapping, hit-testing)', () => {
    const original = loadOriginal('roof-geometry.js', 'roofGeometry')
    const square = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }]
    const shapes = [
      { id: 'p', type: 'polygon', points: square },
      { id: 'r', type: 'rectangle', points: [{ x: 1, y: 1 }, { x: 6.5, y: 4.25 }] },
      { id: 'l', type: 'line', points: [{ x: 0, y: 0 }, { x: 3, y: 4 }] },
    ]
    for (const shape of shapes) {
      for (const fn of ['area', 'perimeter', 'segmentLengths', 'outlinePoints'] as const) {
        expect(roofGeometry[fn](shape)).toEqual(original[fn](shape))
      }
      expect(roofGeometry.shapeContainsPoint(shape, { x: 2, y: 2 }, 0.1)).toBe(original.shapeContainsPoint(shape, { x: 2, y: 2 }, 0.1))
    }
    expect(roofGeometry.boundingBoxOfShapes(shapes)).toEqual(original.boundingBoxOfShapes(shapes))
    expect(roofGeometry.hitTestShapes(shapes, { x: 1.5, y: 2 }, 0.2)).toEqual(original.hitTestShapes(shapes, { x: 1.5, y: 2 }, 0.2))
    expect(roofGeometry.snapToGrid(1.13, 0.25)).toBe(original.snapToGrid(1.13, 0.25))
    expect(roofGeometry.pointInPolygon({ x: 2, y: 1 }, square)).toBe(original.pointInPolygon({ x: 2, y: 1 }, square))
    expect(roofGeometry.pointToSegmentDistance({ x: 2, y: 5 }, { x: 0, y: 0 }, { x: 4, y: 0 }))
      .toBe(original.pointToSegmentDistance({ x: 2, y: 5 }, { x: 0, y: 0 }, { x: 4, y: 0 }))
  })
})
