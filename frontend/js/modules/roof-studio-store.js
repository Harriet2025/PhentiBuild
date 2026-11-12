/**
 * PhentiBuild (PhB) - Roof Studio Store
 *
 * Owns the current drawing (shapes) and the roof properties panel
 * values, plus the undo/redo history for shape edits — the in-memory
 * model and its public API are UNCHANGED from before this file talked to
 * a backend, on purpose: roof-studio-canvas.js's pointer handling (draw,
 * undo, redo) depends on every one of these calls being synchronous and
 * instant, and a real-time drawing tool must never wait on a network
 * round-trip just to let a shape appear or an undo take effect.
 *
 * What changed is only what's *underneath* persist(): instead of writing
 * straight to localStorage, it now debounces a PUT to
 * backend/api/roof-designs/index.php in the background, and the initial
 * load() is a one-time async fetch of the current design (a genuine
 * single-document resource — see RoofDesign.php) instead of a synchronous
 * localStorage read. The brief moment between page load and that fetch
 * resolving is the one real trade-off: the canvas starts empty and the
 * saved drawing "arrives" a beat later via the existing subscribe/notify
 * path, rather than being present instantly the way localStorage was.
 */
(function () {
    'use strict';

    var API_URL = '/PhentiBuild/backend/api/roof-designs/index.php';
    var SAVE_DEBOUNCE_MS = 500;
    var MAX_HISTORY = 100;

    var DEFAULT_PROPERTIES = {
        roofType: 'Gable Roof',
        length: '',
        width: '',
        pitch: '',
        rafterSpacing: '',
        purlinSpacing: '',
        roofingMaterial: ''
    };

    var subscribers = [];
    var shapes = [];
    var properties = Object.assign({}, DEFAULT_PROPERTIES);
    var history = [[]];
    var historyIndex = 0;
    var saveTimer = null;

    function cloneShapes(list) {
        return list.map(function (s) {
            return { id: s.id, type: s.type, points: s.points.map(function (p) { return { x: p.x, y: p.y }; }) };
        });
    }

    function notify() {
        subscribers.forEach(function (fn) { fn(); });
    }

    /** Fire-and-forget background sync, debounced so rapid edits (typing
     *  in a properties field, several quick shape edits) collapse into
     *  one request instead of one per change. Never blocks the caller. */
    function scheduleSave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
            fetch(API_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shapes: shapes, properties: properties })
            }).catch(function () {
                if (window.PhB && window.PhB.toast) {
                    window.PhB.toast('Roof design changes could not be saved to the server. Check your connection.', 'danger');
                }
            });
        }, SAVE_DEBOUNCE_MS);
    }

    async function load() {
        try {
            var response = await fetch(API_URL, { headers: { 'Accept': 'application/json' } });
            var payload = await response.json();
            if (!response.ok || !payload.success) { return; }

            shapes = Array.isArray(payload.data.shapes) ? payload.data.shapes : [];
            properties = Object.assign({}, DEFAULT_PROPERTIES, payload.data.properties || {});
            if (window.PhB && window.PhB.roofGeometry) { window.PhB.roofGeometry.seedShapeIdCounter(shapes); }

            history = [cloneShapes(shapes)];
            historyIndex = 0;
            notify();
        } catch (e) {
            if (window.PhB && window.PhB.toast) {
                window.PhB.toast('Could not load the saved roof design from the server.', 'danger');
            }
        }
    }

    function getShapes() {
        return cloneShapes(shapes);
    }

    function getProperties() {
        return Object.assign({}, properties);
    }

    /** Replaces the shapes array as one undoable step, persisted (in the
     *  background) after. Used for every drawing operation: add a shape,
     *  delete a shape, clear all. */
    function commitShapes(newShapes) {
        shapes = cloneShapes(newShapes);

        // A new action after undoing discards the redo branch, exactly
        // like every other undo/redo implementation.
        history = history.slice(0, historyIndex + 1);
        history.push(cloneShapes(shapes));
        if (history.length > MAX_HISTORY) { history.shift(); }
        historyIndex = history.length - 1;

        scheduleSave();
        notify();
    }

    function addShape(shape) {
        commitShapes(shapes.concat([shape]));
    }

    function removeShape(id) {
        commitShapes(shapes.filter(function (s) { return s.id !== id; }));
    }

    function clearShapes() {
        commitShapes([]);
    }

    function canUndo() { return historyIndex > 0; }
    function canRedo() { return historyIndex < history.length - 1; }

    function undo() {
        if (!canUndo()) { return; }
        historyIndex -= 1;
        shapes = cloneShapes(history[historyIndex]);
        scheduleSave();
        notify();
    }

    function redo() {
        if (!canRedo()) { return; }
        historyIndex += 1;
        shapes = cloneShapes(history[historyIndex]);
        scheduleSave();
        notify();
    }

    /** Property panel fields are plain, persisted state — not part of the
     *  shape undo history (see file header). */
    function setProperty(key, value) {
        if (!(key in DEFAULT_PROPERTIES)) { return; }
        properties[key] = value;
        scheduleSave();
        notify();
    }

    function subscribe(fn) {
        subscribers.push(fn);
    }

    load();

    window.PhB = window.PhB || {};
    window.PhB.roofStudioStore = {
        getShapes: getShapes,
        getProperties: getProperties,
        addShape: addShape,
        removeShape: removeShape,
        clearShapes: clearShapes,
        setProperty: setProperty,
        undo: undo,
        redo: redo,
        canUndo: canUndo,
        canRedo: canRedo,
        subscribe: subscribe
    };
})();
