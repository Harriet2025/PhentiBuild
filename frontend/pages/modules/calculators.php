<?php
/**
 * PhentiBuild - Calculators Module
 *
 * A quick-access surface for the same calculation engines Manual Input's
 * walls/plastering/concrete/rebar/timber sections already use
 * (window.PhB.masonry/.plaster/.concrete/.rebar/.timber — see
 * frontend/js/modules/*-calcs.js) and the same calculations/BOQ stores
 * (calculations-store.js, boq-store.js). Nothing here recomputes any
 * quantity itself: nothing is duplicated except the five field specs
 * below, which have to match each calculator's expected input shape.
 *
 * Unlike Manual Input, this module is not a measurement-capture tool —
 * there is no "Save Measurement" here, no 8-type chooser, and no raw
 * dimension record. It exists purely to run the numbers: pick a
 * calculator, enter values, Calculate, then optionally save the
 * calculation or push it into the Bill of Quantities.
 *
 * Field specs are data-driven, same convention as manual-input.php: add
 * or change a field here only, calculators.js reads validation rules
 * from the rendered data-* attributes.
 */

$calcLengthUnits = [
    'mm' => 'mm',
    'cm' => 'cm',
    'm'  => 'm',
    'in' => 'inches',
    'ft' => 'feet',
];

if (!function_exists('calc_sentence_label')) {
    function calc_sentence_label($label) {
        return ucfirst(strtolower($label));
    }

    function calc_unit_select($field, $units) {
        $html = '<select class="unit-select"'
              . ' data-calc-unit="' . htmlspecialchars($field['name']) . '"'
              . ' data-unit-kind="length"'
              . ' aria-label="Unit for ' . htmlspecialchars(calc_sentence_label($field['label'])) . '">';

        foreach ($units as $value => $label) {
            $selected = ($value === $field['unit']) ? ' selected' : '';
            $html .= '<option value="' . htmlspecialchars($value) . '"' . $selected . '>'
                   . htmlspecialchars($label) . '</option>';
        }

        return $html . '</select>';
    }

    function calc_render_field($sectionId, $f, $lengthUnits) {
        $id       = 'calc-' . $sectionId . '-' . $f['name'];
        $kind     = $f['kind'];
        $required = empty($f['optional']);

        $out  = '<div class="form-group">';
        $out .= '<label class="form-label" for="' . $id . '">'
              . htmlspecialchars($f['label'])
              . ($required ? ' <span class="required">*</span>' : '')
              . '</label>';

        $shared = ' id="' . $id . '"'
                . ' name="' . htmlspecialchars($f['name']) . '"'
                . ' data-calc-field'
                . ' data-kind="' . $kind . '"'
                . ' data-label="' . htmlspecialchars(calc_sentence_label($f['label'])) . '"'
                . ' data-required="' . ($required ? '1' : '0') . '"';

        if ($kind === 'select') {
            $out .= '<select class="form-control"' . $shared . '>';
            $out .= '<option value="">Select ' . htmlspecialchars(strtolower($f['label'])) . '&hellip;</option>';
            foreach ($f['options'] as $option) {
                $out .= '<option value="' . htmlspecialchars($option) . '">'
                      . htmlspecialchars($option) . '</option>';
            }
            $out .= '</select>';
        } else {
            $input = '<input type="text"' . $shared
                   . ' class="form-control form-control-numeric"'
                   . ' inputmode="' . ($kind === 'count' ? 'numeric' : 'decimal') . '"'
                   . ' placeholder="' . htmlspecialchars($f['placeholder']) . '"'
                   . ' autocomplete="off"';

            if (isset($f['min'])) { $input .= ' data-min="' . $f['min'] . '"'; }
            if (isset($f['max'])) { $input .= ' data-max="' . $f['max'] . '"'; }
            $input .= '>';

            $out .= '<div class="measure-input">' . $input;

            if ($kind === 'length') {
                $out .= calc_unit_select($f, $lengthUnits);
            } elseif ($kind === 'count') {
                $out .= '<span class="unit-static">' . htmlspecialchars($f['suffix']) . '</span>';
            }

            $out .= '</div>';
        }

        if (!empty($f['hint'])) {
            $out .= '<span class="form-hint">' . htmlspecialchars($f['hint']) . '</span>';
        }

        $out .= '<span class="form-error" data-error-for="' . htmlspecialchars($f['name']) . '" hidden></span>';
        $out .= '</div>';

        return $out;
    }
}

