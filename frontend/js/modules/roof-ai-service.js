/**
 * PhentiBuild (PhB) - AI Roof Generation Client
 *
 * Architecture:
 *   AI request (this file) → AI response → validation (server-side,
 *   RoofGeometryValidator) → geometry → 3D visualization (roof-ai.js
 *   hands an accepted proposal to PhB.roofStudioStore, which the
 *   existing roof-3d-builder.js / roof-3d-viewer.js already render).
 *
 * This is the only file that talks to backend/api/roof-ai/generate.php.
 * It never invents a proposal client-side: if the backend reports the
 * AI service isn't connected (which, right now, it always will — see
 * backend/services/RoofAIService.php), that status is passed straight
 * through so the UI can be honest about it, exactly like
 * vision-service.js does for the Camera Scanner.
 */
(function () {
    'use strict';

    var GENERATE_URL = '/PhentiBuild/backend/api/roof-ai/generate.php';

    var FALLBACK_ROOF_TYPES = ['Gable Roof', 'Hip Roof', 'Hidden/Flat Roof'];

    /**
     * @param {{roofType?:string, footprint?:{length?:number,width?:number},
     *   pitch?:number, rafterSpacing?:number, purlinSpacing?:number,
     *   roofingMaterial?:string}} request Current Roof Studio context —
     *   every field optional.
     * @returns {Promise<{ok:boolean, status?:string, roofType?:?string,
     *   footprint?:{length:?number,width:?number}, pitch?:?number,
     *   rafterSpacing?:?number, purlinSpacing?:?number,
     *   roofingMaterial?:?string, notes?:?string, message?:string,
     *   allowedRoofTypes?:string[], error?:string, network?:boolean}>}
     */
    async function generate(request) {
        var response;
        try {
            response = await fetch(GENERATE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(request || {})
            });
        } catch (networkError) {
            return { ok: false, network: true, error: 'Could not reach the AI service. Check your connection and try again.' };
        }

        var payload = null;
        try { payload = await response.json(); } catch (e) { /* no/invalid body */ }

        if (!response.ok) {
            return {
                ok: false,
                error: (payload && payload.error) || 'The AI service returned an unexpected error (' + response.status + ').',
                errors: payload && payload.errors
            };
        }

        var data = (payload && payload.data) || {};
        return {
            ok: true,
            status: data.status || 'not_configured',
            roofType: data.roofType || null,
            footprint: {
                length: (data.footprint && typeof data.footprint.length === 'number') ? data.footprint.length : null,
                width: (data.footprint && typeof data.footprint.width === 'number') ? data.footprint.width : null
            },
            pitch: typeof data.pitch === 'number' ? data.pitch : null,
            rafterSpacing: typeof data.rafterSpacing === 'number' ? data.rafterSpacing : null,
            purlinSpacing: typeof data.purlinSpacing === 'number' ? data.purlinSpacing : null,
            roofingMaterial: data.roofingMaterial || null,
            notes: data.notes || null,
            message: data.message || '',
            allowedRoofTypes: (payload && payload.allowedRoofTypes) || FALLBACK_ROOF_TYPES
        };
    }

    window.PhB = window.PhB || {};
    window.PhB.roofAIService = {
        generate: generate,
        ALLOWED_ROOF_TYPES: FALLBACK_ROOF_TYPES
    };
})();
