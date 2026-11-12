<?php
/**
 * PhentiBuild - Contact Form Submission
 * POST /backend/api/contact/submit.php
 *
 * Public endpoint (no session required) — anyone reaching the Contact
 * page can submit this. Server-side validation is the only validation
 * that's trusted; the frontend's own checks (frontend/js/modules/
 * contact.js) exist purely for immediate feedback.
 *
 * Email delivery is not wired up yet (no SMTP/mail service is
 * configured — see EMAIL_ADDRESS in backend/config/contact.php). Rather
 * than pretending an email was sent, every submission is stored in
 * contact_messages for manual follow-up, and the response says so
 * honestly via emailDelivery.
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../config/contact.php';
require_once __DIR__ . '/../../models/ContactMessage.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::methodNotAllowed(['POST']);
}

$input = phb_json_input();

// Honeypot: a real visitor never sees or fills this field (see
// .home-contact-hp in home.css). A non-empty value means a bot filled
// every field it could find, so we quietly report success without
// touching the database rather than tipping it off.
if (!empty(trim((string) ($input['website'] ?? '')))) {
    Response::created(['id' => null, 'status' => 'new', 'emailDelivery' => 'pending']);
}

$v = new Validator($input);
$v->required('name', 'Full name')->minLength('name', 2, 'Full name')->maxLength('name', 255, 'Full name');
$v->required('email', 'Email')->email('email', 'Email')->maxLength('email', 255, 'Email');
$v->optional('phone')->phone('phone', 'Phone');
$v->required('subject', 'Subject')->minLength('subject', 3, 'Subject')->maxLength('subject', 255, 'Subject');
$v->required('message', 'Message')->minLength('message', 10, 'Message')->maxLength('message', 5000, 'Message');

if ($v->fails()) {
    Response::validationFailed($v->errors());
}

$data = $v->validated();
// strip_tags: a contact message is stored and (eventually) read as plain
// text, not rendered as HTML anywhere — this keeps stray markup out of
// it rather than trusting every future reader to escape on output.
$data['name'] = strip_tags($data['name']);
$data['subject'] = strip_tags($data['subject']);
$data['message'] = strip_tags($data['message']);

$model = new ContactMessage(getDbConnection());
$created = $model->create($data);

Response::created([
    'id' => $created['id'],
    'status' => $created['status'],
    // No email transport is configured yet — see this file's header
    // comment. "pending" means the message was saved, not emailed.
    'emailDelivery' => 'pending',
]);
