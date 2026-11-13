import { concrete } from '../../domain/engines/concrete.js'
import { masonry } from '../../domain/engines/masonry.js'
import { plaster } from '../../domain/engines/plaster.js'
import { rebar } from '../../domain/engines/rebar.js'
import { roofing } from '../../domain/engines/roofing.js'
import { timber } from '../../domain/engines/timber.js'
import type { CalculatorEngine, EngineInput, EngineResult } from '../../domain/engines/types'

/**
 * The six calculators — fields from pages/modules/calculators.php and the
 * engine wiring / result layout from js/modules/calculators.js, unchanged.
 * Length limits (min/max) are in millimetres, exactly as before.
 */
export type LengthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft'
export const LENGTH_UNITS: [LengthUnit, string][] = [['mm', 'mm'], ['cm', 'cm'], ['m', 'm'], ['in', 'inches'], ['ft', 'feet']]
export const TO_MM: Record<LengthUnit, number> = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 }

export type PitchUnit = 'deg' | 'pct' | 'ratio'
export const PITCH_UNITS: [PitchUnit, string][] = [['deg', 'degrees'], ['pct', 'percent'], ['ratio', 'rise : 12']]
const PITCH_RANGE: Record<PitchUnit, [number, number]> = { deg: [0.5, 85], pct: [1, 1000], ratio: [0.5, 24] }
const PITCH_SUFFIX: Record<PitchUnit, string> = { deg: '°', pct: '%', ratio: ' in 12' }

export type FieldDef =
  | { name: string; label: string; kind: 'length'; unit: LengthUnit; min: number; max: number; placeholder: string; hint?: string; optional?: boolean }
  | { name: string; label: string; kind: 'pitch'; unit: PitchUnit; placeholder: string; hint?: string; optional?: boolean }
  | { name: string; label: string; kind: 'count'; suffix: string; min: number; max: number; placeholder: string; hint?: string; optional?: boolean }
  | { name: string; label: string; kind: 'select'; options: string[]; hint?: string; optional?: boolean }

export type ResultSpec = { key: string; label: string; unit?: string; decimals?: number; highlight?: boolean }
export type AssumptionSpec = { key: string; label: string; suffix?: string }
type Values = Record<string, string>
type Units = Record<string, LengthUnit>

export type CalculatorDef = {
  id: string
  label: string
  desc: string
  icon: string
  engine: CalculatorEngine
  fields: FieldDef[]
  buildInput: (v: Values, u: Units) => EngineInput
  title: string | ((r: EngineResult) => string)
  successToast: string | ((r: EngineResult) => string)
  results: ResultSpec[] | ((r: EngineResult) => ResultSpec[])
  assumptions: AssumptionSpec[] | ((r: EngineResult) => AssumptionSpec[])
  schedule?: { columns: string[]; rows: (r: EngineResult, input: EngineInput, v: Values, u: Units) => (string | number)[][] }
}

const f = (v: string | undefined, fallback: number) => (v ? parseFloat(v) : fallback)
const WASTE_HINT = 'Typical: 5–15%. Zero means no waste allowance.'

