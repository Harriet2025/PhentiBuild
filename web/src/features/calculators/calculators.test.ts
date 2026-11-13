import { describe, expect, it } from 'vitest'
import { boqRowsFor } from '../../domain/calculators/boqMappers'
import { CALCULATORS, fieldError, type FieldDef } from './config'

const byName = (calc: string, field: string): FieldDef => {
  const def = CALCULATORS.find((c) => c.id === calc)!.fields.find((f) => f.name === field)
  if (!def) throw new Error(`${calc}.${field} missing`)
  return def
}

describe('calculator field validation (same messages as calculators.js)', () => {
  const wallLength = byName('walls', 'wallLength') // length, 100 mm – 500 000 mm, default unit m
  const waste = byName('walls', 'wastePercent') // optional count 0–100
  const walls = byName('plastering', 'numberOfWalls') // count 1–100
  const concreteType = byName('concrete', 'concreteType') // select

  it('required / optional / select', () => {
    expect(fieldError(wallLength, '', 'm')).toBe('Wall length is required.')
    expect(fieldError(waste, '', undefined)).toBe('')
    expect(fieldError(concreteType, '', undefined)).toBe('Select a concrete type.')
    expect(fieldError(concreteType, 'Slab (one-off)', undefined)).toBe('')
  })

  it('numbers: negatives, text, zero, commas and a leading plus', () => {
    expect(fieldError(wallLength, '-3', 'm')).toBe('Wall length cannot be negative.')
    expect(fieldError(wallLength, 'ten', 'm')).toBe('Wall length must be a number, for example 12.5.')
    expect(fieldError(wallLength, '0', 'm')).toBe('Wall length must be greater than zero.')
    expect(fieldError(wallLength, '1,250', 'mm')).toBe('')        // thousands separator accepted
    expect(fieldError(wallLength, '1,250', 'm')).toContain('between') // 1 250 m is over the 500 m limit
    expect(fieldError(wallLength, '+12.5', 'm')).toBe('')
    expect(fieldError(wallLength, '  12.5  ', 'm')).toBe('')
  })

  it('length limits are checked in the selected unit', () => {
    expect(fieldError(wallLength, '0.05', 'm')).toBe('Wall length must be between 0.1 m and 500 m.')
    expect(fieldError(wallLength, '600', 'm')).toBe('Wall length must be between 0.1 m and 500 m.')
    expect(fieldError(wallLength, '600', 'mm')).toBe('')
    expect(fieldError(wallLength, '50', 'mm')).toBe('Wall length must be between 100 mm and 500,000 mm.')
    expect(fieldError(wallLength, '2000', 'ft')).toBe('Wall length must be between 0.328 ft and 1,640.42 ft.')
  })

  it('counts must be whole and in range', () => {
    expect(fieldError(walls, '2.5', undefined)).toBe('Number of walls must be a whole number.')
    expect(fieldError(walls, '101', undefined)).toBe('Number of walls must be between 1 and 100.')
    expect(fieldError(walls, '4', undefined)).toBe('')
  })
})

describe('every calculator runs end-to-end through its engine', () => {
  const sample: Record<string, Record<string, string>> = {
    walls: { wallLength: '12', wallHeight: '3', wallThickness: '150', blockLength: '450', blockHeight: '225', wastePercent: '5' },
    plastering: { wallLength: '12', wallHeight: '3', numberOfWalls: '2', plasterThickness: '12', mixRatioCement: '1', mixRatioSand: '4' },
    concrete: { concreteType: 'Column (repeated)', columnHeight: '3', columnLength: '230', columnWidth: '230', columnQuantity: '8', cementPartsConc: '1', sandPartsConc: '2', aggregatePartsConc: '4' },
    rebar: { numberOfMainBars: '4', mainBarDiameter: '12', mainBarLength: '3', stirrupDiameter: '8', stirrupSpacing: '200', columnHeightRebar: '3', columnLengthRebar: '230', columnWidthRebar: '230', columnQuantityRebar: '6' },
    timber: { memberType: 'Purlins', timberType: '2 x 4', timberLength: '4.8', spacingTimber: '900', structureLength: '12', structureWidth: '9' },
    roofing: { materialType: 'Eurotile / Milano Tile', roofWidth: '9', roofSlopeLength: '6.5' },
  }

  for (const def of CALCULATORS) {
    it(`${def.id}: valid sample has no errors, calculates, and maps to BOQ rows`, () => {
      const values = sample[def.id]
      const units = Object.fromEntries(def.fields.filter((f) => f.kind === 'length').map((f) => [f.name, (f as { unit: 'm' }).unit]))
      for (const field of def.fields) expect(fieldError(field, values[field.name] || '', units[field.name] as never), field.name).toBe('')
      const input = def.buildInput(values, units as never)
      const result = def.engine.calculate(input)
      const specs = typeof def.results === 'function' ? def.results(result) : def.results
      expect(specs.length).toBeGreaterThan(0)
      for (const spec of specs) expect(Number.isFinite(Number(result[spec.key])), spec.key).toBe(true)
      const rows = boqRowsFor(def.id, input, result)!
      expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) {
        expect(row.source).toBe(def.id)
        expect(row.description).not.toContain('undefined')
        expect(Number.isFinite(row.quantity)).toBe(true)
      }
    })
  }

  it('rebar BOQ description shows the real column size (old app printed "undefined x undefinedmm")', () => {
    const def = CALCULATORS.find((c) => c.id === 'rebar')!
    const input = def.buildInput(sample.rebar, { columnLengthRebar: 'mm', columnWidthRebar: 'mm', stirrupSpacing: 'mm' } as never)
    const rows = boqRowsFor('rebar', input, def.engine.calculate(input))!
    expect(rows[0].description).toBe('Reinforcement for 6 column(s) of 230 x 230mm.')
  })
})
