<?php
/**
 * PhentiBuild - Account Profile Update
 * PUT /backend/api/account/profile.php   { "name", "email", "phone", "role" }
 *
 * Getting the current profile reuses the existing
 * backend/api/auth/me.php rather than duplicating that lookup here —
 * this endpoint only handles the write side. On success it also
 * refreshes the session's cached name/role (see core/session.php's
 * phb_login_user, which is where those were first cached) so the app
 * shell's header reflects the change immediately, not just after the
 * next login.
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../models/History.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::methodNotAllowed(['PUT']);
}

$userId = phb_require_auth();
$input = phb_json_input();

// All four fields are required, not optional: the Settings form always
// submits the whole profile together (there is no partial-update UI for
// this endpoint), so an "optional" field left blank would otherwise be
// silently ignored by Validator::validated() instead of rejected —
// which would let a save "succeed" while quietly leaving the name blank.
$v = new Validator($input);
$v->required('name', 'Name')->minLength('name', 2, 'Name')->maxLength('name', 255, 'Name');
$v->required('email', 'Email')->email('email', 'Email')->maxLength('email', 255, 'Email');
$v->required('phone', 'Phone')->phone('phone', 'Phone');
$v->required('role', 'Role')->in('role', User::validRoles(), 'Role');
if ($v->fails()) {
    Response::validationFailed($v->errors());
}

$data = $v->validated();

$user = new User(getDbConnection());

if (isset($data['email']) && $user->emailTakenByAnother(strtolower($data['email']), $userId)) {
    Response::validationFailed(['email' => 'That email address is already in use.']);
}

$updated = $user->update($userId, $data);

if (isset($data['name'])) { $_SESSION['user_name'] = $updated['name']; }
if (isset($data['role'])) { $_SESSION['user_role'] = $updated['role']; }

History::record(getDbConnection(), 'account', (string) $userId, 'updated',
    'Profile was updated (' . implode(', ', array_keys($data)) . ').');

Response::success($updated);