/*
 * Field specs mirror manual-input.php's walls/plastering/concrete/rebar/
 * timber sections exactly (same names, kinds, units, min/max in mm) —
 * that's what each calc-engine's calculate() function expects. See
 * frontend/js/modules/manual-input.js's runXCalculator functions for the
 * proven mapping this copies.
 */
$calcSections = [
    [
        'id' => 'walls', 'label' => 'Block & Mortar', 'engine' => 'masonry',
        'desc' => 'Estimate block count and mortar volume for a blockwork wall.',
        'icon' => '<rect x="3" y="5" width="18" height="14" rx="1"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="5" x2="9" y2="12"/><line x1="15" y1="12" x2="15" y2="19"/>',
        'fields' => [
            ['name' => 'wallLength',    'label' => 'Wall Length',    'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 500000, 'placeholder' => 'e.g. 12.5'],
            ['name' => 'wallHeight',    'label' => 'Wall Height',    'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 100000, 'placeholder' => 'e.g. 3'],
            ['name' => 'wallThickness', 'label' => 'Wall Thickness', 'kind' => 'length', 'unit' => 'mm', 'min' => 25,  'max' => 1000,   'placeholder' => 'e.g. 150', 'hint' => 'Finished thickness of the wall.'],
            ['name' => 'blockLength',   'label' => 'Block Length',   'kind' => 'length', 'unit' => 'mm', 'min' => 50,  'max' => 1000,   'placeholder' => 'e.g. 450'],
            ['name' => 'blockHeight',   'label' => 'Block Height',   'kind' => 'length', 'unit' => 'mm', 'min' => 50,  'max' => 1000,   'placeholder' => 'e.g. 225'],
            ['name' => 'mortarAllowance', 'label' => 'Mortar Allowance', 'kind' => 'length', 'unit' => 'mm', 'min' => 0, 'max' => 50, 'placeholder' => 'e.g. 10', 'hint' => 'Joint thickness added to block dimensions. Typical: 10–12 mm.', 'optional' => true],
            ['name' => 'wastePercent',  'label' => 'Waste Percentage', 'kind' => 'count', 'suffix' => '%', 'min' => 0, 'max' => 100, 'placeholder' => 'e.g. 10', 'hint' => 'Typical: 5–15%. Zero means no waste allowance.', 'optional' => true],
        ],
    ],
    [
        'id' => 'plastering', 'label' => 'Plaster (Cement & Sand)', 'engine' => 'plaster',
        'desc' => 'Estimate plaster volume and dry cement/sand quantities for a rendered wall.',
        'icon' => '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 16l8-8"/><path d="M12 16l4-4"/>',
        'fields' => [
            ['name' => 'wallLength',       'label' => 'Wall Length',       'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 500000, 'placeholder' => 'e.g. 12.5'],
            ['name' => 'wallHeight',       'label' => 'Wall Height',       'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 100000, 'placeholder' => 'e.g. 3'],
            ['name' => 'numberOfWalls',    'label' => 'Number of Walls',   'kind' => 'count',  'suffix' => 'walls', 'min' => 1, 'max' => 100,  'placeholder' => 'e.g. 4', 'hint' => 'How many walls of these dimensions are being plastered.'],
            ['name' => 'plasterThickness', 'label' => 'Plaster Thickness', 'kind' => 'length', 'unit' => 'mm', 'min' => 3,   'max' => 100,    'placeholder' => 'e.g. 12', 'hint' => 'Typical render coats are 12 to 20 mm.'],
            ['name' => 'mixRatioCement',   'label' => 'Cement (mix ratio)', 'kind' => 'count',  'suffix' => 'part', 'min' => 1, 'max' => 10,   'placeholder' => 'e.g. 1', 'hint' => 'Cement parts in the mix (e.g. 1 for 1:3).'],
            ['name' => 'mixRatioSand',     'label' => 'Sand (mix ratio)',   'kind' => 'count',  'suffix' => 'part', 'min' => 1, 'max' => 10,   'placeholder' => 'e.g. 3', 'hint' => 'Sand parts in the mix (e.g. 3 for 1:3).'],
            ['name' => 'wastePercent',     'label' => 'Waste Percentage',   'kind' => 'count',  'suffix' => '%', 'min' => 0, 'max' => 100,  'placeholder' => 'e.g. 5', 'hint' => 'Typical: 5–10%. For spillage and over-troweling.', 'optional' => true],
        ],
    ],
    [
        'id' => 'concrete', 'label' => 'Concrete (Cement, Sand & Aggregate)', 'engine' => 'concrete',
        'desc' => 'Estimate concrete volume and mix materials for a slab or a set of columns.',
        'icon' => '<rect x="3" y="4" width="18" height="16" rx="1"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="17" y1="8" x2="17" y2="16"/>',
        'fields' => [
            ['name' => 'concreteType',   'label' => 'Concrete Type',  'kind' => 'select', 'options' => ['Slab (one-off)', 'Column (repeated)'], 'hint' => 'Choose the element type to calculate volume for.'],
            ['name' => 'slabLength',     'label' => 'Slab Length',    'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 500000, 'placeholder' => 'e.g. 9', 'optional' => true],
            ['name' => 'slabWidth',      'label' => 'Slab Width',     'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 500000, 'placeholder' => 'e.g. 6', 'optional' => true],
            ['name' => 'slabThickness',  'label' => 'Slab Thickness', 'kind' => 'length', 'unit' => 'mm', 'min' => 25,  'max' => 1000,   'placeholder' => 'e.g. 150', 'optional' => true],
            ['name' => 'columnHeight',   'label' => 'Column Height',  'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 100000, 'placeholder' => 'e.g. 3', 'optional' => true],
            ['name' => 'columnLength',   'label' => 'Column Length',  'kind' => 'length', 'unit' => 'mm', 'min' => 25,  'max' => 5000,   'placeholder' => 'e.g. 450', 'optional' => true],
            ['name' => 'columnWidth',    'label' => 'Column Width',   'kind' => 'length', 'unit' => 'mm', 'min' => 25,  'max' => 5000,   'placeholder' => 'e.g. 450', 'optional' => true],
            ['name' => 'columnQuantity', 'label' => 'Column Quantity','kind' => 'count',  'suffix' => 'columns', 'min' => 1, 'max' => 1000, 'placeholder' => 'e.g. 12', 'optional' => true],
            ['name' => 'cementPartsConc','label' => 'Cement (mix)',   'kind' => 'count',  'suffix' => 'part', 'min' => 1, 'max' => 10, 'placeholder' => 'e.g. 1', 'hint' => 'Cement parts (e.g. 1 for 1:2:4).'],
            ['name' => 'sandPartsConc',  'label' => 'Sand (mix)',     'kind' => 'count',  'suffix' => 'part', 'min' => 1, 'max' => 10, 'placeholder' => 'e.g. 2'],
            ['name' => 'aggregatePartsConc', 'label' => 'Aggregate (mix)', 'kind' => 'count', 'suffix' => 'part', 'min' => 1, 'max' => 10, 'placeholder' => 'e.g. 4', 'hint' => 'Aggregate (coarse) parts.'],
            ['name' => 'wastePercentConc', 'label' => 'Waste %',       'kind' => 'count',  'suffix' => '%', 'min' => 0, 'max' => 100, 'placeholder' => 'e.g. 5', 'hint' => 'Spillage and over-pouring: 5–10% typical.', 'optional' => true],
        ],
    ],
    [
        'id' => 'rebar', 'label' => 'Rebar / Steel', 'engine' => 'rebar',
        'desc' => 'Estimate reinforcing steel length and weight for a reinforced column.',
        'icon' => '<rect x="3" y="7" width="18" height="10" rx="1"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/>',
        'fields' => [
            ['name' => 'numberOfMainBars', 'label' => 'Number of Main Bars', 'kind' => 'count', 'suffix' => 'bars', 'min' => 1, 'max' => 20, 'placeholder' => 'e.g. 6', 'hint' => 'Main bars per column (typically 4–8).'],
            ['name' => 'mainBarDiameter',  'label' => 'Main Bar Diameter',  'kind' => 'length', 'unit' => 'mm', 'min' => 4, 'max' => 60, 'placeholder' => 'e.g. 16', 'hint' => 'Typical: 12, 16, 20, 25 mm.'],
            ['name' => 'mainBarLength',    'label' => 'Main Bar Length',    'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 100000, 'placeholder' => 'e.g. 3', 'hint' => 'Usually the column height.'],
            ['name' => 'stirrupDiameter',  'label' => 'Stirrup Diameter',   'kind' => 'length', 'unit' => 'mm', 'min' => 4, 'max' => 30, 'placeholder' => 'e.g. 8', 'hint' => 'Typically: 6, 8, 10 mm.'],
            ['name' => 'stirrupSpacing',   'label' => 'Stirrup Spacing',    'kind' => 'length', 'unit' => 'mm', 'min' => 50, 'max' => 1000, 'placeholder' => 'e.g. 200', 'hint' => 'Centre-to-centre spacing.'],
            ['name' => 'columnHeightRebar','label' => 'Column Height',      'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 100000, 'placeholder' => 'e.g. 3'],
            ['name' => 'columnLengthRebar','label' => 'Column Length',      'kind' => 'length', 'unit' => 'mm', 'min' => 25, 'max' => 5000, 'placeholder' => 'e.g. 450', 'hint' => 'Cross-section length.'],
            ['name' => 'columnWidthRebar', 'label' => 'Column Width',       'kind' => 'length', 'unit' => 'mm', 'min' => 25, 'max' => 5000, 'placeholder' => 'e.g. 450', 'hint' => 'Cross-section width.'],
            ['name' => 'columnQuantityRebar', 'label' => 'Column Quantity', 'kind' => 'count', 'suffix' => 'columns', 'min' => 1, 'max' => 1000, 'placeholder' => 'e.g. 12'],
            ['name' => 'steelDensityRebar', 'label' => 'Steel Density',      'kind' => 'count', 'suffix' => 'kg/m³', 'min' => 7000, 'max' => 8000, 'placeholder' => 'e.g. 7850', 'hint' => 'Standard: 7850 kg/m³.', 'optional' => true],
        ],
    ],
    [
        'id' => 'timber', 'label' => 'Timber', 'engine' => 'timber',
        'desc' => 'Estimate the number of rafter, purlin or batten pieces needed.',
        'icon' => '<rect x="3" y="6" width="18" height="5" rx="1"/><rect x="3" y="13" width="18" height="5" rx="1"/><line x1="8" y1="6" x2="8" y2="11"/><line x1="16" y1="13" x2="16" y2="18"/>',
        'fields' => [
            ['name' => 'memberType',         'label' => 'Member Type',       'kind' => 'select', 'options' => ['Rafters', 'Purlins', 'Battens'], 'hint' => 'Rafters are spaced along the structure length; purlins and battens are spaced up the structure width.'],
            ['name' => 'timberType',         'label' => 'Timber Type',       'kind' => 'select', 'options' => ['2 x 2', '2 x 3', '2 x 4', '2 x 6', '4 x 4'], 'hint' => 'Nominal cross-section size.'],
            ['name' => 'timberLength',       'label' => 'Timber Length',     'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 30000,  'placeholder' => 'e.g. 3.6', 'hint' => 'Stock length of one piece as sold.'],
            ['name' => 'spacingTimber',      'label' => 'Required Spacing',  'kind' => 'length', 'unit' => 'mm', 'min' => 25,  'max' => 3000,   'placeholder' => 'e.g. 600', 'hint' => 'Centre-to-centre spacing between members.'],
            ['name' => 'structureLength',    'label' => 'Structure Length',  'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 500000, 'placeholder' => 'e.g. 12'],
            ['name' => 'structureWidth',     'label' => 'Structure Width',   'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 500000, 'placeholder' => 'e.g. 9'],
            ['name' => 'wastePercentTimber', 'label' => 'Waste Percentage',  'kind' => 'count',  'suffix' => '%', 'min' => 0, 'max' => 100, 'placeholder' => 'e.g. 10', 'hint' => 'Typical: 5–15%. Zero means no waste allowance.', 'optional' => true],
        ],
    ],
    [
        'id' => 'roofing', 'label' => 'Roofing Materials', 'engine' => 'roofing',
        'desc' => 'IBR, Self-Lock, Eurotile/Milano and Asphalt Shingle coverage for a roof slope.',
        'icon' => '<path d="M2 12L12 4l10 8"/><path d="M5 12v7h14v-7"/><line x1="12" y1="4" x2="12" y2="19"/>',
        'fields' => [
            ['name' => 'materialType',   'label' => 'Roofing Material',    'kind' => 'select', 'options' => ['IBR Long Span', 'Self-Lock Long Span', 'Eurotile / Milano Tile', 'Asphalt Shingles'], 'hint' => 'Each material has its own real-world coverage spec — see the assumptions after calculating.'],
            ['name' => 'roofWidth',      'label' => 'Roof Width',          'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 500000, 'placeholder' => 'e.g. 9', 'hint' => 'Horizontal span being covered.'],
            ['name' => 'roofSlopeLength','label' => 'Roof Slope Length',   'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 500000, 'placeholder' => 'e.g. 6.5', 'hint' => 'Eave to ridge, measured along the pitch.'],
            ['name' => 'effectiveCover', 'label' => 'Effective Cover (Self-Lock only)', 'kind' => 'length', 'unit' => 'mm', 'min' => 275, 'max' => 360, 'placeholder' => 'e.g. 320', 'hint' => 'Adjustable side lap, 275–360 mm. Ignored for every other material.', 'optional' => true],
            ['name' => 'wastePercentRoofing', 'label' => 'Waste Percentage', 'kind' => 'count', 'suffix' => '%', 'min' => 0, 'max' => 100, 'placeholder' => 'e.g. 5', 'hint' => 'Typical: 5–10%. Zero means no waste allowance.', 'optional' => true],
        ],
    ],
];
?>
<div class="calculators-module" data-calculators-module>

    <!-- ============================================================
         CHOOSER
         ============================================================ -->
    <div data-calc-chooser>

        <div class="module-header">
            <div>
                <span class="eyebrow">Tools</span>
                <h1>Calculators</h1>
                <p class="text-secondary">Block, cement, sand, aggregate, concrete, rebar and timber calculators.</p>
            </div>
        </div>

        <div class="mi-chooser-grid">
            <?php foreach ($calcSections as $s): ?>
                <button type="button" class="mi-type-card" data-calc-open="<?php echo $s['id']; ?>">
                    <span class="mi-type-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><?php echo $s['icon']; ?></svg>
                    </span>
                    <span class="mi-type-body">
                        <span class="mi-type-title"><?php echo htmlspecialchars($s['label']); ?></span>
                        <span class="mi-type-desc"><?php echo htmlspecialchars($s['desc']); ?></span>
                        <span class="mi-type-meta"><?php echo count($s['fields']); ?> inputs</span>
                    </span>
                    <svg class="mi-type-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 5 16 12 9 19"/></svg>
                </button>
            <?php endforeach; ?>
        </div>

    </div><!-- /chooser -->

    <!-- ============================================================
         ONE FORM VIEW PER CALCULATOR
         ============================================================ -->
    <?php foreach ($calcSections as $s): ?>
        <div class="mi-form-view" data-calc-form-view="<?php echo $s['id']; ?>" hidden>

            <nav class="breadcrumb">
                <a href="#calculators" data-calc-back>Calculators</a>
                <span class="separator">/</span>
                <span class="is-current"><?php echo htmlspecialchars($s['label']); ?></span>
            </nav>

            <div class="module-header">
                <div>
                    <span class="eyebrow">Calculator</span>
                    <h1><?php echo htmlspecialchars($s['label']); ?></h1>
                    <p class="text-secondary"><?php echo htmlspecialchars($s['desc']); ?></p>
                </div>
                <button type="button" class="btn btn-outline-secondary btn-sm" data-calc-back>Change calculator</button>
            </div>

            <form class="card mi-form" novalidate data-calc-form="<?php echo $s['id']; ?>" data-calc-engine="<?php echo $s['engine']; ?>">
                <div class="card-body">

                    <div class="alert alert-danger" data-calc-summary hidden>
                        <span class="alert-icon">!</span>
                        <div class="alert-body">
                            <span class="alert-title">Please check your entries</span>
                            <span data-calc-summary-text></span>
                        </div>
                    </div>

                    <div class="mi-unitbar">
                        <label class="form-label" for="calc-<?php echo $s['id']; ?>-unit-all">Set all length units to</label>
                        <select class="form-control" id="calc-<?php echo $s['id']; ?>-unit-all" data-calc-unit-all>
                            <option value="">Keep each field's own unit</option>
                            <?php foreach ($calcLengthUnits as $value => $label): ?>
                                <option value="<?php echo $value; ?>"><?php echo htmlspecialchars($label); ?></option>
                            <?php endforeach; ?>
                        </select>
                        <span class="form-hint">A shortcut only. Any field can still be switched to its own unit afterwards.</span>
                    </div>

                    <div class="mi-grid">
                        <?php foreach ($s['fields'] as $f): ?>
                            <?php echo calc_render_field($s['id'], $f, $calcLengthUnits); ?>
                        <?php endforeach; ?>
                    </div>
                </div>

                <div class="card-footer mi-actions">
                    <span class="mi-actions-note">Values stay on this page until you save.</span>
                    <div class="mi-actions-buttons">
                        <button type="reset" class="btn btn-outline-secondary">Clear</button>
                        <button type="submit" class="btn btn-primary">Calculate</button>
                    </div>
                </div>
            </form>

            <!-- Results panel, filled in by calculators.js -->
            <div class="mi-calc-results card" data-calc-results hidden>
                <div class="card-header">
                    <h4 data-calc-results-title>Result</h4>
                </div>
                <div class="card-body">
                    <div class="mi-result-grid" data-calc-result-grid></div>

                    <div class="mi-schedule-wrapper" data-calc-schedule-wrapper hidden>
                        <table class="mi-schedule-table">
                            <thead data-calc-schedule-head></thead>
                            <tbody data-calc-schedule-rows></tbody>
                        </table>
                    </div>

                    <div class="mi-assumptions" data-calc-assumptions hidden>
                        <summary class="mi-assumptions-toggle">View assumptions</summary>
                        <div class="mi-assumptions-body" hidden>
                            <ul data-calc-assumptions-list></ul>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-calc-save>Save Calculation</button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-calc-add-to-boq>Add to Bill of Quantities</button>
                </div>
            </div>

        </div><!-- /<?php echo $s['id']; ?> -->
    <?php endforeach; ?>

</div>
