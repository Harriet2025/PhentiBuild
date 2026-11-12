<?php
/**
 * PhentiBuild - How It Works
 * Public marketing page. See frontend/pages/home.php's header comment
 * for the shared conventions this page follows too.
 */
require_once __DIR__ . '/../../backend/config/config.php';
require_once __DIR__ . '/../../backend/components/logo.php';
require_once __DIR__ . '/../../backend/components/home-icons.php';

$homeActivePage = 'how-it-works';

require_once __DIR__ . '/../../backend/components/header.php';
?>
<script src="/PhentiBuild/frontend/js/modules/home.js" defer></script>

<div class="home-page">

    <?php require __DIR__ . '/../../backend/components/home-nav.php'; ?>

    <main>

        <!-- ============================================================
             HOW IT WORKS
             ============================================================ -->
        <section class="home-section home-section--muted">
            <div class="home-container">
                <div class="home-section-head is-centered home-reveal">
                    <span class="eyebrow">Workflow</span>
                    <h1>From Site Measurement to Material List</h1>
                    <p>Six steps carry a single project from a raw dimension to a document you can hand to a client or a supplier, each one building directly on the last, in the same platform.</p>
                </div>

                <div class="home-process home-reveal">
                    <div class="home-process-step">
                        <span class="home-process-icon"><?php echo home_icon($homeIcons, 'scanner'); ?></span>
                        <span class="home-process-number">01</span>
                        <div>
                            <h3>Measure</h3>
                            <p>Capture a dimension with the Camera Scanner or type it in through Manual Input, whatever the site calls for: wall lengths, timber sizes, column dimensions and more. Both routes end up as the same kind of measurement record.</p>
                        </div>
                    </div>
                    <div class="home-process-step">
                        <span class="home-process-icon"><?php echo home_icon($homeIcons, 'calculator'); ?></span>
                        <span class="home-process-number">02</span>
                        <div>
                            <h3>Calculate</h3>
                            <p>Run that measurement through the matching calculator, whether masonry, plaster, concrete, rebar, timber or roofing, and see the assumptions behind the result, not just the number itself.</p>
                        </div>
                    </div>
                    <div class="home-process-step">
                        <span class="home-process-icon"><?php echo home_icon($homeIcons, 'materials'); ?></span>
                        <span class="home-process-number">03</span>
                        <div>
                            <h3>Estimate</h3>
                            <p>Turn the calculation into real material quantities, such as bags of cement, blocks, lengths of timber and sheets of roofing, cross-checked against the Materials Catalog's own unit sizes and coverage specs.</p>
                        </div>
                    </div>
                    <div class="home-process-step">
                        <span class="home-process-icon"><?php echo home_icon($homeIcons, 'roof'); ?></span>
                        <span class="home-process-number">04</span>
                        <div>
                            <h3>Design</h3>
                            <p>For roofs specifically, sketch the footprint in Roof Studio and visualize it in 3D. The same structural parameters you set there feed straight into the timber and roofing estimates above.</p>
                        </div>
                    </div>
                    <div class="home-process-step">
                        <span class="home-process-icon"><?php echo home_icon($homeIcons, 'boq'); ?></span>
                        <span class="home-process-number">05</span>
                        <div>
                            <h3>BOQ</h3>
                            <p>Add any saved calculation into one consolidated Bill of Quantities, where quantity, unit price, waste percentage and contingency all stay editable in one place.</p>
                        </div>
                    </div>
                    <div class="home-process-step">
                        <span class="home-process-icon"><?php echo home_icon($homeIcons, 'reports'); ?></span>
                        <span class="home-process-number">06</span>
                        <div>
                            <h3>Export</h3>
                            <p>Generate a real, editable Excel workbook covering project information, BOQ, material and cost schedules, ready to share with a client or purchasing team, and logged to your project history.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ============================================================
             CALCULATION EXAMPLES
             ============================================================ -->
        <section class="home-section home-section--light">
            <div class="home-container">
                <div class="home-section-head is-centered home-reveal">
                    <span class="eyebrow">Under the Hood</span>
                    <h2>Turn Dimensions Into Decisions.</h2>
                    <p>Step 2 of the process above isn't a black box. Here's the shape of what actually happens to a few common inputs.</p>
                </div>

                <div class="home-calc-grid home-reveal">
                    <div class="home-calc-card">
                        <h3>Wall</h3>
                        <div class="home-calc-flow">
                            <span class="home-calc-chip">Length &times; Height</span>
                            <?php echo home_icon($homeIcons, 'arrowRight', 'home-calc-arrow'); ?>
                            <span class="home-calc-chip">Surface Area</span>
                            <?php echo home_icon($homeIcons, 'arrowRight', 'home-calc-arrow'); ?>
                            <span class="home-calc-chip home-calc-result">Block Quantity</span>
                        </div>
                        <p class="home-calc-desc">Wall area is divided by the chosen block's face size (plus a mortar joint allowance) to get a block count, with a waste percentage rounded in.</p>
                    </div>
                    <div class="home-calc-card">
                        <h3>Slab</h3>
                        <div class="home-calc-flow">
                            <span class="home-calc-chip">Length &times; Width &times; Thickness</span>
                            <?php echo home_icon($homeIcons, 'arrowRight', 'home-calc-arrow'); ?>
                            <span class="home-calc-chip home-calc-result">Concrete Volume</span>
                        </div>
                        <p class="home-calc-desc">Volume is split into cement, sand and aggregate by your chosen mix ratio, each shown separately in dry and final (with-waste) quantities.</p>
                    </div>
                    <div class="home-calc-card">
                        <h3>Column</h3>
                        <div class="home-calc-flow">
                            <span class="home-calc-chip">Dimensions + Reinforcement</span>
                            <?php echo home_icon($homeIcons, 'arrowRight', 'home-calc-arrow'); ?>
                            <span class="home-calc-chip home-calc-result">Concrete + Rebar Schedule</span>
                        </div>
                        <p class="home-calc-desc">Column volume follows the same mix-ratio split as a slab, while main bar count, diameter, and stirrup spacing produce a full steel weight schedule alongside it.</p>
                    </div>
                    <div class="home-calc-card">
                        <h3>Roof</h3>
                        <div class="home-calc-flow">
                            <span class="home-calc-chip">Dimensions + Roof Type</span>
                            <?php echo home_icon($homeIcons, 'arrowRight', 'home-calc-arrow'); ?>
                            <span class="home-calc-chip home-calc-result">Timber + Roofing Requirements</span>
                        </div>
                        <p class="home-calc-desc">Footprint, pitch and spacing determine rafter, purlin and batten counts, while roof area and your chosen roofing material (IBR, Self-Lock, tile or shingle) determine sheet or tile coverage.</p>
                    </div>
                </div>

                <p class="home-calc-note home-reveal">These flows are illustrative examples of how PhentiBuild structures a calculation, not certified engineering standards. Always verify quantities against local building codes and a qualified engineer's specifications.</p>
            </div>
        </section>

        <?php require __DIR__ . '/../../backend/components/home-cta.php'; ?>

    </main>

    <?php require __DIR__ . '/../../backend/components/home-footer.php'; ?>

</div>

<?php require_once __DIR__ . '/../../backend/components/footer.php'; ?>
