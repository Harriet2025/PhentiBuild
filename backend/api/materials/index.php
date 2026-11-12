<?php
/**
 * PhentiBuild - Material API
 *
 *   GET    /backend/api/materials/index.php                    List active materials (optional ?category=&includeInactive=1)
 *   GET    /backend/api/materials/index.php?id=MAT-1001          Get a single material (active or not)
 *   POST   /backend/api/materials/index.php                    Create a material
 *   PUT    /backend/api/materials/index.php?id=MAT-1001          Update a material (partial)
 *   DELETE /backend/api/materials/index.php?id=MAT-1001          Deactivate a material (soft delete — see Material::deactivate)
 *   DELETE /backend/api/materials/index.php?id=MAT-1001&reactivate=1   Reactivate a previously deactivated material
 *
 * See core/Response.php for the JSON envelope and core/bootstrap.php for
 * how uncaught errors become clean JSON 500s.
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/Material.php';

phb_require_auth();

$material = new Material(getDbConnection());
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            handleGetOne($material);
        } else {
            handleList($material);
        }
        break;

    case 'POST':
        handleCreate($material);
        break;

    case 'PUT':
    case 'PATCH':
        handleUpdate($material);
        break;

    case 'DELETE':
        handleDelete($material);
        break;

    default:
        Response::methodNotAllowed(['GET', 'POST', 'PUT', 'DELETE']);
}

function handleList(Material $material): never
{
    $filters = ['includeInactive' => !empty($_GET['includeInactive'])];

    if (!empty($_GET['category'])) {
        if (!in_array($_GET['category'], Material::validCategories(), true)) {
            Response::error('Invalid category filter.', 400);
        }
        $filters['category'] = $_GET['category'];
    }

    $materials = $material->all($filters);
    Response::success($materials, 200, ['count' => count($materials)]);
}

function handleGetOne(Material $material): never
{
    $id = phb_required_string_param();
    $row = $material->find($id);

    if ($row === null) {
        Response::notFound("Material $id was not found.");
    }

    Response::success($row);
}

function handleCreate(Material $material): never
{
    $input = phb_json_input();
    $v = new Validator($input);

    $v->required('name', 'Material name')->minLength('name', 2, 'Material name')->maxLength('name', 255, 'Material name');
    $v->required('category', 'Category')->in('category', Material::validCategories(), 'Category');
    $v->required('unit', 'Unit')->maxLength('unit', 100, 'Unit');
    $v->optional('dimensions')->maxLength('dimensions', 255, 'Dimensions');
    $v->optional('overallDimensions')->maxLength('overallDimensions', 255, 'Overall dimensions');
    $v->optional('effectiveCoverage')->maxLength('effectiveCoverage', 255, 'Effective coverage');
    $v->optional('standardLength')->maxLength('standardLength', 255, 'Standard length');
    $v->optional('spacing')->maxLength('spacing', 255, 'Spacing');
    $v->optional('description')->maxLength('description', 1000, 'Description');

    if ($v->fails()) {
        Response::validationFailed($v->errors());
    }

    $created = $material->create($v->validated());
    Response::created($created);
}

function handleUpdate(Material $material): never
{
    $id = phb_required_string_param();
    $input = phb_json_input();
    $v = new Validator($input);

    $v->optional('name')->minLength('name', 2, 'Material name')->maxLength('name', 255, 'Material name');
    $v->optional('category')->in('category', Material::validCategories(), 'Category');
    $v->optional('unit')->maxLength('unit', 100, 'Unit');
    $v->optional('dimensions')->maxLength('dimensions', 255, 'Dimensions');
    $v->optional('overallDimensions')->maxLength('overallDimensions', 255, 'Overall dimensions');
    $v->optional('effectiveCoverage')->maxLength('effectiveCoverage', 255, 'Effective coverage');
    $v->optional('standardLength')->maxLength('standardLength', 255, 'Standard length');
    $v->optional('spacing')->maxLength('spacing', 255, 'Spacing');
    $v->optional('description')->maxLength('description', 1000, 'Description');

    if ($v->fails()) {
        Response::validationFailed($v->errors());
    }

    $validated = $v->validated();
    if (empty($validated)) {
        Response::error('At least one field must be provided to update.', 400);
    }

    $updated = $material->update($id, $validated);
    if ($updated === null) {
        Response::notFound("Material $id was not found.");
    }

    Response::success($updated);
}

function handleDelete(Material $material): never
{
    $id = phb_required_string_param();

    $result = !empty($_GET['reactivate'])
        ? $material->reactivate($id)
        : $material->deactivate($id);

    if ($result === null) {
        Response::notFound("Material $id was not found.");
    }

    Response::success($result);
}