export const CALCULATORS: CalculatorDef[] = [
  {
    id: 'walls', label: 'Block & Mortar', engine: masonry,
    desc: 'Estimate block count and mortar volume for a blockwork wall.',
    icon: '<rect x="3" y="5" width="18" height="14" rx="1"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="5" x2="9" y2="12"/><line x1="15" y1="12" x2="15" y2="19"/>',
    fields: [
      { name: 'wallLength', label: 'Wall Length', kind: 'length', unit: 'm', min: 100, max: 500000, placeholder: 'e.g. 12.5' },
      { name: 'wallHeight', label: 'Wall Height', kind: 'length', unit: 'm', min: 100, max: 100000, placeholder: 'e.g. 3' },
      { name: 'wallThickness', label: 'Wall Thickness', kind: 'length', unit: 'mm', min: 25, max: 1000, placeholder: 'e.g. 150', hint: 'Finished thickness of the wall.' },
      { name: 'blockLength', label: 'Block Length', kind: 'length', unit: 'mm', min: 50, max: 1000, placeholder: 'e.g. 450' },
      { name: 'blockHeight', label: 'Block Height', kind: 'length', unit: 'mm', min: 50, max: 1000, placeholder: 'e.g. 225' },
      { name: 'mortarAllowance', label: 'Mortar Allowance', kind: 'length', unit: 'mm', min: 0, max: 50, placeholder: 'e.g. 10', hint: 'Joint thickness added to block dimensions. Typical: 10–12 mm.', optional: true },
      { name: 'wastePercent', label: 'Waste Percentage', kind: 'count', suffix: '%', min: 0, max: 100, placeholder: 'e.g. 10', hint: WASTE_HINT, optional: true },
    ],
    buildInput: (v, u) => ({
      wallLength: parseFloat(v.wallLength), wallHeight: parseFloat(v.wallHeight), wallThickness: parseFloat(v.wallThickness),
      blockLength: parseFloat(v.blockLength), blockHeight: parseFloat(v.blockHeight),
      blockLengthUnit: u.blockLength || 'mm', blockHeightUnit: u.blockHeight || 'mm',
      mortarAllowance: f(v.mortarAllowance, 0), mortarAllowanceUnit: u.mortarAllowance || 'mm', wastePercent: f(v.wastePercent, 0),
    }),
    title: 'Block Quantity Estimate', successToast: 'Blocks and mortar calculated.',
    results: [
      { key: 'wallAreaM2', label: 'Wall Area', unit: 'm²', decimals: 2 },
      { key: 'blockCountDry', label: 'Blocks (dry)', unit: 'pieces' },
      { key: 'wasteCount', label: 'Waste Allowance', unit: 'pieces' },
      { key: 'blockCountFinal', label: 'Total Blocks', unit: 'pieces', highlight: true },
      { key: 'mortarVolumeM3', label: 'Mortar Requirement', unit: 'm³', decimals: 3 },
    ],
    assumptions: [
      { key: 'blockPattern', label: 'Block pattern' },
      { key: 'mortarPercentOfBlock', label: 'Mortar', suffix: '% of solid block volume' },
      { key: 'description', label: 'Method' },
    ],
  },
  {
    id: 'plastering', label: 'Plaster (Cement & Sand)', engine: plaster,
    desc: 'Estimate plaster volume and dry cement/sand quantities for a rendered wall.',
    icon: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 16l8-8"/><path d="M12 16l4-4"/>',
    fields: [
      { name: 'wallLength', label: 'Wall Length', kind: 'length', unit: 'm', min: 100, max: 500000, placeholder: 'e.g. 12.5' },
      { name: 'wallHeight', label: 'Wall Height', kind: 'length', unit: 'm', min: 100, max: 100000, placeholder: 'e.g. 3' },
      { name: 'numberOfWalls', label: 'Number of Walls', kind: 'count', suffix: 'walls', min: 1, max: 100, placeholder: 'e.g. 4', hint: 'How many walls of these dimensions are being plastered.' },
      { name: 'plasterThickness', label: 'Plaster Thickness', kind: 'length', unit: 'mm', min: 3, max: 100, placeholder: 'e.g. 12', hint: 'Typical render coats are 12 to 20 mm.' },
      { name: 'mixRatioCement', label: 'Cement (mix ratio)', kind: 'count', suffix: 'part', min: 1, max: 10, placeholder: 'e.g. 1', hint: 'Cement parts in the mix (e.g. 1 for 1:3).' },
      { name: 'mixRatioSand', label: 'Sand (mix ratio)', kind: 'count', suffix: 'part', min: 1, max: 10, placeholder: 'e.g. 3', hint: 'Sand parts in the mix (e.g. 3 for 1:3).' },
      { name: 'wastePercent', label: 'Waste Percentage', kind: 'count', suffix: '%', min: 0, max: 100, placeholder: 'e.g. 5', hint: 'Typical: 5–10%. For spillage and over-troweling.', optional: true },
    ],
    buildInput: (v, u) => ({
      wallLength: parseFloat(v.wallLength), wallHeight: parseFloat(v.wallHeight), numberOfWalls: f(v.numberOfWalls, 1),
      plasterThickness: parseFloat(v.plasterThickness), plasterThicknessUnit: u.plasterThickness || 'mm',
      mixRatioCement: f(v.mixRatioCement, 1), mixRatioSand: f(v.mixRatioSand, 3), wastePercent: f(v.wastePercent, 0),
    }),
    title: 'Plaster & Mortar Estimate', successToast: 'Plaster and mortar calculated.',
    results: [
      { key: 'totalSurfaceAreaM2', label: 'Total Area', unit: 'm²', decimals: 2 },
      { key: 'plasterVolumeM3', label: 'Plaster Volume', unit: 'm³', decimals: 3 },
      { key: 'cementRequirementM3', label: 'Cement (dry)', unit: 'm³', decimals: 3 },
      { key: 'sandRequirementM3', label: 'Sand (dry)', unit: 'm³', decimals: 3 },
      { key: 'cementWithWasteM3', label: 'Cement (final)', unit: 'm³', decimals: 3, highlight: true },
      { key: 'sandWithWasteM3', label: 'Sand (final)', unit: 'm³', decimals: 3, highlight: true },
    ],
    assumptions: [
      { key: 'mixRatio', label: 'Mix ratio', suffix: ' (cement : sand)' },
      { key: 'description', label: 'Mortar type' },
      { key: 'mortarDensity', label: 'Density', suffix: ' (wet mortar)' },
    ],
  },
  {
    id: 'concrete', label: 'Concrete (Cement, Sand & Aggregate)', engine: concrete,
    desc: 'Estimate concrete volume and mix materials for a slab or a set of columns.',
    icon: '<rect x="3" y="4" width="18" height="16" rx="1"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="17" y1="8" x2="17" y2="16"/>',
    fields: [
      { name: 'concreteType', label: 'Concrete Type', kind: 'select', options: ['Slab (one-off)', 'Column (repeated)'], hint: 'Choose the element type to calculate volume for.' },
      { name: 'slabLength', label: 'Slab Length', kind: 'length', unit: 'm', min: 100, max: 500000, placeholder: 'e.g. 9', optional: true },
      { name: 'slabWidth', label: 'Slab Width', kind: 'length', unit: 'm', min: 100, max: 500000, placeholder: 'e.g. 6', optional: true },
      { name: 'slabThickness', label: 'Slab Thickness', kind: 'length', unit: 'mm', min: 25, max: 1000, placeholder: 'e.g. 150', optional: true },
      { name: 'columnHeight', label: 'Column Height', kind: 'length', unit: 'm', min: 100, max: 100000, placeholder: 'e.g. 3', optional: true },
      { name: 'columnLength', label: 'Column Length', kind: 'length', unit: 'mm', min: 25, max: 5000, placeholder: 'e.g. 450', optional: true },
      { name: 'columnWidth', label: 'Column Width', kind: 'length', unit: 'mm', min: 25, max: 5000, placeholder: 'e.g. 450', optional: true },
      { name: 'columnQuantity', label: 'Column Quantity', kind: 'count', suffix: 'columns', min: 1, max: 1000, placeholder: 'e.g. 12', optional: true },
      { name: 'cementPartsConc', label: 'Cement (mix)', kind: 'count', suffix: 'part', min: 1, max: 10, placeholder: 'e.g. 1', hint: 'Cement parts (e.g. 1 for 1:2:4).' },
      { name: 'sandPartsConc', label: 'Sand (mix)', kind: 'count', suffix: 'part', min: 1, max: 10, placeholder: 'e.g. 2' },
      { name: 'aggregatePartsConc', label: 'Aggregate (mix)', kind: 'count', suffix: 'part', min: 1, max: 10, placeholder: 'e.g. 4', hint: 'Aggregate (coarse) parts.' },
      { name: 'wastePercentConc', label: 'Waste %', kind: 'count', suffix: '%', min: 0, max: 100, placeholder: 'e.g. 5', hint: 'Spillage and over-pouring: 5–10% typical.', optional: true },
    ],
    buildInput: (v, u) => {
      const elementType = v.concreteType === 'Slab (one-off)' ? 'slab' : 'column'
      const base: EngineInput = {
        elementType, cementParts: f(v.cementPartsConc, 1), sandParts: f(v.sandPartsConc, 2),
        aggregateParts: f(v.aggregatePartsConc, 4), wastePercent: f(v.wastePercentConc, 0),
      }
      return elementType === 'slab'
        ? { ...base, length: parseFloat(v.slabLength), width: parseFloat(v.slabWidth), thickness: parseFloat(v.slabThickness), thicknessUnit: u.slabThickness || 'mm' }
        : { ...base, height: parseFloat(v.columnHeight), length: parseFloat(v.columnLength), width: parseFloat(v.columnWidth),
            lengthUnit: u.columnLength || 'mm', widthUnit: u.columnWidth || 'mm', quantity: f(v.columnQuantity, 1) }
    },
    title: 'Concrete Volume & Materials', successToast: 'Concrete volume and materials calculated.',
    results: [
      { key: 'individualVolumeM3', label: 'Individual Volume', unit: 'm³', decimals: 4 },
      { key: 'totalVolumeM3', label: 'Total Volume', unit: 'm³', decimals: 3, highlight: true },
      { key: 'cementM3', label: 'Cement (dry)', unit: 'm³', decimals: 3 },
      { key: 'sandM3', label: 'Sand (dry)', unit: 'm³', decimals: 3 },
      { key: 'aggregateM3', label: 'Aggregate (dry)', unit: 'm³', decimals: 3 },
      { key: 'cementWithWasteM3', label: 'Cement (final)', unit: 'm³', decimals: 3, highlight: true },
      { key: 'sandWithWasteM3', label: 'Sand (final)', unit: 'm³', decimals: 3, highlight: true },
      { key: 'aggregateWithWasteM3', label: 'Aggregate (final)', unit: 'm³', decimals: 3, highlight: true },
    ],
    assumptions: [
      { key: 'mixRatio', label: 'Mix ratio', suffix: ' (cement : sand : aggregate)' },
      { key: 'wetYield', label: 'Wet yield', suffix: '× dry volume (slump/compaction)' },
      { key: 'concreteDensity', label: 'Density' },
      { key: 'description', label: 'Method' },
    ],
  },
  {
    id: 'rebar', label: 'Rebar / Steel', engine: rebar,
    desc: 'Estimate reinforcing steel length and weight for a reinforced column.',
    icon: '<rect x="3" y="7" width="18" height="10" rx="1"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/>',
    fields: [
      { name: 'numberOfMainBars', label: 'Number of Main Bars', kind: 'count', suffix: 'bars', min: 1, max: 20, placeholder: 'e.g. 6', hint: 'Main bars per column (typically 4–8).' },
      { name: 'mainBarDiameter', label: 'Main Bar Diameter', kind: 'length', unit: 'mm', min: 4, max: 60, placeholder: 'e.g. 16', hint: 'Typical: 12, 16, 20, 25 mm.' },
      { name: 'mainBarLength', label: 'Main Bar Length', kind: 'length', unit: 'm', min: 100, max: 100000, placeholder: 'e.g. 3', hint: 'Usually the column height.' },
      { name: 'stirrupDiameter', label: 'Stirrup Diameter', kind: 'length', unit: 'mm', min: 4, max: 30, placeholder: 'e.g. 8', hint: 'Typically: 6, 8, 10 mm.' },
      { name: 'stirrupSpacing', label: 'Stirrup Spacing', kind: 'length', unit: 'mm', min: 50, max: 1000, placeholder: 'e.g. 200', hint: 'Centre-to-centre spacing.' },
      { name: 'columnHeightRebar', label: 'Column Height', kind: 'length', unit: 'm', min: 100, max: 100000, placeholder: 'e.g. 3' },
      { name: 'columnLengthRebar', label: 'Column Length', kind: 'length', unit: 'mm', min: 25, max: 5000, placeholder: 'e.g. 450', hint: 'Cross-section length.' },
      { name: 'columnWidthRebar', label: 'Column Width', kind: 'length', unit: 'mm', min: 25, max: 5000, placeholder: 'e.g. 450', hint: 'Cross-section width.' },
      { name: 'columnQuantityRebar', label: 'Column Quantity', kind: 'count', suffix: 'columns', min: 1, max: 1000, placeholder: 'e.g. 12' },
      { name: 'steelDensityRebar', label: 'Steel Density', kind: 'count', suffix: 'kg/m³', min: 7000, max: 8000, placeholder: 'e.g. 7850', hint: 'Standard: 7850 kg/m³.', optional: true },
    ],
    buildInput: (v, u) => ({
      numberOfMainBars: f(v.numberOfMainBars, 6), mainBarDiameter: f(v.mainBarDiameter, 16), mainBarLength: f(v.mainBarLength, 3),
      stirrupDiameter: f(v.stirrupDiameter, 8), stirrupSpacing: f(v.stirrupSpacing, 200), stirrupSpacingUnit: u.stirrupSpacing || 'mm',
      columnHeight: f(v.columnHeightRebar, 3), columnLength: f(v.columnLengthRebar, 450), columnLengthUnit: u.columnLengthRebar || 'mm',
      columnWidth: f(v.columnWidthRebar, 450), columnWidthUnit: u.columnWidthRebar || 'mm',
      columnQuantity: f(v.columnQuantityRebar, 1), steelDensity: f(v.steelDensityRebar, 7850),
    }),
    title: 'Steel Reinforcement Schedule', successToast: 'Rebar schedule and weight calculated.',
    results: [
      { key: 'totalSteelLength', label: 'Total Steel Length', unit: 'm', decimals: 2 },
      { key: 'totalSteelWeight', label: 'Total Steel Weight', unit: 'kg', decimals: 1, highlight: true },
    ],
    schedule: {
      columns: ['Type', 'Diameter (mm)', 'Spacing', 'Quantity', 'Length/Unit (m)', 'Total Length (m)', 'Weight/Unit (kg)', 'Total Weight (kg)'],
      rows: (r) => r.schedule.map((row: EngineResult) => [
        row.type, row.diameter, row.spacing, rebar.formatNumber(row.quantity), rebar.formatNumber(row.lengthPerUnit, 3),
        rebar.formatNumber(row.totalLength, 2), rebar.formatNumber(row.weightPerUnit, 2), rebar.formatNumber(row.totalWeight, 1),
      ]),
    },
    assumptions: [
      { key: 'steelDensity', label: 'Steel density' },
      { key: 'stirrupOverlapPerCorner', label: 'Stirrup overlap' },
      { key: 'description', label: 'Method' },
    ],
  },
  {
    id: 'timber', label: 'Timber', engine: timber,
    desc: 'Estimate the number of rafter, purlin or batten pieces needed.',
    icon: '<rect x="3" y="6" width="18" height="5" rx="1"/><rect x="3" y="13" width="18" height="5" rx="1"/><line x1="8" y1="6" x2="8" y2="11"/><line x1="16" y1="13" x2="16" y2="18"/>',
    fields: [
      { name: 'memberType', label: 'Member Type', kind: 'select', options: ['Rafters', 'Purlins', 'Battens'], hint: 'Rafters are spaced along the structure length; purlins and battens are spaced up the structure width.' },
      { name: 'timberType', label: 'Timber Type', kind: 'select', options: ['2 x 2', '2 x 3', '2 x 4', '2 x 6', '4 x 4'], hint: 'Nominal cross-section size.' },
      { name: 'timberLength', label: 'Timber Length', kind: 'length', unit: 'm', min: 100, max: 30000, placeholder: 'e.g. 3.6', hint: 'Stock length of one piece as sold.' },
      { name: 'spacingTimber', label: 'Required Spacing', kind: 'length', unit: 'mm', min: 25, max: 3000, placeholder: 'e.g. 600', hint: 'Centre-to-centre spacing between members.' },
      { name: 'structureLength', label: 'Structure Length', kind: 'length', unit: 'm', min: 100, max: 500000, placeholder: 'e.g. 12' },
      { name: 'structureWidth', label: 'Structure Width', kind: 'length', unit: 'm', min: 100, max: 500000, placeholder: 'e.g. 9' },
      { name: 'wastePercentTimber', label: 'Waste Percentage', kind: 'count', suffix: '%', min: 0, max: 100, placeholder: 'e.g. 10', hint: WASTE_HINT, optional: true },
    ],
    buildInput: (v, u) => ({
      memberType: v.memberType || 'Rafters', timberType: v.timberType || '2 x 4', timberLength: f(v.timberLength, 0),
      spacing: f(v.spacingTimber, 0), spacingUnit: u.spacingTimber || 'mm', structureLength: f(v.structureLength, 0),
      structureWidth: f(v.structureWidth, 0), wastePercent: f(v.wastePercentTimber, 0),
    }),
    title: 'Timber Takeoff', successToast: 'Timber quantities calculated.',
    results: [
      { key: 'numberOfPieces', label: 'Number of Pieces', unit: 'pcs' },
      { key: 'totalTimberLength', label: 'Total Timber Length', unit: 'm', decimals: 2 },
      { key: 'waste', label: 'Waste', unit: 'm', decimals: 2 },
      { key: 'finalQuantity', label: 'Final Quantity', unit: 'pcs', highlight: true },
    ],
    schedule: {
      columns: ['Member', 'Size', 'Cross-section (mm)', 'Spacing', 'Pieces', 'Length/Piece (m)', 'Total Length (m)', 'Final Qty (pcs)'],
      rows: (r, input, v, u) => [[
        String(r.memberType).charAt(0).toUpperCase() + String(r.memberType).slice(1), r.timberType,
        `${r.crossSection.width} x ${r.crossSection.thickness}`, `${v.spacingTimber} ${u.spacingTimber || 'mm'}`,
        timber.formatNumber(r.numberOfPieces), timber.formatNumber(Number(input.timberLength), 2),
        timber.formatNumber(r.totalTimberLength, 2), timber.formatNumber(r.finalQuantity),
      ]],
    },
    assumptions: [
      { key: 'spacingAxis', label: 'Spacing axis' },
      { key: 'spanAxis', label: 'Span axis' },
      { key: 'description', label: 'Method' },
    ],
  },
  {
    id: 'roofing', label: 'Roofing Materials', engine: roofing,
    desc: 'IBR, Self-Lock, Eurotile/Milano and Asphalt Shingle coverage for a roof slope.',
    icon: '<path d="M2 12L12 4l10 8"/><path d="M5 12v7h14v-7"/><line x1="12" y1="4" x2="12" y2="19"/>',
    fields: [
      { name: 'materialType', label: 'Roofing Material', kind: 'select', options: ['IBR Long Span', 'Self-Lock Long Span', 'Eurotile / Milano Tile', 'Asphalt Shingles'], hint: 'Each material has its own real-world coverage spec — see the assumptions after calculating.' },
      { name: 'roofWidth', label: 'Roof Width', kind: 'length', unit: 'm', min: 100, max: 500000, placeholder: 'e.g. 9', hint: 'Horizontal span being covered.' },
      { name: 'roofSlopeLength', label: 'Roof Slope Length', kind: 'length', unit: 'm', min: 100, max: 500000, placeholder: 'e.g. 6.5', hint: 'Eave to ridge, measured along the pitch.' },
      { name: 'effectiveCover', label: 'Effective Cover (Self-Lock only)', kind: 'length', unit: 'mm', min: 275, max: 360, placeholder: 'e.g. 320', hint: 'Adjustable side lap, 275–360 mm. Ignored for every other material.', optional: true },
      { name: 'wastePercentRoofing', label: 'Waste Percentage', kind: 'count', suffix: '%', min: 0, max: 100, placeholder: 'e.g. 5', hint: 'Typical: 5–10%. Zero means no waste allowance.', optional: true },
    ],
    buildInput: (v, u) => {
      const map: Record<string, string> = { 'IBR Long Span': 'ibr', 'Self-Lock Long Span': 'selflock', 'Eurotile / Milano Tile': 'eurotile', 'Asphalt Shingles': 'shingles' }
      const input: EngineInput = {
        materialType: map[v.materialType] || 'ibr', roofWidth: parseFloat(v.roofWidth),
        roofSlopeLength: parseFloat(v.roofSlopeLength), wastePercent: f(v.wastePercentRoofing, 0),
      }
      if (v.effectiveCover) input.effectiveCoverMm = parseFloat(v.effectiveCover) * (TO_MM[u.effectiveCover || 'mm'] || 1)
      return input
    },
    title: (r) => `${r.label} Coverage`,
    successToast: (r) => `${r.label} coverage calculated.`,
    results: (r) => ({
      ibr: [
        { key: 'sheetCount', label: 'Sheets Needed', unit: 'sheets' },
        { key: 'sheetCountWithWaste', label: 'Sheets (with waste)', unit: 'sheets', highlight: true },
        { key: 'sheetLength', label: 'Sheet Length (cut to)', unit: 'm', decimals: 2 },
        { key: 'totalLengthOrdered', label: 'Total Length to Order', unit: 'm', decimals: 2 },
      ],
      selflock: [
        { key: 'effectiveCoverMm', label: 'Effective Cover Used', unit: 'mm' },
        { key: 'sheetCount', label: 'Sheets Needed', unit: 'sheets' },
        { key: 'sheetCountWithWaste', label: 'Sheets (with waste)', unit: 'sheets', highlight: true },
        { key: 'sheetLength', label: 'Sheet Length (cut to)', unit: 'm', decimals: 2 },
        { key: 'totalLengthOrdered', label: 'Total Length to Order', unit: 'm', decimals: 2 },
      ],
      eurotile: [
        { key: 'tilesPerRow', label: 'Tiles per Row', unit: 'tiles' },
        { key: 'rows', label: 'Rows (up the slope)', unit: 'rows' },
        { key: 'totalTiles', label: 'Total Tiles', unit: 'tiles' },
        { key: 'totalTilesWithWaste', label: 'Total Tiles (with waste)', unit: 'tiles', highlight: true },
        { key: 'battenTotalLengthM', label: 'Battens Required', unit: 'm', decimals: 2 },
        { key: 'rafterCount', label: 'Rafters Required', unit: 'pieces' },
      ],
      shingles: [
        { key: 'roofAreaM2', label: 'Roof Area', unit: 'm²', decimals: 2 },
        { key: 'courses', label: 'Courses (up the slope)', unit: 'courses' },
        { key: 'stripsPerCourse', label: 'Strips per Course', unit: 'strips' },
        { key: 'totalStripsWithWaste', label: 'Total Strips (with waste)', unit: 'strips' },
        { key: 'bundles', label: 'Bundles to Purchase', unit: 'bundles', highlight: true },
        { key: 'underlayBoards', label: 'Underlay Boards', unit: 'boards', highlight: true },
      ],
    } as Record<string, ResultSpec[]>)[r.materialType] || [],
    assumptions: (r) => ({
      ibr: [{ key: 'effectiveCover', label: 'Effective cover' }, { key: 'overallWidth', label: 'Overall width' }, { key: 'description', label: 'Method' }],
      selflock: [{ key: 'effectiveCover', label: 'Effective cover' }, { key: 'overallWidth', label: 'Overall width' }, { key: 'description', label: 'Method' }],
      eurotile: [{ key: 'exposure', label: 'Installed exposure' }, { key: 'rafterSpacing', label: 'Rafter spacing' }, { key: 'description', label: 'Method' }],
      shingles: [{ key: 'shingleSize', label: 'Shingle size' }, { key: 'underlayBoard', label: 'Underlay board' }, { key: 'description', label: 'Method' }],
    } as Record<string, AssumptionSpec[]>)[r.materialType] || [],
  },
]

