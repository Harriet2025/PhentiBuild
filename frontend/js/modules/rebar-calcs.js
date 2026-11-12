/**
 * PhentiBuild (PhB) - Rebar Calculator
 *
 * Pure calculation module for reinforcing steel (rebar) quantity and weight estimation.
 * Calculates main bars, stirrups, and total steel weight for reinforced concrete columns.
 */
(function () {
    'use strict';

    /* ---------------------------------------------------------------
       CONSTANTS
       --------------------------------------------------------------- */
    var STEEL_DENSITY = 7850; // kg/m³
    var STIRRUP_CORNER_OVERLAP = 0.10; // metres (100mm per corner × 4 corners = 400mm)

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
     * Estimates rebar (reinforcing steel) quantities and weight for reinforced columns.
     *
     * Input shape:
     *   {
     *     numberOfMainBars: number,    // main bars per column (e.g. 6, 8)
     *     mainBarDiameter: number,     // in mm (e.g. 16, 20)
     *     mainBarLength: number,       // in metres (column height)
     *     stirrupDiameter: number,     // in mm (e.g. 8, 10)
     *     stirrupSpacing: number,      // in mm, centre-to-centre (e.g. 200)
     *     stirrupSpacingUnit: 'mm'|etc,
     *     columnHeight: number,        // in metres
     *     columnLength: number,        // cross-section, in mm
     *     columnLengthUnit: 'mm'|etc,
     *     columnWidth: number,         // cross-section, in mm
     *     columnWidthUnit: 'mm'|etc,
     *     columnQuantity: number,      // how many identical columns
     *     steelDensity: number,        // kg/m³ (default 7850 for rebars)
     *     stirrupOverlap: number,      // metres per corner (default 0.10)
     *   }
     *
     * Assumptions applied:
     * - Main bars run the full column height.
     * - Stirrups are rectangular hoops spaced along the column at regular intervals.
     * - Stirrup length = perimeter − corner overlaps.
     *   (Each corner loses a small splice length; 100mm × 4 = 400mm typical.)
     * - Number of stirrups = ceil(column height / spacing) + 1
     *   (The +1 accounts for the top and bottom terminal stirrups.)
     * - Steel weight is calculated from diameter and length using the standard
     *   formula: weight (kg) = length (m) × diameter² (mm²) × density / (π × 1e6).
     *   Simplified to: weight = length × (diameter² / 162) for ~7850 kg/m³ steel.
     * - Total quantity and weight are multiplied by column quantity.
     *
     * Output shape:
     *   {
     *     mainBarQuantity: number,     // total main bars across all columns
     *     mainBarTotalLength: number,  // in metres
     *     mainBarTotalWeight: number,  // in kg
     *     stirrupQuantity: number,     // total stirrups across all columns
     *     stirrupTotalLength: number,  // in metres
     *     stirrupTotalWeight: number,  // in kg
     *     totalSteelLength: number,    // main + stirrup (metres)
     *     totalSteelWeight: number,    // main + stirrup (kg)
     *     schedule: [
     *       { type, diameter, spacing, quantity, lengthPerUnit, totalLength, weightPerUnit, totalWeight }
     *     ],
     *     assumptions: {...}
     *   }
     */
    function calculateRebar(input) {
        var out = {};
        var schedule = [];
        var assumptions = {
            steelDensity: input.steelDensity || STEEL_DENSITY + ' kg/m³',
            stirrupOverlapPerCorner: (input.stirrupOverlap || STIRRUP_CORNER_OVERLAP) * 1000 + ' mm per corner',
            description: 'Main bars run column height. Stirrups spaced along height; length = perimeter − overlaps. Weight calculated from π × (d/2)² × length × density.'
        };

        /* Convert dimensions */
        var colHeightM = input.columnHeight || 0;
        var colLengthMm = toMillimetres(input.columnLength, input.columnLengthUnit || 'mm');
        var colWidthMm = toMillimetres(input.columnWidth, input.columnWidthUnit || 'mm');
        var colLengthM = colLengthMm / 1000;
        var colWidthM = colWidthMm / 1000;
        var stirrupSpacingMm = toMillimetres(input.stirrupSpacing, input.stirrupSpacingUnit || 'mm');
        var stirrupSpacingM = stirrupSpacingMm / 1000;

        var density = input.steelDensity || STEEL_DENSITY;
        var cornerOverlap = input.stirrupOverlap || STIRRUP_CORNER_OVERLAP;
        var colQty = input.columnQuantity || 1;

        /* ---- MAIN BARS ---- */
        var mainBarDiam = input.mainBarDiameter || 16; // mm
        var mainBarLen = input.mainBarLength || colHeightM; // metres
        var mainBarCount = input.numberOfMainBars || 6; // per column

        var mainBarPerColumn = mainBarCount;
        var mainBarTotalCountPerColumn = mainBarPerColumn;
        var mainBarLengthPerBar = mainBarLen;
        var mainBarWeightPerBar = steelWeight(mainBarDiam, mainBarLen, density);

        var mainBarQuantity = mainBarTotalCountPerColumn * colQty;
        var mainBarTotalLength = mainBarQuantity * mainBarLengthPerBar;
        var mainBarTotalWeight = mainBarQuantity * mainBarWeightPerBar;

        schedule.push({
            type: 'Main Bar',
            diameter: mainBarDiam,
            spacing: '—',
            quantity: mainBarQuantity,
            lengthPerUnit: roundTo(mainBarLengthPerBar, 3),
            totalLength: roundTo(mainBarTotalLength, 2),
            weightPerUnit: roundTo(mainBarWeightPerBar, 2),
            totalWeight: roundTo(mainBarTotalWeight, 1)
        });

        /* ---- STIRRUPS ---- */
        var stirrupDiam = input.stirrupDiameter || 8; // mm
        var stirrupPerimeter = 2 * (colLengthM + colWidthM);
        var stirrupLengthPerHoop = stirrupPerimeter - (cornerOverlap * 4); // 4 corners
        var stirrupCountPerColumn = Math.ceil(colHeightM / stirrupSpacingM) + 1;

        var stirrupWeightPerHoop = steelWeight(stirrupDiam, stirrupLengthPerHoop, density);

        var stirrupQuantity = stirrupCountPerColumn * colQty;
        var stirrupTotalLength = stirrupQuantity * stirrupLengthPerHoop;
        var stirrupTotalWeight = stirrupQuantity * stirrupWeightPerHoop;

        schedule.push({
            type: 'Stirrup',
            diameter: stirrupDiam,
            spacing: input.stirrupSpacing + ' ' + (input.stirrupSpacingUnit || 'mm'),
            quantity: stirrupQuantity,
            lengthPerUnit: roundTo(stirrupLengthPerHoop, 3),
            totalLength: roundTo(stirrupTotalLength, 2),
            weightPerUnit: roundTo(stirrupWeightPerHoop, 2),
            totalWeight: roundTo(stirrupTotalWeight, 1)
        });

        /* ---- TOTALS ---- */
        var totalSteelLength = mainBarTotalLength + stirrupTotalLength;
        var totalSteelWeight = mainBarTotalWeight + stirrupTotalWeight;

        out.mainBarQuantity = mainBarQuantity;
        out.mainBarTotalLength = roundTo(mainBarTotalLength, 2);
        out.mainBarTotalWeight = roundTo(mainBarTotalWeight, 1);
        out.stirrupQuantity = stirrupQuantity;
        out.stirrupTotalLength = roundTo(stirrupTotalLength, 2);
        out.stirrupTotalWeight = roundTo(stirrupTotalWeight, 1);
        out.totalSteelLength = roundTo(totalSteelLength, 2);
        out.totalSteelWeight = roundTo(totalSteelWeight, 1);
        out.schedule = schedule;
        out.assumptions = assumptions;

        return out;
    }

    /* ---------------------------------------------------------------
       Steel Weight Calculation
       --------------------------------------------------------------- */
    function steelWeight(diameterMm, lengthM, density) {
        // Weight = π × (d/2)² × length × density
        // Simplified: weight (kg) = length × (diameter² / 162)
        // where 162 ≈ π × 1e6 / 7850 (for 7850 kg/m³ density)
        var factor = (density / 7850) * 162; // adjust factor for different densities
        return (lengthM * diameterMm * diameterMm) / factor;
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
    window.PhB = window.PhB || {};
    window.PhB.rebar = {
        calculate: calculateRebar,
        formatNumber: formatNumber,
        roundTo: roundTo
    };
})();
