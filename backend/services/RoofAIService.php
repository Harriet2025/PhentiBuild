<?php
/**
 * PhentiBuild - AI Roof Generation Service Contract
 *
 * Architecture (see backend/api/roof-ai/generate.php and
 * frontend/js/modules/{roof-ai-service,roof-ai}.js for the rest of it):
 *
 *   AI request → AI response → validation → geometry → 3D visualization
 *
 * The "geometry" this service produces is deliberately limited to the
 * same structured *parameters* the existing 2D Roof Studio already
 * understands (roof type, footprint, pitch, rafter/purlin spacing,
 * roofing material) — see backend/models/RoofDesign.php and
 * frontend/js/modules/roof-3d-builder.js. The actual rafter/purlin/hip
 * member geometry is, and stays, deterministic engineering math computed
 * by roof-3d-builder.js from those parameters. An AI model proposing raw
 * 3D mesh coordinates would be indistinguishable from hallucinated
 * geometry with no way to validate it; proposing design parameters that
 * feed the same trusted, already-built geometry engine is the honest
 * scope for "AI-generated" roof geometry here.
 *
 * RoofAIServiceInterface is the seam a real AI integration goes through.
 * HttpRoofAIService is a genuine, working implementation — it makes a
 * real HTTPS call, from PHP only (the API key never reaches the
 * browser) — but it only gets wired into phb_roof_ai_service() when
 * ROOF_AI_API_URL and ROOF_AI_API_KEY are actually set. In this
 * environment they are not, so UnavailableRoofAIService is what runs:
 * it makes no network call and always reports the honest
 * "not_configured" state, exactly like backend/services/VisionService.php
 * does for the Camera Scanner.
 */

/**
 * @phpstan-type RoofAIResult array{
 *     status: string,
 *     roofType: ?string,
 *     footprint: array{length: ?float, width: ?float},
 *     pitch: ?float,
 *     rafterSpacing: ?float,
 *     purlinSpacing: ?float,
 *     roofingMaterial: ?string,
 *     notes: ?string,
 *     message: string
 * }
 */
interface RoofAIServiceInterface
{
    /**
     * @param array $request The current Roof Studio context — whatever
     *   subset of roofType/footprint/pitch/rafterSpacing/purlinSpacing/
     *   roofingMaterial the caller already has filled in, used to seed
     *   or refine the AI's proposal. Every key is optional.
     * @return RoofAIResult
     */
    public function generate(array $request): array;
}

/**
 * The empty/default result shape, shared by every implementation so
 * callers never have to guess which keys exist.
 */
function phb_roof_ai_empty_result(string $status, string $message): array
{
    return [
        'status' => $status,
        'roofType' => null,
        'footprint' => ['length' => null, 'width' => null],
        'pitch' => null,
        'rafterSpacing' => null,
        'purlinSpacing' => null,
        'roofingMaterial' => null,
        'notes' => null,
        'message' => $message,
    ];
}

final class UnavailableRoofAIService implements RoofAIServiceInterface
{
    public function generate(array $request): array
    {
        return phb_roof_ai_empty_result(
            'not_configured',
            'AI roof generation is not connected yet. No external AI service has been configured (ROOF_AI_API_URL / ROOF_AI_API_KEY), so nothing was generated — set the roof properties manually in the panel on the right.'
        );
    }
}

/**
 * Validates and cleans a roof-geometry proposal — whether it came back
 * from a real AI call or (in tests) a hand-built array — against the
 * same bounds the rest of the app already treats as sane. Nothing here
 * invents a missing value; a field that fails or is absent simply stays
 * null in the cleaned result rather than being defaulted, so the caller
 * always knows exactly what the AI actually proposed versus what it
 * left blank.
 */
final class RoofGeometryValidator
{
    public const ALLOWED_ROOF_TYPES = ['Gable Roof', 'Hip Roof', 'Hidden/Flat Roof'];

