<?php
/**
 * PhentiBuild - Application Shell
 * Persistent sidebar + topbar + main content frame that every real
 * module will be mounted into. Navigation only reveals placeholder
 * panels for now — no module logic is implemented at this stage.
 */
require_once __DIR__ . '/../../backend/config/config.php';
require_once __DIR__ . '/../../backend/core/session.php';
require_once __DIR__ . '/../../backend/components/logo.php';

// Protected page: no active session, no app shell.
if (!phb_is_authenticated()) {
    header('Location: login.php');
    exit;
}

$currentUserName = $_SESSION['user_name'];
$currentUserRole = $_SESSION['user_role'];
$currentUserInitial = strtoupper(substr($currentUserName, 0, 1));

// Icon set: small inline line icons, no external icon library.
$icons = [
    'dashboard'  => '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
    'projects'   => '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z"/>',
    'scanner'    => '<path d="M4 8a1 1 0 0 1 1-1h2l1.5-2h7L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z"/><circle cx="12" cy="13" r="3.2"/>',
    'edit'       => '<path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z"/>',
    'calculator' => '<rect x="5" y="3" width="14" height="18" rx="1.5"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="8" y2="11"/><line x1="12" y1="11" x2="12" y2="11"/><line x1="16" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="16" y1="15" x2="16" y2="17.5"/><line x1="8" y1="18.5" x2="12" y2="18.5"/>',
    'materials'  => '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5L12 12l8-4.5"/><path d="M12 12v9"/>',
    'roof'       => '<path d="M3 11L12 4l9 7"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/>',
    'boq'        => '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/>',
    'reports'    => '<line x1="5" y1="20" x2="5" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="19" y1="20" x2="19" y2="15"/>',
    'history'    => '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    'settings'   => '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
    'wrench'     => '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8z"/>',
];

function phb_icon($icons, $key) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' . $icons[$key] . '</svg>';
}

// Single source of truth for navigation + placeholder panels.
$modules = [
    ['group' => 'Overview',     'id' => 'dashboard',     'label' => 'Dashboard',     'icon' => 'dashboard',  'desc' => 'Project overview, key metrics and recent activity will appear here.'],
    ['group' => 'Overview',     'id' => 'projects',      'label' => 'Projects',      'icon' => 'projects',   'desc' => 'Create, browse and manage all construction projects from one place.'],
    ['group' => 'Data Capture', 'id' => 'scanner',       'label' => 'Scanner',       'icon' => 'scanner',    'desc' => 'Use your device camera to capture site photos for computer-vision based measurement and material identification.'],
    ['group' => 'Data Capture', 'id' => 'manual-input',  'label' => 'Manual Input',  'icon' => 'edit',       'desc' => 'Enter wall, floor, roof and structural measurements manually when a scan isn\'t available.'],
    ['group' => 'Tools',        'id' => 'calculators',   'label' => 'Calculators',   'icon' => 'calculator', 'desc' => 'Block, cement, sand, aggregate, concrete, rebar and timber calculators.'],
    ['group' => 'Tools',        'id' => 'materials',     'label' => 'Materials',     'icon' => 'materials',  'desc' => 'Identify and manage building materials, quantities and unit costs.'],
    ['group' => 'Tools',        'id' => 'roof-studio',   'label' => 'Roof Studio',   'icon' => 'roof',       'desc' => 'Design roofs in 2D, visualize them in 3D, and generate AI-assisted roof layouts.'],
    ['group' => 'Documents',    'id' => 'boq',           'label' => 'BOQ',           'icon' => 'boq',        'desc' => 'Bill of Quantities compiled from your calculations and measurements.'],
    ['group' => 'Documents',    'id' => 'reports',       'label' => 'Reports',       'icon' => 'reports',    'desc' => 'Export professional reports and BOQs to Excel.'],
    ['group' => 'Documents',    'id' => 'history',       'label' => 'History',       'icon' => 'history',    'desc' => 'Project history, revisions and a full audit trail of changes.'],
];
$settingsModule = ['id' => 'settings', 'label' => 'Settings', 'icon' => 'settings', 'desc' => 'Manage your account, company profile, units of measurement and preferences.'];

