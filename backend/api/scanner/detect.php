<?php
/**
 * PhentiBuild - Scanner Detection Endpoint
 * POST /backend/api/scanner/detect.php   { "image": "<base64>", "mimeType": "image/jpeg" }
 *
 * The real network hop in the Camera → Vision Service → Detection
 * Result chain — see backend/services/VisionService.php for why this
 * always reports "not_configured" right now rather than fabricating a
 * result. That's a normal, well-formed response (HTTP 200), not an
 * error: the vision service is working exactly as built, it just has no
 * model behind it yet.
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../services/VisionService.php';

phb_require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::methodNotAllowed(['POST']);
}

$input = phb_json_input();

$v = new Validator($input);
$v->required('image', 'Image');
$v->optional('mimeType');
if ($v->fails()) {
    Response::validationFailed($v->errors());
}

$image = (string) $input['image'];
$mimeType = (string) ($input['mimeType'] ?? 'image/jpeg');

// A generous but real cap — a single compressed camera frame has no
// business being larger than this; reject early rather than let an
// oversized payload reach the (currently unused) decode step.
if (strlen($image) > 8 * 1024 * 1024) {
    Response::error('Captured image is too large.', 413);
}

$result = phb_vision_service()->detect($image, $mimeType);

Response::success($result, 200, [
    'plannedObjectTypes' => UnavailableVisionService::PLANNED_OBJECT_TYPES,
]);