    private const BOUNDS = [
        'length' => [1.0, 200.0],
        'width' => [1.0, 200.0],
        'pitch' => [0.0, 80.0],
        'rafterSpacing' => [100.0, 1200.0],
        'purlinSpacing' => [100.0, 1200.0],
    ];

    /**
     * @return array{ok: bool, errors: string[], clean: array}
     */
    public static function validate(array $data): array
    {
        $errors = [];
        $clean = [
            'roofType' => null,
            'footprint' => ['length' => null, 'width' => null],
            'pitch' => null,
            'rafterSpacing' => null,
            'purlinSpacing' => null,
            'roofingMaterial' => null,
            'notes' => null,
        ];

        if (isset($data['roofType'])) {
            if (is_string($data['roofType']) && in_array($data['roofType'], self::ALLOWED_ROOF_TYPES, true)) {
                $clean['roofType'] = $data['roofType'];
            } else {
                $errors[] = 'roofType must be one of: ' . implode(', ', self::ALLOWED_ROOF_TYPES) . '.';
            }
        }

        $footprint = is_array($data['footprint'] ?? null) ? $data['footprint'] : [];
        foreach (['length', 'width'] as $dim) {
            if (isset($footprint[$dim])) {
                $clean['footprint'][$dim] = self::checkNumber($footprint[$dim], $dim, self::BOUNDS[$dim], $errors);
            }
        }

        foreach (['pitch', 'rafterSpacing', 'purlinSpacing'] as $field) {
            if (isset($data[$field])) {
                $clean[$field] = self::checkNumber($data[$field], $field, self::BOUNDS[$field], $errors);
            }
        }

        if (isset($data['roofingMaterial'])) {
            if (is_string($data['roofingMaterial']) && mb_strlen($data['roofingMaterial']) <= 120) {
                $clean['roofingMaterial'] = trim($data['roofingMaterial']) ?: null;
            } else {
                $errors[] = 'roofingMaterial must be text of 120 characters or fewer.';
            }
        }

        if (isset($data['notes']) && is_string($data['notes'])) {
            $clean['notes'] = mb_substr(trim($data['notes']), 0, 500) ?: null;
        }

        return ['ok' => empty($errors), 'errors' => $errors, 'clean' => $clean];
    }

    /** @param array{0:float,1:float} $range */
    private static function checkNumber($value, string $label, array $range, array &$errors): ?float
    {
        if (!is_numeric($value)) {
            $errors[] = "$label must be a number.";
            return null;
        }
        $num = (float) $value;
        if ($num < $range[0] || $num > $range[1]) {
            $errors[] = "$label must be between {$range[0]} and {$range[1]}.";
            return null;
        }
        return $num;
    }
}

/**
 * A real, working call to an external AI service — targets any
 * OpenAI-compatible Chat Completions endpoint (the same request shape
 * OpenAI, Azure OpenAI, and most self-hosted LLM gateways accept), kept
 * generic rather than tied to one vendor's SDK so swapping providers is
 * a config change, not a code change. The API key is read from the
 * server environment and used only in a server-to-server request; it is
 * never sent to, or readable by, the browser.
 */
final class HttpRoofAIService implements RoofAIServiceInterface
{
    private string $apiUrl;
    private string $apiKey;
    private string $model;

    public function __construct(string $apiUrl, string $apiKey, string $model)
    {
        $this->apiUrl = $apiUrl;
        $this->apiKey = $apiKey;
        $this->model = $model;
    }

