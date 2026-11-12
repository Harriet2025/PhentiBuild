<?php
/**
 * PhentiBuild - API Health Check
 * GET /backend/api/ping.php
 * Confirms the PHP backend is reachable through XAMPP and that the
 * database connection itself is alive.
 */

require_once __DIR__ . '/../core/bootstrap.php';

getDbConnection()->query('SELECT 1');

Response::success([
    'app' => APP_NAME,
    'env' => APP_ENV,
    'database' => 'connected',
    'timestamp' => date('c'),
]);
