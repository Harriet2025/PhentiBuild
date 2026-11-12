<?php
/**
 * PhentiBuild - Login
 * Already-authenticated visitors are sent straight to the app rather
 * than shown a login form they don't need.
 */
require_once __DIR__ . '/../../backend/config/config.php';
require_once __DIR__ . '/../../backend/core/session.php';
require_once __DIR__ . '/../../backend/components/logo.php';

if (phb_is_authenticated()) {
    header('Location: app.php');
    exit;
}

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

        <div class="auth-card auth-card--login">
            <?php
            $authHeroEyebrow = 'Welcome back to';
            $authHeroTitleHtml = 'Phenti<span class="accent">Build</span>';
            $authHeroLead = 'Your all-in-one construction estimation & management platform.';
            require __DIR__ . '/../../backend/components/auth-hero.php';
            ?>

            <div class="auth-form-pane">
                <div class="auth-form-float">
                    <div class="auth-form-heading">
                        <h1>Log in to your account</h1>
                        <p>Enter your credentials to continue.</p>
                    </div>

                    <?php if (isset($_GET['registered'])): ?>
                        <div class="alert alert-success">
                            <span class="alert-icon">&check;</span>
                            <div class="alert-body">
                                <span class="alert-title">Account created</span>
                                <span>Log in with your new account to continue.</span>
                            </div>
                        </div>
                    <?php endif; ?>

                    <div class="alert alert-danger" data-form-summary hidden>
                        <span class="alert-icon">!</span>
                        <div class="alert-body">
                            <span class="alert-title" data-form-summary-title>Couldn&rsquo;t log you in</span>
                            <span data-form-summary-text></span>
                        </div>
                    </div>

                    <form novalidate data-login-form>
                        <div class="form-group">
                            <label class="form-label" for="lf-email">Email <span class="required">*</span></label>
                            <input type="text" id="lf-email" name="email" class="form-control" placeholder="you@company.com" autocomplete="username">
                            <span class="form-error" data-error-for="email" hidden></span>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="lf-password">Password <span class="required">*</span></label>
                            <input type="password" id="lf-password" name="password" class="form-control" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" autocomplete="current-password">
                            <span class="form-error" data-error-for="password" hidden></span>
                        </div>

                        <div class="auth-form-options">
                            <div class="form-check">
                                <input type="checkbox" id="lf-remember" name="remember">
                                <label for="lf-remember">Remember me</label>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary w-full" data-form-submit>Log In</button>
                    </form>

                    <p class="auth-footer-note">Don&rsquo;t have an account? <a href="register.php">Create one</a></p>
                </div>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../../backend/components/footer.php'; ?>
