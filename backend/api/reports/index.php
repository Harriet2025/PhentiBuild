<?php
/**
 * PhentiBuild - Report API
 *
 * Backend foundation only — no frontend page exists to connect yet (see
 * backend/database/reports.sql for why).
 *
 *   GET    /backend/api/reports/index.php                List reports (optional ?projectId=)
 *   GET    /backend/api/reports/index.php?id=5             Get a single report
 *   POST   /backend/api/reports/index.php                Create a report
 *   PUT    /backend/api/reports/index.php?id=5             Update a report (partial)
 *   DELETE /backend/api/reports/index.php?id=5             Delete a report
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/Report.php';

phb_require_auth();

$report = new Report(getDbConnection());
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            handleGetOne($report);
        } else {
            handleList($report);
        }
        break;

    case 'POST':
        handleCreate($report);
        break;

    case 'PUT':
    case 'PATCH':
        handleUpdate($report);
        break;

    case 'DELETE':
        handleDelete($report);
        break;

    default:
        Response::methodNotAllowed(['GET', 'POST', 'PUT', 'DELETE']);
}

function handleList(Report $report): never
{
    $filters = [];
    if (!empty($_GET['projectId'])) {
        if (!ctype_digit((string) $_GET['projectId'])) {
            Response::error('Invalid projectId filter.', 400);
        }
        $filters['projectId'] = (int) $_GET['projectId'];
    }

    $rows = $report->all($filters);
    Response::success($rows, 200, ['count' => count($rows)]);
}

function handleGetOne(Report $report): never
{
    $id = phb_required_id_param();
    $row = $report->find($id);

    if ($row === null) {
        Response::notFound("Report $id was not found.");
    }

    Response::success($row);
}

function validateProjectId(Report $report, Validator $v, array $input): void
{
    if (!array_key_exists('projectId', $input) || $input['projectId'] === null || $input['projectId'] === '') {
        return;
    }
    if (!ctype_digit((string) $input['projectId']) || !$report->projectExists((int) $input['projectId'])) {
        Response::validationFailed(['projectId' => 'That project does not exist.']);
    }
}

function handleCreate(Report $report): never
{
    $input = phb_json_input();
    $v = new Validator($input);

    $v->required('title', 'Title')->maxLength('title', 255, 'Title');
    $v->optional('type')->maxLength('type', 50, 'Type');
    $v->optional('notes')->maxLength('notes', 2000, 'Notes');

    if ($v->fails()) {
        Response::validationFailed($v->errors());
    }
    validateProjectId($report, $v, $input);

    $data = $v->validated();
    if (isset($input['projectId']) && $input['projectId'] !== '') {
        $data['projectId'] = (int) $input['projectId'];
    }
    if (isset($input['content'])) {
        $data['content'] = $input['content'];
    }

    $created = $report->create($data);
    Response::created($created);
}

function handleUpdate(Report $report): never
{
    $id = phb_required_id_param();
    $input = phb_json_input();
    $v = new Validator($input);

    $v->optional('title')->maxLength('title', 255, 'Title');
    $v->optional('type')->maxLength('type', 50, 'Type');
    $v->optional('notes')->maxLength('notes', 2000, 'Notes');

    if ($v->fails()) {
        Response::validationFailed($v->errors());
    }
    validateProjectId($report, $v, $input);

    $data = $v->validated();
    if (array_key_exists('projectId', $input)) {
        $data['projectId'] = ($input['projectId'] === '' || $input['projectId'] === null) ? null : (int) $input['projectId'];
    }
    if (array_key_exists('content', $input)) {
        $data['content'] = $input['content'];
    }

    if (empty($data)) {
        Response::error('At least one field must be provided to update.', 400);
    }

    $updated = $report->update($id, $data);
    if ($updated === null) {
        Response::notFound("Report $id was not found.");
    }

    Response::success($updated);
}

function handleDelete(Report $report): never
{
    $id = phb_required_id_param();

    if ($report->find($id) === null) {
        Response::notFound("Report $id was not found.");
    }

    $report->delete($id);
    Response::success(['id' => $id, 'deleted' => true]);
}
