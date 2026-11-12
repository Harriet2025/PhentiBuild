<?php
/**
 * PhentiBuild - API Bootstrap
 *
 * Required first by every endpoint under backend/api/. Wires up the
 * database, response/validation helpers, and — most importantly —
 * catches anything that goes wrong (a bad query, a typo'd array key, a
 * fatal error) and turns it into a clean JSON error response instead of
 * an HTML error page, a raw PHP warning, or a leaked stack trace. The
 * real detail always goes to the server error log, never to the client.
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Response.php';
require_once __DIR__ . '/Validator.php';
require_once __DIR__ . '/session.php';

header('Content-Type: application/json; charset=utf-8');

set_exception_handler(function (Throwable $e): void {
    error_log('[PhentiBuild API] Uncaught ' . get_class($e) . ': ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());

    if ($e instanceof PDOException) {
        Response::serverError('A database error occurred.');
    }
    Response::serverError();
});

set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
    // Respect @-suppressed errors and error_reporting() exclusions.
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

/**
 * Reads and JSON-decodes the request body. Returns an empty array for an
 * empty body (e.g. a DELETE with no payload) and fails cleanly with a
 * 400 for malformed JSON, rather than letting a null propagate into
 * validation and produce a confusing "field is required" message.
 */
function phb_json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
        Response::error('Request body must be valid JSON.', 400);
    }

    return $decoded;
}

/**
 * Reads the numeric id from the query string (?id=123), used by the
 * single-resource routes (get one / update / delete). Fails with 400 if
 * it's missing or not a positive integer, rather than letting an invalid
 * id reach a query.
 */
/**
 * Reads a non-empty string id from the query string, for resources
 * (like materials' MAT-#### ids) whose primary key isn't numeric.
 */
function phb_required_string_param(string $name = 'id'): string
{
    $value = $_GET[$name] ?? null;
    if (!is_string($value) || trim($value) === '') {
        Response::error("A valid $name is required.", 400);
    }
    return trim($value);
}

function phb_required_id_param(string $name = 'id'): int
{
    $value = $_GET[$name] ?? null;
    if ($value === null || !ctype_digit((string) $value) || (int) $value < 1) {
        Response::error("A valid $name is required.", 400);
    }
    return (int) $value;
}
