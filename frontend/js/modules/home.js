/**
 * PhentiBuild (PhB) - Public Homepage Interactions
 *
 * Marketing-page behaviour only: sticky-nav scroll state, the mobile
 * menu, smooth in-page scrolling, a scroll-reveal effect, and the
 * Camera/Manual preview toggle in the "Measure Your Way" section (a
 * static visual demonstration — it does not access the camera or call
 * any backend; the real camera flow lives in the authenticated app's
 * Scanner module).
 */
(function () {
    'use strict';

    var nav = document.querySelector('[data-home-nav]');
    if (!nav) { return; } // not on the homepage

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------------------------------------------------------
       Sticky nav scroll state
       --------------------------------------------------------------- */
    function updateNavScrollState() {
        nav.classList.toggle('is-scrolled', window.scrollY > 12);
    }
    updateNavScrollState();
    window.addEventListener('scroll', updateNavScrollState, { passive: true });

    /* ---------------------------------------------------------------
       Mobile menu
       --------------------------------------------------------------- */
    var menuToggle = document.querySelector('[data-home-menu-toggle]');
    var mobileMenu = document.querySelector('[data-home-mobile-menu]');

    function closeMobileMenu() {
        if (!mobileMenu) { return; }
        mobileMenu.classList.remove('is-open');
        menuToggle.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
    }

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function () {
            var isOpen = mobileMenu.classList.toggle('is-open');
            menuToggle.classList.toggle('is-open', isOpen);
            menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        mobileMenu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeMobileMenu);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { closeMobileMenu(); }
        });
    }

    /* ---------------------------------------------------------------
       Smooth in-page scrolling for same-page hash links
       --------------------------------------------------------------- */
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var targetId = link.getAttribute('href').slice(1);
            var target = targetId ? document.getElementById(targetId) : null;
            if (!target) { return; } // no matching id on this page — let default happen
            e.preventDefault();
            target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            closeMobileMenu();
        });
    });

    /* ---------------------------------------------------------------
       Scroll-reveal
       --------------------------------------------------------------- */
    var revealEls = document.querySelectorAll('.home-reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
        revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        revealEls.forEach(function (el) { observer.observe(el); });
    }

    /* ---------------------------------------------------------------
       "Measure Your Way" camera/manual preview toggle — visual only.
       --------------------------------------------------------------- */
    var modeToggle = document.querySelector('[data-home-mode-toggle]');
    if (modeToggle) {
        var modeButtons = modeToggle.querySelectorAll('[data-home-mode-btn]');
        var modePanels = document.querySelectorAll('[data-home-mode-panel]');

        modeButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var mode = btn.getAttribute('data-home-mode-btn');

                modeButtons.forEach(function (b) {
                    var active = b === btn;
                    b.classList.toggle('is-active', active);
                    b.setAttribute('aria-selected', active ? 'true' : 'false');
                });
                modePanels.forEach(function (panel) {
                    panel.classList.toggle('is-active', panel.getAttribute('data-home-mode-panel') === mode);
                });
            });
        });
    }
})();
