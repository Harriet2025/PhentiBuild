/**
 * PhentiBuild (PhB) - Application Shell Controller
 *
 * Handles shell chrome only: mobile/tablet sidebar drawer, module
 * switching between placeholder panels, and header dropdowns.
 * No module contains real logic yet — each nav item just reveals its
 * placeholder panel. Real modules will replace this switching logic
 * with actual page/component loading in later stages.
 */
(function () {
    'use strict';

    var DESKTOP_BREAKPOINT = 1024;
    var DEFAULT_MODULE = 'dashboard';

    var sidebar = document.querySelector('[data-shell-sidebar]');
    var overlay = document.querySelector('[data-shell-overlay]');
    var toggleButtons = document.querySelectorAll('[data-shell-toggle]');
    var closeButtons = document.querySelectorAll('[data-shell-close]');
    var navLinks = document.querySelectorAll('[data-module]');
    var panels = document.querySelectorAll('[data-module-panel]');
    var pageTitle = document.querySelector('[data-shell-page-title]');
    var dropdownToggles = document.querySelectorAll('[data-dropdown-toggle]');

    /* ---------- Mobile / tablet sidebar drawer ---------- */

    function openSidebar() {
        sidebar.classList.add('is-open');
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('is-open');
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    toggleButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (sidebar.classList.contains('is-open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    });

    closeButtons.forEach(function (btn) {
        btn.addEventListener('click', closeSidebar);
    });

    overlay.addEventListener('click', closeSidebar);

    window.addEventListener('resize', function () {
        if (window.innerWidth >= DESKTOP_BREAKPOINT) {
            closeSidebar();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeSidebar();
            closeAllDropdowns();
        }
    });

    /* ---------- Module switching ---------- */

    /* Hashes may carry a sub-route, e.g. "#projects/PHB-2401". The shell only
       cares about the first segment; the module itself interprets the rest. */
    function moduleIdFromHash(hash) {
        return hash.replace('#', '').split('/')[0];
    }

    function activateModule(moduleId, updateHash) {
        var targetPanel = document.querySelector('[data-module-panel="' + moduleId + '"]');
        if (!targetPanel) {
            moduleId = DEFAULT_MODULE;
            targetPanel = document.querySelector('[data-module-panel="' + moduleId + '"]');
        }

        panels.forEach(function (panel) {
            panel.hidden = panel !== targetPanel;
        });

        navLinks.forEach(function (link) {
            link.classList.toggle('is-active', link.getAttribute('data-module') === moduleId);
        });

        var activeLink = document.querySelector('[data-module="' + moduleId + '"]');
        var label = activeLink ? activeLink.getAttribute('data-module-label') : 'Dashboard';

        if (pageTitle) {
            pageTitle.textContent = label;
        }
        document.title = label + ' · PhentiBuild';

        if (updateHash !== false) {
            history.replaceState(null, '', '#' + moduleId);
        }

        if (window.innerWidth < DESKTOP_BREAKPOINT) {
            closeSidebar();
        }
    }

    navLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            activateModule(link.getAttribute('data-module'));
        });
    });

    window.addEventListener('hashchange', function () {
        activateModule(moduleIdFromHash(window.location.hash), false);
    });

    /* ---------- Header dropdowns (notifications / user menu) ---------- */

    function closeAllDropdowns(except) {
        dropdownToggles.forEach(function (btn) {
            var panel = document.getElementById(btn.getAttribute('data-dropdown-toggle'));
            if (panel && panel !== except) {
                panel.classList.remove('is-open');
            }
        });
    }

    dropdownToggles.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var panel = document.getElementById(btn.getAttribute('data-dropdown-toggle'));
            if (!panel) { return; }
            var isOpen = panel.classList.contains('is-open');
            closeAllDropdowns();
            panel.classList.toggle('is-open', !isOpen);
        });
    });

    document.addEventListener('click', function () {
        closeAllDropdowns();
    });

    /* ---------- Initial state ---------- */

    var initialModule = window.location.hash ? moduleIdFromHash(window.location.hash) : DEFAULT_MODULE;
    activateModule(initialModule, false);
})();
