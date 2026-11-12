<?php
/**
 * PhentiBuild - Measurement API
 *
 *   GET    /backend/api/measurements/index.php                 List measurements (optional ?sectionType=)
 *   GET    /backend/api/measurements/index.php?id=5             Get a single measurement
 *   POST   /backend/api/measurements/index.php                 Create a measurement
 *   PUT    /backend/api/measurements/index.php?id=5             Update a measurement (partial)
 *   DELETE /backend/api/measurements/index.php?id=5             Delete a measurement
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/Measurement.php';

phb_require_auth();

$measurement = new Measurement(getDbConnection());
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            handleGetOne($measurement);
        } else {
            handleList($measurement);
        }
        break;

    case 'POST':
        handleCreate($measurement);
        break;

    case 'PUT':
    case 'PATCH':
        handleUpdate($measurement);
        break;

    case 'DELETE':
        handleDelete($measurement);
        break;

    default:
        Response::methodNotAllowed(['GET', 'POST', 'PUT', 'DELETE']);
}

function handleList(Measurement $measurement): never
{
    $filters = [];
    if (!empty($_GET['sectionType'])) {
        if (!in_array($_GET['sectionType'], Measurement::validSectionTypes(), true)) {
            Response::error('Invalid sectionType filter.', 400);
        }
        $filters['sectionType'] = $_GET['sectionType'];
    }

    $rows = $measurement->all($filters);
    Response::success($rows, 200, ['count' => count($rows)]);
}

function handleGetOne(Measurement $measurement): never
{
    $id = phb_required_id_param();
    $row = $measurement->find($id);

    if ($row === null) {
        Response::notFound("Measurement $id was not found.");
    }

    Response::success($row);
}

function validateValuesPayload(array $input, Validator $v): void
{
    if (!isset($input['values']) || !is_array($input['values']) || empty($input['values'])) {
        Response::error('Validation failed.', 422, ['values' => 'At least one measurement value is required.']);
    }
}

function handleCreate(Measurement $measurement): never
{
    $input = phb_json_input();
    $v = new Validator($input);

    $v->required('sectionType', 'Section type')->in('sectionType', Measurement::validSectionTypes(), 'Section type');
    $v->optional('label')->maxLength('label', 255, 'Label');
    $v->optional('notes')->maxLength('notes', 1000, 'Notes');

    if ($v->fails()) {
        Response::validationFailed($v->errors());
    }
    validateValuesPayload($input, $v);

    $data = $v->validated();
    $data['values'] = $input['values'];

    $created = $measurement->create($data);
    Response::created($created);
}

function handleUpdate(Measurement $measurement): never
{
    $id = phb_required_id_param();
    $input = phb_json_input();
    $v = new Validator($input);

    $v->optional('label')->maxLength('label', 255, 'Label');
    $v->optional('notes')->maxLength('notes', 1000, 'Notes');

    if ($v->fails()) {
        Response::validationFailed($v->errors());
    }

    $data = $v->validated();
    if (isset($input['values'])) {
        if (!is_array($input['values']) || empty($input['values'])) {
            Response::error('Validation failed.', 422, ['values' => 'At least one measurement value is required.']);
        }
        $data['values'] = $input['values'];
    }

    if (empty($data)) {
        Response::error('At least one field must be provided to update.', 400);
    }

    $updated = $measurement->update($id, $data);
    if ($updated === null) {
        Response::notFound("Measurement $id was not found.");
    }

    Response::success($updated);
}

function handleDelete(Measurement $measurement): never
{
    $id = phb_required_id_param();

    if ($measurement->find($id) === null) {
        Response::notFound("Measurement $id was not found.");
    }

    $measurement->delete($id);
    Response::success(['id' => $id, 'deleted' => true]);
}
