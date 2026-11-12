<?php
/**
 * PhentiBuild - Roof Design API
 *
 * A single-document resource, not a collection — see
 * backend/models/RoofDesign.php for why. There is no ?id= query param
 * because there is only ever the one current design.
 *
 *   GET    /backend/api/roof-designs/index.php    Get the current design (auto-creates a blank one on first use)
 *   POST   /backend/api/roof-designs/index.php    Save the design (shapes and/or properties) — same as PUT
 *   PUT    /backend/api/roof-designs/index.php    Save the design (partial — only sent keys change)
 *   DELETE /backend/api/roof-designs/index.php    Reset to a blank drawing with default properties
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/RoofDesign.php';

phb_require_auth();

$roofDesign = new RoofDesign(getDbConnection());
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        Response::success($roofDesign->getCurrent());
        break;

    case 'POST':
    case 'PUT':
    case 'PATCH':
        handleSave($roofDesign);
        break;

    case 'DELETE':
        Response::success($roofDesign->reset());
        break;

    default:
        Response::methodNotAllowed(['GET', 'POST', 'PUT', 'DELETE']);
}

function handleSave(RoofDesign $roofDesign): never
{
    $input = phb_json_input();
    $data = [];

    if (array_key_exists('shapes', $input)) {
        if (!is_array($input['shapes'])) {
            Response::validationFailed(['shapes' => 'Shapes must be an array.']);
        }
        foreach ($input['shapes'] as $shape) {
            if (!is_array($shape) || !isset($shape['id'], $shape['type'], $shape['points']) || !is_array($shape['points'])) {
                Response::validationFailed(['shapes' => 'Each shape needs an id, a type and a points array.']);
            }
        }
        $data['shapes'] = $input['shapes'];
    }

    if (array_key_exists('properties', $input)) {
        if (!is_array($input['properties'])) {
            Response::validationFailed(['properties' => 'Properties must be an object.']);
        }
        $data['properties'] = $input['properties'];
    }

    if (empty($data)) {
        Response::error('At least one of "shapes" or "properties" must be provided.', 400);
    }

    Response::success($roofDesign->save($data));
}
