/* AUTO-CONVERTED from frontend/js/modules/timber-calcs.js — the original IIFE wrapper
   and window.PhB export were replaced by an ES module export. Every formula line
   is unchanged; web/src/domain/engines/engines.test.ts proves identical output. */
/**
 * PhentiBuild (PhB) - Timber & Woodwork Calculator
 *
 * Pure calculation module for structural/carcassing timber takeoffs:
 * rafters, purlins and battens. Works out how many pieces of a given
 * timber size are needed to frame a structure at a fixed spacing, and
 * how much of that quantity is consumed by waste.
 *
 * This file has no knowledge of the DOM. manual-input.js reads the form,
 * builds the input object below, and renders whatever comes back.
 */

/* ---------------------------------------------------------------
   CONSTANTS
   --------------------------------------------------------------- */
// Nominal size -> actual cross-section, in millimetres. These follow
// the timber-trade rounding common on Ghanaian and UK sites
// (1 inch ~= 25mm), not the US dressed-lumber convention.
var SECTION_SIZES = {
    '2 x 2': { width: 50, thickness: 50 },
    '2 x 3': { width: 50, thickness: 75 },
    '2 x 4': { width: 50, thickness: 100 },
    '2 x 6': { width: 50, thickness: 150 },
    '4 x 4': { width: 100, thickness: 100 }
};

/* ---------------------------------------------------------------
   UNIT CONVERSION
   --------------------------------------------------------------- */
var TO_M = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 };

function toMetres(value, unit) {
    return value * (TO_M[unit] || 1);
}

function normaliseMemberType(value) {
    var v = String(value || '').trim().toLowerCase();
    if (v.indexOf('purlin') === 0) { return 'purlins'; }
    if (v.indexOf('batten') === 0) { return 'battens'; }
    return 'rafters';
}

/**
 * Estimates the number of timber pieces, total length and waste for a
 * run of rafters, purlins or battens across a structure.
 *
 * Input shape:
 *   {
 *     memberType: 'Rafters' | 'Purlins' | 'Battens',
 *     timberType: '2 x 2' | '2 x 3' | '2 x 4' | '2 x 6' | '4 x 4',
 *     timberLength: number,       // stock length of one piece, metres
 *     spacing: number,            // required centre-to-centre spacing
 *     spacingUnit: 'mm'|'cm'|'m'|'in'|'ft',
 *     structureLength: number,    // metres
 *     structureWidth: number,     // metres
 *     wastePercent: number        // default 0
 *   }
 *
 * Assumptions applied:
 * - Rafters are spaced along the structure length (across the ridge)
 *   and each one is cut from a single stock-length piece — no
 *   splicing along its run, since a rafter's actual sloped length is
 *   whatever was entered as Timber Length.
 * - Purlins and battens run horizontally across the rafters, spaced
 *   up the structure width (the roof slope), and are spliced from
 *   stock lengths to cover the full structure length whenever one
 *   piece is not long enough on its own.
 * - The "+1" on the piece/row count covers the starting member at
 *   the zero position, which spacing alone would otherwise miss.
 * - Waste is a flat percentage applied to the total length. The
 *   final piece quantity is separately rounded up so it is always a
 *   whole, purchasable number of pieces once that waste allowance is
 *   included.
 *
 * Output shape:
 *   {
 *     memberType, timberType,
 *     crossSection: { width, thickness } (mm),
 *     numberOfPieces: number,       // base pieces needed, no waste
 *     totalTimberLength: number,    // metres, before waste
 *     waste: number,                // metres
 *     finalTimberLength: number,    // metres, including waste
 *     finalQuantity: number,        // pieces, including waste
 *     assumptions: {...}
 *   }
 */
function calculateTimber(input) {
    var memberType = normaliseMemberType(input.memberType);
    var timberType = input.timberType || '2 x 4';
    var crossSection = SECTION_SIZES[timberType] || SECTION_SIZES['2 x 4'];

    var timberLength = input.timberLength || 0; // metres, stock piece length
    var spacingM = toMetres(input.spacing || 0, input.spacingUnit || 'mm');
    var structureLength = input.structureLength || 0; // metres
    var structureWidth = input.structureWidth || 0;   // metres
    var wastePercent = input.wastePercent || 0;

    var numberOfPieces;

    if (memberType === 'rafters') {
        // Spaced along the length; each rafter is a single stock piece.
        numberOfPieces = Math.ceil(structureLength / spacingM) + 1;
    } else {
        // Purlins / battens: rows spaced up the width; each row is
        // spliced from stock lengths to cover the full structure length.
        var rowCount = Math.ceil(structureWidth / spacingM) + 1;
        var piecesPerRow = Math.max(1, Math.ceil(structureLength / timberLength));
        numberOfPieces = rowCount * piecesPerRow;
    }

    var totalTimberLength = numberOfPieces * timberLength;
    var waste = totalTimberLength * (wastePercent / 100);
    var finalTimberLength = totalTimberLength + waste;
    var finalQuantity = Math.ceil(numberOfPieces * (1 + wastePercent / 100));

    var assumptions = {
        spacingAxis: memberType === 'rafters'
            ? 'Structure length (' + roundTo(structureLength, 2) + ' m), members run across it.'
            : 'Structure width (' + roundTo(structureWidth, 2) + ' m), rows run up it.',
        spanAxis: memberType === 'rafters'
            ? 'Each rafter is one stock-length piece — no splicing assumed.'
            : 'Structure length (' + roundTo(structureLength, 2) + ' m), spliced from stock-length pieces per row.',
        description: memberType === 'rafters'
            ? 'Rafters are spaced along the structure length; the +1 covers the starting rafter at the zero position.'
            : 'Rows of ' + memberType + ' are spaced up the structure width; each row is built from stock-length pieces to cover the structure length.'
    };

    return {
        memberType: memberType,
        timberType: timberType,
        crossSection: crossSection,
        numberOfPieces: numberOfPieces,
        totalTimberLength: roundTo(totalTimberLength, 2),
        waste: roundTo(waste, 2),
        finalTimberLength: roundTo(finalTimberLength, 2),
        finalQuantity: finalQuantity,
        assumptions: assumptions
    };
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
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

/* ---------------------------------------------------------------
   Public API
   --------------------------------------------------------------- */
export const timber = {
    calculate: calculateTimber,
    formatNumber: formatNumber,
    roundTo: roundTo,
    sectionSizes: SECTION_SIZES
};
