/**
 * PhentiBuild (PhB) - Roof Studio 3D Viewer
 *
 * Owns the Three.js scene, camera, renderer and a hand-rolled orbit
 * camera (rotate/zoom/pan) — there is no OrbitControls addon vendored
 * here, only the core three.min.js library, so the interaction is built
 * directly on THREE.Vector3/Spherical, matching how the 2D canvas engine
 * (roof-studio-canvas.js) also owns its own pan/zoom rather than pulling
 * in a helper library for it.
 *
 * Call PhB.roof3DViewer.init(canvas) once; it returns a control API the
 * page controller (roof-3d.js) uses to load a model built by
 * PhB.roof3DBuilder and to wire the toolbar.
 */
(function () {
    'use strict';

    var THREE = window.THREE;

    var MIN_DISTANCE = 2;
    var MAX_DISTANCE = 120;
    var MIN_POLAR = 0.05;                 // radians, just above looking straight down
    var MAX_POLAR = Math.PI / 2 - 0.02;   // just above the horizon, so the camera never goes underground

    function init(canvas) {
        if (!THREE || !canvas) { return null; }

        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF2F3F5);

        var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        var sun = new THREE.DirectionalLight(0xffffff, 0.75);
        sun.position.set(8, 14, 6);
        scene.add(sun);
        var fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-8, 6, -6);
        scene.add(fill);

        var ground = new THREE.GridHelper(60, 60, 0xD7D9DC, 0xEDEEF0);
        scene.add(ground);

        var modelGroup = null;
        var modelGroups = {};
        var bounds = { length: 8, width: 6, height: 4, radius: 8 };

        /* -----------------------------------------------------------
           Orbit camera — spherical coordinates around `target`.
           ----------------------------------------------------------- */
        var target = new THREE.Vector3(0, 2, 0);
        var azimuth = Math.PI / 4;   // horizontal angle
        var polar = Math.PI / 3;     // angle from the vertical axis
        var distance = 16;

        function applyCamera() {
            var sinPolar = Math.sin(polar);
            camera.position.set(
                target.x + distance * sinPolar * Math.sin(azimuth),
                target.y + distance * Math.cos(polar),
                target.z + distance * sinPolar * Math.cos(azimuth)
            );
            camera.lookAt(target);
        }

        function frameModel() {
            target.set(0, bounds.height / 2, 0);
            distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, bounds.radius * 2.1));
            azimuth = Math.PI / 4;
            polar = Math.PI / 3;
            applyCamera();
        }

        applyCamera();

        /* -----------------------------------------------------------
           Sizing
           ----------------------------------------------------------- */
        function resize() {
            var rect = canvas.parentElement.getBoundingClientRect();
            var w = Math.max(1, rect.width);
            var h = Math.max(1, rect.height);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h, false);
        }

        var resizeObserver = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(resize) : null;
        if (resizeObserver) { resizeObserver.observe(canvas.parentElement); }
        window.addEventListener('resize', resize);

        /* -----------------------------------------------------------
           Pointer interaction: left-drag rotates, right-drag (or
           shift+left-drag) pans, wheel zooms.
           ----------------------------------------------------------- */
        var dragMode = null; // 'rotate' | 'pan'
        var lastX = 0, lastY = 0;

        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        canvas.addEventListener('pointerdown', function (e) {
            canvas.setPointerCapture(e.pointerId);
            dragMode = (e.button === 2 || e.shiftKey) ? 'pan' : 'rotate';
            lastX = e.clientX;
            lastY = e.clientY;
        });

        canvas.addEventListener('pointermove', function (e) {
            if (!dragMode) { return; }
            var dx = e.clientX - lastX;
            var dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;

            if (dragMode === 'rotate') {
                azimuth -= dx * 0.006;
                polar = Math.max(MIN_POLAR, Math.min(MAX_POLAR, polar - dy * 0.006));
            } else {
                var panScale = distance * 0.0015;
                var right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
                var up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
                target.addScaledVector(right, -dx * panScale);
                target.addScaledVector(up, dy * panScale);
            }
            applyCamera();
        });

        function endDrag() { dragMode = null; }
        canvas.addEventListener('pointerup', endDrag);
        canvas.addEventListener('pointercancel', endDrag);

        canvas.addEventListener('wheel', function (e) {
            e.preventDefault();
            var factor = e.deltaY < 0 ? 0.88 : 1.12;
            distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, distance * factor));
            applyCamera();
        }, { passive: false });

        /* -----------------------------------------------------------
           Model loading / component toggling
           ----------------------------------------------------------- */
        function setModel(built) {
            if (modelGroup) {
                scene.remove(modelGroup);
                disposeGroup(modelGroup);
            }
            modelGroup = built.group;
            modelGroups = built.groups;
            bounds = built.bounds;
            scene.add(modelGroup);
            frameModel();
        }

        function disposeGroup(group) {
            group.traverse(function (obj) {
                if (obj.geometry) { obj.geometry.dispose(); }
                if (obj.material) {
                    if (Array.isArray(obj.material)) { obj.material.forEach(function (m) { m.dispose(); }); }
                    else { obj.material.dispose(); }
                }
            });
        }

        function setComponentVisible(name, visible) {
            if (modelGroups[name]) { modelGroups[name].visible = !!visible; }
        }

        function getComponentVisible(name) {
            return modelGroups[name] ? modelGroups[name].visible : false;
        }

        /* -----------------------------------------------------------
           Render loop
           ----------------------------------------------------------- */
        var running = true;
        function tick() {
            if (!running) { return; }
            renderer.render(scene, camera);
            requestAnimationFrame(tick);
        }

        function dispose() {
            running = false;
            if (resizeObserver) { resizeObserver.disconnect(); }
            window.removeEventListener('resize', resize);
            if (modelGroup) { disposeGroup(modelGroup); }
            renderer.dispose();
        }

        resize();
        tick();

        return {
            setModel: setModel,
            setComponentVisible: setComponentVisible,
            getComponentVisible: getComponentVisible,
            resetView: frameModel,
            resize: resize,
            dispose: dispose,
            getCameraState: function () { return { azimuth: azimuth, polar: polar, distance: distance }; }
        };
    }

    window.PhB = window.PhB || {};
    window.PhB.roof3DViewer = { init: init };
})();
