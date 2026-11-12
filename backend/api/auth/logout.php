<?php
/**
 * PhentiBuild - Logout
 * POST /backend/api/auth/logout.php
 */

require_once __DIR__ . '/../../core/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::methodNotAllowed(['POST']);
}

phb_logout_user();
Response::success(['loggedOut' => true]);
