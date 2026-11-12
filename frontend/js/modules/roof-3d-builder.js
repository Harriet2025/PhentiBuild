/**
 * PhentiBuild (PhB) - Roof Studio 3D Builder
 *
 * Pure geometry-generation module: takes the 2D Roof Studio's structured
 * shapes and properties (PhB.roofStudioStore) and builds a real,
 * parametric Three.js model of the roof structure — not a static image
 * or a pre-baked mesh. Every plane, rafter, purlin, batten, ridge and hip
 * member is computed from the actual footprint dimensions and pitch.
 *
 * Requires window.THREE (vendored locally — see frontend/vendor/three)
 * and PhB.roofGeometry for the 2D shape math. Has no knowledge of the
 * renderer/camera/canvas; roof-3d-viewer.js owns that.
 *
 * Assumptions (all fixed constants below, not user-editable at this
 * stage — flagged here rather than silently baked into the numbers):
 * - Eave (wall-plate) height: 2.7 m. The properties panel has no wall
 *   height field yet, so this is a fixed, documented placeholder.
 * - Hip roofs use the same pitch on every face, so each hip's horizontal
 *   run equals half the building width — the standard equal-pitch hip.
 * - Batten spacing defaults to 350 mm; there is no batten-spacing field
 *   in the properties panel (only rafter and purlin spacing).
 * - Jack rafters are generated correctly (tapering to zero at the
 *   corners) on the two main hip slopes; the two triangular hip-end
 *   planes are shown as true sloped surfaces with their hip-line edges,
 *   but are not further subdivided into their own jack rafters.
 */
