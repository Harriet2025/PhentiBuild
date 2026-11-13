/* AUTO-CONVERTED from frontend/js/modules/plaster-calcs.js — the original IIFE wrapper
   and window.PhB export were replaced by an ES module export. Every formula line
   is unchanged; web/src/domain/engines/engines.test.ts proves identical output. */
/**
 * PhentiBuild (PhB) - Plaster & Mortar Calculator
 *
 * Pure calculation module for plaster/render quantity estimation.
 * No DOM, no UI — just numbers.
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
 * Estimates plaster/render and mortar requirements for wall finishes.
 *
 * Input shape:
 *   {
 *     wallLength: number,          // in metres
 *     wallHeight: number,          // in metres
 *     numberOfWalls: number,       // how many walls (1–n)
 *     plasterThickness: number,    // in mm
 *     plasterThicknessUnit: 'mm'|etc,
 *     mixRatioCement: number,      // cement parts (e.g. 1 for 1:3)
 *     mixRatioSand: number,        // sand parts (e.g. 3 for 1:3)
 *     wastePercent: number,        // 0–100
 *   }
 *
 * Assumptions applied:
 * - Walls are flat, vertical rectangles with no openings.
 * - Plaster fills the full thickness uniformly.
 * - Mix ratio is applied as volume fractions (cement : sand).
 * - Mortar is mixed dry, so 1 volume part cement + 3 volume parts sand
 *   yields approximately 3.6–3.8 volume parts of mixed mortar
 *   (due to air pockets and compaction). We use 3.8 as the standard.
 * - Waste accounts for spillage, over-troweling, and mixing loss.
 * - Density of mortar is ~1,900–2,000 kg/m³ (informational only).
 *
 * Output shape:
 *   {
 *     totalSurfaceAreaM2: number,  // total area to be plastered
 *     plasterVolumeM3: number,     // volume of plaster needed
 *     mortarVolumeM3: number,      // mortar to be mixed (same as plaster volume)
 *     cementRequirementM3: number, // dry cement volume
 *     sandRequirementM3: number,   // dry sand volume
 *     cementWithWasteM3: number,   // cement + waste
 *     sandWithWasteM3: number,     // sand + waste
 *     assumptions: {...}
 *   }
 */
function calculatePlaster(input) {
    var out = {};
    var assumptions = {
        mixRatio: input.mixRatioCement + ':' + input.mixRatioSand,
        mortarYield: 3.8,
        mortarDensity: '~1,950 kg/m³',
        description: 'Plaster is a cementitious mortar applied to walls. Dry mix volumes are calculated; wet yield varies by water content.'
    };

    /* 1. Total surface area */
    var totalSurfaceAreaM2 = input.wallLength * input.wallHeight * input.numberOfWalls;

    /* 2. Plaster volume (m³) */
    var thicknessMm = toMillimetres(input.plasterThickness, input.plasterThicknessUnit || 'mm');
    var thicknessM = thicknessMm / 1000;
    var plasterVolumeM3 = totalSurfaceAreaM2 * thicknessM;

    /* 3. Mortar volume = plaster volume (mortar is the base of plaster) */
    var mortarVolumeM3 = plasterVolumeM3;

    /* 4. Cement and sand requirements (dry) */
    // Mix ratio: cement : sand
    var cementParts = input.mixRatioCement || 1;
    var sandParts = input.mixRatioSand || 3;
    var totalParts = cementParts + sandParts;

    // Dry volumes (before mixing)
    var cementRequirementM3 = mortarVolumeM3 * (cementParts / totalParts);
    var sandRequirementM3 = mortarVolumeM3 * (sandParts / totalParts);

    /* 5. Add waste allowance */
    var waste = input.wastePercent || 0;
    var wasteFactor = 1 + (waste / 100);
    var cementWithWasteM3 = cementRequirementM3 * wasteFactor;
    var sandWithWasteM3 = sandRequirementM3 * wasteFactor;

    out.totalSurfaceAreaM2 = roundTo(totalSurfaceAreaM2, 2);
    out.plasterVolumeM3 = roundTo(plasterVolumeM3, 3);
    out.mortarVolumeM3 = roundTo(mortarVolumeM3, 3);
    out.cementRequirementM3 = roundTo(cementRequirementM3, 3);
    out.sandRequirementM3 = roundTo(sandRequirementM3, 3);
    out.cementWithWasteM3 = roundTo(cementWithWasteM3, 3);
    out.sandWithWasteM3 = roundTo(sandWithWasteM3, 3);
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
export const plaster = {
    calculate: calculatePlaster,
    formatNumber: formatNumber,
    roundTo: roundTo
};
