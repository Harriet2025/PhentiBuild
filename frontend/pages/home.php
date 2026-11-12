<?php
/**
 * PhentiBuild - Public Homepage
 *
 * Marketing/information page only. Nothing here talks to the backend
 * beyond the real links it hands off to (login.php / register.php /
 * features.php / how-it-works.php / vision.php) — every "feature"
 * described below that isn't actually connected yet (camera-based
 * recognition, AI roof generation) is described as a capability, never
 * demonstrated as if it already runs, matching how the app itself is
 * honest about those same features (see backend/services/
 * VisionService.php and RoofAIService.php).
 *
 * The Features/How It Works/Vision content that used to live on this
 * page as in-page sections now has its own page each — this file only
 * keeps the hero, a quick value strip, the platform introduction, the
 * audience section and the closing pitch, so the homepage stays short.
 *
 * Styling: frontend/css/modules/home.css (imported by main.css).
 * Behaviour: frontend/js/modules/home.js.
 */
require_once __DIR__ . '/../../backend/config/config.php';
require_once __DIR__ . '/../../backend/config/contact.php';
require_once __DIR__ . '/../../backend/components/logo.php';
require_once __DIR__ . '/../../backend/components/home-icons.php';

$homeActivePage = 'home';

require_once __DIR__ . '/../../backend/components/header.php';
?>
<script src="/PhentiBuild/frontend/js/modules/home.js" defer></script>

<div class="home-page">

    <?php require __DIR__ . '/../../backend/components/home-nav.php'; ?>

    <main>

        <!-- ============================================================
             HERO
             ============================================================ -->
        <section class="home-hero">
            <div class="home-container">
                <div class="home-hero-inner">
                    <h1 class="home-hero-title">Build Smarter.<br>Measure <span class="accent">Better.</span></h1>
                    <p class="home-hero-lead">Your construction site, measurements, calculations and material estimates, brought together in one intelligent platform.</p>
                    <p class="home-hero-sub">PhentiBuild helps construction professionals measure, estimate, design and manage building projects with greater speed and confidence.</p>
                    <div class="home-hero-actions">
                        <a href="register.php" class="btn btn-primary btn-lg">Get Started</a>
                        <a href="#what-is-phentibuild" class="btn btn-outline btn-lg" data-home-scroll>Explore PhentiBuild</a>
                    </div>
                    <p class="home-hero-tagline">Built for the people who build.</p>
                </div>
            </div>
            <span class="home-hero-scroll-cue"><?php echo home_icon($homeIcons, 'chevronDown'); ?>Scroll</span>
        </section>

        <!-- ============================================================
             VALUE STRIP
             ============================================================ -->
        <section class="home-value-strip">
            <div class="home-container home-value-grid">
                <div class="home-value-item">
                    <span class="home-value-icon"><?php echo home_icon($homeIcons, 'ruler'); ?></span>
                    <div>
                        <span class="home-value-title">Measure</span>
                        <p class="home-value-text">Calculate construction dimensions accurately.</p>
                    </div>
                </div>
                <div class="home-value-item">
                    <span class="home-value-icon"><?php echo home_icon($homeIcons, 'layers'); ?></span>
                    <div>
                        <span class="home-value-title">Estimate</span>
                        <p class="home-value-text">Understand material requirements.</p>
                    </div>
                </div>
                <div class="home-value-item">
                    <span class="home-value-icon"><?php echo home_icon($homeIcons, 'roof'); ?></span>
                    <div>
                        <span class="home-value-title">Design</span>
                        <p class="home-value-text">Visualize roof structures.</p>
                    </div>
                </div>
                <div class="home-value-item">
                    <span class="home-value-icon"><?php echo home_icon($homeIcons, 'docCheck'); ?></span>
                    <div>
                        <span class="home-value-title">Document</span>
                        <p class="home-value-text">Generate BOQs and reports.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ============================================================
             WHAT IS PHENTIBUILD?
             ============================================================ -->
        <section class="home-section home-section--light" id="what-is-phentibuild">
            <div class="home-container">
                <div class="home-split home-reveal">
                    <div class="home-split-text">
                        <span class="home-split-eyebrow-rule"></span>
                        <h2>Construction Planning, Reimagined.</h2>
                        <p>PhentiBuild is a digital construction platform designed to simplify the way building professionals measure, calculate, estimate and plan construction work.</p>
                        <p>It brings measurement, material takeoff, structural calculation, roof design and reporting into one platform, instead of switching between notebooks, calculators, spreadsheets and separate tools every time a number needs checking.</p>
                        <p><a href="features.php" class="btn btn-outline">See all features</a></p>
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
             WHO IS PHENTIBUILD FOR?
             ============================================================ -->
        <section class="home-section home-section--muted">
            <div class="home-container">
                <div class="home-section-head is-centered home-reveal">
                    <span class="eyebrow">Audience</span>
                    <h2>Built for the People Who Build.</h2>
                </div>

                <div class="home-persona-grid home-reveal">
                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'hardhat'); ?></span>
                        <h3>Contractors</h3>
                        <p>Plan and estimate projects more efficiently.</p>
                    </div>
                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'clipboard'); ?></span>
                        <h3>Site Managers</h3>
                        <p>Capture measurements and keep project information organized.</p>
                    </div>
                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'boq'); ?></span>
                        <h3>Quantity Surveyors</h3>
                        <p>Work with material quantities and BOQs.</p>
                    </div>
                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'tsquare'); ?></span>
                        <h3>Draftsmen</h3>
                        <p>Work with dimensions and roof designs.</p>
                    </div>
                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'wrench'); ?></span>
                        <h3>Builders</h3>
                        <p>Get practical construction estimates.</p>
                    </div>
                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'graduation'); ?></span>
                        <h3>Students</h3>
                        <p>Learn and practice construction estimation digitally.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ============================================================
             WHY PHENTIBUILD
             ============================================================ -->
        <section class="home-section home-section--dark">
            <div class="home-container">
                <div class="home-section-head is-centered home-reveal">
                    <span class="eyebrow">Why PhentiBuild</span>
                    <h2>Less Guesswork. More Confidence.</h2>
                </div>

                <div class="home-benefits-grid home-reveal">
                    <?php
                    $benefits = [
                        'Reduce repetitive calculations',
                        'Save time on-site and in the office',
                        'Organize project information in one place',
                        'Simplify material estimation',
                        'Generate BOQs faster',
                        'Visualize roof structures before you build',
                        'Keep a running history of every calculation',
                        'Work from site or office, on your terms',
                    ];
                    foreach ($benefits as $b): ?>
                        <div class="home-benefit">
                            <span class="home-benefit-icon"><?php echo home_icon($homeIcons, 'check'); ?></span>
                            <p><?php echo htmlspecialchars($b); ?></p>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </section>

        <?php require __DIR__ . '/../../backend/components/home-cta.php'; ?>

        <?php require __DIR__ . '/../../backend/components/home-contact-cta.php'; ?>

    </main>

    <?php require __DIR__ . '/../../backend/components/home-footer.php'; ?>

</div>

<?php require_once __DIR__ . '/../../backend/components/footer.php'; ?>