    public function generate(array $request): array
    {
        $prompt = $this->buildPrompt($request);

        $body = json_encode([
            'model' => $this->model,
            'messages' => [
                ['role' => 'system', 'content' => 'You are a structural roofing assistant. Reply with ONLY a single JSON object matching the requested schema — no prose, no markdown fences.'],
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.2,
        ], JSON_UNESCAPED_SLASHES);

        $ch = curl_init($this->apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->apiKey,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 8,
        ]);
        $raw = curl_exec($ch);
        $httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($raw === false || $curlError !== '') {
            error_log('[PhentiBuild RoofAI] Upstream call failed: ' . $curlError);
            return phb_roof_ai_empty_result('upstream_error', 'Could not reach the AI service. Try again shortly.');
        }
        if ($httpStatus < 200 || $httpStatus >= 300) {
            error_log("[PhentiBuild RoofAI] Upstream returned HTTP $httpStatus: " . substr((string) $raw, 0, 500));
            return phb_roof_ai_empty_result('upstream_error', "The AI service returned an error (HTTP $httpStatus).");
        }

        $envelope = json_decode((string) $raw, true);
        $content = $envelope['choices'][0]['message']['content'] ?? null;
        if (!is_string($content)) {
            return phb_roof_ai_empty_result('invalid_response', 'The AI service response was not in the expected format.');
        }

        // Models sometimes wrap JSON in a code fence despite instructions
        // not to — strip that before decoding rather than failing on it.
        $jsonText = trim($content);
        if (str_starts_with($jsonText, '```')) {
            $jsonText = preg_replace('/^```[a-zA-Z]*\n|\n```$/', '', $jsonText);
        }

        $decoded = json_decode($jsonText, true);
        if (!is_array($decoded)) {
            return phb_roof_ai_empty_result('invalid_response', 'The AI service reply could not be parsed as JSON.');
        }

        $validated = RoofGeometryValidator::validate($decoded);
        if (!$validated['ok']) {
            $result = phb_roof_ai_empty_result('invalid_response', 'The AI proposal failed validation: ' . implode(' ', $validated['errors']));
            return $result;
        }

        $clean = $validated['clean'];
        return [
            'status' => 'ok',
            'roofType' => $clean['roofType'],
            'footprint' => $clean['footprint'],
            'pitch' => $clean['pitch'],
            'rafterSpacing' => $clean['rafterSpacing'],
            'purlinSpacing' => $clean['purlinSpacing'],
            'roofingMaterial' => $clean['roofingMaterial'],
            'notes' => $clean['notes'],
            'message' => 'AI-generated roof layout proposal — review before accepting.',
        ];
    }

    private function buildPrompt(array $request): string
    {
        $schema = <<<SCHEMA
        {
          "roofType": one of "Gable Roof" | "Hip Roof" | "Hidden/Flat Roof",
          "footprint": { "length": metres, "width": metres },
          "pitch": degrees (0-80),
          "rafterSpacing": millimetres,
          "purlinSpacing": millimetres,
          "roofingMaterial": short product name,
          "notes": one short sentence explaining the choice
        }
        SCHEMA;

        $context = json_encode($request, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        return "Propose a structurally sensible roof design as a single JSON object matching this schema:\n$schema\n\n"
            . "Current known project inputs (any field may be blank — fill in a sensible value, keep any that are already set unless a different value is clearly better):\n$context";
    }
}

/**
 * The one place a real integration gets wired in. Everything upstream
 * (the API endpoint) calls this instead of constructing a class
 * directly, so connecting a real AI provider later is a config change
 * (setting ROOF_AI_API_URL / ROOF_AI_API_KEY / ROOF_AI_MODEL in .env) —
 * not a change to the endpoint, the frontend client, or the UI.
 */
function phb_roof_ai_service(): RoofAIServiceInterface
{
    $apiUrl = trim((string) phb_env('ROOF_AI_API_URL', ''));
    $apiKey = trim((string) phb_env('ROOF_AI_API_KEY', ''));
    $model = trim((string) phb_env('ROOF_AI_MODEL', '')) ?: 'gpt-4o-mini';

    if ($apiUrl === '' || $apiKey === '') {
        return new UnavailableRoofAIService();
    }

    return new HttpRoofAIService($apiUrl, $apiKey, $model);
}
