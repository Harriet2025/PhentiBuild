<?php
/**
 * PhentiBuild - Company Profile API
 *
 * A single-document resource, same pattern as roof-designs — see
 * backend/models/CompanyProfile.php. There is no ?id= because there is
 * only ever the one company profile.
 *
 *   GET /backend/api/company-profile/index.php   Get the profile (auto-creates a blank one on first use)
 *   PUT /backend/api/company-profile/index.php   Save the profile (partial — only sent keys change)
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/CompanyProfile.php';

phb_require_auth();

$profile = new CompanyProfile(getDbConnection());
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        Response::success($profile->getCurrent());
        break;

    case 'PUT':
    case 'POST':
    case 'PATCH':
        handleSave($profile);
        break;

    default:
        Response::methodNotAllowed(['GET', 'PUT']);
}

function handleSave(CompanyProfile $profile): never
{
    $input = phb_json_input();
    $errors = [];
    $data = [];

    // Every field may be blanked out on purpose (e.g. clearing a
    // registration number), so presence is checked with
    // array_key_exists rather than Validator::validated() — that method
    // treats an empty string as "not sent", which would make a field
    // impossible to ever clear back to blank.
    if (array_key_exists('companyName', $input)) {
        $value = (string) $input['companyName'];
        if (mb_strlen($value) > 255) { $errors['companyName'] = 'Company name must be 255 characters or fewer.'; }
        $data['companyName'] = trim($value);
    }
    if (array_key_exists('address', $input)) {
        $value = (string) $input['address'];
        if (mb_strlen($value) > 500) { $errors['address'] = 'Address must be 500 characters or fewer.'; }
        $data['address'] = trim($value);
    }
    if (array_key_exists('phone', $input)) {
        $value = trim((string) $input['phone']);
        if ($value !== '') {
            $digits = preg_replace('/[\s\-().]/', '', $value);
            if (!preg_match('/^\+?\d{7,15}$/', $digits)) {
                $errors['phone'] = 'Phone must be a valid phone number (7–15 digits).';
            }
        }
        $data['phone'] = $value;
    }
    if (array_key_exists('email', $input)) {
        $value = trim((string) $input['email']);
        if ($value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Email must be a valid email address.';
        }
        $data['email'] = $value;
    }
    if (array_key_exists('registrationNumber', $input)) {
        $value = (string) $input['registrationNumber'];
        if (mb_strlen($value) > 100) { $errors['registrationNumber'] = 'Registration number must be 100 characters or fewer.'; }
        $data['registrationNumber'] = trim($value);
    }

    if (!empty($errors)) {
        Response::validationFailed($errors);
    }
    if (empty($data)) {
        Response::error('At least one field must be provided.', 400);
    }

    Response::success($profile->save($data));
}
