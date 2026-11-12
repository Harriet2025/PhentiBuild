/**
 * PhentiBuild (PhB) - Vision Service Client
 *
 * Architecture:
 *   Camera → Vision Service (this file) → Detection Result → Measurement
 *   → User Confirmation → Calculation Engine
 *
 * This is the only file scanner.js talks to for detection — it owns the
 * real network call to backend/api/scanner/detect.php and normalizes
 * whatever comes back into one shape. It never invents a result: if the
 * backend reports the vision model isn't connected (which, right now,
 * it always will — see backend/services/VisionService.php), that status
 * is passed straight through so the UI can be honest about it.
 */
(function () {
    'use strict';

    var DETECT_URL = '/PhentiBuild/backend/api/scanner/detect.php';

    /** Kept in sync with UnavailableVisionService::PLANNED_OBJECT_TYPES
     *  server-side; the server's copy in the detect() response meta is
     *  the source of truth, this is just a same-page fallback so the
     *  "planned recognition" list can render before the first request. */
    var FALLBACK_OBJECT_TYPES = [
        { id: 'timber_2x2', category: 'timber', label: '2 × 2 Timber' },
        { id: 'timber_2x3', category: 'timber', label: '2 × 3 Timber' },
        { id: 'timber_2x4', category: 'timber', label: '2 × 4 Timber' },
        { id: 'timber_2x6', category: 'timber', label: '2 × 6 Timber' },
        { id: 'timber_4x4', category: 'timber', label: '4 × 4 Timber' },
        { id: 'exposed_wall', category: 'wall', label: 'Exposed Wall (length, height, surface area)' }
    ];

    /** data:image/jpeg;base64,XXXX -> { base64: "XXXX", mimeType: "image/jpeg" } */
    function splitDataUrl(dataUrl) {
        var match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
        if (!match) { return null; }
        return { mimeType: match[1], base64: match[2] };
    }

    /**
     * @param {string} imageDataUrl A canvas.toDataURL() capture
     * @returns {Promise<{ok:boolean, status?:string, objectType?:?string,
     *   label?:?string, measurements?:object, confidence?:?number,
     *   message?:string, plannedObjectTypes?:array, error?:string, network?:boolean}>}
     */
    async function detect(imageDataUrl) {
        var parts = splitDataUrl(imageDataUrl);
        if (!parts) {
            return { ok: false, error: 'Captured frame could not be read.' };
        }

        var response;
        try {
            response = await fetch(DETECT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ image: parts.base64, mimeType: parts.mimeType })
            });
        } catch (networkError) {
            return { ok: false, network: true, error: 'Could not reach the vision service. Check your connection and try again.' };
        }

        var payload = null;
        try { payload = await response.json(); } catch (e) { /* no/invalid body */ }

        if (!response.ok) {
            return {
                ok: false,
                error: (payload && payload.error) || 'The vision service returned an unexpected error (' + response.status + ').'
            };
        }

        var data = (payload && payload.data) || {};
        return {
            ok: true,
            status: data.status || 'not_configured',
            objectType: data.objectType || null,
            label: data.label || null,
            measurements: data.measurements || {},
            confidence: typeof data.confidence === 'number' ? data.confidence : null,
            message: data.message || '',
            plannedObjectTypes: (payload && payload.plannedObjectTypes) || FALLBACK_OBJECT_TYPES
        };
    }

    window.PhB = window.PhB || {};
    window.PhB.visionService = {
        detect: detect,
        PLANNED_OBJECT_TYPES: FALLBACK_OBJECT_TYPES
    };
})();
