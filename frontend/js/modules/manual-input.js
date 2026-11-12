/**
 * PhentiBuild (PhB) - Manual Input
 *
 * Owns the Manual Input module: routing between the measurement-type
 * chooser and the seven entry forms (#manual-input/<type>), the unit
 * selectors, and validation.
 *
 * This stage is input only. Nothing here estimates a quantity and nothing
 * is written to storage — pressing "Check Entries" validates the form and
 * says so, because the Calculators module has not been built yet.
 *
 * The validator is generic: it reads each field's rules from the data-*
 * attributes rendered by pages/modules/manual-input.php, so adding a field
 * there needs no change in this file.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-manual-input]');
    if (!root) { return; }

    var chooser = root.querySelector('[data-mi-chooser]');
    var formViews = Array.prototype.slice.call(root.querySelectorAll('[data-mi-form-view]'));

    function toast(message, variant) {
        if (window.PhB && window.PhB.toast) { window.PhB.toast(message, variant); }
    }

    /* ---------------------------------------------------------------
       Units
       These factors exist ONLY so an entry can be range-checked against
       the sensible limits declared in manual-input.php, which are written
       in millimetres. No quantity, area or volume is worked out here.
       --------------------------------------------------------------- */
    var TO_MM = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 };
    var UNIT_NAME = { mm: 'mm', cm: 'cm', m: 'm', in: 'in', ft: 'ft' };

    var PITCH_RANGE = { deg: [0.5, 85], pct: [1, 1000], ratio: [0.5, 24] };
    var PITCH_UNIT = { deg: '°', pct: '%', ratio: ' in 12' };

    // A timber section side outside this range is almost certainly a typo.
    var SECTION_MIN_MM = 10;
    var SECTION_MAX_MM = 600;

    var NUMBER = /^(\d+(\.\d+)?|\.\d+)$/;
    var SECTION_PATTERN = /^(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)$/i;

    /** Trims to at most 3 decimals and groups thousands, so a limit reads
     *  as "500 m" or "1,000 mm" rather than "500.0000000001". */
    function formatNumber(value) {
        var rounded = Math.round(value * 1000) / 1000;
        var parts = String(rounded).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    function limitInUnit(millimetres, unit) {
        return formatNumber(millimetres / TO_MM[unit]) + ' ' + UNIT_NAME[unit];
    }

    /** The placeholder already carries a good example ("e.g. 12.5"). */
    function exampleFor(input) {
        var placeholder = input.getAttribute('placeholder') || '';
        return placeholder.replace(/^e\.g\.\s*/i, '') || '12.5';
    }

    /* ---------------------------------------------------------------
       Validation — returns an error string, or '' when the field is fine
       --------------------------------------------------------------- */
    function unitFor(form, input) {
        var select = form.querySelector('[data-mi-unit="' + input.name + '"]');
        return select ? select.value : null;
    }

    function checkSection(form, input, label, raw) {
        var match = SECTION_PATTERN.exec(raw);
        if (!match) {
            return label + ' must be entered as width x thickness, for example 50 x 100.';
        }

        var unit = unitFor(form, input) || 'mm';
        var sides = [parseFloat(match[1]), parseFloat(match[2])];

        for (var i = 0; i < sides.length; i++) {
            if (!(sides[i] > 0)) {
                return label + ' must be greater than zero on both sides.';
            }
            var asMm = sides[i] * TO_MM[unit];
            if (asMm < SECTION_MIN_MM || asMm > SECTION_MAX_MM) {
                return label + ' must be between ' + limitInUnit(SECTION_MIN_MM, unit) +
                       ' and ' + limitInUnit(SECTION_MAX_MM, unit) + ' on each side.';
            }
        }
        return '';
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
        if (kind === 'section') { return checkSection(form, input, label, raw); }

        // Commas are thousands separators here, not decimal points.
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

        if (kind === 'pitch') {
            var pitchUnit = unitFor(form, input) || 'deg';
            var range = PITCH_RANGE[pitchUnit];
            if (value < range[0] || value > range[1]) {
                return label + ' must be between ' + formatNumber(range[0]) + PITCH_UNIT[pitchUnit] +
                       ' and ' + formatNumber(range[1]) + PITCH_UNIT[pitchUnit] + '.';
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
       One controller per form. All seven behave identically.
       --------------------------------------------------------------- */
    function initForm(view) {
        var form = view.querySelector('[data-mi-form]');
        if (!form) { return; }

        var inputs = Array.prototype.slice.call(form.querySelectorAll('[data-mi-field]'));
        var summary = form.querySelector('[data-mi-summary]');
        var summaryText = form.querySelector('[data-mi-summary-text]');
        var success = form.querySelector('[data-mi-success]');
        var unitAll = form.querySelector('[data-mi-unit-all]');

        var touched = {};
        // Once Check Entries has been pressed every error stays on screen.
        // Without this, moving focus to the first invalid field fires a blur
        // that re-validates and wipes messages on fields never visited.
        var submitAttempted = false;

        // Set by each runXCalculator function after a successful run, so
        // "Add to Bill of Quantities" can re-map the same input/result
        // without recomputing anything.
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

        /** Validates every field, revealing messages only for fields the user
         *  has already touched (or all of them, once Check Entries is used). */
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
            success.hidden = true;
            inputs.forEach(function (input) { setFieldError(input, ''); });
        }

        inputs.forEach(function (input) {
            input.addEventListener('blur', function () {
                touched[input.name] = true;
                validateAll();
            });

            // Keep a flagged field in step with what is being typed, so the
            // message clears the moment the value becomes valid.
            input.addEventListener('input', function () {
                success.hidden = true;
                if (touched[input.name] || submitAttempted) { validateAll(); }
            });

            input.addEventListener('change', function () {
                touched[input.name] = true;
                validateAll();
            });
        });

        // Changing a unit changes what counts as a sensible value, so the
        // field has to be re-checked against the new range.
        form.querySelectorAll('[data-mi-unit]').forEach(function (select) {
            select.addEventListener('change', function () {
                var input = form.querySelector('[data-mi-field][name="' + select.getAttribute('data-mi-unit') + '"]');
                if (input && input.value.trim()) { touched[input.name] = true; }
                success.hidden = true;
                validateAll();
            });
        });

        if (unitAll) {
            unitAll.addEventListener('change', function () {
                var unit = unitAll.value;
                if (!unit) { return; }

                form.querySelectorAll('[data-mi-unit][data-unit-kind="length"]').forEach(function (select) {
                    select.value = unit;
                });

                inputs.forEach(function (input) {
                    if (input.value.trim()) { touched[input.name] = true; }
                });
                success.hidden = true;
                validateAll();
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            submitAttempted = true;
            success.hidden = true;

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

            // Special handling for walls: run the masonry calculator
            if (form.getAttribute('data-mi-form') === 'walls' && window.PhB && window.PhB.masonry) {
                runMasonryCalculator(form);
                return;
            }

            // Special handling for plastering: run the plaster calculator
            if (form.getAttribute('data-mi-form') === 'plastering' && window.PhB && window.PhB.plaster) {
                runPlasterCalculator(form);
                return;
            }

            // Special handling for concrete: run the concrete calculator
            if (form.getAttribute('data-mi-form') === 'concrete' && window.PhB && window.PhB.concrete) {
                runConcreteCalculator(form);
                return;
            }

            // Special handling for rebar: run the rebar calculator
            if (form.getAttribute('data-mi-form') === 'rebar' && window.PhB && window.PhB.rebar) {
                runRebarCalculator(form);
                return;
            }

            // Special handling for timber: run the timber calculator
            if (form.getAttribute('data-mi-form') === 'timber' && window.PhB && window.PhB.timber) {
                runTimberCalculator(form);
                return;
            }

            success.hidden = false;
            toast('All entries are valid.', 'success');
        });

        // Save Measurement — persists this form's current values to the
        // backend (backend/api/measurements/index.php) as a standalone
        // record, independent of whether this section has a calculator.
        // Reuses the same validation the Check Entries button runs.
        var saveMeasurementBtn = form.querySelector('[data-mi-save-measurement]');
        if (saveMeasurementBtn) {
            saveMeasurementBtn.addEventListener('click', async function () {
                if (!window.PhB || !window.PhB.measurementsStore) { return; }

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

                var values = {};
                inputs.forEach(function (input) {
                    if (input.value.trim()) { values[input.name] = input.value.trim(); }
                });

                saveMeasurementBtn.disabled = true;
                var originalText = saveMeasurementBtn.textContent;
                saveMeasurementBtn.textContent = 'Saving…';

                var sectionType = form.getAttribute('data-mi-form');
                var result = await window.PhB.measurementsStore.add({ sectionType: sectionType, values: values });

                saveMeasurementBtn.disabled = false;
                saveMeasurementBtn.textContent = originalText;

                toast(
                    result.ok ? 'Measurement saved.' : result.error,
                    result.ok ? 'success' : 'danger'
                );
            });
        }

        // Masonry calculator integration for walls form
        function runMasonryCalculator(form) {
            var values = {};
            inputs.forEach(function (input) {
                values[input.name] = input.value.trim();
            });

            var unitLengths = {};
            form.querySelectorAll('[data-mi-unit][data-unit-kind="length"]').forEach(function (select) {
                unitLengths[select.getAttribute('data-mi-unit')] = select.value;
            });

            var input = {
                wallLength: parseFloat(values.wallLength),
                wallHeight: parseFloat(values.wallHeight),
                wallThickness: parseFloat(values.wallThickness),
                blockLength: parseFloat(values.blockLength),
                blockHeight: parseFloat(values.blockHeight),
                blockLengthUnit: unitLengths.blockLength || 'mm',
                blockHeightUnit: unitLengths.blockHeight || 'mm',
                mortarAllowance: values.mortarAllowance ? parseFloat(values.mortarAllowance) : 0,
                mortarAllowanceUnit: unitLengths.mortarAllowance || 'mm',
                wastePercent: values.wastePercent ? parseFloat(values.wastePercent) : 0
            };

            var result = window.PhB.masonry.calculate(input);

            // Display results
            var resultsPanel = form.closest('[data-mi-form-view]').querySelector('[data-mi-calc-results]');
            if (!resultsPanel) { return; }

            resultsPanel.querySelector('[data-result="wallAreaM2"]').textContent = window.PhB.masonry.formatNumber(result.wallAreaM2, 2);
            resultsPanel.querySelector('[data-result="blockCountDry"]').textContent = window.PhB.masonry.formatNumber(result.blockCountDry);
            resultsPanel.querySelector('[data-result="wasteCount"]').textContent = window.PhB.masonry.formatNumber(result.wasteCount);
            resultsPanel.querySelector('[data-result="blockCountFinal"]').textContent = window.PhB.masonry.formatNumber(result.blockCountFinal);
            resultsPanel.querySelector('[data-result="mortarVolumeM3"]').textContent = window.PhB.masonry.formatNumber(result.mortarVolumeM3, 3);

            var assumptions = result.assumptions;
            resultsPanel.querySelector('[data-assumption="blockPattern"]').textContent = assumptions.blockPattern;
            resultsPanel.querySelector('[data-assumption="mortarPercentOfBlock"]').textContent = assumptions.mortarPercentOfBlock;
            resultsPanel.querySelector('[data-assumption="description"]').textContent = assumptions.description;

            lastCalculation = { input: input, result: result };
            resultsPanel.hidden = false;
            toast('Blocks and mortar calculated.', 'success');
        }

        // Plaster calculator integration for plastering form
        function runPlasterCalculator(form) {
            var values = {};
            inputs.forEach(function (input) {
                values[input.name] = input.value.trim();
            });

            var unitLengths = {};
            form.querySelectorAll('[data-mi-unit][data-unit-kind="length"]').forEach(function (select) {
                unitLengths[select.getAttribute('data-mi-unit')] = select.value;
            });

            var input = {
                wallLength: parseFloat(values.wallLength),
                wallHeight: parseFloat(values.wallHeight),
                numberOfWalls: values.numberOfWalls ? parseFloat(values.numberOfWalls) : 1,
                plasterThickness: parseFloat(values.plasterThickness),
                plasterThicknessUnit: unitLengths.plasterThickness || 'mm',
                mixRatioCement: values.mixRatioCement ? parseFloat(values.mixRatioCement) : 1,
                mixRatioSand: values.mixRatioSand ? parseFloat(values.mixRatioSand) : 3,
                wastePercent: values.wastePercent ? parseFloat(values.wastePercent) : 0
            };

            var result = window.PhB.plaster.calculate(input);

            // Display results
            var resultsPanel = form.closest('[data-mi-form-view]').querySelector('[data-mi-calc-results]');
            if (!resultsPanel) { return; }

            resultsPanel.querySelector('[data-result="totalSurfaceAreaM2"]').textContent = window.PhB.plaster.formatNumber(result.totalSurfaceAreaM2, 2);
            resultsPanel.querySelector('[data-result="plasterVolumeM3"]').textContent = window.PhB.plaster.formatNumber(result.plasterVolumeM3, 3);
            resultsPanel.querySelector('[data-result="cementRequirementM3"]').textContent = window.PhB.plaster.formatNumber(result.cementRequirementM3, 3);
            resultsPanel.querySelector('[data-result="sandRequirementM3"]').textContent = window.PhB.plaster.formatNumber(result.sandRequirementM3, 3);
            resultsPanel.querySelector('[data-result="cementWithWasteM3"]').textContent = window.PhB.plaster.formatNumber(result.cementWithWasteM3, 3);
            resultsPanel.querySelector('[data-result="sandWithWasteM3"]').textContent = window.PhB.plaster.formatNumber(result.sandWithWasteM3, 3);

            var assumptions = result.assumptions;
            resultsPanel.querySelector('[data-assumption="mixRatio"]').textContent = assumptions.mixRatio;
            resultsPanel.querySelector('[data-assumption="description"]').textContent = assumptions.description;
            resultsPanel.querySelector('[data-assumption="mortarDensity"]').textContent = assumptions.mortarDensity;

            lastCalculation = { input: input, result: result };
            resultsPanel.hidden = false;
            toast('Plaster and mortar calculated.', 'success');
        }

        // Concrete calculator integration for concrete form
        function runConcreteCalculator(form) {
            var values = {};
            inputs.forEach(function (input) {
                values[input.name] = input.value.trim();
            });

            var unitLengths = {};
            form.querySelectorAll('[data-mi-unit][data-unit-kind="length"]').forEach(function (select) {
                unitLengths[select.getAttribute('data-mi-unit')] = select.value;
            });

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
                input.thicknessUnit = unitLengths.slabThickness || 'mm';
            } else {
                input.height = parseFloat(values.columnHeight);
                input.length = parseFloat(values.columnLength);
                input.width = parseFloat(values.columnWidth);
                input.lengthUnit = unitLengths.columnLength || 'mm';
                input.widthUnit = unitLengths.columnWidth || 'mm';
                input.quantity = values.columnQuantity ? parseFloat(values.columnQuantity) : 1;
            }

            var result = window.PhB.concrete.calculate(input);

            // Display results
            var resultsPanel = form.closest('[data-mi-form-view]').querySelector('[data-mi-calc-results]');
            if (!resultsPanel) { return; }

            resultsPanel.querySelector('[data-result="individualVolumeM3"]').textContent = window.PhB.concrete.formatNumber(result.individualVolumeM3, 4);
            resultsPanel.querySelector('[data-result="totalVolumeM3"]').textContent = window.PhB.concrete.formatNumber(result.totalVolumeM3, 3);
            resultsPanel.querySelector('[data-result="cementM3"]').textContent = window.PhB.concrete.formatNumber(result.cementM3, 3);
            resultsPanel.querySelector('[data-result="sandM3"]').textContent = window.PhB.concrete.formatNumber(result.sandM3, 3);
            resultsPanel.querySelector('[data-result="aggregateM3"]').textContent = window.PhB.concrete.formatNumber(result.aggregateM3, 3);
            resultsPanel.querySelector('[data-result="cementWithWasteM3"]').textContent = window.PhB.concrete.formatNumber(result.cementWithWasteM3, 3);
            resultsPanel.querySelector('[data-result="sandWithWasteM3"]').textContent = window.PhB.concrete.formatNumber(result.sandWithWasteM3, 3);
            resultsPanel.querySelector('[data-result="aggregateWithWasteM3"]').textContent = window.PhB.concrete.formatNumber(result.aggregateWithWasteM3, 3);

            var assumptions = result.assumptions;
            resultsPanel.querySelector('[data-assumption="mixRatio"]').textContent = assumptions.mixRatio;
            resultsPanel.querySelector('[data-assumption="wetYield"]').textContent = assumptions.wetYield;
            resultsPanel.querySelector('[data-assumption="concreteDensity"]').textContent = assumptions.concreteDensity;
            resultsPanel.querySelector('[data-assumption="description"]').textContent = assumptions.description;

            lastCalculation = { input: input, result: result };
            resultsPanel.hidden = false;
            toast('Concrete volume and materials calculated.', 'success');
        }

        // Rebar calculator integration for rebar form
        function runRebarCalculator(form) {
            var values = {};
            inputs.forEach(function (input) {
                values[input.name] = input.value.trim();
            });

            var unitLengths = {};
            form.querySelectorAll('[data-mi-unit][data-unit-kind="length"]').forEach(function (select) {
                unitLengths[select.getAttribute('data-mi-unit')] = select.value;
            });

            var input = {
                numberOfMainBars: values.numberOfMainBars ? parseFloat(values.numberOfMainBars) : 6,
                mainBarDiameter: values.mainBarDiameter ? parseFloat(values.mainBarDiameter) : 16,
                mainBarLength: values.mainBarLength ? parseFloat(values.mainBarLength) : 3,
                stirrupDiameter: values.stirrupDiameter ? parseFloat(values.stirrupDiameter) : 8,
                stirrupSpacing: values.stirrupSpacing ? parseFloat(values.stirrupSpacing) : 200,
                stirrupSpacingUnit: unitLengths.stirrupSpacing || 'mm',
                columnHeight: values.columnHeightRebar ? parseFloat(values.columnHeightRebar) : 3,
                columnLength: values.columnLengthRebar ? parseFloat(values.columnLengthRebar) : 450,
                columnLengthUnit: unitLengths.columnLengthRebar || 'mm',
                columnWidth: values.columnWidthRebar ? parseFloat(values.columnWidthRebar) : 450,
                columnWidthUnit: unitLengths.columnWidthRebar || 'mm',
                columnQuantity: values.columnQuantityRebar ? parseFloat(values.columnQuantityRebar) : 1,
                steelDensity: values.steelDensityRebar ? parseFloat(values.steelDensityRebar) : 7850
            };

            var result = window.PhB.rebar.calculate(input);

            // Display results
            var resultsPanel = form.closest('[data-mi-form-view]').querySelector('[data-mi-calc-results]');
            if (!resultsPanel) { return; }

            resultsPanel.querySelector('[data-result="totalSteelLength"]').textContent = window.PhB.rebar.formatNumber(result.totalSteelLength, 2);
            resultsPanel.querySelector('[data-result="totalSteelWeight"]').textContent = window.PhB.rebar.formatNumber(result.totalSteelWeight, 1);

            // Populate schedule table
            var scheduleBody = resultsPanel.querySelector('[data-schedule-rows]');
            scheduleBody.innerHTML = '';
            result.schedule.forEach(function (row) {
                var tr = document.createElement('tr');
                tr.innerHTML = '<td>' + row.type + '</td>' +
                              '<td style="text-align:right;">' + row.diameter + '</td>' +
                              '<td style="text-align:right;">' + row.spacing + '</td>' +
                              '<td style="text-align:right;">' + window.PhB.rebar.formatNumber(row.quantity) + '</td>' +
                              '<td style="text-align:right;">' + window.PhB.rebar.formatNumber(row.lengthPerUnit, 3) + '</td>' +
                              '<td style="text-align:right;">' + window.PhB.rebar.formatNumber(row.totalLength, 2) + '</td>' +
                              '<td style="text-align:right;">' + window.PhB.rebar.formatNumber(row.weightPerUnit, 2) + '</td>' +
                              '<td style="text-align:right;">' + window.PhB.rebar.formatNumber(row.totalWeight, 1) + '</td>';
                scheduleBody.appendChild(tr);
            });

            var assumptions = result.assumptions;
            resultsPanel.querySelector('[data-assumption="steelDensity"]').textContent = assumptions.steelDensity;
            resultsPanel.querySelector('[data-assumption="stirrupOverlapPerCorner"]').textContent = assumptions.stirrupOverlapPerCorner;
            resultsPanel.querySelector('[data-assumption="description"]').textContent = assumptions.description;

            lastCalculation = { input: input, result: result };
            resultsPanel.hidden = false;
            toast('Rebar schedule and weight calculated.', 'success');
        }

        // Timber calculator integration for timber form
        function runTimberCalculator(form) {
            var values = {};
            inputs.forEach(function (input) {
                values[input.name] = input.value.trim();
            });

            var unitLengths = {};
            form.querySelectorAll('[data-mi-unit][data-unit-kind="length"]').forEach(function (select) {
                unitLengths[select.getAttribute('data-mi-unit')] = select.value;
            });

            var input = {
                memberType: values.memberType || 'Rafters',
                timberType: values.timberType || '2 x 4',
                timberLength: values.timberLength ? parseFloat(values.timberLength) : 0,
                spacing: values.spacingTimber ? parseFloat(values.spacingTimber) : 0,
                spacingUnit: unitLengths.spacingTimber || 'mm',
                structureLength: values.structureLength ? parseFloat(values.structureLength) : 0,
                structureWidth: values.structureWidth ? parseFloat(values.structureWidth) : 0,
                wastePercent: values.wastePercentTimber ? parseFloat(values.wastePercentTimber) : 0
            };

            var result = window.PhB.timber.calculate(input);

            // Display results
            var resultsPanel = form.closest('[data-mi-form-view]').querySelector('[data-mi-calc-results]');
            if (!resultsPanel) { return; }

            resultsPanel.querySelector('[data-result="numberOfPieces"]').textContent = window.PhB.timber.formatNumber(result.numberOfPieces);
            resultsPanel.querySelector('[data-result="totalTimberLength"]').textContent = window.PhB.timber.formatNumber(result.totalTimberLength, 2);
            resultsPanel.querySelector('[data-result="waste"]').textContent = window.PhB.timber.formatNumber(result.waste, 2);
            resultsPanel.querySelector('[data-result="finalQuantity"]').textContent = window.PhB.timber.formatNumber(result.finalQuantity);

            // Populate schedule table (single row per submission; run again
            // for each member type or timber size to build up a full BOQ).
            var scheduleBody = resultsPanel.querySelector('[data-schedule-rows]');
            scheduleBody.innerHTML = '';
            var memberLabel = result.memberType.charAt(0).toUpperCase() + result.memberType.slice(1);
            var tr = document.createElement('tr');
            tr.innerHTML = '<td>' + memberLabel + '</td>' +
                          '<td>' + result.timberType + '</td>' +
                          '<td style="text-align:right;">' + result.crossSection.width + ' x ' + result.crossSection.thickness + '</td>' +
                          '<td style="text-align:right;">' + values.spacingTimber + ' ' + (unitLengths.spacingTimber || 'mm') + '</td>' +
                          '<td style="text-align:right;">' + window.PhB.timber.formatNumber(result.numberOfPieces) + '</td>' +
                          '<td style="text-align:right;">' + window.PhB.timber.formatNumber(input.timberLength, 2) + '</td>' +
                          '<td style="text-align:right;">' + window.PhB.timber.formatNumber(result.totalTimberLength, 2) + '</td>' +
                          '<td style="text-align:right;">' + window.PhB.timber.formatNumber(result.finalQuantity) + '</td>';
            scheduleBody.appendChild(tr);

            var assumptions = result.assumptions;
            resultsPanel.querySelector('[data-assumption="spacingAxis"]').textContent = assumptions.spacingAxis;
            resultsPanel.querySelector('[data-assumption="spanAxis"]').textContent = assumptions.spanAxis;
            resultsPanel.querySelector('[data-assumption="description"]').textContent = assumptions.description;

            lastCalculation = { input: input, result: result };
            resultsPanel.hidden = false;
            toast('Timber quantities calculated.', 'success');
        }

        // The browser clears the values after the reset event, so the error
        // state has to be cleaned up on the next tick.
        form.addEventListener('reset', function () {
            setTimeout(clearAll, 0);
            // Also hide the results panel on reset
            var resultsPanel = form.closest('[data-mi-form-view]').querySelector('[data-mi-calc-results]');
            if (resultsPanel) { resultsPanel.hidden = true; }
        });

        // Assumptions disclosure toggle
        var resultsPanel = view.querySelector('[data-mi-calc-results]');
        if (resultsPanel) {
            var toggle = resultsPanel.querySelector('.mi-assumptions-toggle');
            var body = resultsPanel.querySelector('.mi-assumptions-body');
            if (toggle && body) {
                toggle.addEventListener('click', function (e) {
                    e.preventDefault();
                    body.hidden = !body.hidden;
                });
            }

            // "Add to Bill of Quantities" — re-maps the last calculation this
            // form produced into BOQ line items. Only present on forms with
            // a connected calculator (walls, plastering, concrete, rebar,
            // timber), so this is a no-op everywhere else.
            var addToBoqBtn = resultsPanel.querySelector('[data-add-to-boq]');
            if (addToBoqBtn) {
                addToBoqBtn.addEventListener('click', async function () {
                    if (!lastCalculation || !window.PhB || !window.PhB.boqStore) { return; }
                    var sourceType = addToBoqBtn.getAttribute('data-add-to-boq');

                    addToBoqBtn.disabled = true;
                    var originalText = addToBoqBtn.textContent;
                    addToBoqBtn.textContent = 'Adding…';

                    var outcome = await window.PhB.boqStore.addFromCalculator(sourceType, lastCalculation.input, lastCalculation.result);

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

            // "Save Calculation" — persists the same {input, result} pair
            // to the backend (backend/api/calculations/index.php) as a
            // permanent record, instead of it only living in the
            // transient `lastCalculation` variable until the next run.
            var saveCalcBtn = resultsPanel.querySelector('[data-save-calculation]');
            if (saveCalcBtn) {
                saveCalcBtn.addEventListener('click', async function () {
                    if (!lastCalculation || !window.PhB || !window.PhB.calculationsStore) { return; }
                    var calculationType = saveCalcBtn.getAttribute('data-save-calculation');

                    saveCalcBtn.disabled = true;
                    var originalText = saveCalcBtn.textContent;
                    saveCalcBtn.textContent = 'Saving…';

                    var result = await window.PhB.calculationsStore.add({
                        calculationType: calculationType,
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
    }

    formViews.forEach(initForm);

    /* ---------------------------------------------------------------
       Routing: #manual-input (chooser) / #manual-input/<type> (a form)
       --------------------------------------------------------------- */
    function typeFromHash() {
        var parts = window.location.hash.replace('#', '').split('/');
        return (parts[0] === 'manual-input' && parts[1]) ? parts[1] : null;
    }

    function render(typeId) {
        var target = typeId
            ? root.querySelector('[data-mi-form-view="' + typeId + '"]')
            : null;

        chooser.hidden = !!target;
        formViews.forEach(function (view) {
            view.hidden = view !== target;
        });
    }

    function syncFromHash() {
        var typeId = typeFromHash();

        if (typeId && !root.querySelector('[data-mi-form-view="' + typeId + '"]')) {
            // A stale bookmark or a hand-typed hash — fall back to the chooser.
            typeId = null;
            history.replaceState(null, '', '#manual-input');
        }

        render(typeId);
    }

    window.addEventListener('hashchange', syncFromHash);

    root.addEventListener('click', function (e) {
        var opener = e.target.closest('[data-mi-open]');
        if (opener) {
            window.location.hash = '#manual-input/' + opener.getAttribute('data-mi-open');
            return;
        }

        var back = e.target.closest('[data-mi-back]');
        if (back) {
            e.preventDefault();
            window.location.hash = '#manual-input';
        }
    });

    // The shell rewrites the hash with history.replaceState, which fires no
    // hashchange event, so a sidebar click back into this module has to bring
    // it home to the chooser itself.
    document.querySelectorAll('[data-module="manual-input"]').forEach(function (link) {
        link.addEventListener('click', function () {
            history.replaceState(null, '', '#manual-input');
            render(null);
        });
    });

    syncFromHash();
})();
