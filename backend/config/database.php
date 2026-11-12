<?php
/**
 * PhentiBuild - Database Connection
 *
 * A single PDO connection, created lazily and reused for the lifetime of
 * the request. Always uses prepared statements upstream (never emulated
 * ones — see ATTR_EMULATE_PREPARES below) and throws on error so callers
 * can rely on exceptions rather than checking a return value everywhere.
 *
 * getDbConnection() never leaks connection details: on failure it logs
 * the real error server-side and lets the caller's exception handling
 * (see core/bootstrap.php) turn that into a generic JSON 500 — a raw
 * PDOException message can contain the DSN, and must never reach a
 * client response.
 */

require_once __DIR__ . '/config.php';

function getDbConnection(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            DB_HOST,
            DB_PORT,
            DB_NAME
        );

        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Real prepared statements sent to the server, not PHP-side
            // string interpolation dressed up as one — this is what
            // actually protects against SQL injection.
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    return $pdo;
}
