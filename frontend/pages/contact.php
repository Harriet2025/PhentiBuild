<?php
/**
 * PhentiBuild - Contact
 * Public marketing page. See frontend/pages/home.php's header comment
 * for the shared conventions this page follows too. Contact details
 * come from backend/config/contact.php — nothing here is hard-coded.
 */
require_once __DIR__ . '/../../backend/config/config.php';
require_once __DIR__ . '/../../backend/config/contact.php';
require_once __DIR__ . '/../../backend/components/logo.php';
require_once __DIR__ . '/../../backend/components/home-icons.php';

$homeActivePage = 'contact';
$contactSocial = phb_social_links();

require_once __DIR__ . '/../../backend/components/header.php';
?>
<script src="/PhentiBuild/frontend/js/modules/home.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/contact.js" defer></script>

<div class="home-page">

    <?php require __DIR__ . '/../../backend/components/home-nav.php'; ?>

    <main>

        <!-- ============================================================
             HERO
             ============================================================ -->
        <section class="home-section home-section--muted">
            <div class="home-container">
                <div class="home-section-head is-centered home-reveal">
                    <span class="eyebrow">Contact</span>
                    <h1>Let&rsquo;s Build Something Better.</h1>
                    <p>Have a question about PhentiBuild? Get in touch with our team.</p>
                </div>
            </div>
        </section>

        <!-- ============================================================
             CONTACT CHANNELS
             ============================================================ -->
        <section class="home-section home-section--light">
            <div class="home-container">
                <div class="home-persona-grid home-persona-grid--contact home-reveal">

                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'whatsapp'); ?></span>
                        <h3>WhatsApp</h3>
                        <p>Chat with us directly.</p>
                        <a href="<?php echo htmlspecialchars(phb_whatsapp_link()); ?>" class="btn btn-primary btn-block" target="_blank" rel="noopener noreferrer">Start WhatsApp Chat</a>
                        <p class="home-contact-alt">Also on WhatsApp: <a href="<?php echo htmlspecialchars(phb_whatsapp_link(WHATSAPP_NUMBER_ALT)); ?>" target="_blank" rel="noopener noreferrer"><?php echo htmlspecialchars(WHATSAPP_NUMBER_ALT); ?></a></p>
                    </div>

                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'phone'); ?></span>
                        <h3>Phone</h3>
                        <p>Speak with our team.</p>
                        <a href="<?php echo htmlspecialchars(phb_tel_link()); ?>" class="btn btn-primary btn-block">Call PhentiBuild</a>
                        <p class="home-contact-alt">Also reachable: <a href="<?php echo htmlspecialchars(phb_tel_link(PHONE_NUMBER_ALT)); ?>"><?php echo htmlspecialchars(PHONE_NUMBER_ALT); ?></a></p>
                    </div>

                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'email'); ?></span>
                        <h3>Email</h3>
                        <p>Send us an email.</p>
                        <a href="<?php echo htmlspecialchars(phb_mailto_link()); ?>" class="btn btn-primary btn-block">Send Email</a>
                        <p class="home-contact-alt"><?php echo htmlspecialchars(EMAIL_ADDRESS); ?></p>
                    </div>

                    <div class="home-persona">
                        <span class="home-persona-icon"><?php echo home_icon($homeIcons, 'share'); ?></span>
                        <h3>Social Media</h3>
                        <p>Follow PhentiBuild and stay updated.</p>
                        <?php if (!empty($contactSocial)): ?>
                            <div class="home-contact-social-row">
                                <?php foreach ($contactSocial as $key => $social): ?>
                                    <a href="<?php echo htmlspecialchars($social['url']); ?>" target="_blank" rel="noopener noreferrer" aria-label="PhentiBuild on <?php echo htmlspecialchars($social['label']); ?>">
                                        <?php echo home_icon($homeIcons, $social['icon']); ?>
                                    </a>
                                <?php endforeach; ?>
                            </div>
                        <?php else: ?>
                            <p class="home-contact-alt">Coming soon.</p>
                        <?php endif; ?>
                    </div>

                </div>
            </div>
        </section>

        <!-- ============================================================
             CONTACT FORM
             ============================================================ -->
        <section class="home-section home-section--muted">
            <div class="home-container">
                <div class="home-section-head is-centered home-reveal">
                    <h2>Send Us a Message</h2>
                    <p>Fill in the form below and our team will get back to you.</p>
                </div>

                <div class="home-contact-form-wrap home-reveal" data-contact-card>
                    <div class="alert alert-danger" data-form-summary hidden>
                        <span class="alert-icon">!</span>
                        <div class="alert-body">
                            <span class="alert-title" data-form-summary-title>Please check the form</span>
                            <span data-form-summary-text></span>
                        </div>
                    </div>

                    <form novalidate data-contact-form>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="cf-name">Full Name <span class="required">*</span></label>
                                <input type="text" id="cf-name" name="name" class="form-control" placeholder="e.g. Patrick Nkansah" autocomplete="name">
                                <span class="form-error" data-error-for="name" hidden></span>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="cf-email">Email Address <span class="required">*</span></label>
                                <input type="text" id="cf-email" name="email" class="form-control" placeholder="you@company.com" autocomplete="email">
                                <span class="form-error" data-error-for="email" hidden></span>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="cf-phone">Phone Number</label>
                                <input type="text" id="cf-phone" name="phone" class="form-control" placeholder="e.g. 024 123 4567" autocomplete="tel">
                                <span class="form-error" data-error-for="phone" hidden></span>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="cf-subject">Subject <span class="required">*</span></label>
                                <input type="text" id="cf-subject" name="subject" class="form-control" placeholder="What is this about?">
                                <span class="form-error" data-error-for="subject" hidden></span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="cf-message">Message <span class="required">*</span></label>
                            <textarea id="cf-message" name="message" class="form-control" rows="5" placeholder="Tell us how we can help."></textarea>
                            <span class="form-error" data-error-for="message" hidden></span>
                        </div>

                        <div class="home-contact-hp" aria-hidden="true">
                            <label for="cf-website">Leave this field empty</label>
                            <input type="text" id="cf-website" name="website" tabindex="-1" autocomplete="off">
                        </div>

                        <button type="submit" class="btn btn-primary w-full" data-form-submit style="margin-top: var(--phb-space-4);">Send Message</button>
                    </form>
                </div>
            </div>
        </section>

    </main>

    <?php require __DIR__ . '/../../backend/components/home-footer.php'; ?>

</div>

<?php require_once __DIR__ . '/../../backend/components/footer.php'; ?>
