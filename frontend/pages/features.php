<?php
/**
 * PhentiBuild - Features
 * Public marketing page. See frontend/pages/home.php's header comment
 * for the shared conventions (honesty about unconnected capabilities,
 * shared nav/footer/CTA components) — this page follows the same rules.
 * Camera-based recognition is described as what the Scanner is built to
 * do, always paired with the fact that every reading is manually
 * reviewed before it's saved — never presented as if it runs unattended.
 */
require_once __DIR__ . '/../../backend/config/config.php';
require_once __DIR__ . '/../../backend/components/logo.php';
require_once __DIR__ . '/../../backend/components/home-icons.php';

$homeActivePage = 'features';

require_once __DIR__ . '/../../backend/components/header.php';
?>
<script src="/PhentiBuild/frontend/js/modules/home.js" defer></script>

<div class="home-page">

    <?php require __DIR__ . '/../../backend/components/home-nav.php'; ?>

    <main>

        <!-- ============================================================
             CORE FEATURES
             ============================================================ -->
        <section class="home-section home-section--muted">
            <div class="home-container">
                <div class="home-section-head is-centered home-reveal">
                    <span class="eyebrow">Platform</span>
                    <h1>Everything You Need to Build Smarter</h1>
                    <p>Ten connected tools, one platform, covering everything from the first measurement to the final export. Each one is built to stand on its own, but they share the same data, so a measurement taken this morning is already waiting for you in the BOQ this afternoon.</p>
                </div>

                <div class="home-features-grid">

                    <article class="home-feature home-feature--wide home-reveal">
                        <span class="home-feature-icon"><?php echo home_icon($homeIcons, 'scanner'); ?></span>
                        <div>
                            <span class="home-feature-tag">Data Capture</span>
                            <h3>Smart Site Scanning</h3>
                            <p>Use your device camera to identify and measure construction elements on site, including timber sizes and exposed walls, captured straight from where the work is happening. The scanner is built to recognize standard timber sizes (2&times;2 through 4&times;4) and to measure an exposed wall's length, height and surface area.</p>
                            <ul class="home-feature-list-detail">
                                <li>Every capture routes to a confirm and correct step, so nothing is saved to your project without your review</li>
                                <li>Falls back to Manual Input instantly if a scan isn't clear or the camera isn't available</li>
                                <li>Confirmed scans feed straight into the same measurement records Manual Input uses</li>
                            </ul>
                        </div>
                    </article>

                    <article class="home-feature home-reveal">
                        <span class="home-feature-icon"><?php echo home_icon($homeIcons, 'edit'); ?></span>
                        <h3>Manual Measurements</h3>
                        <p>Enter dimensions manually whenever camera scanning is unavailable or precision input is preferred. Every field is validated as you type, with sensible unit conversions (mm, cm, m, in, ft) handled for you.</p>
                    </article>

                    <article class="home-feature home-reveal">
                        <span class="home-feature-icon"><?php echo home_icon($homeIcons, 'materials'); ?></span>
                        <h3>Material Estimation</h3>
                        <p>Estimate blocks, cement, sand, aggregate, timber and roofing materials from the dimensions you've already captured. A live Materials Catalog keeps unit sizes and coverage specs consistent across every calculation.</p>
                    </article>

                    <article class="home-feature home-reveal">
                        <span class="home-feature-icon"><?php echo home_icon($homeIcons, 'calculator'); ?></span>
                        <h3>Structural Calculations</h3>
                        <p>Calculate concrete volume, mortar and plaster requirements, and column dimensions with reinforcement. Each comes with its own assumptions shown alongside the result, not hidden behind the number.</p>
                    </article>

                    <article class="home-feature home-reveal">
                        <span class="home-feature-icon"><?php echo home_icon($homeIcons, 'rebar'); ?></span>
                        <h3>Rebar Estimation</h3>
                        <p>Generate a full steel schedule from main bar count, diameter and spacing, covering main bars, stirrups, total length and total weight, broken out line by line.</p>
                    </article>

                    <article class="home-feature home-reveal">
                        <span class="home-feature-icon"><?php echo home_icon($homeIcons, 'timber'); ?></span>
                        <h3>Timber &amp; Woodwork</h3>
                        <p>Calculate rafters, purlins and battens from your structure's dimensions and chosen spacing, with waste allowance built into the final piece count.</p>
                    </article>

                    <article class="home-feature home-feature--wide home-reveal">
                        <span class="home-feature-icon"><?php echo home_icon($homeIcons, 'roof'); ?></span>
                        <div>
                            <span class="home-feature-tag">Design</span>
                            <h3>Roof Studio</h3>
                            <p>Sketch a roof footprint on a real 2D drawing canvas and work with Gable, Hip and Hidden/Flat configurations, with pitch, rafter spacing, purlin spacing and roofing material recorded alongside the drawing itself, not as a separate spreadsheet you have to keep in sync.</p>
                            <ul class="home-feature-list-detail">
                                <li>Line, rectangle and polygon drawing tools with snap-to-grid and undo/redo</li>
                                <li>Every shape is stored as real-world coordinates, not pixels, so it means the same thing at any zoom level</li>
                                <li>Feeds directly into 3D Roof Visualization and material estimation below</li>
                            </ul>
                        </div>
                    </article>

                    <article class="home-feature home-reveal">
                        <span class="home-feature-icon"><?php echo home_icon($homeIcons, 'cube3d'); ?></span>
                        <h3>3D Roof Visualization</h3>
                        <p>Turn your roof footprint, pitch and spacing into a real, rotatable structural model, with rafters, purlins, battens, ridge and hips all generated from your actual dimensions, not a stock image.</p>
                    </article>

                    <article class="home-feature home-reveal">
                        <span class="home-feature-icon"><?php echo home_icon($homeIcons, 'boq'); ?></span>
                        <h3>Bill of Quantities</h3>
                        <p>Every calculation you save, from blocks and cement to timber, rebar and roofing sheets, can be added straight into one dynamic BOQ, editable by quantity, unit price and waste percentage, with a running contingency total.</p>
                    </article>

                    <article class="home-feature home-reveal">
                        <span class="home-feature-icon"><?php echo home_icon($homeIcons, 'reports'); ?></span>
                        <h3>Reports &amp; Excel</h3>
                        <p>Export project information, your BOQ and material schedules into a real, professionally structured .xlsx workbook that opens in Excel and stays fully editable, ready to share with a client or supplier.</p>
                    </article>

                </div>
            </div>
        </section>

        <!-- ============================================================
             MEASURE YOUR WAY (camera / manual)
             ============================================================ -->
        <section class="home-section home-section--light">
            <div class="home-container">
                <div class="home-section-head is-centered home-reveal">
                    <span class="eyebrow">Dual-Mode Workflow</span>
                    <h2>Measure Your Way</h2>
                    <p>Construction sites don't always cooperate with a camera. Poor light, a cracked screen, a measurement that needs to be exact, any of these can get in the way. PhentiBuild is built so neither mode is a second-class option.</p>
                </div>

                <div class="home-reveal home-toggle-wrap">
                    <div class="home-toggle" data-home-mode-toggle role="tablist" aria-label="Measurement mode preview">
                        <button type="button" class="home-toggle-btn is-active" data-home-mode-btn="camera" role="tab" aria-selected="true">Camera</button>
                        <button type="button" class="home-toggle-btn" data-home-mode-btn="manual" role="tab" aria-selected="false">Manual</button>
                    </div>
                </div>

                <div class="home-mode-grid">
                    <article class="home-mode-panel is-active home-reveal" data-home-mode-panel="camera">
                        <span class="home-mode-icon"><?php echo home_icon($homeIcons, 'scanner'); ?></span>
                        <h3>Camera Scanner</h3>
                        <p>Use your device camera to identify and measure construction elements on site. Point, capture, and review what was detected before anything is confirmed, so you always have the final say on the number that gets saved.</p>
                    </article>
                    <article class="home-mode-panel home-reveal" data-home-mode-panel="manual">
                        <span class="home-mode-icon"><?php echo home_icon($homeIcons, 'edit'); ?></span>
                        <h3>Manual Input</h3>
                        <p>Enter your dimensions directly when you need precision or when camera scanning isn't available. You get the same validated fields, unit conversions and calculation engine, just typed in rather than captured.</p>
                    </article>
                </div>
            </div>
        </section>

        <?php require __DIR__ . '/../../backend/components/home-cta.php'; ?>

    </main>

    <?php require __DIR__ . '/../../backend/components/home-footer.php'; ?>

</div>

<?php require_once __DIR__ . '/../../backend/components/footer.php'; ?>
