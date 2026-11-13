/* AUTO-CONVERTED from frontend/js/modules/masonry-calcs.js — the original IIFE wrapper
   and window.PhB export were replaced by an ES module export. Every formula line
   is unchanged; web/src/domain/engines/engines.test.ts proves identical output. */
/**
 * PhentiBuild (PhB) - Masonry Calculator
 *
 * Pure calculation module for wall and block quantity estimation.
 * No DOM, no UI — just numbers. The inputs and results are plain objects.
 *
 * All lengths are normalized to millimetres before calculation, then the
 * results are rounded to sensible precision.
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
 * Estimates block and mortar requirements for a blockwork wall.
 *
 * Input shape:
 *   {
 *     wallLength: number,          // in metres
 *     wallHeight: number,          // in metres
 *     wallThickness: number,       // in mm (used to estimate mortar volume)
 *     blockLength: number,         // in mm
 *     blockHeight: number,         // in mm
 *     blockLengthUnit: 'mm'|'cm'|etc,
 *     blockHeightUnit: 'mm'|'cm'|etc,
 *     mortarAllowance: number,     // in mm (added to block dimensions)
 *     mortarAllowanceUnit: 'mm'|etc,
 *     wastePercent: number,        // 0–100
 *   }
 *
 * Assumptions applied:
 * - Blocks are laid in a grid pattern (no bond variation, single-wythe only).
 * - Mortar allowance is added to both block length and height.
 * - Mortar joint volume is estimated as 10% of the solid block volume
 *   (standard assumption in construction).
 * - Waste accounts for breakage and cutting; it's added as a percentage
 *   of the dry block count.
 * - Wall thickness is used to estimate mortar requirement; it's assumed
 *   the wall is a single wythe and mortar fills the full thickness.
 *
 * Output shape:
 *   {
 *     wallAreaM2: number,          // wall area in m²
 *     blockCountDry: number,       // blocks needed (without waste)
 *     wasteCount: number,          // blocks to account for waste
 *     blockCountFinal: number,     // total blocks (including waste)
 *     mortarVolumeM3: number,      // mortar needed in m³
 *     assumptions: {
 *       mortarPercentOfBlock: 10,
 *       …
 *     }
 *   }
 */
function calculateMasonry(input) {
    var out = {};
    var assumptions = {
        mortarPercentOfBlock: 10,
        blockPattern: 'single-wythe grid',
        description: 'Single-wythe blocks in a regular grid with uniform mortar joints.'
    };

    /* Convert all dimensions to millimetres */
    var wLength = toMillimetres(input.wallLength, 'm');      // wall length in mm
    var wHeight = toMillimetres(input.wallHeight, 'm');      // wall height in mm
    var wThickness = toMillimetres(input.wallThickness, 'mm'); // already mm
    var bLength = toMillimetres(input.blockLength, input.blockLengthUnit || 'mm');
    var bHeight = toMillimetres(input.blockHeight, input.blockHeightUnit || 'mm');
    var mortar = toMillimetres(input.mortarAllowance || 0, input.mortarAllowanceUnit || 'mm');
    var waste = input.wastePercent || 0;

    /* 1. Wall area (m²) */
    var wallAreaM2 = (input.wallLength * input.wallHeight);

    /* 2. Block count (dry) */
    // Add mortar allowance to block dimensions for fitting calculation
    var bLengthWithMortar = bLength + mortar;
    var bHeightWithMortar = bHeight + mortar;
    var bAreaMm2 = bLengthWithMortar * bHeightWithMortar;
    var wallAreaMm2 = wLength * wHeight;
    var blockCountDry = Math.ceil(wallAreaMm2 / bAreaMm2);

    /* 3. Waste blocks */
    var wasteCount = Math.ceil(blockCountDry * (waste / 100));
    var blockCountFinal = blockCountDry + wasteCount;

    /* 4. Mortar volume (m³) */
    // Solid block volume
    var blockVolumeMm3 = bLength * bHeight * wThickness;
    var blockVolumeM3 = blockVolumeMm3 / 1e9;

    // Mortar is estimated as a percentage of the total block volume
    var mortarPercentage = assumptions.mortarPercentOfBlock / 100;
    var mortarVolumeM3 = blockCountDry * blockVolumeM3 * mortarPercentage;

    out.wallAreaM2 = roundTo(wallAreaM2, 2);
    out.blockCountDry = blockCountDry;
    out.wasteCount = wasteCount;
    out.blockCountFinal = blockCountFinal;
    out.mortarVolumeM3 = roundTo(mortarVolumeM3, 3);
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
export const masonry = {
    calculate: calculateMasonry,
    formatNumber: formatNumber,
    roundTo: roundTo
};
