<?php
/**
 * PhentiBuild - Contact Configuration
 *
 * Centralizes every contact channel (WhatsApp, phone, email, social) so a
 * real number, address or handle is defined in exactly one place, rather
 * than typed directly into markup wherever a "Contact us" link happens to
 * appear. Same phb_env()-with-fallback pattern as DB_HOST/DB_PORT etc. in
 * config.php, so a real deployment can override any of these via .env
 * without touching code.
 *
 * An empty string means "not configured yet". Every place that renders a
 * social link checks for this first (see phb_social_links() below) so the
 * site never links to an account that doesn't exist.
 */
require_once __DIR__ . '/config.php';

// Primary line: used for the main WhatsApp CTA (wa.me link) and the main
// "Call PhentiBuild" tel: link throughout the site.
define('WHATSAPP_NUMBER', phb_env('WHATSAPP_NUMBER', '+233577577327'));
define('PHONE_NUMBER', phb_env('PHONE_NUMBER', '+233577577327'));

// Second line — also reachable on WhatsApp and by call, offered as an
// alternate option on the dedicated Contact page.
define('WHATSAPP_NUMBER_ALT', phb_env('WHATSAPP_NUMBER_ALT', '+233554072100'));
define('PHONE_NUMBER_ALT', phb_env('PHONE_NUMBER_ALT', '+233554072100'));

define('EMAIL_ADDRESS', phb_env('EMAIL_ADDRESS', 'phentibuild@gmail.com'));

// Social accounts — left blank (unconfigured) until PhentiBuild's official
// pages exist. Do not fill these with guessed/invented URLs.
define('FACEBOOK_URL', phb_env('FACEBOOK_URL', ''));
define('INSTAGRAM_URL', phb_env('INSTAGRAM_URL', ''));
define('TIKTOK_URL', phb_env('TIKTOK_URL', ''));
define('LINKEDIN_URL', phb_env('LINKEDIN_URL', ''));
define('X_URL', phb_env('X_URL', ''));

// Physical/business location — not yet provided; left blank on purpose.
define('LOCATION', phb_env('LOCATION', ''));

/**
 * A wa.me link for the given number (defaults to the primary WhatsApp
 * number). WhatsApp's API wants digits only, so any spaces, dashes,
 * parentheses or a leading "+" are stripped before building the URL.
 */
function phb_whatsapp_link(?string $number = null): string
{
    $digits = preg_replace('/\D/', '', $number ?? WHATSAPP_NUMBER);
    return 'https://wa.me/' . $digits;
}

function phb_tel_link(?string $number = null): string
{
    return 'tel:' . ($number ?? PHONE_NUMBER);
}

function phb_mailto_link(?string $email = null): string
{
    return 'mailto:' . ($email ?? EMAIL_ADDRESS);
}

/**
 * Every social account that actually has a URL configured, in display
 * order — used by both the footer and the Contact page so neither one
 * ever renders an icon linking to an account that isn't set up yet.
 *
 * @return array<string,array{label:string,url:string,icon:string}>
 */
function phb_social_links(): array
{
    $all = [
        'facebook'  => ['label' => 'Facebook',    'url' => FACEBOOK_URL,  'icon' => 'facebook'],
        'instagram' => ['label' => 'Instagram',   'url' => INSTAGRAM_URL, 'icon' => 'instagram'],
        'tiktok'    => ['label' => 'TikTok',      'url' => TIKTOK_URL,    'icon' => 'tiktok'],
        'linkedin'  => ['label' => 'LinkedIn',    'url' => LINKEDIN_URL,  'icon' => 'linkedin'],
        'x'         => ['label' => 'X (Twitter)', 'url' => X_URL,         'icon' => 'x'],
    ];

    return array_filter($all, function (array $item): bool {
        return trim($item['url']) !== '';
    });
}