/* ------------------------------------------------------------ validation */
const NUMBER = /^(\d+(\.\d+)?|\.\d+)$/
const UNIT_NAME: Record<LengthUnit, string> = { mm: 'mm', cm: 'cm', m: 'm', in: 'in', ft: 'ft' }

export function formatLimit(value: number): string {
  const [whole, frac] = String(Math.round(value * 1000) / 1000).split('.')
  return [whole.replace(/\B(?=(\d{3})+(?!\d))/g, ','), frac].filter(Boolean).join('.')
}

const sentence = (label: string) => label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()

/** Port of messageFor() in calculators.js / manual-input.js: one field's error, or ''. */
export function fieldError(field: FieldDef, rawValue: string, unit: LengthUnit | PitchUnit | undefined): string {
  const label = sentence(field.label)
  const raw = rawValue.trim().replace(/\s+/g, ' ')
  if (!raw) {
    if (field.optional) return ''
    return field.kind === 'select' ? `Select a ${label.toLowerCase()}.` : `${label} is required.`
  }
  if (field.kind === 'select') return ''
  const cleaned = raw.replace(/,/g, '').replace(/^\+/, '')
  if (cleaned.startsWith('-')) return `${label} cannot be negative.`
  if (!NUMBER.test(cleaned)) {
    const example = field.placeholder.replace(/^e\.g\.\s*/i, '') || '12.5'
    return `${label} must be a number, for example ${example}.`
  }
  const value = parseFloat(cleaned)
  if (value <= 0) return `${label} must be greater than zero.`
  if (field.kind === 'count') {
    if (value % 1 !== 0) return `${label} must be a whole number.`
    if (value < field.min || value > field.max) return `${label} must be between ${formatLimit(field.min)} and ${formatLimit(field.max)}.`
    return ''
  }
  if (field.kind === 'pitch') {
    const p = (unit as PitchUnit) || 'deg'
    const [low, high] = PITCH_RANGE[p]
    if (value < low || value > high) return `${label} must be between ${formatLimit(low)}${PITCH_SUFFIX[p]} and ${formatLimit(high)}${PITCH_SUFFIX[p]}.`
    return ''
  }
  const u = (unit as LengthUnit) || 'mm'
  const asMm = value * TO_MM[u]
  if (asMm < field.min || asMm > field.max) {
    return `${label} must be between ${formatLimit(field.min / TO_MM[u])} ${UNIT_NAME[u]} and ${formatLimit(field.max / TO_MM[u])} ${UNIT_NAME[u]}.`
  }
  return ''
}
