<?php
/**
 * PhentiBuild - Homepage Contact CTA
 * A lighter companion to home-cta.php, pointing specifically at the
 * dedicated Contact page and a direct WhatsApp chat. Included only on
 * home.php, immediately before the footer. Requires backend/config/
 * contact.php (phb_whatsapp_link()) to already be loaded by the
 * including page.
 */
?>
<section class="home-section home-section--light">
    <div class="home-container">
        <div class="home-section-head is-centered home-reveal">
            <h2>Have Questions About PhentiBuild?</h2>
            <p>Our team is here to help you understand how PhentiBuild can support your construction workflow.</p>
        </div>
        <div class="home-cta-actions home-reveal">
            <a href="contact.php" class="btn btn-primary btn-lg">Contact Us</a>
            <a href="<?php echo htmlspecialchars(phb_whatsapp_link()); ?>" class="btn btn-outline btn-lg" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
        </div>
    </div>
</section>
