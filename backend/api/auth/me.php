<?php
/**
 * PhentiBuild - Current Session
 * GET /backend/api/auth/me.php
 *
 * A protected endpoint: 401 with no active session, 200 with the user's
 * data (never the password hash) when logged in. Demonstrates
 * phb_require_auth() — the same guard any future protected API endpoint
 * would use.
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/User.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::methodNotAllowed(['GET']);
}

$userId = phb_require_auth();

$user = new User(getDbConnection());
$row = $user->findById($userId);

if ($row === null) {
    // The session outlived the account it pointed to (e.g. deleted from
    // the DB directly) — treat it as logged out rather than crashing.
    phb_logout_user();
    Response::error('Your session is no longer valid. Please log in again.', 401);
}

unset($row['password_hash']);
$row['id'] = (int) $row['id'];
Response::success($row);
