<?php
/**
 * PhentiBuild - Manual Input Module
 *
 * Lets the user pick what they want to measure and capture the raw
 * dimensions for it. This stage is the INPUT UI ONLY: sections, fields,
 * unit selectors and validation. Nothing is calculated and nothing is
 * saved — the calculation engine and the measurement store are separate
 * later stages.
 *
 * Everything below is data-driven. Adding or changing a field means
 * editing $miSections only: the markup renderer picks up the change, and
 * manual-input.js reads each field's validation rules from the data-*
 * attributes rendered here rather than keeping its own copy of the spec.
 */

$miLengthUnits = [
    'mm' => 'mm',
    'cm' => 'cm',
    'm'  => 'm',
    'in' => 'inches',
    'ft' => 'feet',
];

$miPitchUnits = [
    'deg'   => 'degrees',
    'pct'   => 'percent',
    'ratio' => 'rise : 12',
];

if (!function_exists('mi_sentence_label')) {
    /**
     * Field labels are Title Case ("Wall Length") but error messages read
     * as sentences ("Wall length is required."). None of the labels below
     * contain acronyms, so lower-casing and re-capitalising is safe.
     */
    function mi_sentence_label($label) {
        return ucfirst(strtolower($label));
    }

    function mi_unit_select($field, $units, $unitKind) {
        $html = '<select class="unit-select"'
              . ' data-mi-unit="' . htmlspecialchars($field['name']) . '"'
              . ' data-unit-kind="' . $unitKind . '"'
              . ' aria-label="Unit for ' . htmlspecialchars(mi_sentence_label($field['label'])) . '">';

        foreach ($units as $value => $label) {
            $selected = ($value === $field['unit']) ? ' selected' : '';
            $html .= '<option value="' . htmlspecialchars($value) . '"' . $selected . '>'
                   . htmlspecialchars($label) . '</option>';
        }

        return $html . '</select>';
    }

    function mi_render_field($sectionId, $f, $lengthUnits, $pitchUnits) {
        $id       = 'mi-' . $sectionId . '-' . $f['name'];
        $kind     = $f['kind'];
        $required = empty($f['optional']);

        $out  = '<div class="form-group">';
        $out .= '<label class="form-label" for="' . $id . '">'
              . htmlspecialchars($f['label'])
              . ($required ? ' <span class="required">*</span>' : '')
              . '</label>';

        $shared = ' id="' . $id . '"'
                . ' name="' . htmlspecialchars($f['name']) . '"'
                . ' data-mi-field'
                . ' data-kind="' . $kind . '"'
                . ' data-label="' . htmlspecialchars(mi_sentence_label($f['label'])) . '"'
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
            /* Deliberately type="text" rather than type="number": number
               inputs report an empty value for unparseable text, which makes
               it impossible to tell "left blank" from "typed 12,,5" and show
               the right message. inputmode still gives phones a numeric pad. */
            $input = '<input type="text"' . $shared
                   . ' class="form-control' . ($kind === 'section' ? '' : ' form-control-numeric') . '"'
                   . ' inputmode="' . ($kind === 'count' ? 'numeric' : 'decimal') . '"'
                   . ' placeholder="' . htmlspecialchars($f['placeholder']) . '"'
                   . ' autocomplete="off"';

            if (isset($f['min'])) { $input .= ' data-min="' . $f['min'] . '"'; }
            if (isset($f['max'])) { $input .= ' data-max="' . $f['max'] . '"'; }
            $input .= '>';

            $out .= '<div class="measure-input">' . $input;

            if ($kind === 'length' || $kind === 'section') {
                $out .= mi_unit_select($f, $lengthUnits, 'length');
            } elseif ($kind === 'pitch') {
                $out .= mi_unit_select($f, $pitchUnits, 'pitch');
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
 * Field kinds:
 *   length  - number + length unit selector. min/max are stated in MILLIMETRES;
 *             the validator converts the entry before range-checking it.
 *   count   - whole number with a fixed noun, no unit selector. min/max are counts.
 *   section - timber cross-section "width x thickness" + length unit selector.
 *   pitch   - number + pitch unit selector (degrees / percent / rise per 12).
 *   select  - fixed list of options.
 *
 * The min/max values are deliberately generous. They exist to catch a slipped
 * decimal point or a wrong unit (a 5,000 m wall), not to police the design.
 */
$miSections = [
    [
        'id'    => 'walls',
        'label' => 'Walls & Masonry',
        'desc'  => 'Blockwork wall dimensions and the size of the block being used.',
        'note'  => 'Enter one wall at a time. Block length and height describe the face of a single block, not the wall.',
        'icon'  => '<rect x="3" y="5" width="18" height="14" rx="1"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="5" x2="9" y2="12"/><line x1="15" y1="12" x2="15" y2="19"/>',
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
        'id'    => 'plastering',
        'label' => 'Plastering',
        'desc'  => 'Wall area to be rendered and the thickness of the plaster coat.',
        'note'  => 'Record each face separately when only one side of the wall is being finished.',
        'icon'  => '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 16l8-8"/><path d="M12 16l4-4"/>',
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
        'id'    => 'slab',
        'label' => 'Floor / Slab',
        'desc'  => 'Plan dimensions and thickness of a floor slab or concrete bed.',
        'note'  => 'Break irregular floors into rectangles and enter each one separately.',
        'icon'  => '<path d="M12 4l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 9v4"/><path d="M21 9v4"/>',
        'fields' => [
            ['name' => 'length',        'label' => 'Length',         'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 500000, 'placeholder' => 'e.g. 9'],
            ['name' => 'width',         'label' => 'Width',          'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 500000, 'placeholder' => 'e.g. 6'],
            ['name' => 'slabThickness', 'label' => 'Slab Thickness',  'kind' => 'length', 'unit' => 'mm', 'min' => 25,  'max' => 2000,   'placeholder' => 'e.g. 150'],
        ],
    ],
    [
        'id'    => 'column',
        'label' => 'Column',
        'desc'  => 'Height and cross-section of a single structural column.',
        'note'  => 'Height runs floor to soffit. Length, breadth and width all describe the cross-section, so on a square column they carry the same value.',
        'icon'  => '<rect x="9" y="4" width="6" height="16"/><line x1="5" y1="4" x2="19" y2="4"/><line x1="5" y1="20" x2="19" y2="20"/>',
        'fields' => [
            ['name' => 'height',  'label' => 'Height',  'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 100000, 'placeholder' => 'e.g. 3'],
            ['name' => 'length',  'label' => 'Length',  'kind' => 'length', 'unit' => 'mm', 'min' => 25,  'max' => 5000,   'placeholder' => 'e.g. 450'],
            ['name' => 'breadth', 'label' => 'Breadth', 'kind' => 'length', 'unit' => 'mm', 'min' => 25,  'max' => 5000,   'placeholder' => 'e.g. 225'],
            ['name' => 'width',   'label' => 'Width',   'kind' => 'length', 'unit' => 'mm', 'min' => 25,  'max' => 5000,   'placeholder' => 'e.g. 225'],
        ],
    ],
    [
        'id'    => 'roof',
        'label' => 'Roof',
        'desc'  => 'Plan size, pitch and framing spacings for a roof structure.',
        'note'  => 'Roof length and width are the plan dimensions of the area covered, measured on the ground floor plan.',
        'icon'  => '<path d="M2 12L12 4l10 8"/><path d="M5 12v7h14v-7"/><line x1="12" y1="4" x2="12" y2="19"/>',
        'fields' => [
            ['name' => 'roofLength',    'label' => 'Roof Length',    'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 500000, 'placeholder' => 'e.g. 12'],
            ['name' => 'roofWidth',     'label' => 'Roof Width',     'kind' => 'length', 'unit' => 'm',  'min' => 100, 'max' => 500000, 'placeholder' => 'e.g. 9'],
            ['name' => 'roofPitch',     'label' => 'Roof Pitch',     'kind' => 'pitch',  'unit' => 'deg', 'placeholder' => 'e.g. 30', 'hint' => 'Choose the unit your drawing uses: degrees, percent fall, or rise per 12 of run.'],
            ['name' => 'rafterSpacing', 'label' => 'Rafter Spacing', 'kind' => 'length', 'unit' => 'mm', 'min' => 100, 'max' => 3000, 'placeholder' => 'e.g. 600'],
            ['name' => 'purlinSpacing', 'label' => 'Purlin Spacing', 'kind' => 'length', 'unit' => 'mm', 'min' => 100, 'max' => 3000, 'placeholder' => 'e.g. 900'],
            ['name' => 'roofType',      'label' => 'Roof Type',      'kind' => 'select', 'options' => ['Gable', 'Hip', 'Shed / Mono-pitch', 'Gambrel', 'Mansard', 'Flat', 'Butterfly', 'Pyramid Hip']],
        ],
    ],
    [
        'id'    => 'concrete',
        'label' => 'Concrete',
        'desc'  => 'Concrete volume and material requirements for slabs or columns.',
        'note'  => 'Enter slab dimensions OR column dimensions—not both. The calculator will handle each type.',
        'icon'  => '<rect x="3" y="4" width="18" height="16" rx="1"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="17" y1="8" x2="17" y2="16"/>',
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
        'id'    => 'rebar',
        'label' => 'Rebar',
        'desc'  => 'Reinforcing steel (rebar) quantity and weight for reinforced columns.',
        'note'  => 'Enter main bar and stirrup details. The calculator will produce a steel schedule and total weight.',
        'icon'  => '<rect x="3" y="7" width="18" height="10" rx="1"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/>',
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
        'id'    => 'timber',
        'label' => 'Timber',
        'desc'  => 'Rafter, purlin and batten quantities for structural or carcassing timber.',
        'note'  => 'Enter one member type and timber size at a time. A roof or floor with more than one member type needs a separate entry for each.',
        'icon'  => '<rect x="3" y="6" width="18" height="5" rx="1"/><rect x="3" y="13" width="18" height="5" rx="1"/><line x1="8" y1="6" x2="8" y2="11"/><line x1="16" y1="13" x2="16" y2="18"/>',
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
];
?>
<div class="manual-input-module" data-manual-input>

    <!-- ============================================================
         CHOOSER: pick what to measure
         ============================================================ -->
    <div data-mi-chooser>

        <div class="module-header">
            <div>
                <span class="eyebrow">Data Capture</span>
                <h1>Manual Input</h1>
                <p class="text-secondary">Choose what you want to measure, then enter the dimensions by hand.</p>
            </div>
        </div>

        <div class="alert alert-info mi-intro">
            <span class="alert-icon">i</span>
            <div class="alert-body">
                <span class="alert-title">Input only at this stage</span>
                <span>Every measurement can be entered in mm, cm, m, inches or feet, and each entry is validated as you type. Quantities and estimates are produced by the Calculators module, which has not been built yet.</span>
            </div>
        </div>

        <div class="mi-chooser-grid">
            <?php foreach ($miSections as $s): ?>
                <button type="button" class="mi-type-card" data-mi-open="<?php echo $s['id']; ?>">
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
         ONE FORM VIEW PER MEASUREMENT TYPE
         ============================================================ -->
    <?php foreach ($miSections as $s): ?>
        <div class="mi-form-view" data-mi-form-view="<?php echo $s['id']; ?>" hidden>

            <nav class="breadcrumb">
                <a href="#manual-input" data-mi-back>Manual Input</a>
                <span class="separator">/</span>
                <span class="is-current"><?php echo htmlspecialchars($s['label']); ?></span>
            </nav>

            <div class="module-header">
                <div>
                    <span class="eyebrow">Manual Entry</span>
                    <h1><?php echo htmlspecialchars($s['label']); ?></h1>
                    <p class="text-secondary"><?php echo htmlspecialchars($s['desc']); ?></p>
                </div>
                <button type="button" class="btn btn-outline-secondary btn-sm" data-mi-back>Change type</button>
            </div>

            <form class="card mi-form" novalidate data-mi-form="<?php echo $s['id']; ?>">
                <div class="card-body">

                    <div class="alert alert-danger" data-mi-summary hidden>
                        <span class="alert-icon">!</span>
                        <div class="alert-body">
                            <span class="alert-title">Please check your entries</span>
                            <span data-mi-summary-text></span>
                        </div>
                    </div>

                    <div class="alert alert-success" data-mi-success hidden>
                        <span class="alert-icon">&check;</span>
                        <div class="alert-body">
                            <span class="alert-title">All entries are valid</span>
                            <span>These measurements are ready to be calculated. The Calculators module is not built yet, so nothing has been worked out or saved.</span>
                        </div>
                    </div>

                    <div class="mi-unitbar">
                        <label class="form-label" for="mi-<?php echo $s['id']; ?>-unit-all">Set all length units to</label>
                        <select class="form-control" id="mi-<?php echo $s['id']; ?>-unit-all" data-mi-unit-all>
                            <option value="">Keep each field's own unit</option>
                            <?php foreach ($miLengthUnits as $value => $label): ?>
                                <option value="<?php echo $value; ?>"><?php echo htmlspecialchars($label); ?></option>
                            <?php endforeach; ?>
                        </select>
                        <span class="form-hint">A shortcut only. Any field can still be switched to its own unit afterwards.</span>
                    </div>

                    <div class="mi-grid">
                        <?php foreach ($s['fields'] as $f): ?>
                            <?php echo mi_render_field($s['id'], $f, $miLengthUnits, $miPitchUnits); ?>
                        <?php endforeach; ?>
                    </div>

                    <p class="mi-note"><?php echo htmlspecialchars($s['note']); ?></p>
                </div>

                <div class="card-footer mi-actions">
                    <span class="mi-actions-note">Entries are checked, not calculated.</span>
                    <div class="mi-actions-buttons">
                        <button type="reset" class="btn btn-outline-secondary">Clear</button>
                        <button type="button" class="btn btn-outline-secondary" data-mi-save-measurement>Save Measurement</button>
                        <button type="submit" class="btn btn-primary">Check Entries</button>
                    </div>
                </div>
            </form>

            <!-- Calculation results panel (walls only) -->
            <?php if ($s['id'] === 'walls'): ?>
                <div class="mi-calc-results card" data-mi-calc-results="walls" hidden>
                    <div class="card-header">
                        <h4>Block Quantity Estimate</h4>
                    </div>
                    <div class="card-body">
                        <div class="mi-result-grid">
                            <div class="mi-result-row">
                                <span class="mi-result-label">Wall Area</span>
                                <span class="mi-result-value" data-result="wallAreaM2">—</span>
                                <span class="mi-result-unit">m²</span>
                            </div>
                            <div class="mi-result-row">
                                <span class="mi-result-label">Blocks (dry)</span>
                                <span class="mi-result-value" data-result="blockCountDry">—</span>
                                <span class="mi-result-unit">pieces</span>
                            </div>
                            <div class="mi-result-row">
                                <span class="mi-result-label">Waste Allowance</span>
                                <span class="mi-result-value" data-result="wasteCount">—</span>
                                <span class="mi-result-unit">pieces</span>
                            </div>
                            <div class="mi-result-row mi-result-highlight">
                                <span class="mi-result-label">Total Blocks</span>
                                <span class="mi-result-value" data-result="blockCountFinal">—</span>
                                <span class="mi-result-unit">pieces</span>
                            </div>
                            <div class="mi-result-row">
                                <span class="mi-result-label">Mortar Requirement</span>
                                <span class="mi-result-value" data-result="mortarVolumeM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                        </div>

                        <div class="mi-assumptions">
                            <summary class="mi-assumptions-toggle">View assumptions</summary>
                            <div class="mi-assumptions-body" hidden>
                                <ul>
                                    <li><strong>Block pattern:</strong> <span data-assumption="blockPattern">—</span></li>
                                    <li><strong>Mortar:</strong> <span data-assumption="mortarPercentOfBlock">—</span>% of solid block volume</li>
                                    <li><strong>Method:</strong> <span data-assumption="description">—</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button type="button" class="btn btn-outline-secondary btn-sm" data-save-calculation="walls">Save Calculation</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm" data-add-to-boq="walls">Add to Bill of Quantities</button>
                    </div>
                </div>
            <?php endif; ?>

            <!-- Calculation results panel (plastering only) -->
            <?php if ($s['id'] === 'plastering'): ?>
                <div class="mi-calc-results card" data-mi-calc-results="plastering" hidden>
                    <div class="card-header">
                        <h4>Plaster & Mortar Estimate</h4>
                    </div>
                    <div class="card-body">
                        <div class="mi-result-grid">
                            <div class="mi-result-row">
                                <span class="mi-result-label">Total Area</span>
                                <span class="mi-result-value" data-result="totalSurfaceAreaM2">—</span>
                                <span class="mi-result-unit">m²</span>
                            </div>
                            <div class="mi-result-row">
                                <span class="mi-result-label">Plaster Volume</span>
                                <span class="mi-result-value" data-result="plasterVolumeM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                            <div class="mi-result-row">
                                <span class="mi-result-label">Cement (dry)</span>
                                <span class="mi-result-value" data-result="cementRequirementM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                            <div class="mi-result-row">
                                <span class="mi-result-label">Sand (dry)</span>
                                <span class="mi-result-value" data-result="sandRequirementM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                            <div class="mi-result-row mi-result-highlight">
                                <span class="mi-result-label">Cement (final)</span>
                                <span class="mi-result-value" data-result="cementWithWasteM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                            <div class="mi-result-row mi-result-highlight">
                                <span class="mi-result-label">Sand (final)</span>
                                <span class="mi-result-value" data-result="sandWithWasteM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                        </div>

                        <div class="mi-assumptions">
                            <summary class="mi-assumptions-toggle">View assumptions</summary>
                            <div class="mi-assumptions-body" hidden>
                                <ul>
                                    <li><strong>Mix ratio:</strong> <span data-assumption="mixRatio">—</span> (cement : sand)</li>
                                    <li><strong>Mortar type:</strong> <span data-assumption="description">—</span></li>
                                    <li><strong>Density:</strong> <span data-assumption="mortarDensity">—</span> (wet mortar)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button type="button" class="btn btn-outline-secondary btn-sm" data-save-calculation="plastering">Save Calculation</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm" data-add-to-boq="plastering">Add to Bill of Quantities</button>
                    </div>
                </div>
            <?php endif; ?>

            <!-- Calculation results panel (concrete only) -->
            <?php if ($s['id'] === 'concrete'): ?>
                <div class="mi-calc-results card" data-mi-calc-results="concrete" hidden>
                    <div class="card-header">
                        <h4>Concrete Volume & Materials</h4>
                    </div>
                    <div class="card-body">
                        <div class="mi-result-grid">
                            <div class="mi-result-row">
                                <span class="mi-result-label">Individual Volume</span>
                                <span class="mi-result-value" data-result="individualVolumeM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                            <div class="mi-result-row mi-result-highlight">
                                <span class="mi-result-label">Total Volume</span>
                                <span class="mi-result-value" data-result="totalVolumeM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                            <div class="mi-result-row">
                                <span class="mi-result-label">Cement (dry)</span>
                                <span class="mi-result-value" data-result="cementM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                            <div class="mi-result-row">
                                <span class="mi-result-label">Sand (dry)</span>
                                <span class="mi-result-value" data-result="sandM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                            <div class="mi-result-row">
                                <span class="mi-result-label">Aggregate (dry)</span>
                                <span class="mi-result-value" data-result="aggregateM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                            <div class="mi-result-row mi-result-highlight">
                                <span class="mi-result-label">Cement (final)</span>
                                <span class="mi-result-value" data-result="cementWithWasteM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                            <div class="mi-result-row mi-result-highlight">
                                <span class="mi-result-label">Sand (final)</span>
                                <span class="mi-result-value" data-result="sandWithWasteM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                            <div class="mi-result-row mi-result-highlight">
                                <span class="mi-result-label">Aggregate (final)</span>
                                <span class="mi-result-value" data-result="aggregateWithWasteM3">—</span>
                                <span class="mi-result-unit">m³</span>
                            </div>
                        </div>

                        <div class="mi-assumptions">
                            <summary class="mi-assumptions-toggle">View assumptions</summary>
                            <div class="mi-assumptions-body" hidden>
                                <ul>
                                    <li><strong>Mix ratio:</strong> <span data-assumption="mixRatio">—</span> (cement : sand : aggregate)</li>
                                    <li><strong>Wet yield:</strong> <span data-assumption="wetYield">—</span>× dry volume (slump/compaction)</li>
                                    <li><strong>Density:</strong> <span data-assumption="concreteDensity">—</span></li>
                                    <li><strong>Method:</strong> <span data-assumption="description">—</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button type="button" class="btn btn-outline-secondary btn-sm" data-save-calculation="concrete">Save Calculation</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm" data-add-to-boq="concrete">Add to Bill of Quantities</button>
                    </div>
                </div>
            <?php endif; ?>

            <!-- Calculation results panel (rebar only) -->
            <?php if ($s['id'] === 'rebar'): ?>
                <div class="mi-calc-results card" data-mi-calc-results="rebar" hidden>
                    <div class="card-header">
                        <h4>Steel Reinforcement Schedule</h4>
                    </div>
                    <div class="card-body">
                        <div class="mi-result-grid">
                            <div class="mi-result-row">
                                <span class="mi-result-label">Total Steel Length</span>
                                <span class="mi-result-value" data-result="totalSteelLength">—</span>
                                <span class="mi-result-unit">m</span>
                            </div>
                            <div class="mi-result-row mi-result-highlight">
                                <span class="mi-result-label">Total Steel Weight</span>
                                <span class="mi-result-value" data-result="totalSteelWeight">—</span>
                                <span class="mi-result-unit">kg</span>
                            </div>
                        </div>

                        <!-- Rebar Schedule Table -->
                        <div class="mi-schedule-wrapper">
                            <table class="mi-schedule-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Diameter (mm)</th>
                                        <th>Spacing</th>
                                        <th>Quantity</th>
                                        <th>Length/Unit (m)</th>
                                        <th>Total Length (m)</th>
                                        <th>Weight/Unit (kg)</th>
                                        <th>Total Weight (kg)</th>
                                    </tr>
                                </thead>
                                <tbody data-schedule-rows>
                                </tbody>
                            </table>
                        </div>

                        <div class="mi-assumptions">
                            <summary class="mi-assumptions-toggle">View assumptions</summary>
                            <div class="mi-assumptions-body" hidden>
                                <ul>
                                    <li><strong>Steel density:</strong> <span data-assumption="steelDensity">—</span></li>
                                    <li><strong>Stirrup overlap:</strong> <span data-assumption="stirrupOverlapPerCorner">—</span></li>
                                    <li><strong>Method:</strong> <span data-assumption="description">—</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button type="button" class="btn btn-outline-secondary btn-sm" data-save-calculation="rebar">Save Calculation</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm" data-add-to-boq="rebar">Add to Bill of Quantities</button>
                    </div>
                </div>
            <?php endif; ?>

            <!-- Calculation results panel (timber only) -->
            <?php if ($s['id'] === 'timber'): ?>
                <div class="mi-calc-results card" data-mi-calc-results="timber" hidden>
                    <div class="card-header">
                        <h4>Timber Takeoff</h4>
                    </div>
                    <div class="card-body">
                        <div class="mi-result-grid">
                            <div class="mi-result-row">
                                <span class="mi-result-label">Number of Pieces</span>
                                <span class="mi-result-value" data-result="numberOfPieces">—</span>
                                <span class="mi-result-unit">pcs</span>
                            </div>
                            <div class="mi-result-row">
                                <span class="mi-result-label">Total Timber Length</span>
                                <span class="mi-result-value" data-result="totalTimberLength">—</span>
                                <span class="mi-result-unit">m</span>
                            </div>
                            <div class="mi-result-row">
                                <span class="mi-result-label">Waste</span>
                                <span class="mi-result-value" data-result="waste">—</span>
                                <span class="mi-result-unit">m</span>
                            </div>
                            <div class="mi-result-row mi-result-highlight">
                                <span class="mi-result-label">Final Quantity</span>
                                <span class="mi-result-value" data-result="finalQuantity">—</span>
                                <span class="mi-result-unit">pcs</span>
                            </div>
                        </div>

                        <!-- Timber Schedule Table -->
                        <div class="mi-schedule-wrapper">
                            <table class="mi-schedule-table">
                                <thead>
                                    <tr>
                                        <th>Member</th>
                                        <th>Size</th>
                                        <th>Cross-section (mm)</th>
                                        <th>Spacing</th>
                                        <th>Pieces</th>
                                        <th>Length/Piece (m)</th>
                                        <th>Total Length (m)</th>
                                        <th>Final Qty (pcs)</th>
                                    </tr>
                                </thead>
                                <tbody data-schedule-rows>
                                </tbody>
                            </table>
                        </div>

                        <div class="mi-assumptions">
                            <summary class="mi-assumptions-toggle">View assumptions</summary>
                            <div class="mi-assumptions-body" hidden>
                                <ul>
                                    <li><strong>Spacing axis:</strong> <span data-assumption="spacingAxis">—</span></li>
                                    <li><strong>Span axis:</strong> <span data-assumption="spanAxis">—</span></li>
                                    <li><strong>Method:</strong> <span data-assumption="description">—</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button type="button" class="btn btn-outline-secondary btn-sm" data-save-calculation="timber">Save Calculation</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm" data-add-to-boq="timber">Add to Bill of Quantities</button>
                    </div>
                </div>
            <?php endif; ?>

        </div><!-- /<?php echo $s['id']; ?> -->
    <?php endforeach; ?>

</div>
