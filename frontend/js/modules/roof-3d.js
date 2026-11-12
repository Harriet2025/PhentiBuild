/**
 * PhentiBuild (PhB) - Roof Studio 3D (page controller)
 *
 * Owns the 2D/3D view tab switch and the 3D tab's own toolbar (Reset
 * View, component toggles). The 3D scene is lazily created the first
 * time the 3D tab is opened — a WebGL context is a real resource, and
 * most sessions may never leave the 2D plan — then rebuilt from
 * PhB.roofStudioStore every time the drawing or properties change while
 * the 3D tab exists, via PhB.roof3DBuilder.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-roof-studio-module]');
    var store = window.PhB && window.PhB.roofStudioStore;
    if (!root || !store) { return; }

    var tabButtons = root.querySelectorAll('[data-rs-view-tab]');
    var panels = root.querySelectorAll('[data-rs-view-panel]');
    var canvas3d = root.querySelector('[data-rs-3d-canvas]');
    var resetViewBtn = root.querySelector('[data-rs-action="reset-view"]');
    var toggleInputs = root.querySelectorAll('[data-rs-toggle-component]');
    var unsupportedNotice = root.querySelector('[data-rs-3d-unsupported]');
    var roofTypeSelect = root.querySelector('[data-rs-prop="roofType"]');

    var viewer = null;
    var builderAvailable = !!(window.PhB && window.PhB.roof3DBuilder && window.PhB.roof3DViewer && window.THREE);

    function showView(view) {
        tabButtons.forEach(function (btn) {
            btn.classList.toggle('is-active', btn.getAttribute('data-rs-view-tab') === view);
        });
        panels.forEach(function (panel) {
            panel.hidden = panel.getAttribute('data-rs-view-panel') !== view;
        });

        if (view === '3d') {
            ensureViewer();
            rebuild();
            if (viewer) { viewer.resize(); }
        }
    }

    function ensureViewer() {
        if (viewer || !builderAvailable) { return; }
        viewer = window.PhB.roof3DViewer.init(canvas3d);
        if (viewer) {
            toggleInputs.forEach(function (input) {
                viewer.setComponentVisible(input.getAttribute('data-rs-toggle-component'), input.checked);
            });
            // Exposed for debugging/devtools access, and so tests can
            // inspect live camera state directly (see roof-studio.js,
            // which does the same for the 2D canvas engine).
            window.PhB.roof3DViewerInstance = viewer;
        }
    }

    function updateToggleAvailability(roofType) {
        var isFlat = /flat|hidden/i.test(roofType || '');
        toggleInputs.forEach(function (input) {
            var name = input.getAttribute('data-rs-toggle-component');
            var notApplicable = isFlat && (name === 'ridge' || name === 'hipStructures');
            input.disabled = notApplicable;
            input.closest('.rs-toggle-item').classList.toggle('is-disabled', notApplicable);
        });
    }

    function rebuild() {
        if (!viewer || !builderAvailable) { return; }
        var shapes = store.getShapes();
        var properties = store.getProperties();
        var built = window.PhB.roof3DBuilder.build(shapes, properties);
        if (!built) { return; }
        viewer.setModel(built);
        toggleInputs.forEach(function (input) {
            viewer.setComponentVisible(input.getAttribute('data-rs-toggle-component'), input.checked);
        });
        updateToggleAvailability(properties.roofType);
    }

    if (!builderAvailable && unsupportedNotice) {
        unsupportedNotice.hidden = false;
    }

    tabButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            showView(btn.getAttribute('data-rs-view-tab'));
        });
    });

    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', function () {
            if (viewer) { viewer.resetView(); }
        });
    }

    toggleInputs.forEach(function (input) {
        input.addEventListener('change', function () {
            if (viewer) { viewer.setComponentVisible(input.getAttribute('data-rs-toggle-component'), input.checked); }
        });
    });

    // Keep the 3D model in sync with the drawing/properties. Only the
    // active panel actually needs a fresh render, but rebuilding is cheap
    // (a handful of boxes/planes) so there is no need to track visibility.
    store.subscribe(function () {
        if (viewer) { rebuild(); }
    });

    if (roofTypeSelect) {
        roofTypeSelect.addEventListener('change', function () {
            updateToggleAvailability(roofTypeSelect.value);
        });
    }

    updateToggleAvailability(store.getProperties().roofType);
})();
