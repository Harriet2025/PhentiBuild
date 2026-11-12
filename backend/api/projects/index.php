<?php
/**
 * PhentiBuild - Project API
 *
 *   GET    /backend/api/projects/index.php              List projects (optional ?status=&type= filters)
 *   GET    /backend/api/projects/index.php?id=5          Get a single project
 *   POST   /backend/api/projects/index.php               Create a project
 *   PUT    /backend/api/projects/index.php?id=5           Update a project (partial — only sent fields change)
 *   DELETE /backend/api/projects/index.php?id=5           Delete a project
 *
 * All responses are JSON: {"success":true,"data":...} or
 * {"success":false,"error":"...","errors":{...}} (errors only present
 * for 422 validation failures). See core/Response.php for the envelope
 * and core/bootstrap.php for how uncaught errors become clean JSON 500s
 * instead of leaking a stack trace or raw database error to the client.
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/Project.php';

phb_require_auth();

$project = new Project(getDbConnection());
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            handleGetOne($project);
        } else {
            handleList($project);
        }
        break;

    case 'POST':
        handleCreate($project);
        break;

    case 'PUT':
    case 'PATCH':
        handleUpdate($project);
        break;

    case 'DELETE':
        handleDelete($project);
        break;

    default:
        Response::methodNotAllowed(['GET', 'POST', 'PUT', 'DELETE']);
}

function handleList(Project $project): never
{
    $filters = [];

    if (!empty($_GET['status'])) {
        if (!in_array($_GET['status'], Project::validStatuses(), true)) {
            Response::error('Invalid status filter.', 400);
        }
        $filters['status'] = $_GET['status'];
    }

    if (!empty($_GET['type'])) {
        if (!in_array($_GET['type'], Project::validTypes(), true)) {
            Response::error('Invalid type filter.', 400);
        }
        $filters['type'] = $_GET['type'];
    }

    $projects = $project->all($filters);
    Response::success($projects, 200, ['count' => count($projects)]);
}

function handleGetOne(Project $project): never
{
    $id = phb_required_id_param();
    $row = $project->find($id);

    if ($row === null) {
        Response::notFound("Project $id was not found.");
    }

    Response::success($row);
}

function handleCreate(Project $project): never
{
    $input = phb_json_input();
    $v = new Validator($input);

    $v->required('name', 'Project name')->minLength('name', 3, 'Project name')->maxLength('name', 255, 'Project name');
    $v->required('client', 'Client name')->minLength('client', 2, 'Client name')->maxLength('client', 255, 'Client name');
    $v->required('contact', 'Client contact')->phoneOrEmail('contact', 'Client contact')->maxLength('contact', 255, 'Client contact');
    $v->required('location', 'Project location')->maxLength('location', 255, 'Project location');
    $v->required('type', 'Project type')->in('type', Project::validTypes(), 'Project type');
    $v->required('startDate', 'Start date')->date('startDate', 'Start date');
    $v->required('endDate', 'Expected completion date')
        ->date('endDate', 'Expected completion date')
        ->dateNotBefore('endDate', 'startDate', 'Expected completion date');
    $v->optional('description')->string('description', 'Description')->maxLength('description', 1000);

    if ($v->fails()) {
        Response::validationFailed($v->errors());
    }

    $created = $project->create($v->validated());
    Response::created($created);
}

function handleUpdate(Project $project): never
{
    $id = phb_required_id_param();
    $input = phb_json_input();
    $v = new Validator($input);

    $v->optional('name')->string('name', 'Project name')->minLength('name', 3, 'Project name')->maxLength('name', 255, 'Project name');
    $v->optional('client')->string('client', 'Client name')->minLength('client', 2, 'Client name')->maxLength('client', 255, 'Client name');
    $v->optional('contact')->phoneOrEmail('contact', 'Client contact')->maxLength('contact', 255, 'Client contact');
    $v->optional('location')->string('location', 'Project location')->maxLength('location', 255, 'Project location');
    $v->optional('type')->in('type', Project::validTypes(), 'Project type');
    $v->optional('description')->string('description', 'Description')->maxLength('description', 1000);
    $v->optional('startDate')->date('startDate', 'Start date');
    $v->optional('endDate')->date('endDate', 'Expected completion date');
    if (isset($input['startDate'], $input['endDate'])) {
        $v->dateNotBefore('endDate', 'startDate', 'Expected completion date');
    }
    $v->optional('progress')->integerBetween('progress', 0, 100, 'Progress');
    $v->optional('status')->in('status', Project::validStatuses(), 'Status');

    if ($v->fails()) {
        Response::validationFailed($v->errors());
    }

    $validated = $v->validated();
    if (empty($validated)) {
        Response::error('At least one field must be provided to update.', 400);
    }

    $updated = $project->update($id, $validated);
    if ($updated === null) {
        Response::notFound("Project $id was not found.");
    }

    Response::success($updated);
}

function handleDelete(Project $project): never
{
    $id = phb_required_id_param();

    if ($project->find($id) === null) {
        Response::notFound("Project $id was not found.");
    }

    $project->delete($id);
    Response::success(['id' => $id, 'deleted' => true]);
}
