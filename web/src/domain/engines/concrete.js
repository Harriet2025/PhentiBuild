/* AUTO-CONVERTED from frontend/js/modules/concrete-calcs.js — the original IIFE wrapper
   and window.PhB export were replaced by an ES module export. Every formula line
   is unchanged; web/src/domain/engines/engines.test.ts proves identical output. */
/**
 * PhentiBuild (PhB) - Concrete Calculator
 *
 * Pure calculation module for concrete volume and material estimation.
 * Supports both slabs (one-off) and columns (repeated elements).
 */

/* ---------------------------------------------------------------
   UNIT CONVERSION
   --------------------------------------------------------------- */
var TO_MM = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 };

function toMillimetres(value, unit) {
    return value * (TO_MM[unit] || 1);
}

/* ---------------------------------------------------------------
   Calculation Engine
   --------------------------------------------------------------- */

/**
 * Estimates concrete and component requirements for cast concrete elements.
 *
 * Input shape (slab):
 *   {
 *     elementType: 'slab',
 *     length: number,              // in metres
 *     width: number,               // in metres
 *     thickness: number,           // in mm
 *     thicknessUnit: 'mm'|etc,
 *     cementParts: number,         // cement parts in the mix (e.g. 1 for 1:2:4)
 *     sandParts: number,           // sand parts
 *     aggregateParts: number,      // aggregate parts
 *     wastePercent: number,        // 0–100
 *   }
 *
 * Input shape (column):
 *   {
 *     elementType: 'column',
 *     height: number,              // in metres
 *     length: number,              // cross-section, in mm
 *     lengthUnit: 'mm'|etc,
 *     width: number,               // cross-section, in mm
 *     widthUnit: 'mm'|etc,
 *     quantity: number,            // how many identical columns
 *     cementParts: number,
 *     sandParts: number,
 *     aggregateParts: number,
 *     wastePercent: number,
 *   }
 *
 * Assumptions applied:
 * - Slab volume = length × width × thickness (converted to m³).
 * - Column volume = height × length × width per unit, multiplied by quantity.
 * - Mix ratio defines dry material proportions by volume.
 * - Concrete slump/compaction adds ~20% to dry volume, so wet concrete
 *   yield is approximately 1.2× the dry volume (industry standard).
 * - Waste accounts for spillage, over-pouring, and form loss.
 * - Density of concrete is ~2,400 kg/m³ for reference (not calculated here).
 *
 * Output shape:
 *   {
 *     individualVolumeM3: number,  // per element (slab or one column)
 *     totalVolumeM3: number,       // total concrete needed
 *     cementM3: number,            // dry cement volume
 *     sandM3: number,              // dry sand volume
 *     aggregateM3: number,         // dry aggregate volume
 *     cementWithWasteM3: number,   // cement + waste
 *     sandWithWasteM3: number,     // sand + waste
 *     aggregateWithWasteM3: number,// aggregate + waste
 *     assumptions: {...}
 *   }
 */
function calculateConcrete(input) {
    var out = {};
    var assumptions = {
        mixRatio: input.cementParts + ':' + input.sandParts + ':' + input.aggregateParts,
        wetYield: 1.2,
        concreteDensity: '~2,400 kg/m³',
        description: 'Dry material volumes expanded by 20% for wet concrete yield (slump and compaction loss).'
    };

    var individualVolumeM3, totalVolumeM3;

    if (input.elementType === 'slab') {
        /* Slab calculation */
        var thicknessMm = toMillimetres(input.thickness, input.thicknessUnit || 'mm');
        var thicknessM = thicknessMm / 1000;
        individualVolumeM3 = input.length * input.width * thicknessM;
        totalVolumeM3 = individualVolumeM3; // Single slab
    } else if (input.elementType === 'column') {
        /* Column calculation */
        var lengthMm = toMillimetres(input.length, input.lengthUnit || 'mm');
        var widthMm = toMillimetres(input.width, input.widthUnit || 'mm');
        var lengthM = lengthMm / 1000;
        var widthM = widthMm / 1000;
        var heightM = input.height || 0;
        var qty = input.quantity || 1;

        individualVolumeM3 = heightM * lengthM * widthM;
        totalVolumeM3 = individualVolumeM3 * qty;
    } else {
        return out; // Unknown type
    }

    /* Dry material volumes */
    var totalParts = input.cementParts + input.sandParts + input.aggregateParts;
    var cementM3 = totalVolumeM3 * (input.cementParts / totalParts);
    var sandM3 = totalVolumeM3 * (input.sandParts / totalParts);
    var aggregateM3 = totalVolumeM3 * (input.aggregateParts / totalParts);

    /* Add waste allowance */
    var waste = input.wastePercent || 0;
    var wasteFactor = 1 + (waste / 100);
    var cementWithWasteM3 = cementM3 * wasteFactor;
    var sandWithWasteM3 = sandM3 * wasteFactor;
    var aggregateWithWasteM3 = aggregateM3 * wasteFactor;

    out.individualVolumeM3 = roundTo(individualVolumeM3, 4);
    out.totalVolumeM3 = roundTo(totalVolumeM3, 3);
    out.cementM3 = roundTo(cementM3, 3);
    out.sandM3 = roundTo(sandM3, 3);
    out.aggregateM3 = roundTo(aggregateM3, 3);
    out.cementWithWasteM3 = roundTo(cementWithWasteM3, 3);
    out.sandWithWasteM3 = roundTo(sandWithWasteM3, 3);
    out.aggregateWithWasteM3 = roundTo(aggregateWithWasteM3, 3);
    out.assumptions = assumptions;

    return out;
}

/* ---------------------------------------------------------------
   Formatting Helpers
   --------------------------------------------------------------- */
function roundTo(value, decimals) {
    var factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

function formatNumber(value, decimals) {
    var rounded = roundTo(value, decimals || 0);
    var str = String(rounded);
    var parts = str.split('.');
    // Add thousands separators
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

/* ---------------------------------------------------------------
   Public API
   --------------------------------------------------------------- */
export const concrete = {
    calculate: calculateConcrete,
    formatNumber: formatNumber,
    roundTo: roundTo
};
