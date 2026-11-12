<?php
/**
 * PhentiBuild - Camera Scanner
 *
 * The camera preview, capture, and manual-correction workflow are fully
 * real and functional. Automatic object detection is NOT — see
 * backend/services/VisionService.php. Every capture is sent to a real
 * backend endpoint (backend/api/scanner/detect.php), which honestly
 * reports that no vision model is connected yet, and the UI routes
 * straight to manual entry rather than pretending to have detected
 * anything.
 */
?>
<div class="scanner-module" data-scanner-module>

    <div class="module-header">
        <div>
            <span class="eyebrow">Data Capture</span>
            <h1>Camera Scanner</h1>
            <p class="text-secondary">Capture a site photo, then confirm or enter the object's measurements.</p>
        </div>
    </div>

    <div class="alert alert-warning scanner-cv-notice">
        <span class="alert-icon">!</span>
        <div class="alert-body">
            <span class="alert-title">Computer vision is not connected yet</span>
            <span>The camera, capture, and confirmation workflow below are fully functional. Automatic object detection requires a trained vision model that hasn&rsquo;t been integrated — every capture currently routes to manual entry. Nothing on this page fabricates a detection result.</span>
        </div>
    </div>

    <div class="scanner-layout">

        <div class="card scanner-camera-card">
            <div class="scanner-camera-frame">
                <video data-scanner-video autoplay playsinline muted hidden></video>
                <canvas data-scanner-canvas hidden></canvas>
                <img data-scanner-still alt="Captured frame" hidden>
                <div class="scanner-camera-placeholder" data-scanner-placeholder>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a1 1 0 0 1 1-1h2l1.5-2h7L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z"/><circle cx="12" cy="13" r="3.2"/></svg>
                    <p>Camera is off</p>
                </div>
            </div>

            <div class="scanner-status-bar">
                <span class="text-xs text-muted">Scanning status</span>
                <span class="badge badge-neutral" data-scanner-status-badge>Camera off</span>
            </div>

            <div class="alert alert-danger" data-scanner-camera-error hidden>
                <span class="alert-icon">!</span>
                <div class="alert-body">
                    <span class="alert-title">Camera unavailable</span>
                    <span data-scanner-camera-error-text></span>
                </div>
            </div>

            <div class="scanner-camera-actions">
                <button type="button" class="btn btn-primary" data-scanner-start>Start Camera</button>
                <button type="button" class="btn btn-primary" data-scanner-capture hidden>Capture</button>
                <button type="button" class="btn btn-outline-secondary" data-scanner-stop hidden>Stop Camera</button>
            </div>
        </div>

        <div class="card scanner-result-card" data-scanner-result hidden>
            <h3>Scan Result</h3>

            <dl class="scanner-result-facts">
                <dt>Detected Object</dt>
                <dd data-result-object>&mdash;</dd>
                <dt>Measurement</dt>
                <dd data-result-measurement>&mdash;</dd>
                <dt>Confidence Score</dt>
                <dd data-result-confidence>&mdash;</dd>
            </dl>

            <p class="text-sm text-secondary" data-scanner-result-message></p>

            <form novalidate class="scanner-edit-form" data-scanner-edit-form hidden>
                <div class="alert alert-danger" data-scanner-form-summary hidden>
                    <span class="alert-icon">!</span>
                    <div class="alert-body"><span data-scanner-form-summary-text></span></div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="sc-object-type">Object Type <span class="required">*</span></label>
                    <select id="sc-object-type" class="form-control" data-field-object-type>
                        <option value="">Select the object you captured&hellip;</option>
                        <optgroup label="Timber" data-optgroup-timber></optgroup>
                        <optgroup label="Wall" data-optgroup-wall></optgroup>
                    </select>
                    <span class="form-error" data-error-for="objectType" hidden></span>
                </div>

                <div class="form-group" data-field-group="timber" hidden>
                    <label class="form-label" for="sc-timber-length">Length (m) <span class="required">*</span></label>
                    <input type="text" id="sc-timber-length" class="form-control form-control-numeric" inputmode="decimal" placeholder="e.g. 3.6" data-field-timber-length>
                    <span class="form-error" data-error-for="timberLength" hidden></span>
                </div>

                <div data-field-group="wall" hidden>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="sc-wall-length">Length (m) <span class="required">*</span></label>
                            <input type="text" id="sc-wall-length" class="form-control form-control-numeric" inputmode="decimal" placeholder="e.g. 4.5" data-field-wall-length>
                            <span class="form-error" data-error-for="wallLength" hidden></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="sc-wall-height">Height (m) <span class="required">*</span></label>
                            <input type="text" id="sc-wall-height" class="form-control form-control-numeric" inputmode="decimal" placeholder="e.g. 2.7" data-field-wall-height>
                            <span class="form-error" data-error-for="wallHeight" hidden></span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Surface Area (computed)</label>
                        <input type="text" class="form-control form-control-numeric" readonly data-field-wall-area value="&mdash;">
                        <span class="form-hint">Length &times; Height, calculated automatically as you type.</span>
                    </div>
                </div>
            </form>

            <div class="scanner-result-actions">
                <button type="button" class="btn btn-outline-secondary" data-scanner-edit>Edit</button>
                <button type="button" class="btn btn-primary" data-scanner-confirm>Confirm &amp; Save</button>
                <button type="button" class="btn btn-outline-secondary" data-scanner-reject>Reject</button>
                <button type="button" class="btn btn-ghost" data-scanner-rescan>Rescan</button>
            </div>
        </div>

    </div>

    <div class="card scanner-roadmap-card">
        <h3>Planned Recognition</h3>
        <p class="text-secondary">Once a vision model is connected, this scanner is built to recognize:</p>
        <ul class="scanner-roadmap-list" data-scanner-roadmap-list></ul>
    </div>

</div>
