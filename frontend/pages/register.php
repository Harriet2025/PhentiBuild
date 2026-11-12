<?php
/**
 * PhentiBuild - Register
 */
require_once __DIR__ . '/../../backend/config/config.php';
require_once __DIR__ . '/../../backend/core/session.php';
require_once __DIR__ . '/../../backend/components/logo.php';

if (phb_is_authenticated()) {
    header('Location: app.php');
    exit;
}

$roles = ['User', 'Contractor', 'Site Manager', 'Quantity Surveyor', 'Draftsman', 'Admin'];

require_once __DIR__ . '/../../backend/components/header.php';
?>
<script src="/PhentiBuild/frontend/js/toast.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/auth.js" defer></script>

<div class="auth-page">
    <div class="auth-page-inner">
        <div class="auth-brand-header">
            <div class="auth-brand-logo-row">
                <?php echo phb_logo_mark('', 56); ?>
                <span class="auth-brand-wordmark">Phenti<span class="accent">Build</span></span>
            </div>
            <p class="auth-brand-tagline">Build Smart, Estimate Accurately</p>
        </div>

        <div class="auth-card auth-card--register">
            <div class="auth-form-toolbar">
                <div class="auth-form-heading">
                    <h1><span class="accent">Create</span> your account</h1>
                    <p>Join PhentiBuild and start building smarter.</p>
                </div>
                <div class="auth-switch-pill">
                    Already have an account? <a href="login.php">Log in</a>
                </div>
            </div>

            <div class="alert alert-danger" data-form-summary hidden>
                <span class="alert-icon">!</span>
                <div class="alert-body">
                    <span class="alert-title" data-form-summary-title>Please check the form</span>
                    <span data-form-summary-text></span>
                </div>
            </div>

            <form novalidate data-register-form>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="rf-name">Full Name <span class="required">*</span></label>
                        <input type="text" id="rf-name" name="name" class="form-control" placeholder="e.g. Patrick Nkansah" autocomplete="name">
                        <span class="form-error" data-error-for="name" hidden></span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="rf-email">Email Address <span class="required">*</span></label>
                        <input type="text" id="rf-email" name="email" class="form-control" placeholder="you@company.com" autocomplete="email">
                        <span class="form-error" data-error-for="email" hidden></span>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="rf-phone">Phone Number <span class="required">*</span></label>
                        <input type="text" id="rf-phone" name="phone" class="form-control" placeholder="e.g. 024 123 4567" autocomplete="tel">
                        <span class="form-error" data-error-for="phone" hidden></span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="rf-role">Role / Account Type <span class="required">*</span></label>
                        <select id="rf-role" name="role" class="form-control">
                            <option value="" disabled selected>Select your role</option>
                            <?php foreach ($roles as $r): ?>
                                <option value="<?php echo htmlspecialchars($r); ?>"><?php echo htmlspecialchars($r); ?></option>
                            <?php endforeach; ?>
                        </select>
                        <span class="form-error" data-error-for="role" hidden></span>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="rf-password">Password <span class="required">*</span></label>
                        <input type="password" id="rf-password" name="password" class="form-control" placeholder="At least 8 characters" autocomplete="new-password">
                        <span class="form-error" data-error-for="password" hidden></span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="rf-confirm">Confirm Password <span class="required">*</span></label>
                        <input type="password" id="rf-confirm" name="confirmPassword" class="form-control" placeholder="Re-enter your password" autocomplete="new-password">
                        <span class="form-error" data-error-for="confirmPassword" hidden></span>
                    </div>
                </div>

                <div class="auth-security-note">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"></path>
                        <path d="M9 12l2 2 4-4"></path>
                    </svg>
                    <div>
                        <strong>Your security is our priority</strong>
                        <span>Passwords are encrypted end-to-end — we never store or see your plain-text password.</span>
                    </div>
                </div>

                <div class="form-check auth-terms-check">
                    <input type="checkbox" id="rf-terms" name="acceptTerms">
                    <label for="rf-terms">I agree to the <a href="#">Terms &amp; Conditions</a> and <a href="#">Privacy Policy</a></label>
                </div>
                <span class="form-error" data-error-for="acceptTerms" hidden></span>

                <button type="submit" class="btn btn-primary w-full" data-form-submit style="margin-top: var(--phb-space-5);">Create Account</button>
            </form>
        </div>

        <p class="auth-footer-note">Already have an account? <a href="login.php">Log in</a></p>
    </div>
</div>

<?php require_once __DIR__ . '/../../backend/components/footer.php'; ?>
