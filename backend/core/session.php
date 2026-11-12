<?php
/**
 * PhentiBuild - Session Management
 *
 * Required by core/bootstrap.php, so every API endpoint has a started
 * session available. Cookie flags are set BEFORE session_start() (PHP
 * ignores changes made after) and are what actually keeps the session
 * token safe:
 *   - httponly: JavaScript can never read the session cookie via
 *     document.cookie — this is the real mechanism behind "never expose
 *     credentials to JavaScript" for anything session-related. The
 *     frontend never sees a token to store or leak; the browser just
 *     sends the cookie automatically with same-origin fetch() calls.
 *   - samesite=Lax: the cookie isn't sent on cross-site requests, a
 *     cheap, standard CSRF mitigation appropriate for a same-origin app
 *     with no cross-site posting scenario.
 *   - secure: only when the request actually arrived over HTTPS —
 *     forcing it unconditionally would break the session on this XAMPP
 *     dev box, which serves plain HTTP on localhost.
 */

if (session_status() === PHP_SESSION_NONE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    session_name('phb_session');
    session_start();
}

/** The logged-in user's id, or null if there is no active session. */
function phb_current_user_id(): ?int
{
    return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
}

function phb_is_authenticated(): bool
{
    return phb_current_user_id() !== null;
}

/**
 * Establishes the session for a just-verified user. Regenerates the
 * session id first (session fixation prevention: a pre-login session id
 * — one an attacker could have handed the victim — must never carry
 * authenticated privileges).
 *
 * When $remember is true, the session cookie's expiry is pushed out to
 * 30 days instead of the default "until the browser closes" — the only
 * difference "remember me" makes here. It still carries the same
 * httponly/samesite/secure flags, so it's just a longer-lived version of
 * the exact same protected cookie, not a separate token.
 */
function phb_login_user(array $user, bool $remember = false): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_role'] = $user['role'];

    if ($remember) {
        $params = session_get_cookie_params();
        setcookie(session_name(), session_id(), [
            'expires' => time() + 30 * 24 * 60 * 60,
            'path' => $params['path'],
            'domain' => $params['domain'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'],
        ]);
    }
}

function phb_logout_user(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }

    session_destroy();
}

/**
 * For any endpoint that must be logged in — sends a 401 JSON response
 * and stops execution otherwise. Called after core/bootstrap.php's own
 * requires, so Response is already available.
 */
function phb_require_auth(): int
{
    $userId = phb_current_user_id();
    if ($userId === null) {
        Response::error('You must be logged in to do that.', 401);
    }
    return $userId;
}
