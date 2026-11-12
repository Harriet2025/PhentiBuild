<?php
/**
 * PhentiBuild - Vision Service Contract
 *
 * Architecture (see backend/api/scanner/detect.php and
 * frontend/js/modules/{vision-service,scanner}.js for the rest of it):
 *
 *   Camera → Vision Service → Detection Result → Measurement → User Confirmation → Calculation Engine
 *
 * VisionServiceInterface is the seam a real model integrates through —
 * whoever wires one up later implements detect() against a real
 * classifier/measurement model and swaps the instance built in
 * phb_vision_service() below. Nothing else in the app needs to change:
 * the API endpoint, the frontend client, and the scanner UI all already
 * speak this same result shape.
 *
 * UnavailableVisionService is what's actually wired in right now. It
 * does not simulate, randomize, or hardcode a detection — it always and
 * only reports that no model is connected. That is the honest state of
 * this feature today, and the UI is built to handle exactly this
 * response by routing straight to manual entry.
 */

interface VisionServiceInterface
{
    /**
     * @param string $imageBase64 Raw base64 image payload (no data: URI prefix)
     * @param string $mimeType    e.g. "image/jpeg"
     * @return array{
     *     status: string,
     *     objectType: ?string,
     *     label: ?string,
     *     measurements: array,
     *     confidence: ?float,
     *     message: string
     * }
     */
    public function detect(string $imageBase64, string $mimeType): array;
}

final class UnavailableVisionService implements VisionServiceInterface
{
    /** Kept here (not hidden in the frontend) so the single source of
     *  truth for "what this scanner will eventually recognize" lives
     *  next to the service that will eventually produce it. */
    public const PLANNED_OBJECT_TYPES = [
        ['id' => 'timber_2x2', 'category' => 'timber', 'label' => '2 × 2 Timber'],
        ['id' => 'timber_2x3', 'category' => 'timber', 'label' => '2 × 3 Timber'],
        ['id' => 'timber_2x4', 'category' => 'timber', 'label' => '2 × 4 Timber'],
        ['id' => 'timber_2x6', 'category' => 'timber', 'label' => '2 × 6 Timber'],
        ['id' => 'timber_4x4', 'category' => 'timber', 'label' => '4 × 4 Timber'],
        ['id' => 'exposed_wall', 'category' => 'wall', 'label' => 'Exposed Wall (length, height, surface area)'],
    ];

    public function detect(string $imageBase64, string $mimeType): array
    {
        return [
            'status' => 'not_configured',
            'objectType' => null,
            'label' => null,
            'measurements' => [],
            'confidence' => null,
            'message' => 'Computer vision detection is not connected yet. No model has been integrated, so nothing was auto-detected — enter the object type and measurements manually below.',
        ];
    }
}

/**
 * The one place a real implementation gets wired in. Everything
 * upstream (the API endpoint) calls this instead of constructing a
 * class directly, so connecting a real model later is a one-line change
 * here — not a change to the endpoint, the frontend client, or the UI.
 */
function phb_vision_service(): VisionServiceInterface
{
    return new UnavailableVisionService();
}
