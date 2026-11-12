<?php
/**
 * PhentiBuild - Global Configuration
 *
 * Loads settings from a .env file at the project root when one exists,
 * falling back to sane local-development defaults so the app still runs
 * out of the box on a fresh XAMPP install. Real deployments should set
 * these as actual environment variables (or ship a .env — see .env.example)
 * rather than editing this file, and .env is git-ignored so credentials
 * never end up committed alongside the code.
 */

/**
 * Minimal .env loader: KEY=VALUE per line, "#" comments, blank lines
 * skipped. Never overwrites a variable the environment already set, so a
 * real server environment variable always wins over the file.
 */
function phb_load_env(string $path): void
{
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        // Strip matching surrounding quotes, e.g. DB_PASS="secret".
        if (strlen($value) >= 2 && $value[0] === $value[-1] && ($value[0] === '"' || $value[0] === "'")) {
            $value = substr($value, 1, -1);
        }

        if (getenv($key) === false) {
            putenv("$key=$value");
        }
    }
}

phb_load_env(__DIR__ . '/../../.env');

/**
 * Reads an environment variable with a fallback default.
 */
function phb_env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

// --- Database connection settings ---
// Defaults match a stock XAMPP install (MariaDB on the port XAMPP's own
// mysqld actually listens on — commonly 3306, but this machine's XAMPP is
// configured for 3307 because a separate MySQL Server install already
// holds 3306). Override via .env for any other environment.
define('DB_HOST', phb_env('DB_HOST', '127.0.0.1'));
define('DB_PORT', (int) phb_env('DB_PORT', '3307'));
define('DB_NAME', phb_env('DB_NAME', 'phentibuild'));
define('DB_USER', phb_env('DB_USER', 'root'));
define('DB_PASS', phb_env('DB_PASS', ''));

// --- Application settings ---
define('APP_NAME', 'PhentiBuild');
define('APP_SHORT_NAME', 'PhB');
define('APP_ENV', phb_env('APP_ENV', 'development'));

// Base URL of the app as served by XAMPP (adjust if folder name changes)
define('BASE_URL', phb_env('BASE_URL', 'http://localhost/PhentiBuild'));

// --- Error reporting ---
// Development shows errors on screen; anything else (staging/production)
// must never leak PHP errors into a response — the API's error handler
// (see core/bootstrap.php) always returns clean JSON regardless of this
// setting, but display_errors is an extra belt-and-braces guard against
// stray output from misconfigured or third-party code.
error_reporting(E_ALL);
ini_set('display_errors', APP_ENV === 'development' ? '1' : '0');
