/**
 * PhentiBuild (PhB) - Roofing Material Coverage Calculator
 *
 * Pure calculation module for sheet/tile/shingle coverage on a roof
 * slope. No DOM, no UI — just numbers, same convention as
 * masonry/plaster/concrete/rebar/timber-calcs.js.
 *
 * Every constant below is a real manufacturer/trade coverage spec, not a
 * guess:
 *   - IBR Long Span:      686 mm effective cover, 737 mm overall width,
 *                          cut to the roof's own slope length.
 *   - Self-Lock Long Span: 275-360 mm effective cover (adjustable side
 *                          lap), 410 mm overall width, cut to length.
 *   - Eurotile / Milano:  1340 x 420 mm tile, installed exposure
 *                          1290 x 370 mm, 900 mm rafter spacing.
 *   - Asphalt Shingles:   139 x 1000 mm shingle strip, 1200 x 2400 mm
 *                          underlay board.
 *
 * The two inputs every material shares — roof width (the horizontal
 * span being covered) and roof slope length (the distance up the
 * pitch, eave to ridge) — match how a roofer actually measures a roof
 * face on site, rather than requiring this file to re-derive Roof
 * Studio's own hip/gable/flat plane geometry (frontend/js/modules/
 * roof-3d-builder.js already owns that, for a different purpose).
 */
