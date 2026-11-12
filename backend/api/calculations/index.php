<?php
/**
 * PhentiBuild - Calculation API
 *
 *   GET    /backend/api/calculations/index.php               List calculations (optional ?calculationType=)
 *   GET    /backend/api/calculations/index.php?id=5           Get a single calculation
 *   POST   /backend/api/calculations/index.php               Save a calculation run (input + result)
 *   PUT    /backend/api/calculations/index.php?id=5           Update a calculation's label/notes
 *   DELETE /backend/api/calculations/index.php?id=5           Delete a calculation
 *
 * The input/result pair is not editable once saved — see Calculation::update
 * — only its label and notes are, since a calculation record should stay a
 * faithful record of what was actually computed.
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/Calculation.php';

phb_require_auth();

$calculation = new Calculation(getDbConnection());
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            handleGetOne($calculation);
        } else {
            handleList($calculation);
        }
        break;

    case 'POST':
        handleCreate($calculation);
        break;

    case 'PUT':
    case 'PATCH':
        handleUpdate($calculation);
        break;

    case 'DELETE':
        handleDelete($calculation);
        break;

    default:
        Response::methodNotAllowed(['GET', 'POST', 'PUT', 'DELETE']);
}

function handleList(Calculation $calculation): never
{
    $filters = [];
    if (!empty($_GET['calculationType'])) {
        if (!in_array($_GET['calculationType'], Calculation::validCalculationTypes(), true)) {
            Response::error('Invalid calculationType filter.', 400);
        }
        $filters['calculationType'] = $_GET['calculationType'];
    }

    $rows = $calculation->all($filters);
    Response::success($rows, 200, ['count' => count($rows)]);
}

function handleGetOne(Calculation $calculation): never
{
    $id = phb_required_id_param();
    $row = $calculation->find($id);

    if ($row === null) {
        Response::notFound("Calculation $id was not found.");
    }

    Response::success($row);
}

function handleCreate(Calculation $calculation): never
{
    $input = phb_json_input();
    $v = new Validator($input);

    $v->required('calculationType', 'Calculation type')->in('calculationType', Calculation::validCalculationTypes(), 'Calculation type');
    $v->optional('label')->maxLength('label', 255, 'Label');
    $v->optional('notes')->maxLength('notes', 1000, 'Notes');

    if ($v->fails()) {
        Response::validationFailed($v->errors());
    }

    if (!isset($input['input']) || !is_array($input['input']) || empty($input['input'])) {
        Response::validationFailed(['input' => 'The calculation input is required.']);
    }
    if (!isset($input['result']) || !is_array($input['result']) || empty($input['result'])) {
        Response::validationFailed(['result' => 'The calculation result is required.']);
    }

    $data = $v->validated();
    $data['input'] = $input['input'];
    $data['result'] = $input['result'];

    $created = $calculation->create($data);
    Response::created($created);
}

function handleUpdate(Calculation $calculation): never
{
    $id = phb_required_id_param();
    $input = phb_json_input();
    $v = new Validator($input);

    $v->optional('label')->maxLength('label', 255, 'Label');
    $v->optional('notes')->maxLength('notes', 1000, 'Notes');

    if ($v->fails()) {
        Response::validationFailed($v->errors());
    }

    $validated = $v->validated();
    if (empty($validated)) {
        Response::error('At least one field (label or notes) must be provided to update.', 400);
    }

    $updated = $calculation->update($id, $validated);
    if ($updated === null) {
        Response::notFound("Calculation $id was not found.");
    }

    Response::success($updated);
}

function handleDelete(Calculation $calculation): never
{
    $id = phb_required_id_param();

    if ($calculation->find($id) === null) {
        Response::notFound("Calculation $id was not found.");
    }

    $calculation->delete($id);
    Response::success(['id' => $id, 'deleted' => true]);
}