$groups = [];
foreach ($modules as $m) {
    $groups[$m['group']][] = $m;
}

require_once __DIR__ . '/../../backend/components/header.php';
?>
<script src="/PhentiBuild/frontend/js/app-shell.js" defer></script>
<script src="/PhentiBuild/frontend/js/toast.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/auth.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/projects-store.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/projects.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/project-form.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/project-detail.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/measurements-store.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/vision-service.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/scanner.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/calculations-store.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/masonry-calcs.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/plaster-calcs.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/concrete-calcs.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/rebar-calcs.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/timber-calcs.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/roofing-calcs.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/manual-input.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/materials-store.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/materials.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/materials-form.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/boq-store.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/calculators.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/settings.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/boq.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/boq-form.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/roof-geometry.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/roof-studio-store.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/roof-studio-canvas.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/roof-studio.js" defer></script>
<script src="/PhentiBuild/frontend/vendor/three/three.min.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/roof-3d-builder.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/roof-3d-viewer.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/roof-3d.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/roof-ai-service.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/roof-ai.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/history.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/reports.js" defer></script>
<script src="/PhentiBuild/frontend/js/modules/dashboard.js" defer></script>

<div class="shell">

    <div class="shell-overlay" data-shell-overlay></div>

    <aside class="shell-sidebar" data-shell-sidebar>
        <div class="shell-sidebar-header">
            <div class="shell-brand">
                <?php echo phb_logo_mark('brand-logo', 48); ?>
                <span>PhentiBuild</span>
            </div>
            <button class="shell-sidebar-close" data-shell-close aria-label="Close navigation">&times;</button>
        </div>

        <nav class="shell-nav">
            <?php foreach ($groups as $groupName => $items): ?>
                <span class="sidebar-section-label"><?php echo htmlspecialchars($groupName); ?></span>
                <?php foreach ($items as $m): ?>
                    <a href="#<?php echo $m['id']; ?>"
                       class="sidebar-link<?php echo $m['id'] === 'dashboard' ? ' is-active' : ''; ?>"
                       data-module="<?php echo $m['id']; ?>"
                       data-module-label="<?php echo htmlspecialchars($m['label']); ?>">
                        <span class="icon"><?php echo phb_icon($icons, $m['icon']); ?></span>
                        <?php echo htmlspecialchars($m['label']); ?>
                    </a>
                <?php endforeach; ?>
            <?php endforeach; ?>
        </nav>

        <div class="shell-sidebar-footer">
            <a href="#<?php echo $settingsModule['id']; ?>"
               class="sidebar-link"
               data-module="<?php echo $settingsModule['id']; ?>"
               data-module-label="<?php echo htmlspecialchars($settingsModule['label']); ?>">
                <span class="icon"><?php echo phb_icon($icons, $settingsModule['icon']); ?></span>
                <?php echo htmlspecialchars($settingsModule['label']); ?>
            </a>
        </div>
    </aside>

    <div class="shell-content">
        <header class="topbar shell-topbar">
            <div class="shell-topbar-left">
                <button class="sidebar-toggle" data-shell-toggle aria-label="Open navigation">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
                <h1 class="shell-page-title hide-mobile" data-shell-page-title>Dashboard</h1>
            </div>

            <div class="shell-mode-switch" role="group" aria-label="Data capture mode">
                <a href="#scanner" class="shell-mode-btn" data-module="scanner" data-module-label="Scanner">
                    <?php echo phb_icon($icons, 'scanner'); ?>
                    <span class="shell-mode-btn-label">Camera Scanner</span>
                </a>
                <a href="#manual-input" class="shell-mode-btn" data-module="manual-input" data-module-label="Manual Input">
                    <?php echo phb_icon($icons, 'edit'); ?>
                    <span class="shell-mode-btn-label">Manual Input</span>
                </a>
            </div>

            <div class="shell-topbar-search hide-mobile">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="search" placeholder="Search projects, materials, BOQ items&hellip;">
            </div>

            <div class="shell-topbar-actions">
                <div class="shell-dropdown">
                    <button class="shell-icon-btn" data-dropdown-toggle="notificationsPanel" aria-label="Notifications">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>
                    </button>
                    <div class="shell-dropdown-panel" id="notificationsPanel">
                        <div class="shell-dropdown-header">Notifications</div>
                        <div class="shell-dropdown-empty">You're all caught up. Notifications will appear here once available.</div>
                    </div>
                </div>

                <div class="shell-dropdown">
                    <button class="shell-icon-btn shell-user-btn" data-dropdown-toggle="profilePanel">
                        <span class="shell-avatar"><?php echo htmlspecialchars($currentUserInitial); ?></span>
                        <span class="shell-user-meta hide-mobile">
                            <span class="shell-user-name"><?php echo htmlspecialchars($currentUserName); ?></span>
                            <span class="shell-user-role"><?php echo htmlspecialchars($currentUserRole); ?></span>
                        </span>
                    </button>
                    <div class="shell-dropdown-panel" id="profilePanel">
                        <div class="shell-dropdown-header">Account</div>
                        <a class="shell-dropdown-item" href="#settings" data-module="settings">Profile Settings</a>
                        <a class="shell-dropdown-item" href="#" data-logout>Log Out</a>
                    </div>
                </div>
            </div>
        </header>

        <main class="shell-main">
            <?php foreach ($modules as $m): ?>
                <?php $modulePath = __DIR__ . '/modules/' . $m['id'] . '.php'; ?>
                <section class="module-panel" data-module-panel="<?php echo $m['id']; ?>" <?php echo $m['id'] === 'dashboard' ? '' : 'hidden'; ?>>
                    <?php if (file_exists($modulePath)): ?>
                        <?php include $modulePath; ?>
                    <?php else: ?>
                        <span class="eyebrow"><?php echo htmlspecialchars($m['group']); ?></span>
                        <h1><?php echo htmlspecialchars($m['label']); ?></h1>
                        <p class="text-secondary"><?php echo htmlspecialchars($m['desc']); ?></p>
                        <div class="module-placeholder">
                            <span class="placeholder-icon"><?php echo phb_icon($icons, 'wrench'); ?></span>
                            <h3><?php echo htmlspecialchars($m['label']); ?> is not built yet</h3>
                            <p>This module will be implemented in an upcoming stage of the PhentiBuild build.</p>
                        </div>
                    <?php endif; ?>
                </section>
            <?php endforeach; ?>

            <?php $settingsModulePath = __DIR__ . '/modules/' . $settingsModule['id'] . '.php'; ?>
            <section class="module-panel" data-module-panel="<?php echo $settingsModule['id']; ?>" hidden>
                <?php if (file_exists($settingsModulePath)): ?>
                    <?php include $settingsModulePath; ?>
                <?php else: ?>
                    <span class="eyebrow">Account</span>
                    <h1><?php echo htmlspecialchars($settingsModule['label']); ?></h1>
                    <p class="text-secondary"><?php echo htmlspecialchars($settingsModule['desc']); ?></p>
                    <div class="module-placeholder">
                        <span class="placeholder-icon"><?php echo phb_icon($icons, 'wrench'); ?></span>
                        <h3>Settings is not built yet</h3>
                        <p>This module will be implemented in an upcoming stage of the PhentiBuild build.</p>
                    </div>
                <?php endif; ?>
            </section>
        </main>
    </div>
</div>

<?php require_once __DIR__ . '/../../backend/components/footer.php'; ?>
