/* AUTO-CONVERTED from frontend/js/modules/roof-geometry.js — the original IIFE wrapper
   and window.PhB export were replaced by an ES module export. Every formula line
   is unchanged; web/src/domain/engines/engines.test.ts proves identical output. */
/**
 * PhentiBuild (PhB) - Roof Studio Geometry
 *
 * Pure geometry module for the 2D Roof Studio. No DOM, no canvas — just
 * shape data and the math needed to hit-test, measure and snap it. All
 * points are stored in real-world METRES, not pixels, so the drawing is
 * genuine structured geometric data: it means the same thing regardless
 * of zoom, pan or canvas size, and can be handed to a future 3D model or
 * AI layout stage without translation.
 *
 * Shape shape:
 *   { id: 'S1', type: 'line',      points: [{x,y}, {x,y}] }             // exactly 2 points
 *   { id: 'S2', type: 'rectangle', points: [{x,y}, {x,y}] }             // two opposite corners
 *   { id: 'S3', type: 'polygon',   points: [{x,y}, {x,y}, {x,y}, ...] } // 3+ points, implicitly closed
 */

var nextShapeNumber = 1;

function makeShapeId() {
    return 'S' + (nextShapeNumber++);
}

/** Keeps future ids from colliding with ones loaded from storage. */
function seedShapeIdCounter(shapes) {
    var highest = 0;
    (shapes || []).forEach(function (s) {
        var match = /^S(\d+)$/.exec(s.id || '');
        if (match) { highest = Math.max(highest, parseInt(match[1], 10)); }
    });
    nextShapeNumber = Math.max(nextShapeNumber, highest + 1);
}

function createShape(type, points) {
    return { id: makeShapeId(), type: type, points: points.map(function (p) { return { x: p.x, y: p.y }; }) };
}

/** A rectangle is stored as two opposite corners; this expands it to
 *  the 4 corners in drawing order (a closed loop). */
function rectangleCorners(points) {
    var a = points[0], b = points[1];
    return [
        { x: a.x, y: a.y },
        { x: b.x, y: a.y },
        { x: b.x, y: b.y },
        { x: a.x, y: b.y }
    ];
}

/** The ordered vertex list to draw/measure for any shape type — a line
 *  stays open (2 points), rectangle expands to 4 corners, polygon is
 *  used as-is. Does not repeat the first point at the end. */
function outlinePoints(shape) {
    if (shape.type === 'rectangle') { return rectangleCorners(shape.points); }
    return shape.points;
}

function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Length of each edge, in the same order as outlinePoints(). Lines
 *  have 1 edge; rectangles and polygons are closed, so edge count
 *  equals vertex count (last edge wraps back to the first vertex). */
function segmentLengths(shape) {
    var pts = outlinePoints(shape);
    var closed = shape.type !== 'line';
    var lengths = [];
    var count = closed ? pts.length : pts.length - 1;
    for (var i = 0; i < count; i++) {
        var a = pts[i];
        var b = pts[(i + 1) % pts.length];
        lengths.push(distance(a, b));
    }
    return lengths;
}

function perimeter(shape) {
    return segmentLengths(shape).reduce(function (sum, l) { return sum + l; }, 0);
}

/** Shoelace formula. Only meaningful for rectangle/polygon. */
function area(shape) {
    if (shape.type === 'line') { return 0; }
    var pts = outlinePoints(shape);
    var sum = 0;
    for (var i = 0; i < pts.length; i++) {
        var a = pts[i];
        var b = pts[(i + 1) % pts.length];
        sum += (a.x * b.y) - (b.x * a.y);
    }
    return Math.abs(sum) / 2;
}

function pointToSegmentDistance(p, a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var lengthSq = dx * dx + dy * dy;
    var t = lengthSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    var closest = { x: a.x + t * dx, y: a.y + t * dy };
    return distance(p, closest);
}

/** Standard ray-casting point-in-polygon test. */
function pointInPolygon(point, polygonPoints) {
    var inside = false;
    for (var i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
        var xi = polygonPoints[i].x, yi = polygonPoints[i].y;
        var xj = polygonPoints[j].x, yj = polygonPoints[j].y;
        var intersects = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersects) { inside = !inside; }
    }
    return inside;
}

/** True if the click point falls on or inside the shape, within
 *  `tolerance` world units for edge proximity. */
function shapeContainsPoint(shape, point, tolerance) {
    var pts = outlinePoints(shape);

    if (shape.type !== 'line' && pointInPolygon(point, pts)) { return true; }

    var closed = shape.type !== 'line';
    var edges = closed ? pts.length : pts.length - 1;
    for (var i = 0; i < edges; i++) {
        var a = pts[i];
        var b = pts[(i + 1) % pts.length];
        if (pointToSegmentDistance(point, a, b) <= tolerance) { return true; }
    }
    return false;
}

/** Returns the id of the topmost (last-drawn) shape under `point`, or
 *  null. Iterates in reverse so later shapes win on overlap. */
function hitTestShapes(shapes, point, tolerance) {
    for (var i = shapes.length - 1; i >= 0; i--) {
        if (shapeContainsPoint(shapes[i], point, tolerance)) { return shapes[i].id; }
    }
    return null;
}

function snapToGrid(value, gridSize) {
    return Math.round(value / gridSize) * gridSize;
}

function snapPoint(point, gridSize) {
    return { x: snapToGrid(point.x, gridSize), y: snapToGrid(point.y, gridSize) };
}

/** World-space bounding box across every shape, or null if there are
 *  none — used to "fit to view". */
function boundingBoxOfShapes(shapes) {
    if (!shapes.length) { return null; }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach(function (shape) {
        outlinePoints(shape).forEach(function (p) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
    });
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
}
export const roofGeometry = {
    createShape: createShape,
    seedShapeIdCounter: seedShapeIdCounter,
    rectangleCorners: rectangleCorners,
    outlinePoints: outlinePoints,
    distance: distance,
    segmentLengths: segmentLengths,
    perimeter: perimeter,
    area: area,
    pointToSegmentDistance: pointToSegmentDistance,
    pointInPolygon: pointInPolygon,
    shapeContainsPoint: shapeContainsPoint,
    hitTestShapes: hitTestShapes,
    snapToGrid: snapToGrid,
    snapPoint: snapPoint,
    boundingBoxOfShapes: boundingBoxOfShapes
};
