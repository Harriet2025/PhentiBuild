<?php
/**
 * PhentiBuild - Auth Hero Panel
 * Shared branding/feature panel for the login and register screens.
 * Caller sets $authHeroEyebrow / $authHeroTitleHtml / $authHeroLead
 * before including this file (all optional — sane defaults below).
 */
$authHeroEyebrow = $authHeroEyebrow ?? 'Welcome to';
$authHeroTitleHtml = $authHeroTitleHtml ?? 'Phenti<span class="accent">Build</span>';
$authHeroLead = $authHeroLead ?? 'Your all-in-one construction estimation & management platform.';
?>
<aside class="auth-hero-pane">
    <div class="auth-hero-overlay"></div>

    <div class="auth-hero-content">
        <div class="auth-hero-brand">
            <?php echo phb_logo_mark('auth-hero-logo', 40); ?>
            <span>PhentiBuild</span>
        </div>

        <p class="auth-hero-eyebrow"><?php echo htmlspecialchars($authHeroEyebrow); ?></p>
        <h1 class="auth-hero-title"><?php echo $authHeroTitleHtml; ?></h1>
        <p class="auth-hero-lead"><?php echo htmlspecialchars($authHeroLead); ?></p>

        <ul class="auth-feature-list">
            <li>
                <span class="auth-feature-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 16 16 4l4 4L8 20H4v-4z"></path>
                        <path d="M13 7l4 4"></path>
                        <path d="M9 11l1.5 1.5"></path>
                        <path d="M6.5 13.5 8 15"></path>
                    </svg>
                </span>
                <span class="auth-feature-text">
                    <strong>Smart Estimation</strong>
                    Accurate calculations for materials, labor &amp; costs.
                </span>
            </li>
            <li>
                <span class="auth-feature-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="5" y="3" width="14" height="18" rx="2"></rect>
                        <path d="M9 3h6v3H9z"></path>
                        <path d="M8 12.5 10.5 15 16 9.5"></path>
                    </svg>
                </span>
                <span class="auth-feature-text">
                    <strong>Project Management</strong>
                    Organize, track and manage all your construction projects.
                </span>
            </li>
            <li>
                <span class="auth-feature-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="4" y1="20" x2="20" y2="20"></line>
                        <rect x="6" y="12" width="3.2" height="8"></rect>
                        <rect x="11" y="7" width="3.2" height="13"></rect>
                        <rect x="16" y="3" width="3.2" height="17"></rect>
                    </svg>
                </span>
                <span class="auth-feature-text">
                    <strong>Real-Time Reports</strong>
                    Get real-time insights &amp; professional reports.
                </span>
            </li>
        </ul>

        <div class="auth-feature-row" aria-hidden="true">
            <span class="auth-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 16 16 4l4 4L8 20H4v-4z"></path>
                    <path d="M13 7l4 4"></path>
                </svg>
            </span>
            <span class="auth-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="5" y="3" width="14" height="18" rx="2"></rect>
                    <path d="M9 3h6v3H9z"></path>
                    <path d="M8 12.5 10.5 15 16 9.5"></path>
                </svg>
            </span>
            <span class="auth-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="4" y1="20" x2="20" y2="20"></line>
                    <rect x="6" y="12" width="3.2" height="8"></rect>
                    <rect x="11" y="7" width="3.2" height="13"></rect>
                    <rect x="16" y="3" width="3.2" height="17"></rect>
                </svg>
            </span>
        </div>
    </div>
</aside>