(function () {
    'use strict';

    var MATERIALS = {
        ibr: {
            label: 'IBR Long Span',
            effectiveCoverMm: 686,
            overallWidthMm: 737,
            unit: 'sheet'
        },
        selflock: {
            label: 'Self-Lock Long Span',
            effectiveCoverRangeMm: [275, 360],
            defaultEffectiveCoverMm: 320,
            overallWidthMm: 410,
            unit: 'sheet'
        },
        eurotile: {
            label: 'Eurotile / Milano Tile',
            tileSizeMm: { width: 1340, length: 420 },
            exposureMm: { width: 1290, length: 370 },
            rafterSpacingMm: 900,
            unit: 'tile'
        },
        shingles: {
            label: 'Asphalt Shingles',
            shingleSizeMm: { length: 1000, height: 139 },
            underlayBoardMm: { width: 1200, length: 2400 },
            bundleCoverageM2: 9.3,
            bundlesPerCoverage: 3,
            unit: 'strip'
        }
    };

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

    function withWaste(count, wastePercent) {
        return Math.ceil(count * (1 + (wastePercent || 0) / 100));
    }

    /**
     * Input shape:
     *   {
     *     materialType: 'ibr' | 'selflock' | 'eurotile' | 'shingles',
     *     roofWidth: number,          // metres, horizontal span covered
     *     roofSlopeLength: number,    // metres, eave to ridge along the pitch
     *     effectiveCoverMm: number,   // selflock only, 275-360
     *     wastePercent: number        // default 0
     *   }
     *
     * Output shape (fields vary slightly per material — see each branch):
     *   {
     *     materialType, label,
     *     ...material-specific counts...,
     *     assumptions: {...}
     *   }
     */
    function calculateRoofing(input) {
        var materialType = input.materialType;
        var spec = MATERIALS[materialType];
        if (!spec) { throw new Error('Unknown roofing material type: ' + materialType); }

        var roofWidth = input.roofWidth || 0;
        var slopeLength = input.roofSlopeLength || 0;
        var waste = input.wastePercent || 0;
        var out = { materialType: materialType, label: spec.label };

        if (materialType === 'ibr' || materialType === 'selflock') {
            var coverMm = materialType === 'selflock'
                ? (input.effectiveCoverMm || spec.defaultEffectiveCoverMm)
                : spec.effectiveCoverMm;
            var coverM = coverMm / 1000;

            var sheetCount = Math.ceil(roofWidth / coverM);
            var sheetCountWithWaste = withWaste(sheetCount, waste);
            var totalLengthOrdered = sheetCountWithWaste * slopeLength;

            out.effectiveCoverMm = coverMm;
            out.overallWidthMm = spec.overallWidthMm;
            out.sheetCount = sheetCount;
            out.sheetCountWithWaste = sheetCountWithWaste;
            out.sheetLength = roundTo(slopeLength, 2);
            out.totalLengthOrdered = roundTo(totalLengthOrdered, 2);
            out.assumptions = {
                effectiveCover: coverMm + ' mm per sheet' + (materialType === 'selflock' ? ' (adjustable, 275–360 mm range)' : ''),
                overallWidth: spec.overallWidthMm + ' mm',
                description: 'Sheets are cut to the roof\'s own slope length and run vertically from eave to ridge; width is covered by side-lapping sheets at their effective cover.'
            };
        } else if (materialType === 'eurotile') {
            var exposureWm = spec.exposureMm.width / 1000;
            var exposureLm = spec.exposureMm.length / 1000;
            var rafterSpacingM = spec.rafterSpacingMm / 1000;

            var tilesPerRow = Math.ceil(roofWidth / exposureWm);
            var rows = Math.ceil(slopeLength / exposureLm);
            var totalTiles = tilesPerRow * rows;
            var totalTilesWithWaste = withWaste(totalTiles, waste);

            var battenRows = rows;
            var battenTotalLengthM = battenRows * roofWidth;
            var rafterCount = Math.ceil(roofWidth / rafterSpacingM) + 1;

            out.tileSizeMm = spec.tileSizeMm;
            out.exposureMm = spec.exposureMm;
            out.tilesPerRow = tilesPerRow;
            out.rows = rows;
            out.totalTiles = totalTiles;
            out.totalTilesWithWaste = totalTilesWithWaste;
            out.battenRows = battenRows;
            out.battenTotalLengthM = roundTo(battenTotalLengthM, 2);
            out.rafterCount = rafterCount;
            out.assumptions = {
                exposure: spec.exposureMm.width + ' x ' + spec.exposureMm.length + ' mm installed exposure per tile (' + spec.tileSizeMm.width + ' x ' + spec.tileSizeMm.length + ' mm actual tile size)',
                rafterSpacing: spec.rafterSpacingMm + ' mm centres',
                description: 'Tiles are laid in rows up the slope at their installed exposure; one continuous batten line runs the full roof width per row, fixed to rafters at the spacing above.'
            };
        } else if (materialType === 'shingles') {
            var courseHeightM = spec.shingleSizeMm.height / 1000;
            var strimLengthM = spec.shingleSizeMm.length / 1000;
            var roofAreaM2 = roofWidth * slopeLength;

            var courses = Math.ceil(slopeLength / courseHeightM);
            var stripsPerCourse = Math.ceil(roofWidth / strimLengthM);
            var totalStrips = courses * stripsPerCourse;
            var totalStripsWithWaste = withWaste(totalStrips, waste);

            var underlayBoardAreaM2 = (spec.underlayBoardMm.width / 1000) * (spec.underlayBoardMm.length / 1000);
            var underlayBoards = Math.ceil(roofAreaM2 / underlayBoardAreaM2);
            var bundles = Math.ceil((roofAreaM2 / spec.bundleCoverageM2) * spec.bundlesPerCoverage);

            out.shingleSizeMm = spec.shingleSizeMm;
            out.roofAreaM2 = roundTo(roofAreaM2, 2);
            out.courses = courses;
            out.stripsPerCourse = stripsPerCourse;
            out.totalStrips = totalStrips;
            out.totalStripsWithWaste = totalStripsWithWaste;
            out.underlayBoardMm = spec.underlayBoardMm;
            out.underlayBoards = underlayBoards;
            out.bundles = bundles;
            out.assumptions = {
                shingleSize: spec.shingleSizeMm.length + ' x ' + spec.shingleSizeMm.height + ' mm per strip',
                underlayBoard: spec.underlayBoardMm.width + ' x ' + spec.underlayBoardMm.length + ' mm per board',
                description: 'Strips run in courses up the slope at their own height; a solid underlay of marine/construction board is assumed beneath the full roof area before shingles are laid.'
            };
        }

        return out;
    }

    window.PhB = window.PhB || {};
    window.PhB.roofing = {
        calculate: calculateRoofing,
        formatNumber: formatNumber,
        roundTo: roundTo,
        MATERIALS: MATERIALS
    };
})();
