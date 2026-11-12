<?php
/**
 * PhentiBuild - Public Site Icon Set
 *
 * Shared by home.php and the other public marketing pages
 * (features.php, how-it-works.php, vision.php). Same visual language as
 * the app shell's own icon set (frontend/pages/app.php) — kept separate
 * since the public site is a standalone entry point, not part of the
 * authenticated app shell.
 */
$homeIcons = [
    'scanner'   => '<path d="M4 8a1 1 0 0 1 1-1h2l1.5-2h7L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z"/><circle cx="12" cy="13" r="3.2"/>',
    'edit'      => '<path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z"/>',
    'materials' => '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5L12 12l8-4.5"/><path d="M12 12v9"/>',
    'layers'    => '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    'calculator'=> '<rect x="5" y="3" width="14" height="18" rx="1.5"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="16" y1="15" x2="16" y2="17.5"/>',
    'rebar'     => '<rect x="3" y="7" width="18" height="10" rx="1"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/>',
    'timber'    => '<rect x="3" y="6" width="18" height="5" rx="1"/><rect x="3" y="13" width="18" height="5" rx="1"/><line x1="8" y1="6" x2="8" y2="11"/><line x1="16" y1="13" x2="16" y2="18"/>',
    'roof'      => '<path d="M3 11L12 4l9 7"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/>',
    'cube3d'    => '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    'boq'       => '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/>',
    'reports'   => '<line x1="5" y1="20" x2="5" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="19" y1="20" x2="19" y2="15"/>',
    'ruler'     => '<path d="M3 17L17 3l4 4L7 21z"/><path d="M14 6l2 2M10.5 9.5l2 2M7 13l2 2"/>',
    'docCheck'  => '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M9 13l2 2 4-4"/>',
    'check'     => '<polyline points="5 13 9 17 19 7"/>',
    'close'     => '<line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>',
    'menu'      => '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    'chevronDown' => '<polyline points="6 9 12 15 18 9"/>',
    'arrowRight'  => '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    'hardhat'   => '<path d="M4 15.5a8 8 0 0 1 16 0z"/><path d="M2 15.5h20"/><path d="M12 6v3.5"/>',
    'wrench'    => '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8z"/>',
    'clipboard' => '<rect x="6" y="4" width="12" height="16" rx="1"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/>',
    'tsquare'   => '<path d="M5 4v16h4V9h11V4z"/>',
    'graduation'=> '<path d="M12 3L2 8l10 5 10-5-10-5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    'whatsapp'  => '<path d="M4 20l1.4-4.1A8 8 0 1 1 9 18.8L4 20z"/><path d="M9 9.6c0-.6.4-1.1 1-1.1h1c.5 3 2.5 5 5.5 5.5v1c0 .6-.5 1-1 1-3 0-6.5-3-6.5-6.4z"/>',
    'phone'     => '<path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.2c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2 2.2z"/>',
    'email'     => '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 6.5l9 6.5 9-6.5"/>',
    'share'     => '<circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/><line x1="8" y1="10.8" x2="16" y2="7.2"/><line x1="8" y1="13.2" x2="16" y2="16.8"/>',
    'facebook'  => '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M14 9.5h-1.5c-.6 0-1 .4-1 1V12h2.3l-.3 2.5h-2V20h-2.5v-5.5H9V12h1.5v-1.8c0-1.5 1-2.7 2.5-2.7H14v2z"/>',
    'instagram' => '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="16.2" cy="7.8" r="0.6" fill="currentColor" stroke="none"/>',
    'tiktok'    => '<path d="M13 4v10.2a3 3 0 1 1-2-2.8"/><path d="M13 4c.3 2 1.8 3.5 4 3.8"/>',
    'linkedin'  => '<rect x="4" y="4" width="16" height="16" rx="3"/><line x1="8" y1="10" x2="8" y2="16"/><circle cx="8" cy="7.2" r="0.6" fill="currentColor" stroke="none"/><path d="M11.5 16v-3.5c0-1.2.8-2 2-2s2 .8 2 2V16"/><line x1="11.5" y1="10" x2="11.5" y2="16"/>',
    'x'         => '<rect x="4" y="4" width="16" height="16" rx="4"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/><line x1="15.5" y1="8.5" x2="8.5" y2="15.5"/>',
];

if (!function_exists('home_icon')) {
    function home_icon($icons, $key, $extraClass = '') {
        $cls = trim('home-icon-svg ' . $extraClass);
        return '<svg class="' . htmlspecialchars($cls) . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
             . $icons[$key] . '</svg>';
    }
}
