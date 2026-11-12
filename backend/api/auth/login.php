<?php
/**
 * PhentiBuild - Login
 * POST /backend/api/auth/login.php
 *
 * A wrong password and an unrecognised email both return the exact same
 * generic 401 — see User::verifyCredentials — so a failed login attempt
 * never reveals whether the email itself was even registered.
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/User.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::methodNotAllowed(['POST']);
}

$user = new User(getDbConnection());
$input = phb_json_input();
$v = new Validator($input);

$v->required('email', 'Email')->email('email', 'Email');
$v->required('password', 'Password');

if ($v->fails()) {
    Response::validationFailed($v->errors());
}

$data = $v->validated();
$verified = $user->verifyCredentials($data['email'], $data['password']);

if ($verified === null) {
    Response::error('Incorrect email or password.', 401);
}

phb_login_user($verified, !empty($input['remember']));
Response::success($verified);
