<?php
/**
 * PhentiBuild - Public Site Footer
 * Shared by every public marketing page. Requires backend/components/
 * logo.php (phb_logo_mark()) and backend/config/contact.php (contact
 * constants, phb_whatsapp_link()/phb_tel_link()/phb_mailto_link(),
 * phb_social_links()) to already be loaded by the including page.
 */
require_once __DIR__ . '/../config/contact.php';
$homeFooterSocial = phb_social_links();
?>
<footer class="home-footer">
    <div class="home-container">
        <div class="home-footer-top">
            <div>
                <div class="home-footer-brand">
                    <?php echo phb_logo_mark('', 32); ?>
                    Phenti<span class="accent">Build</span>
                </div>
                <p class="home-footer-tagline">Construction planning, measurement and estimation — brought together.</p>
            </div>
            <nav class="home-footer-nav" aria-label="Footer">
                <a href="home.php">Home</a>
                <a href="features.php">Features</a>
                <a href="how-it-works.php">How It Works</a>
                <a href="vision.php">Vision</a>
                <a href="contact.php">Contact</a>
                <a href="login.php">Sign In</a>
                <a href="register.php">Register</a>
            </nav>
            <div class="home-footer-contact">
                <p class="home-footer-contact-title">Contact PhentiBuild</p>
                <ul class="home-footer-contact-list">
                    <li>
                        <a href="<?php echo htmlspecialchars(phb_whatsapp_link()); ?>" target="_blank" rel="noopener noreferrer">
                            <?php echo home_icon($homeIcons, 'whatsapp'); ?> WhatsApp
                        </a>
                    </li>
                    <li>
                        <a href="<?php echo htmlspecialchars(phb_tel_link()); ?>">
                            <?php echo home_icon($homeIcons, 'phone'); ?> <?php echo htmlspecialchars(PHONE_NUMBER); ?>
                        </a>
                    </li>
                    <li>
                        <a href="<?php echo htmlspecialchars(phb_mailto_link()); ?>">
                            <?php echo home_icon($homeIcons, 'email'); ?> <?php echo htmlspecialchars(EMAIL_ADDRESS); ?>
                        </a>
                    </li>
                </ul>
                <?php if (!empty($homeFooterSocial)): ?>
                    <div class="home-footer-social">
                        <?php foreach ($homeFooterSocial as $key => $social): ?>
                            <a href="<?php echo htmlspecialchars($social['url']); ?>" target="_blank" rel="noopener noreferrer" aria-label="PhentiBuild on <?php echo htmlspecialchars($social['label']); ?>">
                                <?php echo home_icon($homeIcons, $social['icon']); ?>
                            </a>
                        <?php endforeach; ?>
                    </div>
                <?php else: ?>
                    <p class="home-footer-social-empty">Social media coming soon.</p>
                <?php endif; ?>
            </div>
        </div>
        <p class="home-footer-bottom">&copy; 2026 PhentiBuild. All rights reserved.</p>
    </div>
</footer>
