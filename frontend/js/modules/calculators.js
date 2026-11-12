/**
 * PhentiBuild (PhB) - Calculators (page controller)
 *
 * A quick-access chooser + form for each of the five calculation
 * engines already used by Manual Input (window.PhB.masonry/.plaster/
 * .concrete/.rebar/.timber — see frontend/js/modules/*-calcs.js). This
 * file does not compute anything itself: it only validates input,
 * hands it to the matching engine exactly the way manual-input.js's
 * runXCalculator functions do, and renders whatever comes back into a
 * generic results panel. Save Calculation and Add to Bill of Quantities
 * reuse the same calculations-store.js / boq-store.js already wired
 * into Manual Input.
 *
 * Field validation is generic and reads the data-* attributes rendered
 * by pages/modules/calculators.php, the same convention manual-input.js
 * uses for its own forms (this file is self-contained rather than
 * sharing that closure, matching how every other module in this app
 * owns its own DOM logic).
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-calculators-module]');
    if (!root) { return; }

    var chooser = root.querySelector('[data-calc-chooser]');
    var formViews = Array.prototype.slice.call(root.querySelectorAll('[data-calc-form-view]'));

    function toast(message, variant) {
        if (window.PhB && window.PhB.toast) { window.PhB.toast(message, variant); }
    }

    /* ---------------------------------------------------------------
       Units + validation (mirrors manual-input.js's generic validator)
       --------------------------------------------------------------- */
    var TO_MM = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 };
    var UNIT_NAME = { mm: 'mm', cm: 'cm', m: 'm', in: 'in', ft: 'ft' };
    var NUMBER = /^(\d+(\.\d+)?|\.\d+)$/;

    function formatNumber(value) {
        var rounded = Math.round(value * 1000) / 1000;
        var parts = String(rounded).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    function limitInUnit(millimetres, unit) {
        return formatNumber(millimetres / TO_MM[unit]) + ' ' + UNIT_NAME[unit];
    }

    function exampleFor(input) {
        var placeholder = input.getAttribute('placeholder') || '';
        return placeholder.replace(/^e\.g\.\s*/i, '') || '12.5';
    }

    function unitFor(form, input) {
        var select = form.querySelector('[data-calc-unit="' + input.name + '"]');
        return select ? select.value : null;
    }

    function messageFor(form, input) {
        var label = input.getAttribute('data-label');
        var kind = input.getAttribute('data-kind');
        var required = input.getAttribute('data-required') === '1';
        var raw = input.value.trim().replace(/\s+/g, ' ');

        if (!raw) {
            if (!required) { return ''; }
            return kind === 'select'
                ? 'Select a ' + label.toLowerCase() + '.'
                : label + ' is required.';
        }

        if (kind === 'select') { return ''; }

        var cleaned = raw.replace(/,/g, '').replace(/^\+/, '');

        if (cleaned.charAt(0) === '-') {
            return label + ' cannot be negative.';
        }
        if (!NUMBER.test(cleaned)) {
            return label + ' must be a number, for example ' + exampleFor(input) + '.';
        }

        var value = parseFloat(cleaned);
        if (value <= 0) {
            return label + ' must be greater than zero.';
        }

        if (kind === 'count') {
            if (value % 1 !== 0) {
                return label + ' must be a whole number.';
            }
            var countMin = parseFloat(input.getAttribute('data-min'));
            var countMax = parseFloat(input.getAttribute('data-max'));
            if (value < countMin || value > countMax) {
                return label + ' must be between ' + formatNumber(countMin) +
                       ' and ' + formatNumber(countMax) + '.';
            }
            return '';
        }

        // kind === 'length'
        var unit = unitFor(form, input) || 'mm';
        var minMm = parseFloat(input.getAttribute('data-min'));
        var maxMm = parseFloat(input.getAttribute('data-max'));
        var asMm = value * TO_MM[unit];

        if (asMm < minMm || asMm > maxMm) {
            return label + ' must be between ' + limitInUnit(minMm, unit) +
                   ' and ' + limitInUnit(maxMm, unit) + '.';
        }
        return '';
    }

    /* ---------------------------------------------------------------
       Per-engine input mapping (adapted from manual-input.js's
       runXCalculator functions) and result-panel rendering specs.
       --------------------------------------------------------------- */
    function readValues(form, inputs) {
        var values = {};
        inputs.forEach(function (input) { values[input.name] = input.value.trim(); });
        return values;
    }

    function readUnits(form) {
        var units = {};
        form.querySelectorAll('[data-calc-unit][data-unit-kind="length"]').forEach(function (select) {
            units[select.getAttribute('data-calc-unit')] = select.value;
        });
        return units;
    }

    var ENGINES = {
        masonry: {
            buildInput: function (values, units) {
                return {
                    wallLength: parseFloat(values.wallLength),
                    wallHeight: parseFloat(values.wallHeight),
                    wallThickness: parseFloat(values.wallThickness),
                    blockLength: parseFloat(values.blockLength),
                    blockHeight: parseFloat(values.blockHeight),
                    blockLengthUnit: units.blockLength || 'mm',
                    blockHeightUnit: units.blockHeight || 'mm',
                    mortarAllowance: values.mortarAllowance ? parseFloat(values.mortarAllowance) : 0,
                    mortarAllowanceUnit: units.mortarAllowance || 'mm',
                    wastePercent: values.wastePercent ? parseFloat(values.wastePercent) : 0
                };
            },
            run: function (input) { return window.PhB.masonry.calculate(input); },
            title: 'Block Quantity Estimate',
            successToast: 'Blocks and mortar calculated.',
            results: [
                { key: 'wallAreaM2', label: 'Wall Area', unit: 'm²', decimals: 2 },
                { key: 'blockCountDry', label: 'Blocks (dry)', unit: 'pieces' },
                { key: 'wasteCount', label: 'Waste Allowance', unit: 'pieces' },
                { key: 'blockCountFinal', label: 'Total Blocks', unit: 'pieces', highlight: true },
                { key: 'mortarVolumeM3', label: 'Mortar Requirement', unit: 'm³', decimals: 3 }
            ],
            assumptions: [
                { key: 'blockPattern', label: 'Block pattern' },
                { key: 'mortarPercentOfBlock', label: 'Mortar', suffix: '% of solid block volume' },
                { key: 'description', label: 'Method' }
            ]
        },
        plaster: {
            buildInput: function (values, units) {
                return {
                    wallLength: parseFloat(values.wallLength),
                    wallHeight: parseFloat(values.wallHeight),
                    numberOfWalls: values.numberOfWalls ? parseFloat(values.numberOfWalls) : 1,
                    plasterThickness: parseFloat(values.plasterThickness),
                    plasterThicknessUnit: units.plasterThickness || 'mm',
                    mixRatioCement: values.mixRatioCement ? parseFloat(values.mixRatioCement) : 1,
                    mixRatioSand: values.mixRatioSand ? parseFloat(values.mixRatioSand) : 3,
                    wastePercent: values.wastePercent ? parseFloat(values.wastePercent) : 0
                };
            },
            run: function (input) { return window.PhB.plaster.calculate(input); },
            title: 'Plaster & Mortar Estimate',
            successToast: 'Plaster and mortar calculated.',
            results: [
                { key: 'totalSurfaceAreaM2', label: 'Total Area', unit: 'm²', decimals: 2 },
                { key: 'plasterVolumeM3', label: 'Plaster Volume', unit: 'm³', decimals: 3 },
                { key: 'cementRequirementM3', label: 'Cement (dry)', unit: 'm³', decimals: 3 },
                { key: 'sandRequirementM3', label: 'Sand (dry)', unit: 'm³', decimals: 3 },
                { key: 'cementWithWasteM3', label: 'Cement (final)', unit: 'm³', decimals: 3, highlight: true },
                { key: 'sandWithWasteM3', label: 'Sand (final)', unit: 'm³', decimals: 3, highlight: true }
            ],
            assumptions: [
                { key: 'mixRatio', label: 'Mix ratio', suffix: ' (cement : sand)' },
                { key: 'description', label: 'Mortar type' },
                { key: 'mortarDensity', label: 'Density', suffix: ' (wet mortar)' }
            ]
        },
        concrete: {
            buildInput: function (values, units) {
                var elementType = values.concreteType === 'Slab (one-off)' ? 'slab' : 'column';
                var input = {
                    elementType: elementType,
                    cementParts: values.cementPartsConc ? parseFloat(values.cementPartsConc) : 1,
                    sandParts: values.sandPartsConc ? parseFloat(values.sandPartsConc) : 2,
                    aggregateParts: values.aggregatePartsConc ? parseFloat(values.aggregatePartsConc) : 4,
                    wastePercent: values.wastePercentConc ? parseFloat(values.wastePercentConc) : 0
                };
                if (elementType === 'slab') {
                    input.length = parseFloat(values.slabLength);
                    input.width = parseFloat(values.slabWidth);
                    input.thickness = parseFloat(values.slabThickness);
                    input.thicknessUnit = units.slabThickness || 'mm';
                } else {
                    input.height = parseFloat(values.columnHeight);
                    input.length = parseFloat(values.columnLength);
                    input.width = parseFloat(values.columnWidth);
                    input.lengthUnit = units.columnLength || 'mm';
                    input.widthUnit = units.columnWidth || 'mm';
                    input.quantity = values.columnQuantity ? parseFloat(values.columnQuantity) : 1;
                }
                return input;
            },
            run: function (input) { return window.PhB.concrete.calculate(input); },
            title: 'Concrete Volume & Materials',
            successToast: 'Concrete volume and materials calculated.',
            results: [
                { key: 'individualVolumeM3', label: 'Individual Volume', unit: 'm³', decimals: 4 },
                { key: 'totalVolumeM3', label: 'Total Volume', unit: 'm³', decimals: 3, highlight: true },
                { key: 'cementM3', label: 'Cement (dry)', unit: 'm³', decimals: 3 },
                { key: 'sandM3', label: 'Sand (dry)', unit: 'm³', decimals: 3 },
                { key: 'aggregateM3', label: 'Aggregate (dry)', unit: 'm³', decimals: 3 },
                { key: 'cementWithWasteM3', label: 'Cement (final)', unit: 'm³', decimals: 3, highlight: true },
                { key: 'sandWithWasteM3', label: 'Sand (final)', unit: 'm³', decimals: 3, highlight: true },
                { key: 'aggregateWithWasteM3', label: 'Aggregate (final)', unit: 'm³', decimals: 3, highlight: true }
            ],
            assumptions: [
                { key: 'mixRatio', label: 'Mix ratio', suffix: ' (cement : sand : aggregate)' },
                { key: 'wetYield', label: 'Wet yield', suffix: '× dry volume (slump/compaction)' },
                { key: 'concreteDensity', label: 'Density' },
                { key: 'description', label: 'Method' }
            ]
        },
        rebar: {
            buildInput: function (values, units) {
                return {
                    numberOfMainBars: values.numberOfMainBars ? parseFloat(values.numberOfMainBars) : 6,
                    mainBarDiameter: values.mainBarDiameter ? parseFloat(values.mainBarDiameter) : 16,
                    mainBarLength: values.mainBarLength ? parseFloat(values.mainBarLength) : 3,
                    stirrupDiameter: values.stirrupDiameter ? parseFloat(values.stirrupDiameter) : 8,
                    stirrupSpacing: values.stirrupSpacing ? parseFloat(values.stirrupSpacing) : 200,
                    stirrupSpacingUnit: units.stirrupSpacing || 'mm',
                    columnHeight: values.columnHeightRebar ? parseFloat(values.columnHeightRebar) : 3,
                    columnLength: values.columnLengthRebar ? parseFloat(values.columnLengthRebar) : 450,
                    columnLengthUnit: units.columnLengthRebar || 'mm',
                    columnWidth: values.columnWidthRebar ? parseFloat(values.columnWidthRebar) : 450,
                    columnWidthUnit: units.columnWidthRebar || 'mm',
                    columnQuantity: values.columnQuantityRebar ? parseFloat(values.columnQuantityRebar) : 1,
                    steelDensity: values.steelDensityRebar ? parseFloat(values.steelDensityRebar) : 7850
                };
            },
            run: function (input) { return window.PhB.rebar.calculate(input); },
            title: 'Steel Reinforcement Schedule',
            successToast: 'Rebar schedule and weight calculated.',
            results: [
                { key: 'totalSteelLength', label: 'Total Steel Length', unit: 'm', decimals: 2 },
                { key: 'totalSteelWeight', label: 'Total Steel Weight', unit: 'kg', decimals: 1, highlight: true }
            ],
            schedule: {
                columns: ['Type', 'Diameter (mm)', 'Spacing', 'Quantity', 'Length/Unit (m)', 'Total Length (m)', 'Weight/Unit (kg)', 'Total Weight (kg)'],
                rows: function (result) {
                    var fmt = window.PhB.rebar.formatNumber;
                    return result.schedule.map(function (row) {
                        return [
                            row.type, row.diameter, row.spacing,
                            fmt(row.quantity), fmt(row.lengthPerUnit, 3), fmt(row.totalLength, 2),
                            fmt(row.weightPerUnit, 2), fmt(row.totalWeight, 1)
                        ];
                    });
                }
            },
            assumptions: [
                { key: 'steelDensity', label: 'Steel density' },
                { key: 'stirrupOverlapPerCorner', label: 'Stirrup overlap' },
                { key: 'description', label: 'Method' }
            ]
        },
        timber: {
            buildInput: function (values, units) {
                return {
                    memberType: values.memberType || 'Rafters',
                    timberType: values.timberType || '2 x 4',
                    timberLength: values.timberLength ? parseFloat(values.timberLength) : 0,
                    spacing: values.spacingTimber ? parseFloat(values.spacingTimber) : 0,
                    spacingUnit: units.spacingTimber || 'mm',
                    structureLength: values.structureLength ? parseFloat(values.structureLength) : 0,
                    structureWidth: values.structureWidth ? parseFloat(values.structureWidth) : 0,
                    wastePercent: values.wastePercentTimber ? parseFloat(values.wastePercentTimber) : 0
                };
            },
            run: function (input) { return window.PhB.timber.calculate(input); },
            title: 'Timber Takeoff',
            successToast: 'Timber quantities calculated.',
            results: [
                { key: 'numberOfPieces', label: 'Number of Pieces', unit: 'pcs' },
                { key: 'totalTimberLength', label: 'Total Timber Length', unit: 'm', decimals: 2 },
                { key: 'waste', label: 'Waste', unit: 'm', decimals: 2 },
                { key: 'finalQuantity', label: 'Final Quantity', unit: 'pcs', highlight: true }
            ],
            schedule: {
                columns: ['Member', 'Size', 'Cross-section (mm)', 'Spacing', 'Pieces', 'Length/Piece (m)', 'Total Length (m)', 'Final Qty (pcs)'],
                rows: function (result, input, values, units) {
                    var fmt = window.PhB.timber.formatNumber;
                    var memberLabel = result.memberType.charAt(0).toUpperCase() + result.memberType.slice(1);
                    return [[
                        memberLabel, result.timberType,
                        result.crossSection.width + ' x ' + result.crossSection.thickness,
                        values.spacingTimber + ' ' + (units.spacingTimber || 'mm'),
                        fmt(result.numberOfPieces), fmt(input.timberLength, 2),
                        fmt(result.totalTimberLength, 2), fmt(result.finalQuantity)
                    ]];
                }
            },
            assumptions: [
                { key: 'spacingAxis', label: 'Spacing axis' },
                { key: 'spanAxis', label: 'Span axis' },
                { key: 'description', label: 'Method' }
            ]
        },
        roofing: {
            // Result shape differs per roofing material (sheets vs tiles vs
            // shingles), so title/results/assumptions are functions of the
            // result here rather than the fixed arrays every other engine
            // uses — see resolve() below, which handles both forms.
            buildInput: function (values, units) {
                var materialTypeMap = {
                    'IBR Long Span': 'ibr',
                    'Self-Lock Long Span': 'selflock',
                    'Eurotile / Milano Tile': 'eurotile',
                    'Asphalt Shingles': 'shingles'
                };
                var input = {
                    materialType: materialTypeMap[values.materialType] || 'ibr',
                    roofWidth: parseFloat(values.roofWidth),
                    roofSlopeLength: parseFloat(values.roofSlopeLength),
                    wastePercent: values.wastePercentRoofing ? parseFloat(values.wastePercentRoofing) : 0
                };
                if (values.effectiveCover) {
                    var unit = units.effectiveCover || 'mm';
                    var toMm = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 };
                    input.effectiveCoverMm = parseFloat(values.effectiveCover) * (toMm[unit] || 1);
                }
                return input;
            },
            run: function (input) { return window.PhB.roofing.calculate(input); },
            title: function (result) { return result.label + ' Coverage'; },
            successToast: function (result) { return result.label + ' coverage calculated.'; },
            results: function (result) {
                var byMaterial = {
                    ibr: [
                        { key: 'sheetCount', label: 'Sheets Needed', unit: 'sheets' },
                        { key: 'sheetCountWithWaste', label: 'Sheets (with waste)', unit: 'sheets', highlight: true },
                        { key: 'sheetLength', label: 'Sheet Length (cut to)', unit: 'm', decimals: 2 },
                        { key: 'totalLengthOrdered', label: 'Total Length to Order', unit: 'm', decimals: 2 }
                    ],
                    selflock: [
                        { key: 'effectiveCoverMm', label: 'Effective Cover Used', unit: 'mm' },
                        { key: 'sheetCount', label: 'Sheets Needed', unit: 'sheets' },
                        { key: 'sheetCountWithWaste', label: 'Sheets (with waste)', unit: 'sheets', highlight: true },
                        { key: 'sheetLength', label: 'Sheet Length (cut to)', unit: 'm', decimals: 2 },
                        { key: 'totalLengthOrdered', label: 'Total Length to Order', unit: 'm', decimals: 2 }
                    ],
                    eurotile: [
                        { key: 'tilesPerRow', label: 'Tiles per Row', unit: 'tiles' },
                        { key: 'rows', label: 'Rows (up the slope)', unit: 'rows' },
                        { key: 'totalTiles', label: 'Total Tiles', unit: 'tiles' },
                        { key: 'totalTilesWithWaste', label: 'Total Tiles (with waste)', unit: 'tiles', highlight: true },
                        { key: 'battenTotalLengthM', label: 'Battens Required', unit: 'm', decimals: 2 },
                        { key: 'rafterCount', label: 'Rafters Required', unit: 'pieces' }
                    ],
                    shingles: [
                        { key: 'roofAreaM2', label: 'Roof Area', unit: 'm²', decimals: 2 },
                        { key: 'courses', label: 'Courses (up the slope)', unit: 'courses' },
                        { key: 'stripsPerCourse', label: 'Strips per Course', unit: 'strips' },
                        { key: 'totalStripsWithWaste', label: 'Total Strips (with waste)', unit: 'strips' },
                        { key: 'bundles', label: 'Bundles to Purchase', unit: 'bundles', highlight: true },
                        { key: 'underlayBoards', label: 'Underlay Boards', unit: 'boards', highlight: true }
                    ]
                };
                return byMaterial[result.materialType] || [];
            },
            assumptions: function (result) {
                var byMaterial = {
                    ibr: [
                        { key: 'effectiveCover', label: 'Effective cover' },
                        { key: 'overallWidth', label: 'Overall width' },
                        { key: 'description', label: 'Method' }
                    ],
                    selflock: [
                        { key: 'effectiveCover', label: 'Effective cover' },
                        { key: 'overallWidth', label: 'Overall width' },
                        { key: 'description', label: 'Method' }
                    ],
                    eurotile: [
                        { key: 'exposure', label: 'Installed exposure' },
                        { key: 'rafterSpacing', label: 'Rafter spacing' },
                        { key: 'description', label: 'Method' }
                    ],
                    shingles: [
                        { key: 'shingleSize', label: 'Shingle size' },
                        { key: 'underlayBoard', label: 'Underlay board' },
                        { key: 'description', label: 'Method' }
                    ]
                };
                return byMaterial[result.materialType] || [];
            }
        }
    };

    /* ---------------------------------------------------------------
       One controller per form. All five behave identically.
       --------------------------------------------------------------- */
    function initForm(view) {
        var form = view.querySelector('[data-calc-form]');
        if (!form) { return; }

        var engineName = form.getAttribute('data-calc-engine');
        var engine = ENGINES[engineName];
        var inputs = Array.prototype.slice.call(form.querySelectorAll('[data-calc-field]'));
        var summary = form.querySelector('[data-calc-summary]');
        var summaryText = form.querySelector('[data-calc-summary-text]');
        var unitAll = form.querySelector('[data-calc-unit-all]');
        var resultsPanel = view.querySelector('[data-calc-results]');

        var touched = {};
        var submitAttempted = false;
        var lastCalculation = null;

        function setFieldError(input, message) {
            var errorEl = form.querySelector('[data-error-for="' + input.name + '"]');
            if (!errorEl) { return; }
            if (message) {
                input.classList.add('is-invalid');
                input.setAttribute('aria-invalid', 'true');
                errorEl.textContent = message;
                errorEl.hidden = false;
            } else {
                input.classList.remove('is-invalid');
                input.removeAttribute('aria-invalid');
                errorEl.textContent = '';
                errorEl.hidden = true;
            }
        }

        function validateAll() {
            var invalid = [];
            inputs.forEach(function (input) {
                var message = messageFor(form, input);
                if (message) { invalid.push(input); }
                var reveal = submitAttempted || touched[input.name];
                setFieldError(input, reveal ? message : '');
            });
            return invalid;
        }

        function clearAll() {
            touched = {};
            submitAttempted = false;
            summary.hidden = true;
            resultsPanel.hidden = true;
            inputs.forEach(function (input) { setFieldError(input, ''); });
        }

        inputs.forEach(function (input) {
            input.addEventListener('blur', function () {
                touched[input.name] = true;
                validateAll();
            });
            input.addEventListener('input', function () {
                if (touched[input.name] || submitAttempted) { validateAll(); }
            });
            input.addEventListener('change', function () {
                touched[input.name] = true;
                validateAll();
            });
        });

        form.querySelectorAll('[data-calc-unit]').forEach(function (select) {
            select.addEventListener('change', function () {
                var input = form.querySelector('[data-calc-field][name="' + select.getAttribute('data-calc-unit') + '"]');
                if (input && input.value.trim()) { touched[input.name] = true; }
                validateAll();
            });
        });

        if (unitAll) {
            unitAll.addEventListener('change', function () {
                var unit = unitAll.value;
                if (!unit) { return; }
                form.querySelectorAll('[data-calc-unit][data-unit-kind="length"]').forEach(function (select) {
                    select.value = unit;
                });
                inputs.forEach(function (input) {
                    if (input.value.trim()) { touched[input.name] = true; }
                });
                validateAll();
            });
        }

        /* -----------------------------------------------------------
           Generic results rendering — one renderer for all five engines,
           driven by the ENGINES[...] spec above.
           ----------------------------------------------------------- */
        function resolve(specOrFn, result) {
            return typeof specOrFn === 'function' ? specOrFn(result) : specOrFn;
        }

        function renderResults(values, units, input, result) {
            resultsPanel.querySelector('[data-calc-results-title]').textContent = resolve(engine.title, result);

            var fmt = window.PhB[engineName].formatNumber;
            var grid = resultsPanel.querySelector('[data-calc-result-grid]');
            grid.innerHTML = '';
            resolve(engine.results, result).forEach(function (spec) {
                var value = result[spec.key];
                var row = document.createElement('div');
                row.className = 'mi-result-row' + (spec.highlight ? ' mi-result-highlight' : '');
                row.innerHTML =
                    '<span class="mi-result-label"></span>' +
                    '<span class="mi-result-value"></span>' +
                    '<span class="mi-result-unit"></span>';
                row.querySelector('.mi-result-label').textContent = spec.label;
                row.querySelector('.mi-result-value').textContent = fmt(value, spec.decimals);
                row.querySelector('.mi-result-unit').textContent = spec.unit || '';
                grid.appendChild(row);
            });

            var scheduleWrapper = resultsPanel.querySelector('[data-calc-schedule-wrapper]');
            if (engine.schedule) {
                var head = resultsPanel.querySelector('[data-calc-schedule-head]');
                head.innerHTML = '<tr>' + engine.schedule.columns.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';

                var body = resultsPanel.querySelector('[data-calc-schedule-rows]');
                body.innerHTML = '';
                engine.schedule.rows(result, input, values, units).forEach(function (cells) {
                    var tr = document.createElement('tr');
                    tr.innerHTML = cells.map(function (c) { return '<td>' + c + '</td>'; }).join('');
                    body.appendChild(tr);
                });
                scheduleWrapper.hidden = false;
            } else {
                scheduleWrapper.hidden = true;
            }

            var assumptionsBlock = resultsPanel.querySelector('[data-calc-assumptions]');
            var assumptionsList = resultsPanel.querySelector('[data-calc-assumptions-list]');
            assumptionsList.innerHTML = '';
            (resolve(engine.assumptions, result) || []).forEach(function (spec) {
                var value = result.assumptions ? result.assumptions[spec.key] : undefined;
                if (value === undefined) { return; }
                var li = document.createElement('li');
                li.innerHTML = '<strong></strong> ';
                li.querySelector('strong').textContent = spec.label + ':';
                li.appendChild(document.createTextNode(' ' + value + (spec.suffix || '')));
                assumptionsList.appendChild(li);
            });
            assumptionsBlock.hidden = false;

            resultsPanel.hidden = false;
        }

        function runCalculation() {
            var values = readValues(form, inputs);
            var units = readUnits(form);
            var input = engine.buildInput(values, units);
            var result = engine.run(input);

            renderResults(values, units, input, result);
            lastCalculation = { input: input, result: result };
            toast(resolve(engine.successToast, result), 'success');
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            submitAttempted = true;

            var invalid = validateAll();
            if (invalid.length) {
                summaryText.textContent = invalid.length === 1
                    ? 'There is 1 entry that needs your attention.'
                    : 'There are ' + invalid.length + ' entries that need your attention.';
                summary.hidden = false;
                invalid[0].focus();
                return;
            }

            summary.hidden = true;
            if (engine) { runCalculation(); }
        });

        form.addEventListener('reset', function () {
            setTimeout(clearAll, 0);
        });

        var toggle = resultsPanel.querySelector('.mi-assumptions-toggle');
        var body = resultsPanel.querySelector('.mi-assumptions-body');
        if (toggle && body) {
            toggle.addEventListener('click', function (e) {
                e.preventDefault();
                body.hidden = !body.hidden;
            });
        }

        var addToBoqBtn = resultsPanel.querySelector('[data-calc-add-to-boq]');
        if (addToBoqBtn) {
            addToBoqBtn.addEventListener('click', async function () {
                if (!lastCalculation || !window.PhB || !window.PhB.boqStore) { return; }

                addToBoqBtn.disabled = true;
                var originalText = addToBoqBtn.textContent;
                addToBoqBtn.textContent = 'Adding…';

                var outcome = await window.PhB.boqStore.addFromCalculator(
                    form.getAttribute('data-calc-form'), lastCalculation.input, lastCalculation.result
                );

                addToBoqBtn.disabled = false;
                addToBoqBtn.textContent = originalText;

                if (!outcome.ok) {
                    toast(outcome.error, 'danger');
                    return;
                }
                var count = outcome.items.length;
                toast(count + (count === 1 ? ' item' : ' items') + ' added to the Bill of Quantities.', 'success');
            });
        }

        var saveCalcBtn = resultsPanel.querySelector('[data-calc-save]');
        if (saveCalcBtn) {
            saveCalcBtn.addEventListener('click', async function () {
                if (!lastCalculation || !window.PhB || !window.PhB.calculationsStore) { return; }

                saveCalcBtn.disabled = true;
                var originalText = saveCalcBtn.textContent;
                saveCalcBtn.textContent = 'Saving…';

                var result = await window.PhB.calculationsStore.add({
                    calculationType: form.getAttribute('data-calc-form'),
                    input: lastCalculation.input,
                    result: lastCalculation.result
                });

                saveCalcBtn.disabled = false;
                saveCalcBtn.textContent = originalText;

                toast(
                    result.ok ? 'Calculation saved.' : result.error,
                    result.ok ? 'success' : 'danger'
                );
            });
        }
    }

    formViews.forEach(initForm);

    /* ---------------------------------------------------------------
       Routing: #calculators (chooser) / #calculators/<type> (a form)
       --------------------------------------------------------------- */
    function typeFromHash() {
        var parts = window.location.hash.replace('#', '').split('/');
        return (parts[0] === 'calculators' && parts[1]) ? parts[1] : null;
    }

    function render(typeId) {
        var target = typeId
            ? root.querySelector('[data-calc-form-view="' + typeId + '"]')
            : null;

        chooser.hidden = !!target;
        formViews.forEach(function (view) {
            view.hidden = view !== target;
        });
    }

    function syncFromHash() {
        var typeId = typeFromHash();

        if (typeId && !root.querySelector('[data-calc-form-view="' + typeId + '"]')) {
            typeId = null;
            history.replaceState(null, '', '#calculators');
        }

        render(typeId);
    }

    window.addEventListener('hashchange', syncFromHash);

    root.addEventListener('click', function (e) {
        var opener = e.target.closest('[data-calc-open]');
        if (opener) {
            window.location.hash = '#calculators/' + opener.getAttribute('data-calc-open');
            return;
        }

        var back = e.target.closest('[data-calc-back]');
        if (back) {
            e.preventDefault();
            window.location.hash = '#calculators';
        }
    });

    document.querySelectorAll('[data-module="calculators"]').forEach(function (link) {
        link.addEventListener('click', function () {
            history.replaceState(null, '', '#calculators');
            render(null);
        });
    });

    syncFromHash();
})();
