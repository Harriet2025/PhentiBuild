import type { BoqInput } from '../../api/resources/boq'
import type { EngineInput, EngineResult } from '../engines/types'

/**
 * Port of CALCULATOR_MAPPERS in js/modules/boq-store.js: turns one
 * calculator run into the BOQ line items "Add to Bill of Quantities"
 * creates. Same items, categories, units, descriptions and quantities.
 */
type Row = Omit<BoqInput, 'unitPrice' | 'notes' | 'source'>
type Mapper = (input: EngineInput, result: EngineResult) => Row[]

const MAPPERS: Record<string, Mapper> = {
  walls: (input, result) => [
    {
      item: 'Sandcrete Block', category: 'Blocks',
      description: `Blocks for a wall ${input.wallLength}m long x ${input.wallHeight}m high.`,
      specification: `${input.blockLength} x ${input.blockHeight} mm face`,
      unit: 'piece', quantity: result.blockCountDry, wastePercent: Number(input.wastePercent) || 0,
    },
    {
      item: 'Mortar (blockwork joints)', category: 'Other',
      description: 'Mortar for laying the blockwork above. Break down into cement and sand using the Plastering calculator if a material-level split is needed.',
      specification: '', unit: 'm³', quantity: result.mortarVolumeM3, wastePercent: 0,
    },
  ],
  plastering: (input, result) => {
    const spec = `Mix ratio ${input.mixRatioCement}:${input.mixRatioSand} (cement:sand)`
    const desc = (what: string) => `${what} for plastering ${result.totalSurfaceAreaM2}m² at ${input.plasterThickness}${input.plasterThicknessUnit} thick.`
    return [
      { item: 'Portland Cement', category: 'Cement', description: desc('Cement'), specification: spec, unit: 'm³', quantity: result.cementRequirementM3, wastePercent: Number(input.wastePercent) || 0 },
      { item: 'Plastering Sand', category: 'Sand', description: desc('Sand'), specification: spec, unit: 'm³', quantity: result.sandRequirementM3, wastePercent: Number(input.wastePercent) || 0 },
    ]
  },
  concrete: (input, result) => {
    const desc = input.elementType === 'slab'
      ? `Concrete for a slab ${result.totalVolumeM3}m³.`
      : `Concrete for ${input.quantity || 1} column(s), ${result.totalVolumeM3}m³ total.`
    const spec = `Mix ratio ${input.cementParts}:${input.sandParts}:${input.aggregateParts} (cement:sand:aggregate)`
    const waste = Number(input.wastePercent) || 0
    return [
      { item: 'Portland Cement', category: 'Cement', description: desc, specification: spec, unit: 'm³', quantity: result.cementM3, wastePercent: waste },
      { item: 'Concreting Sand', category: 'Sand', description: desc, specification: spec, unit: 'm³', quantity: result.sandM3, wastePercent: waste },
      { item: 'Coarse Aggregate', category: 'Aggregate', description: desc, specification: spec, unit: 'm³', quantity: result.aggregateM3, wastePercent: waste },
    ]
  },
  rebar: (input, result) => {
    // NB: the original read columnLengthRebar/columnWidthRebar (calculator
    // field names) here; the engine input calls them columnLength/columnWidth.
    const colDesc = `Reinforcement for ${input.columnQuantity || 1} column(s) of ${input.columnLengthRebar ?? input.columnLength} x ${input.columnWidthRebar ?? input.columnWidth}${input.columnLengthUnit}.`
    return [
      { item: 'Reinforcement Bar (Main Bars)', category: 'Rebar', description: colDesc,
        specification: `${input.mainBarDiameter} mm diameter, ${input.numberOfMainBars} bars per column`, unit: 'kg', quantity: result.mainBarTotalWeight, wastePercent: 0 },
      { item: 'Reinforcement Bar (Stirrups)', category: 'Rebar', description: colDesc,
        specification: `${input.stirrupDiameter} mm diameter, ${input.stirrupSpacing} mm spacing`, unit: 'kg', quantity: result.stirrupTotalWeight, wastePercent: 0 },
    ]
  },
  timber: (input, result) => {
    const memberLabel = String(result.memberType).charAt(0).toUpperCase() + String(result.memberType).slice(1)
    return [{
      item: `Timber ${result.timberType}`, category: 'Timber',
      description: `${memberLabel} for a structure ${input.structureLength}m x ${input.structureWidth}m.`,
      specification: `${result.crossSection.width} x ${result.crossSection.thickness} mm, ${input.timberLength}m lengths`,
      unit: 'piece', quantity: result.numberOfPieces, wastePercent: Number(input.wastePercent) || 0,
    }]
  },
  roofing: (input, result) => {
    const roofDesc = `Roof ${input.roofWidth}m wide x ${input.roofSlopeLength}m slope length.`
    const waste = Number(input.wastePercent) || 0
    if (result.materialType === 'ibr' || result.materialType === 'selflock') {
      return [{ item: result.label, category: 'Roofing', description: roofDesc,
        specification: `${result.effectiveCoverMm} mm effective cover, ${result.overallWidthMm} mm overall, cut to ${result.sheetLength}m`,
        unit: 'sheet', quantity: result.sheetCount, wastePercent: waste }]
    }
    if (result.materialType === 'eurotile') {
      return [
        { item: result.label, category: 'Roofing', description: roofDesc,
          specification: `${result.exposureMm.width} x ${result.exposureMm.length} mm installed exposure`, unit: 'piece', quantity: result.totalTiles, wastePercent: waste },
        { item: 'Roofing Battens', category: 'Timber', description: `Batten lines for ${result.rows} tile rows above.`,
          specification: `${result.exposureMm.length} mm gauge`, unit: 'm', quantity: result.battenTotalLengthM, wastePercent: 0 },
      ]
    }
    if (result.materialType === 'shingles') {
      return [
        { item: result.label, category: 'Roofing', description: roofDesc,
          specification: `${result.shingleSizeMm.length} x ${result.shingleSizeMm.height} mm strip`, unit: 'bundle', quantity: result.bundles, wastePercent: waste },
        { item: 'Roofing Underlay Board', category: 'Underlay', description: `Underlay beneath ${result.roofAreaM2}m² of shingles above.`,
          specification: `${result.underlayBoardMm.width} x ${result.underlayBoardMm.length} mm board`, unit: 'piece', quantity: result.underlayBoards, wastePercent: 0 },
      ]
    }
    return []
  },
}

/** BOQ rows for a calculator run, or null if that calculator isn't connected to the BOQ. */
export function boqRowsFor(sourceType: string, input: EngineInput, result: EngineResult): BoqInput[] | null {
  const mapper = MAPPERS[sourceType]
  if (!mapper) return null
  return mapper(input, result).map((row) => ({ ...row, source: sourceType, unitPrice: 0, notes: '' }))
}
