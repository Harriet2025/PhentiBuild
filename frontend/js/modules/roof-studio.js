/**
 * PhentiBuild (PhB) - Roof Studio (page controller)
 *
 * Wires the toolbar, properties panel and status bar to
 * PhB.roofStudioCanvas (the drawing engine) and PhB.roofStudioStore (data
 * + undo/redo). Also populates the Roofing Material dropdown from the
 * Materials Catalog so the two modules share one list of roofing products
 * instead of keeping a second copy here.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-roof-studio-module]');
    var store = window.PhB && window.PhB.roofStudioStore;
    var engineFactory = window.PhB && window.PhB.roofStudioCanvas;
    if (!root || !store || !engineFactory) { return; }

    var canvas = root.querySelector('[data-rs-canvas]');
    var toolButtons = root.querySelectorAll('[data-rs-tool]');
    var deleteBtn = root.querySelector('[data-rs-action="delete"]');
    var undoBtn = root.querySelector('[data-rs-action="undo"]');
    var redoBtn = root.querySelector('[data-rs-action="redo"]');
    var zoomInBtn = root.querySelector('[data-rs-action="zoom-in"]');
    var zoomOutBtn = root.querySelector('[data-rs-action="zoom-out"]');
    var zoomFitBtn = root.querySelector('[data-rs-action="zoom-fit"]');
    var clearBtn = root.querySelector('[data-rs-action="clear"]');
    var snapToggle = root.querySelector('[data-rs-snap-toggle]');
    var zoomReadout = root.querySelector('[data-rs-zoom-readout]');
    var shapeCountEl = root.querySelector('[data-rs-shape-count]');
    var saveStatusEl = root.querySelector('[data-rs-save-status]');
    var hintEl = root.querySelector('[data-rs-hint]');
    var statusTool = root.querySelector('[data-rs-status-tool]');
    var statusCoords = root.querySelector('[data-rs-status-coords]');
    var statusSelection = root.querySelector('[data-rs-status-selection]');
    var materialSelect = root.querySelector('[data-rs-material-select]');

    var TOOL_LABELS = {
        select: 'Select', line: 'Line', rectangle: 'Rectangle', polygon: 'Polygon', pan: 'Pan'
    };

    var FALLBACK_ROOFING_MATERIALS = [
        'IBR Long Span Roofing Sheet', 'Self-Lock Long Span Roofing Sheet',
        'Eurotile Roofing Sheet', 'Milano Roof Tile', 'Asphalt Shingles'
    ];

    /* ---------------------------------------------------------------
       Roofing Material select — sourced from the Materials Catalog so
       the two modules never drift out of sync.
       --------------------------------------------------------------- */
    async function populateMaterialSelect(selectedValue) {
        if (!materialSelect) { return; }

        var names = [];
        if (window.PhB && window.PhB.materialsStore) {
            var result = await window.PhB.materialsStore.getAll();
            if (result.ok) {
                names = result.materials
                    .filter(function (m) { return m.category === 'Roofing'; })
                    .map(function (m) { return m.name; });
            }
        }
        if (!names.length) { names = FALLBACK_ROOFING_MATERIALS; }

        materialSelect.innerHTML = '<option value="">Select a roofing material&hellip;</option>' +
            names.map(function (name) {
                var selected = name === selectedValue ? ' selected' : '';
                return '<option value="' + name.replace(/"/g, '&quot;') + '"' + selected + '>' + name + '</option>';
            }).join('');
    }

    /* ---------------------------------------------------------------
       Properties panel
       --------------------------------------------------------------- */
    function loadProperties() {
        var props = store.getProperties();
        root.querySelectorAll('[data-rs-prop]').forEach(function (input) {
            var key = input.getAttribute('data-rs-prop');
            if (key === 'roofingMaterial') { return; } // handled by populateMaterialSelect
            input.value = props[key] || '';
        });
        populateMaterialSelect(props.roofingMaterial);
    }

    var saveFlashTimer = null;
    function flashSaved() {
        if (!saveStatusEl) { return; }
        saveStatusEl.textContent = 'Saved';
        saveStatusEl.classList.add('is-flash');
        clearTimeout(saveFlashTimer);
        saveFlashTimer = setTimeout(function () { saveStatusEl.classList.remove('is-flash'); }, 600);
    }

    root.querySelectorAll('[data-rs-prop]').forEach(function (input) {
        var key = input.getAttribute('data-rs-prop');
        var eventName = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(eventName, function () {
            store.setProperty(key, input.value);
            flashSaved();
        });
    });

    /* ---------------------------------------------------------------
       Canvas engine
       --------------------------------------------------------------- */
    var engine = engineFactory.init(canvas, {
        onStatusChange: function (status) {
            toolButtons.forEach(function (btn) {
                btn.classList.toggle('is-active', btn.getAttribute('data-rs-tool') === status.tool);
            });

            if (zoomReadout) { zoomReadout.textContent = Math.round(status.zoom * 100) + '%'; }
            if (shapeCountEl) { shapeCountEl.textContent = status.shapeCount + (status.shapeCount === 1 ? ' shape' : ' shapes'); }
            if (statusTool) { statusTool.textContent = TOOL_LABELS[status.tool] || status.tool; }
            if (statusCoords && status.cursorWorld) {
                statusCoords.textContent = 'x: ' + status.cursorWorld.x.toFixed(2) + ' m, y: ' + status.cursorWorld.y.toFixed(2) + ' m';
            }
            if (statusSelection) {
                statusSelection.textContent = status.selectedShapeId ? 'Selected: ' + status.selectedShapeId : 'No selection';
            }
            if (deleteBtn) { deleteBtn.disabled = !status.selectedShapeId; }
            if (undoBtn) { undoBtn.disabled = !status.canUndo; }
            if (redoBtn) { redoBtn.disabled = !status.canRedo; }
            if (snapToggle) { snapToggle.checked = status.snapEnabled; }

            if (hintEl) {
                hintEl.hidden = !status.isDrawingPolygon;
                if (status.isDrawingPolygon) {
                    hintEl.textContent = 'Click to add points. Double-click, or press Enter, to finish. Esc to cancel.';
                }
            }
        }
    });

    if (!engine) { return; }

    // Exposed for debugging/devtools access, and so tests can inspect the
    // live interaction state directly rather than through DOM reflections
    // that are deliberately deferred to a render frame.
    window.PhB.roofStudioEngine = engine;

    /* ---------------------------------------------------------------
       Toolbar wiring
       --------------------------------------------------------------- */
    toolButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            engine.setTool(btn.getAttribute('data-rs-tool'));
        });
    });

    if (deleteBtn) {
        deleteBtn.addEventListener('click', function () { engine.deleteSelected(); });
    }
    if (undoBtn) {
        undoBtn.addEventListener('click', function () { store.undo(); });
    }
    if (redoBtn) {
        redoBtn.addEventListener('click', function () { store.redo(); });
    }
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function () { engine.zoomIn(); });
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function () { engine.zoomOut(); });
    }
    if (zoomFitBtn) {
        zoomFitBtn.addEventListener('click', function () { engine.zoomFit(); });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            if (!store.getShapes().length) { return; }
            store.clearShapes();
            window.PhB.toast('Drawing cleared. Press Ctrl+Z to undo.', 'success');
        });
    }
    if (snapToggle) {
        snapToggle.addEventListener('change', function () { engine.setSnapEnabled(snapToggle.checked); });
    }

    store.subscribe(flashSaved);

    loadProperties();
})();
