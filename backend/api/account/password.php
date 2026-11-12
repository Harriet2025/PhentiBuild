<?php
/**
 * PhentiBuild - Account Password Change
 * POST /backend/api/account/password.php
 *   { "currentPassword", "newPassword", "confirmNewPassword" }
 *
 * The current password must verify against the stored hash before a new
 * one is set — see User::changePassword(). A wrong current password is
 * reported as a normal 422 validation error on that field, not a 401 or
 * 403: the caller is already authenticated (phb_require_auth passed),
 * this is just proving they still know their own password before a
 * sensitive change, the same reasoning a re-auth prompt anywhere else
 * would follow.
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../models/History.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::methodNotAllowed(['POST']);
}

$userId = phb_require_auth();
$input = phb_json_input();

$v = new Validator($input);
$v->required('currentPassword', 'Current password');
$v->required('newPassword', 'New password')->minLength('newPassword', 8, 'New password')->maxLength('newPassword', 255, 'New password');
$v->required('confirmNewPassword', 'Confirm new password');
if ($v->fails()) {
    Response::validationFailed($v->errors());
}

if ($input['newPassword'] !== $input['confirmNewPassword']) {
    Response::validationFailed(['confirmNewPassword' => 'New password and confirmation do not match.']);
}

$user = new User(getDbConnection());
$changed = $user->changePassword($userId, (string) $input['currentPassword'], (string) $input['newPassword']);

if (!$changed) {
    Response::validationFailed(['currentPassword' => 'Current password is incorrect.']);
}

History::record(getDbConnection(), 'account', (string) $userId, 'updated', 'Password was changed.');

Response::success(['changed' => true]);
