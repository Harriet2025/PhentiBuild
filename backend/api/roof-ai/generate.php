<?php
/**
 * PhentiBuild - AI Roof Generation Endpoint
 * POST /backend/api/roof-ai/generate.php
 *   { "roofType": "Gable Roof", "footprint": {"length":12,"width":9},
 *     "pitch": 30, "rafterSpacing": 600, "purlinSpacing": 900,
 *     "roofingMaterial": "IBR Long Span Roofing Sheet" }
 *
 * Every field is optional — the client sends whatever the Roof Studio
 * properties panel currently has filled in, as context for the AI to
 * refine or fill the rest of. See backend/services/RoofAIService.php
 * for why this always reports "not_configured" honestly rather than
 * fabricating a design when no AI provider is connected (which, in this
 * environment, is always right now).
 *
 *   Camera... (n/a here) — this is the roof-generation equivalent of
 *   backend/api/scanner/detect.php:
 *   AI request → AI response → validation → geometry → 3D visualization
 *   (validation + the geometry/3D steps happen in RoofGeometryValidator
 *   and the existing frontend/js/modules/roof-3d-builder.js respectively)
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../services/RoofAIService.php';

phb_require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::methodNotAllowed(['POST']);
}

$input = phb_json_input();

$v = new Validator($input);
$v->optional('roofType')->in('roofType', RoofGeometryValidator::ALLOWED_ROOF_TYPES, 'Roof type');
$v->optional('pitch')->numeric('pitch', 'Pitch', 0);
$v->optional('rafterSpacing')->numeric('rafterSpacing', 'Rafter spacing', 0);
$v->optional('purlinSpacing')->numeric('purlinSpacing', 'Purlin spacing', 0);
$v->optional('roofingMaterial')->string('roofingMaterial', 'Roofing material')->maxLength('roofingMaterial', 120, 'Roofing material');
if ($v->fails()) {
    Response::validationFailed($v->errors());
}

$footprint = ['length' => null, 'width' => null];
if (isset($input['footprint']) && is_array($input['footprint'])) {
    foreach (['length', 'width'] as $dim) {
        if (isset($input['footprint'][$dim]) && is_numeric($input['footprint'][$dim])) {
            $footprint[$dim] = (float) $input['footprint'][$dim];
        }
    }
}

$request = array_merge($v->validated(), ['footprint' => $footprint]);

$result = phb_roof_ai_service()->generate($request);

Response::success($result, 200, [
    'allowedRoofTypes' => RoofGeometryValidator::ALLOWED_ROOF_TYPES,
]);
