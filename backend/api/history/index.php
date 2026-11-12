<?php
/**
 * PhentiBuild - History API
 *
 * Read-only by design — see backend/models/History.php for why there is
 * no create/update/delete here. Entries are written internally by other
 * models right after their own operations succeed. Requires a logged-in
 * session — an audit trail is exactly the kind of data that shouldn't be
 * readable by an anonymous request.
 *
 *   GET /backend/api/history/index.php                                    List recent entries (newest first, capped at 100)
 *   GET /backend/api/history/index.php?q=boq                              Search summary/user/project text
 *   GET /backend/api/history/index.php?date=2026-09-05                    Filter to one calendar date
 *   GET /backend/api/history/index.php?userId=3                           Filter to one user
 *   GET /backend/api/history/index.php?module=BOQ                         Filter to one module
 *   GET /backend/api/history/index.php?entityType=project                 Filter by entity type
 *   GET /backend/api/history/index.php?entityType=project&entityId=5      Filter to one entity's trail
 *   GET /backend/api/history/index.php?id=12                              Get a single entry
 *   GET /backend/api/history/index.php?limit=20                           Cap the list (max 500)
 *
 * The list response's meta also carries `users` and `modules` — the full
 * option sets for the History page's filter dropdowns, computed
 * independently of whatever filters are currently applied so the
 * dropdowns never shrink to just what's visible.
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/History.php';

phb_require_auth();

$history = new History(getDbConnection());
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    Response::methodNotAllowed(['GET']);
}

if (isset($_GET['id'])) {
    $id = phb_required_id_param();
    $row = $history->find($id);
    if ($row === null) {
        Response::notFound("History entry $id was not found.");
    }
    Response::success($row);
}

$filters = [];
if (!empty($_GET['entityType'])) {
    if (!in_array($_GET['entityType'], History::validEntityTypes(), true)) {
        Response::error('Invalid entityType filter.', 400);
    }
    $filters['entityType'] = $_GET['entityType'];
}
if (!empty($_GET['entityId'])) {
    $filters['entityId'] = (string) $_GET['entityId'];
}
if (!empty($_GET['module'])) {
    if (!in_array($_GET['module'], History::validModules(), true)) {
        Response::error('Invalid module filter.', 400);
    }
    $filters['module'] = $_GET['module'];
}
if (!empty($_GET['userId'])) {
    if (!ctype_digit((string) $_GET['userId'])) {
        Response::error('Invalid userId filter.', 400);
    }
    $filters['userId'] = (int) $_GET['userId'];
}
if (!empty($_GET['date'])) {
    $date = (string) $_GET['date'];
    $parsed = DateTime::createFromFormat('Y-m-d', $date);
    if (!$parsed || $parsed->format('Y-m-d') !== $date) {
        Response::error('Invalid date filter — expected YYYY-MM-DD.', 400);
    }
    $filters['date'] = $date;
}
if (!empty($_GET['q'])) {
    $filters['q'] = trim((string) $_GET['q']);
}

$limit = isset($_GET['limit']) && ctype_digit((string) $_GET['limit']) ? (int) $_GET['limit'] : 100;

$rows = $history->all($filters, $limit);

Response::success($rows, 200, [
    'count' => count($rows),
    'users' => $history->filterUsers(),
    'modules' => History::validModules(),
]);
