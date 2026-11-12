/**
 * PhentiBuild (PhB) - Roof Studio Canvas Engine
 *
 * Owns the <canvas>: sizing, the grid, rendering every shape from
 * PhB.roofStudioStore, and all pointer/keyboard/wheel interaction (the
 * drawing tools, selection, zoom, pan and snap-to-grid). Geometry math
 * comes from PhB.roofGeometry; persistence and undo/redo come from
 * PhB.roofStudioStore. This file's own state is view-only and transient
 * (active tool, zoom/pan, in-progress shape, current selection) — none of
 * it is saved, so a reload always comes back to a clean Select tool at a
 * fitted view over whatever was persisted.
 *
 * Call PhB.roofStudioCanvas.init(canvas, options) once; it returns a
 * small control API the page controller (roof-studio.js) uses to wire up
 * the toolbar and properties panel.
 */
(function () {
    'use strict';

    var geo = window.PhB && window.PhB.roofGeometry;
    var store = window.PhB && window.PhB.roofStudioStore;

    var PIXELS_PER_METRE = 40;      // at zoom = 1
    var GRID_MINOR_M = 0.25;        // snap granularity and finest grid line
    var GRID_MAJOR_EVERY = 4;       // every 4th minor line (1m) is a major line
    var MIN_ZOOM = 0.15;
    var MAX_ZOOM = 8;
    var HIT_TOLERANCE_PX = 8;

    var COLORS = {
        bg: '#FFFFFF',
        gridMinor: '#EDEEF0',
        gridMajor: '#D7D9DC',
        axis: '#B5B9BE',
        shape: '#2B2B2B',
        shapeFill: 'rgba(255, 102, 0, 0.08)',
        selected: '#FF6600',
        selectedFill: 'rgba(255, 102, 0, 0.18)',
        preview: '#1565C0',
        snapDot: '#1565C0',
        dimText: '#5A6672',
        dimTextBg: 'rgba(255, 255, 255, 0.85)'
    };

    function init(canvas, options) {
        if (!geo || !store || !canvas) { return null; }
        options = options || {};
        var onStatusChange = options.onStatusChange || function () {};

        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;

        var view = { zoom: 1, panX: 0, panY: 0 };
        var activeTool = 'select';
        var snapEnabled = true;
        var selectedShapeId = null;
        var drawingState = null;      // in-progress line/rectangle/polygon
        var isPanning = false;
        var panStart = null;          // { screenX, screenY, panX, panY }
        var isSpaceDown = false;
        var lastPointerWorld = null;  // for status readout when idle
        var shapes = store.getShapes();
        var renderQueued = false;

        /* -----------------------------------------------------------
           Coordinate transforms
           ----------------------------------------------------------- */
        function worldToScreen(p) {
            var scale = PIXELS_PER_METRE * view.zoom;
            return { x: view.panX + p.x * scale, y: view.panY + p.y * scale };
        }

        function screenToWorld(p) {
            var scale = PIXELS_PER_METRE * view.zoom;
            return { x: (p.x - view.panX) / scale, y: (p.y - view.panY) / scale };
        }

        function eventToWorld(e) {
            var rect = canvas.getBoundingClientRect();
            return screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }

        function eventToScreen(e) {
            var rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }

        function maybeSnap(point) {
            return snapEnabled ? geo.snapPoint(point, GRID_MINOR_M) : point;
        }

        /* -----------------------------------------------------------
           Sizing (crisp on high-DPI screens, tracks container size)
           ----------------------------------------------------------- */
        function resize() {
            var rect = canvas.parentElement.getBoundingClientRect();
            dpr = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, Math.round(rect.width * dpr));
            canvas.height = Math.max(1, Math.round(rect.height * dpr));
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            scheduleRender();
        }

        var resizeObserver = (typeof ResizeObserver !== 'undefined')
            ? new ResizeObserver(resize)
            : null;
        if (resizeObserver) { resizeObserver.observe(canvas.parentElement); }
        window.addEventListener('resize', resize);

        /* -----------------------------------------------------------
           Rendering
           ----------------------------------------------------------- */
        function cssSize() {
            var rect = canvas.parentElement.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        }

        function drawGrid() {
            var size = cssSize();
            var scale = PIXELS_PER_METRE * view.zoom;
            var minorPx = GRID_MINOR_M * scale;

            // Below this spacing, minor lines would just be visual noise.
            var showMinor = minorPx >= 6;

            var topLeft = screenToWorld({ x: 0, y: 0 });
            var bottomRight = screenToWorld({ x: size.width, y: size.height });

            var startXIndex = Math.floor(topLeft.x / GRID_MINOR_M) - 1;
            var endXIndex = Math.ceil(bottomRight.x / GRID_MINOR_M) + 1;
            var startYIndex = Math.floor(topLeft.y / GRID_MINOR_M) - 1;
            var endYIndex = Math.ceil(bottomRight.y / GRID_MINOR_M) + 1;

            ctx.save();
            ctx.lineWidth = 1;

            for (var xi = startXIndex; xi <= endXIndex; xi++) {
                var isMajor = xi % GRID_MAJOR_EVERY === 0;
                if (!isMajor && !showMinor) { continue; }
                var sx = worldToScreen({ x: xi * GRID_MINOR_M, y: 0 }).x;
                ctx.strokeStyle = isMajor ? COLORS.gridMajor : COLORS.gridMinor;
                ctx.beginPath();
                ctx.moveTo(sx + 0.5, 0);
                ctx.lineTo(sx + 0.5, size.height);
                ctx.stroke();
            }

            for (var yi = startYIndex; yi <= endYIndex; yi++) {
                var isMajorY = yi % GRID_MAJOR_EVERY === 0;
                if (!isMajorY && !showMinor) { continue; }
                var sy = worldToScreen({ x: 0, y: yi * GRID_MINOR_M }).y;
                ctx.strokeStyle = isMajorY ? COLORS.gridMajor : COLORS.gridMinor;
                ctx.beginPath();
                ctx.moveTo(0, sy + 0.5);
                ctx.lineTo(size.width, sy + 0.5);
                ctx.stroke();
            }

            // Axes through the world origin, so there is always a visible
            // reference point regardless of what has been drawn.
            var origin = worldToScreen({ x: 0, y: 0 });
            ctx.strokeStyle = COLORS.axis;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, origin.y + 0.5); ctx.lineTo(size.width, origin.y + 0.5);
            ctx.moveTo(origin.x + 0.5, 0); ctx.lineTo(origin.x + 0.5, size.height);
            ctx.stroke();
            ctx.restore();
        }

        function polygonPath(screenPts) {
            ctx.beginPath();
            screenPts.forEach(function (p, i) {
                if (i === 0) { ctx.moveTo(p.x, p.y); } else { ctx.lineTo(p.x, p.y); }
            });
            ctx.closePath();
        }

        function drawDimensionLabel(worldA, worldB, text) {
            var a = worldToScreen(worldA);
            var b = worldToScreen(worldB);
            var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

            ctx.save();
            ctx.font = '11px ' + (getComputedStyle(document.body).fontFamily || 'sans-serif');
            var padding = 3;
            var metrics = ctx.measureText(text);
            var w = metrics.width + padding * 2;
            var h = 14;
            ctx.fillStyle = COLORS.dimTextBg;
            ctx.fillRect(mid.x - w / 2, mid.y - h / 2, w, h);
            ctx.fillStyle = COLORS.dimText;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, mid.x, mid.y + 0.5);
            ctx.restore();
        }

        function formatMetres(m) {
            return m.toFixed(2) + ' m';
        }

        function drawShapeDimensions(shape) {
            var pts = geo.outlinePoints(shape);
            var lengths = geo.segmentLengths(shape);
            var closed = shape.type !== 'line';
            var edgeCount = closed ? pts.length : pts.length - 1;
            for (var i = 0; i < edgeCount; i++) {
                var a = pts[i];
                var b = pts[(i + 1) % pts.length];
                // Skip degenerate edges (e.g. a rectangle still being drawn).
                if (lengths[i] < 0.01) { continue; }
                drawDimensionLabel(a, b, formatMetres(lengths[i]));
            }
        }

        function drawShape(shape, isSelected) {
            var pts = geo.outlinePoints(shape).map(worldToScreen);
            var closed = shape.type !== 'line';

            ctx.save();
            ctx.lineWidth = isSelected ? 2.5 : 1.75;
            ctx.strokeStyle = isSelected ? COLORS.selected : COLORS.shape;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            if (closed) {
                polygonPath(pts);
                ctx.fillStyle = isSelected ? COLORS.selectedFill : COLORS.shapeFill;
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                ctx.lineTo(pts[1].x, pts[1].y);
                ctx.stroke();
            }
            ctx.restore();

            drawShapeDimensions(shape);
        }

        function drawDrawingPreview() {
            if (!drawingState) { return; }

            if (drawingState.tool === 'line' || drawingState.tool === 'rectangle') {
                if (!drawingState.end) { return; }
                var previewShape = { type: drawingState.tool, points: [drawingState.start, drawingState.end] };
                var pts = geo.outlinePoints(previewShape).map(worldToScreen);

                ctx.save();
                ctx.setLineDash([5, 4]);
                ctx.lineWidth = 1.75;
                ctx.strokeStyle = COLORS.preview;

                if (drawingState.tool === 'rectangle') {
                    polygonPath(pts);
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(pts[0].x, pts[0].y);
                    ctx.lineTo(pts[1].x, pts[1].y);
                    ctx.stroke();
                }
                ctx.restore();
                drawShapeDimensions(previewShape);
            } else if (drawingState.tool === 'polygon') {
                var placed = drawingState.points.map(worldToScreen);
                ctx.save();
                ctx.setLineDash([5, 4]);
                ctx.lineWidth = 1.75;
                ctx.strokeStyle = COLORS.preview;
                ctx.beginPath();
                placed.forEach(function (p, i) {
                    if (i === 0) { ctx.moveTo(p.x, p.y); } else { ctx.lineTo(p.x, p.y); }
                });
                if (drawingState.previewPoint) {
                    var pv = worldToScreen(drawingState.previewPoint);
                    ctx.lineTo(pv.x, pv.y);
                }
                ctx.stroke();
                ctx.restore();

                // Dimension for the segment currently being placed.
                if (drawingState.previewPoint && drawingState.points.length) {
                    var last = drawingState.points[drawingState.points.length - 1];
                    var len = geo.distance(last, drawingState.previewPoint);
                    if (len >= 0.01) { drawDimensionLabel(last, drawingState.previewPoint, formatMetres(len)); }
                }

                // Vertex markers so each placed click is visible.
                ctx.fillStyle = COLORS.preview;
                placed.forEach(function (p) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        }

        function drawSnapIndicator() {
            if (!snapEnabled || !lastPointerWorld || drawingState || isPanning) { return; }
            var snapped = geo.snapPoint(lastPointerWorld, GRID_MINOR_M);
            var s = worldToScreen(snapped);
            ctx.save();
            ctx.strokeStyle = COLORS.snapDot;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        function render() {
            renderQueued = false;
            var size = cssSize();
            ctx.clearRect(0, 0, size.width, size.height);
            ctx.fillStyle = COLORS.bg;
            ctx.fillRect(0, 0, size.width, size.height);

            drawGrid();
            shapes.forEach(function (shape) {
                drawShape(shape, shape.id === selectedShapeId);
            });
            drawDrawingPreview();
            drawSnapIndicator();

            reportStatus();
        }

        function scheduleRender() {
            if (renderQueued) { return; }
            renderQueued = true;
            requestAnimationFrame(render);
        }

        /* -----------------------------------------------------------
           Status reporting (toolbar / status bar are owned by the page
           controller — this just hands it fresh numbers).
           ----------------------------------------------------------- */
        function reportStatus() {
            onStatusChange({
                tool: activeTool,
                zoom: view.zoom,
                snapEnabled: snapEnabled,
                selectedShapeId: selectedShapeId,
                shapeCount: shapes.length,
                canUndo: store.canUndo(),
                canRedo: store.canRedo(),
                cursorWorld: lastPointerWorld,
                isDrawingPolygon: !!(drawingState && drawingState.tool === 'polygon')
            });
        }

        /* -----------------------------------------------------------
           View controls
           ----------------------------------------------------------- */
        function setZoom(newZoom, anchorScreen) {
            newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
            var size = cssSize();
            var anchor = anchorScreen || { x: size.width / 2, y: size.height / 2 };
            var worldAtAnchor = screenToWorld(anchor);

            view.zoom = newZoom;

            var scale = PIXELS_PER_METRE * view.zoom;
            view.panX = anchor.x - worldAtAnchor.x * scale;
            view.panY = anchor.y - worldAtAnchor.y * scale;
            scheduleRender();
        }

        function zoomIn() { setZoom(view.zoom * 1.25); }
        function zoomOut() { setZoom(view.zoom / 1.25); }

        function zoomFit() {
            var box = geo.boundingBoxOfShapes(shapes);
            var size = cssSize();
            if (!box) {
                view.zoom = 1;
                view.panX = size.width / 2 - 4 * PIXELS_PER_METRE;
                view.panY = size.height / 2 - 3 * PIXELS_PER_METRE;
                scheduleRender();
                return;
            }
            var margin = 1.5; // metres of breathing room around the drawing
            var worldW = Math.max(0.5, (box.maxX - box.minX) + margin * 2);
            var worldH = Math.max(0.5, (box.maxY - box.minY) + margin * 2);
            var zoomX = size.width / (worldW * PIXELS_PER_METRE);
            var zoomY = size.height / (worldH * PIXELS_PER_METRE);
            view.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(zoomX, zoomY)));

            var scale = PIXELS_PER_METRE * view.zoom;
            var centreWorld = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
            view.panX = size.width / 2 - centreWorld.x * scale;
            view.panY = size.height / 2 - centreWorld.y * scale;
            scheduleRender();
        }

        /* -----------------------------------------------------------
           Tool / selection controls
           ----------------------------------------------------------- */
        function cancelDrawing() {
            drawingState = null;
            scheduleRender();
        }

        function setTool(tool) {
            if (drawingState) { cancelDrawing(); }
            activeTool = tool;
            if (tool !== 'select') { selectedShapeId = null; }
            scheduleRender();
        }

        function setSnapEnabled(value) {
            snapEnabled = !!value;
            scheduleRender();
        }

        function deleteSelected() {
            if (!selectedShapeId) { return false; }
            store.removeShape(selectedShapeId);
            selectedShapeId = null;
            return true;
        }

        function finalizeDragShape() {
            if (!drawingState || !drawingState.end) { drawingState = null; return; }
            var start = drawingState.start;
            var end = drawingState.end;
            if (geo.distance(start, end) >= GRID_MINOR_M / 2) {
                store.addShape(geo.createShape(drawingState.tool, [start, end]));
            }
            drawingState = null;
        }

        function finalizePolygon() {
            if (!drawingState || drawingState.points.length < 3) {
                drawingState = null;
                scheduleRender();
                return;
            }
            store.addShape(geo.createShape('polygon', drawingState.points));
            drawingState = null;
            scheduleRender();
        }

        /* -----------------------------------------------------------
           Pointer interaction
           ----------------------------------------------------------- */
        function startPan(screenPoint) {
            isPanning = true;
            panStart = { x: screenPoint.x, y: screenPoint.y, panX: view.panX, panY: view.panY };
        }

        canvas.addEventListener('pointerdown', function (e) {
            canvas.setPointerCapture(e.pointerId);
            var screenPoint = eventToScreen(e);
            var worldPoint = screenToWorld(screenPoint);

            if (isSpaceDown || activeTool === 'pan') {
                startPan(screenPoint);
                return;
            }

            if (activeTool === 'select') {
                selectedShapeId = geo.hitTestShapes(shapes, worldPoint, HIT_TOLERANCE_PX / (PIXELS_PER_METRE * view.zoom));
                scheduleRender();
                return;
            }

            var snapped = maybeSnap(worldPoint);

            if (activeTool === 'line' || activeTool === 'rectangle') {
                drawingState = { tool: activeTool, start: snapped, end: snapped };
                scheduleRender();
                return;
            }

            if (activeTool === 'polygon') {
                if (!drawingState) {
                    drawingState = { tool: 'polygon', points: [snapped], previewPoint: snapped };
                } else {
                    drawingState.points.push(snapped);
                }
                scheduleRender();
            }
        });

        canvas.addEventListener('pointermove', function (e) {
            var screenPoint = eventToScreen(e);
            var worldPoint = screenToWorld(screenPoint);
            lastPointerWorld = worldPoint;

            if (isPanning) {
                view.panX = panStart.panX + (screenPoint.x - panStart.x);
                view.panY = panStart.panY + (screenPoint.y - panStart.y);
                scheduleRender();
                return;
            }

            var snapped = maybeSnap(worldPoint);

            if (drawingState && (drawingState.tool === 'line' || drawingState.tool === 'rectangle')) {
                drawingState.end = snapped;
                scheduleRender();
                return;
            }

            if (drawingState && drawingState.tool === 'polygon') {
                drawingState.previewPoint = snapped;
                scheduleRender();
                return;
            }

            scheduleRender();
        });

        function endPointer(e) {
            if (isPanning) {
                isPanning = false;
                panStart = null;
                return;
            }
            if (drawingState && (drawingState.tool === 'line' || drawingState.tool === 'rectangle')) {
                finalizeDragShape();
                scheduleRender();
            }
        }

        canvas.addEventListener('pointerup', endPointer);
        canvas.addEventListener('pointercancel', endPointer);

        canvas.addEventListener('dblclick', function (e) {
            if (activeTool === 'polygon' && drawingState) {
                e.preventDefault();
                finalizePolygon();
            }
        });

        canvas.addEventListener('wheel', function (e) {
            e.preventDefault();
            var screenPoint = eventToScreen(e);
            var factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
            setZoom(view.zoom * factor, screenPoint);
        }, { passive: false });

        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        /* -----------------------------------------------------------
           Keyboard shortcuts — only act when this canvas's module panel
           is the visible one and focus isn't in a text field, so typing
           in the properties panel (or any other module) is never hijacked.
           ----------------------------------------------------------- */
        function isTypingInField() {
            var el = document.activeElement;
            if (!el) { return false; }
            var tag = el.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
        }

        function isModuleVisible() {
            var panel = canvas.closest('[data-module-panel]');
            return !panel || !panel.hidden;
        }

        window.addEventListener('keydown', function (e) {
            if (!isModuleVisible()) { return; }

            if (e.code === 'Space' && !isTypingInField()) {
                isSpaceDown = true;
                e.preventDefault();
                return;
            }

            if (isTypingInField()) { return; }

            if (e.key === 'Escape') {
                if (drawingState) { cancelDrawing(); }
                else if (selectedShapeId) { selectedShapeId = null; scheduleRender(); }
                return;
            }

            if (e.key === 'Enter' && drawingState && drawingState.tool === 'polygon') {
                finalizePolygon();
                return;
            }

            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeId) {
                e.preventDefault();
                deleteSelected();
                return;
            }

            var ctrlOrCmd = e.ctrlKey || e.metaKey;
            if (!ctrlOrCmd) {
                var TOOL_KEYS = { v: 'select', l: 'line', r: 'rectangle', p: 'polygon', h: 'pan' };
                var toolForKey = TOOL_KEYS[e.key.toLowerCase()];
                if (toolForKey) {
                    setTool(toolForKey);
                    return;
                }
            }
            if (ctrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                store.undo();
                return;
            }
            if (ctrlOrCmd && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
                e.preventDefault();
                store.redo();
            }
        });

        window.addEventListener('keyup', function (e) {
            if (e.code === 'Space') { isSpaceDown = false; }
        });

        /* -----------------------------------------------------------
           Store subscription — re-read shapes whenever they change
           (add/remove/undo/redo), from this engine or elsewhere.
           ----------------------------------------------------------- */
        store.subscribe(function () {
            shapes = store.getShapes();
            if (selectedShapeId && !shapes.some(function (s) { return s.id === selectedShapeId; })) {
                selectedShapeId = null;
            }
            scheduleRender();
        });

        resize();
        zoomFit();

        return {
            setTool: setTool,
            getTool: function () { return activeTool; },
            setSnapEnabled: setSnapEnabled,
            getSnapEnabled: function () { return snapEnabled; },
            zoomIn: zoomIn,
            zoomOut: zoomOut,
            zoomFit: zoomFit,
            getZoom: function () { return view.zoom; },
            deleteSelected: deleteSelected,
            getSelectedShapeId: function () { return selectedShapeId; },
            cancelDrawing: cancelDrawing,
            finalizePolygon: finalizePolygon
        };
    }

    window.PhB = window.PhB || {};
    window.PhB.roofStudioCanvas = { init: init };
})();
