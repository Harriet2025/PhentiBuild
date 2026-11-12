<?php
/**
 * PhentiBuild - API Response Helper
 *
 * Every endpoint replies through this class, so the response envelope
 * and HTTP status codes stay consistent across all resources (Projects
 * now; Measurements, Calculations, Materials, BOQs, Roof Designs, Users
 * and History as they're added). Every method ends the request — an
 * endpoint calls exactly one of these and nothing executes after it.
 */
final class Response
{
    public static function success($data = null, int $status = 200, array $meta = []): never
    {
        self::send(array_merge([
            'success' => true,
            'data' => $data,
        ], $meta), $status);
    }

    public static function created($data = null): never
    {
        self::success($data, 201);
    }

    /**
     * @param array<string,string> $errors Field-level validation messages, keyed by field name.
     */
    public static function error(string $message, int $status = 400, array $errors = []): never
    {
        $body = [
            'success' => false,
            'error' => $message,
        ];
        if (!empty($errors)) {
            $body['errors'] = $errors;
        }
        self::send($body, $status);
    }

    public static function notFound(string $message = 'Resource not found.'): never
    {
        self::error($message, 404);
    }

    public static function validationFailed(array $errors): never
    {
        self::error('Validation failed.', 422, $errors);
    }

    public static function methodNotAllowed(array $allowed): never
    {
        header('Allow: ' . implode(', ', $allowed));
        self::error('Method not allowed.', 405);
    }

    public static function serverError(string $message = 'An unexpected error occurred.'): never
    {
        self::error($message, 500);
    }

    private static function send(array $body, int $status): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($body, JSON_UNESCAPED_SLASHES);
        exit;
    }
}