(function () {
    'use strict';

    var THREE = window.THREE;
    var geo = window.PhB && window.PhB.roofGeometry;

    var EAVE_HEIGHT = 2.7;          // m, wall-plate height
    var PARAPET_HEIGHT = 0.4;       // m, flat/hidden roof upstand
    var DEFAULT_BATTEN_SPACING_MM = 350;
    var DEFAULT_FOOTPRINT = { length: 8, width: 6 };
    var MIN_DIMENSION = 1;          // metres, guards against degenerate input

    var MEMBER = {
        rafter:  0.10,  // box side, metres (visual, loosely matches 50x100/100x100mm timber)
        purlin:  0.10,
        batten:  0.045,
        ridge:   0.15,
        hip:     0.15
    };

    var COLOR = {
        roofPlane: 0xC9713D,   // terracotta-ish, stands in for the roofing material
        rafter:    0x8A5A34,
        purlin:    0x6B4423,
        batten:    0xB08968,
        ridge:     0xFF6600,   // brand orange — the ridge is the roof's spine, made to stand out
        hip:       0x1565C0
    };

    /* ---------------------------------------------------------------
       Small vector / mesh helpers
       --------------------------------------------------------------- */
    function v(x, y, z) { return new THREE.Vector3(x, y, z); }

    function lerpPoint(a, b, t) {
        return v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
    }

    /** A thin box "stick" running from `start` to `end`, used for every
     *  rafter/purlin/batten/ridge/hip member. */
    function makeStick(start, end, thickness, material) {
        var length = start.distanceTo(end);
        if (length < 1e-4) { return null; }
        var geometry = new THREE.BoxGeometry(thickness, length, thickness);
        var mesh = new THREE.Mesh(geometry, material);
        var mid = lerpPoint(start, end, 0.5);
        mesh.position.copy(mid);
        var direction = end.clone().sub(start).normalize();
        mesh.quaternion.setFromUnitVectors(v(0, 1, 0), direction);
        return mesh;
    }

    function addStick(group, start, end, thickness, material) {
        var mesh = makeStick(start, end, thickness, material);
        if (mesh) { group.add(mesh); }
    }

    /** A single- or double-triangle plane from 3 or 4 coplanar-ish
     *  points, given in drawing order (quad points must be in order
     *  around the perimeter, not criss-crossed). */
    function makePlaneMesh(points, material) {
        var geometry = new THREE.BufferGeometry();
        var positions = [];

        if (points.length === 3) {
            points.forEach(function (p) { positions.push(p.x, p.y, p.z); });
        } else if (points.length === 4) {
            var order = [0, 1, 2, 0, 2, 3];
            order.forEach(function (i) { positions.push(points[i].x, points[i].y, points[i].z); });
        } else {
            return null;
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeVertexNormals();
        var mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }

    function addPlane(group, points, material) {
        var mesh = makePlaneMesh(points, material);
        if (mesh) { group.add(mesh); }
    }

    function metresFromMm(mm, fallback) {
        var value = parseFloat(mm);
        return (isFinite(value) && value > 0) ? value / 1000 : fallback / 1000;
    }

    /* ---------------------------------------------------------------
       Footprint — prefers the actual drawn geometry (a rectangle, or
       the bounding box of the most recently drawn area shape) over the
       properties panel's declared Length/Width, falling back to a
       placeholder footprint if neither is available yet.
       --------------------------------------------------------------- */
    function deriveFootprint(shapes, properties) {
        var areaShapes = shapes.filter(function (s) { return s.type === 'rectangle' || s.type === 'polygon'; });

        if (areaShapes.length) {
            var latest = areaShapes[areaShapes.length - 1];
            var box = geo.boundingBoxOfShapes([latest]);
            var length = box.maxX - box.minX;
            var width = box.maxY - box.minY;
            if (length >= MIN_DIMENSION && width >= MIN_DIMENSION) {
                return { length: length, width: width, source: 'drawing' };
            }
        }

        var propLength = parseFloat(properties.length);
        var propWidth = parseFloat(properties.width);
        if (isFinite(propLength) && propLength >= MIN_DIMENSION && isFinite(propWidth) && propWidth >= MIN_DIMENSION) {
            return { length: propLength, width: propWidth, source: 'properties' };
        }

        return { length: DEFAULT_FOOTPRINT.length, width: DEFAULT_FOOTPRINT.width, source: 'default' };
    }

    /* ---------------------------------------------------------------
       Roof type builders — each returns nothing, populating the group
       maps passed in. All work in metres, X = along length, Z = along
       width, Y = up.
       --------------------------------------------------------------- */
    function buildGable(L, W, pitchDeg, rafterSpacingM, purlinSpacingM, battenSpacingM, groups, materials) {
        var pitchRad = pitchDeg * Math.PI / 180;
        var run = W / 2;
        var rise = run * Math.tan(pitchRad);
        var ridgeY = EAVE_HEIGHT + rise;
        var slopeLength = Math.hypot(run, rise);

        var eaveFront = function (x) { return v(x, EAVE_HEIGHT, 0); };
        var eaveBack = function (x) { return v(x, EAVE_HEIGHT, W); };
        var ridgeAt = function (x) { return v(x, ridgeY, W / 2); };

        // Roof planes (front slope, back slope) + the two gable end walls.
        addPlane(groups.roofPlanes, [eaveFront(0), eaveFront(L), ridgeAt(L), ridgeAt(0)], materials.roofPlane);
        addPlane(groups.roofPlanes, [ridgeAt(0), ridgeAt(L), eaveBack(L), eaveBack(0)], materials.roofPlane);
        addPlane(groups.roofPlanes, [eaveFront(0), eaveBack(0), ridgeAt(0)], materials.roofPlane);
        addPlane(groups.roofPlanes, [eaveFront(L), eaveBack(L), ridgeAt(L)], materials.roofPlane);

        // Ridge.
        addStick(groups.ridge, ridgeAt(0), ridgeAt(L), MEMBER.ridge, materials.ridge);

        // Common rafters — a pair (front slope + back slope) at every
        // spacing position along the length, including both ends.
        for (var x = 0; x <= L + 1e-6; x += rafterSpacingM) {
            var xc = Math.min(x, L);
            addStick(groups.rafters, eaveFront(xc), ridgeAt(xc), MEMBER.rafter, materials.rafter);
            addStick(groups.rafters, eaveBack(xc), ridgeAt(xc), MEMBER.rafter, materials.rafter);
            if (xc === L) { break; }
        }

        // Purlins and battens — horizontal members spaced up each slope,
        // running the full length.
        [purlinSpacingM, battenSpacingM].forEach(function (spacing, idx) {
            var group = idx === 0 ? groups.purlins : groups.battens;
            var material = idx === 0 ? materials.purlin : materials.batten;
            var thickness = idx === 0 ? MEMBER.purlin : MEMBER.batten;
            for (var d = spacing; d < slopeLength; d += spacing) {
                var t = d / slopeLength;
                var zFront = t * run;
                var yFront = EAVE_HEIGHT + t * rise;
                addStick(group, v(0, yFront, zFront), v(L, yFront, zFront), thickness, material);
                var zBack = W - t * run;
                addStick(group, v(0, yFront, zBack), v(L, yFront, zBack), thickness, material);
            }
        });
    }

    function buildHip(L, W, pitchDeg, rafterSpacingM, purlinSpacingM, battenSpacingM, groups, materials) {
        var pitchRad = pitchDeg * Math.PI / 180;
        var run = W / 2;
        var rise = run * Math.tan(pitchRad);
        var ridgeY = EAVE_HEIGHT + rise;
        var slopeLength = Math.hypot(run, rise);

        // Equal-pitch hips are set back by one run's worth of length from
        // each end. If the building is shorter than it is wide, the ridge
        // degenerates to a single point (a full pyramid hip).
        var ridgeStartX = Math.min(run, L / 2);
        var ridgeEndX = Math.max(L - run, L / 2);

        var frontCornerL = v(0, EAVE_HEIGHT, 0);
        var frontCornerR = v(L, EAVE_HEIGHT, 0);
        var backCornerL = v(0, EAVE_HEIGHT, W);
        var backCornerR = v(L, EAVE_HEIGHT, W);
        var ridgeL = v(ridgeStartX, ridgeY, W / 2);
        var ridgeR = v(ridgeEndX, ridgeY, W / 2);

        // 4 roof planes: front + back trapezoids, left + right end triangles.
        addPlane(groups.roofPlanes, [frontCornerL, frontCornerR, ridgeR, ridgeL], materials.roofPlane);
        addPlane(groups.roofPlanes, [ridgeL, ridgeR, backCornerR, backCornerL], materials.roofPlane);
        addPlane(groups.roofPlanes, [frontCornerL, backCornerL, ridgeL], materials.roofPlane);
        addPlane(groups.roofPlanes, [frontCornerR, backCornerR, ridgeR], materials.roofPlane);

        // Ridge (may be zero-length for a pyramid hip — makeStick no-ops then).
        addStick(groups.ridge, ridgeL, ridgeR, MEMBER.ridge, materials.ridge);

        // The 4 hip lines.
        addStick(groups.hipStructures, frontCornerL, ridgeL, MEMBER.hip, materials.hip);
        addStick(groups.hipStructures, backCornerL, ridgeL, MEMBER.hip, materials.hip);
        addStick(groups.hipStructures, frontCornerR, ridgeR, MEMBER.hip, materials.hip);
        addStick(groups.hipStructures, backCornerR, ridgeR, MEMBER.hip, materials.hip);

        /** Jack rafter end point on the front/back trapezoids: for an
         *  eave x within a hip's horizontal run, follow the same slope as
         *  a common rafter until it meets that hip line. */
        function hipSlopeEnd(x, cornerX, hipTopX, z0, zRidge) {
            var span = hipTopX - cornerX;
            var t = Math.abs(span) < 1e-6 ? 1 : (x - cornerX) / span;
            return v(x, EAVE_HEIGHT + t * rise, z0 + t * (zRidge - z0));
        }

        // Common + jack rafters on the front and back trapezoids.
        for (var x = 0; x <= L + 1e-6; x += rafterSpacingM) {
            var xc = Math.min(x, L);
            var frontStart = v(xc, EAVE_HEIGHT, 0);
            var backStart = v(xc, EAVE_HEIGHT, W);
            var frontEnd, backEnd;

            if (xc <= ridgeStartX) {
                frontEnd = hipSlopeEnd(xc, 0, ridgeStartX, 0, W / 2);
                backEnd = hipSlopeEnd(xc, 0, ridgeStartX, W, W / 2);
            } else if (xc >= ridgeEndX) {
                frontEnd = hipSlopeEnd(xc, L, ridgeEndX, 0, W / 2);
                backEnd = hipSlopeEnd(xc, L, ridgeEndX, W, W / 2);
            } else {
                frontEnd = v(xc, ridgeY, W / 2);
                backEnd = v(xc, ridgeY, W / 2);
            }

            addStick(groups.rafters, frontStart, frontEnd, MEMBER.rafter, materials.rafter);
            addStick(groups.rafters, backStart, backEnd, MEMBER.rafter, materials.rafter);
            if (xc === L) { break; }
        }

        // Purlins/battens on the front & back trapezoids, tapering
        // correctly at both hip ends, plus on the two end triangles.
        [purlinSpacingM, battenSpacingM].forEach(function (spacing, idx) {
            var group = idx === 0 ? groups.purlins : groups.battens;
            var material = idx === 0 ? materials.purlin : materials.batten;
            var thickness = idx === 0 ? MEMBER.purlin : MEMBER.batten;

            for (var d = spacing; d < slopeLength; d += spacing) {
                var t = d / slopeLength;
                var y = EAVE_HEIGHT + t * rise;
                var zFront = t * run;
                var zBack = W - t * run;
                var xStart = ridgeStartX - t * ridgeStartX;   // 0 -> ridgeStartX as t: 1 -> 0
                var xEnd = ridgeEndX + t * (L - ridgeEndX);   // L -> ridgeEndX as t: 1 -> 0

                addStick(group, v(xStart, y, zFront), v(xEnd, y, zFront), thickness, material);
                addStick(group, v(xStart, y, zBack), v(xEnd, y, zBack), thickness, material);

                // End triangles: a member from one hip line to the other
                // at this same slope height, on each end.
                var leftFront = v(xStart, y, zFront);
                var leftBack = v(xStart, y, zBack);
                addStick(group, leftFront, leftBack, thickness, material);
                var rightFront = v(xEnd, y, zFront);
                var rightBack = v(xEnd, y, zBack);
                addStick(group, rightFront, rightBack, thickness, material);
            }
        });
    }

    function buildFlat(L, W, rafterSpacingM, purlinSpacingM, battenSpacingM, groups, materials) {
        var roofY = EAVE_HEIGHT + PARAPET_HEIGHT;

        addPlane(groups.roofPlanes, [v(0, roofY, 0), v(L, roofY, 0), v(L, roofY, W), v(0, roofY, W)], materials.roofPlane);

        // Parapet upstand around the perimeter.
        var parapetMaterial = materials.roofPlane;
        addPlane(groups.roofPlanes, [v(0, EAVE_HEIGHT, 0), v(L, EAVE_HEIGHT, 0), v(L, roofY, 0), v(0, roofY, 0)], parapetMaterial);
        addPlane(groups.roofPlanes, [v(0, EAVE_HEIGHT, W), v(L, EAVE_HEIGHT, W), v(L, roofY, W), v(0, roofY, W)], parapetMaterial);
        addPlane(groups.roofPlanes, [v(0, EAVE_HEIGHT, 0), v(0, EAVE_HEIGHT, W), v(0, roofY, W), v(0, roofY, 0)], parapetMaterial);
        addPlane(groups.roofPlanes, [v(L, EAVE_HEIGHT, 0), v(L, EAVE_HEIGHT, W), v(L, roofY, W), v(L, roofY, 0)], parapetMaterial);

        // "Rafters" here are flat joists spanning the width; purlins and
        // battens form a perpendicular support grid beneath the deck.
        for (var x = 0; x <= L + 1e-6; x += rafterSpacingM) {
            var xc = Math.min(x, L);
            addStick(groups.rafters, v(xc, EAVE_HEIGHT, 0), v(xc, EAVE_HEIGHT, W), MEMBER.rafter, materials.rafter);
            if (xc === L) { break; }
        }
        [purlinSpacingM, battenSpacingM].forEach(function (spacing, idx) {
            var group = idx === 0 ? groups.purlins : groups.battens;
            var material = idx === 0 ? materials.purlin : materials.batten;
            var thickness = idx === 0 ? MEMBER.purlin : MEMBER.batten;
            for (var z = spacing; z < W; z += spacing) {
                addStick(group, v(0, EAVE_HEIGHT, z), v(L, EAVE_HEIGHT, z), thickness, material);
            }
        });
    }

    /* ---------------------------------------------------------------
       Public entry point
       --------------------------------------------------------------- */
    function build(shapes, properties) {
        if (!THREE || !geo) { return null; }

        var footprint = deriveFootprint(shapes, properties);
        var L = footprint.length;
        var W = footprint.width;

        var pitchDeg = parseFloat(properties.pitch);
        if (!isFinite(pitchDeg) || pitchDeg < 0) { pitchDeg = 25; }
        pitchDeg = Math.min(pitchDeg, 80);

        var rafterSpacingM = metresFromMm(properties.rafterSpacing, 600);
        var purlinSpacingM = metresFromMm(properties.purlinSpacing, 900);
        var battenSpacingM = DEFAULT_BATTEN_SPACING_MM / 1000;

        var materials = {
            roofPlane: new THREE.MeshLambertMaterial({ color: COLOR.roofPlane, side: THREE.DoubleSide }),
            rafter: new THREE.MeshLambertMaterial({ color: COLOR.rafter }),
            purlin: new THREE.MeshLambertMaterial({ color: COLOR.purlin }),
            batten: new THREE.MeshLambertMaterial({ color: COLOR.batten }),
            ridge: new THREE.MeshLambertMaterial({ color: COLOR.ridge }),
            hip: new THREE.MeshLambertMaterial({ color: COLOR.hip })
        };

        var root = new THREE.Group();
        var groups = {
            roofPlanes: new THREE.Group(),
            rafters: new THREE.Group(),
            purlins: new THREE.Group(),
            battens: new THREE.Group(),
            ridge: new THREE.Group(),
            hipStructures: new THREE.Group()
        };
        Object.keys(groups).forEach(function (key) {
            groups[key].name = key;
            root.add(groups[key]);
        });

        var roofType = (properties.roofType || '').toLowerCase();
        var isHip = roofType.indexOf('hip') !== -1;
        var isFlat = roofType.indexOf('flat') !== -1 || roofType.indexOf('hidden') !== -1;

        if (isFlat) {
            buildFlat(L, W, rafterSpacingM, purlinSpacingM, battenSpacingM, groups, materials);
        } else if (isHip) {
            buildHip(L, W, pitchDeg, rafterSpacingM, purlinSpacingM, battenSpacingM, groups, materials);
        } else {
            buildGable(L, W, pitchDeg, rafterSpacingM, purlinSpacingM, battenSpacingM, groups, materials);
        }

        // Centre the whole model on the origin so the camera always
        // frames it consistently regardless of footprint size.
        root.position.set(-L / 2, 0, -W / 2);

        var ridgeY = isFlat ? (EAVE_HEIGHT + PARAPET_HEIGHT) : (EAVE_HEIGHT + (W / 2) * Math.tan(pitchDeg * Math.PI / 180));

        return {
            group: root,
            groups: groups,
            footprint: footprint,
            bounds: {
                length: L, width: W, height: ridgeY,
                radius: Math.hypot(L / 2, W / 2, ridgeY)
            },
            roofType: isFlat ? 'flat' : (isHip ? 'hip' : 'gable')
        };
    }

    window.PhB = window.PhB || {};
    window.PhB.roof3DBuilder = { build: build, EAVE_HEIGHT: EAVE_HEIGHT };
})();
