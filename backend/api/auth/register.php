<?php
/**
 * PhentiBuild - Register
 * POST /backend/api/auth/register.php
 *
 * Creates an account only — it does not log the new user in. Login is a
 * deliberately separate, explicit step (see login.php), so the two flows
 * stay independently testable and a freshly created account is verified
 * against the real login path rather than assumed to work.
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/User.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::methodNotAllowed(['POST']);
}

$user = new User(getDbConnection());
$input = phb_json_input();
$v = new Validator($input);

$v->required('name', 'Name')->minLength('name', 2, 'Name')->maxLength('name', 255, 'Name');
$v->required('email', 'Email')->email('email', 'Email')->maxLength('email', 255, 'Email');
$v->required('phone', 'Phone')->phone('phone', 'Phone');
$v->required('password', 'Password')->minLength('password', 8, 'Password')->maxLength('password', 255, 'Password');
$v->required('role', 'Role')->in('role', User::validRoles(), 'Role');

if ($v->fails()) {
    Response::validationFailed($v->errors());
}

$data = $v->validated();

if ($user->emailExists($data['email'])) {
    Response::validationFailed(['email' => 'An account with this email already exists.']);
}

$created = $user->create($data);
Response::created($created);
