<?php
/**
 * PhentiBuild - Vision
 * Public marketing page. See frontend/pages/home.php's header comment
 * for the shared conventions this page follows too.
 */
require_once __DIR__ . '/../../backend/config/config.php';
require_once __DIR__ . '/../../backend/components/logo.php';
require_once __DIR__ . '/../../backend/components/home-icons.php';

$homeActivePage = 'vision';

require_once __DIR__ . '/../../backend/components/header.php';
?>
<script src="/PhentiBuild/frontend/js/modules/home.js" defer></script>

<div class="home-page">

    <?php require __DIR__ . '/../../backend/components/home-nav.php'; ?>

    <main>

        <!-- ============================================================
             VISION
             ============================================================ -->
        <section class="home-vision">
            <div class="home-vision-inner home-reveal">
                <h1>Our Vision</h1>
                <p class="home-vision-statement">To make construction planning, measurement, estimation and structural visualization smarter, faster and more accessible through technology.</p>
                <p class="home-vision-support">PhentiBuild aims to bridge the gap between traditional construction practices and modern digital tools, giving the people who build the tools they need to plan with greater clarity and confidence.</p>
            </div>
        </section>

        <!-- ============================================================
             WHY THIS MATTERS
             ============================================================ -->
        <section class="home-section home-section--light">
            <div class="home-container">
                <div class="home-split home-reveal">
                    <div class="home-split-text">
                        <span class="home-split-eyebrow-rule"></span>
                        <h2>The Problem We Started With.</h2>
                        <p>A single construction estimate can pass through a notebook, a phone calculator, a spreadsheet and a separate drawing tool before it ever reaches a client, and every handoff between them is a place a number can drift, a unit can get lost, or a material quantity can quietly go stale.</p>
                        <p>None of that is a failure of the people doing the work. It's a gap in the tools available to them: tools built for an office, not a site, that assume a single calculation instead of a whole project's worth of them. PhentiBuild exists to close that gap.</p>
                    </div>
                    <div class="home-split-visual">
                        <div class="home-blueprint" role="img" aria-label="Stylised blueprint illustration representing a measured building footprint">
                            <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
                                <rect class="home-blueprint-frame" x="60" y="50" width="220" height="160"/>
                                <line class="home-blueprint-frame" x1="60" y1="150" x2="280" y2="150"/>
                                <line class="home-blueprint-frame" x1="170" y1="50" x2="170" y2="150"/>
                                <path class="home-blueprint-dim" d="M60 225h220"/>
                                <path class="home-blueprint-dim" d="M60 218v14M280 218v14"/>
                                <text class="home-blueprint-label" x="150" y="245">12.00 m</text>
                                <path class="home-blueprint-dim" d="M320 50v160"/>
                                <path class="home-blueprint-dim" d="M313 50h14M313 210h14"/>
                                <text class="home-blueprint-label" x="330" y="135">9.00 m</text>
                                <path class="home-blueprint-accent" d="M60 50l220 0"/>
                                <circle class="home-blueprint-accent" cx="60" cy="50" r="4" fill="var(--phb-primary)" stroke="none"/>
                                <circle class="home-blueprint-accent" cx="280" cy="50" r="4" fill="var(--phb-primary)" stroke="none"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ============================================================
             PILLARS OF THE VISION
             ============================================================ -->
        <section class="home-section home-section--muted">
            <div class="home-container">
                <div class="home-section-head is-centered home-reveal">
                    <span class="eyebrow">What This Means in Practice</span>
                    <h2>Four Ideas Behind Every Decision We Make.</h2>
                </div>

                <div class="home-persona-grid home-persona-grid--pillars home-reveal">
                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'graduation'); ?></span>
                        <h3>Accessible</h3>
                        <p>Powerful estimation shouldn't be locked behind expensive software or years of training. PhentiBuild is built to work as readily for a site manager with a phone in one hand as for a quantity surveyor at a desk.</p>
                    </div>
                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'check'); ?></span>
                        <h3>Accurate &amp; Transparent</h3>
                        <p>Every calculation shows its assumptions alongside its answer, not hidden behind the number. When you can see how a figure was reached, you can trust it, and correct it if it's wrong.</p>
                    </div>
                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'roof'); ?></span>
                        <h3>Rooted in Real Practice</h3>
                        <p>Construction knowledge built over generations doesn't need replacing, it needs faster tools to apply it. PhentiBuild is built around the calculations professionals already trust, not in place of them.</p>
                    </div>
                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'boq'); ?></span>
                        <h3>One Connected Workflow</h3>
                        <p>Measurement, calculation, design and documentation shouldn't live in separate tools. Keeping them in one place means nothing gets lost between a site visit and a final report.</p>
                    </div>
                </div>
            </div>
        </section>

        <?php require __DIR__ . '/../../backend/components/home-cta.php'; ?>

    </main>

    <?php require __DIR__ . '/../../backend/components/home-footer.php'; ?>

</div>

<?php require_once __DIR__ . '/../../backend/components/footer.php'; ?>
