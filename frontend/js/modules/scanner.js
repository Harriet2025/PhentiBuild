/**
 * PhentiBuild (PhB) - Camera Scanner
 *
 * Architecture this file drives:
 *   Camera → Vision Service → Detection Result → Measurement
 *   → User Confirmation → Calculation Engine
 *
 * The camera preview (getUserMedia), capture (canvas snapshot), and the
 * confirm/edit/reject/rescan workflow are all real. Detection is not —
 * every capture is sent to window.PhB.visionService.detect(), which
 * calls a real backend endpoint that honestly reports no vision model
 * is connected (see backend/services/VisionService.php). This file
 * never fills in a fake object/measurement/confidence itself; it only
 * ever displays what the vision service actually returned, and always
 * offers the manual Edit form as the way to supply real values.
 *
 * A confirmed scan is saved through the existing measurements store
 * (frontend/js/modules/measurements-store.js) — the same "Calculation
 * engine" entry point Manual Input already uses — as sectionType
 * 'timber' or 'walls' depending on what was captured.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-scanner-module]');
    var visionService = window.PhB && window.PhB.visionService;
    var measurementsStore = window.PhB && window.PhB.measurementsStore;
    if (!root || !visionService || !measurementsStore) { return; }

    /* ---------------------------------------------------------------
       Elements
       --------------------------------------------------------------- */
    var video = root.querySelector('[data-scanner-video]');
    var canvas = root.querySelector('[data-scanner-canvas]');
    var stillImg = root.querySelector('[data-scanner-still]');
    var placeholder = root.querySelector('[data-scanner-placeholder]');
    var statusBadge = root.querySelector('[data-scanner-status-badge]');
    var cameraError = root.querySelector('[data-scanner-camera-error]');
    var cameraErrorText = root.querySelector('[data-scanner-camera-error-text]');

    var startBtn = root.querySelector('[data-scanner-start]');
    var captureBtn = root.querySelector('[data-scanner-capture]');
    var stopBtn = root.querySelector('[data-scanner-stop]');

    var resultCard = root.querySelector('[data-scanner-result]');
    var resultObject = root.querySelector('[data-result-object]');
    var resultMeasurement = root.querySelector('[data-result-measurement]');
    var resultConfidence = root.querySelector('[data-result-confidence]');
    var resultMessage = root.querySelector('[data-scanner-result-message]');

    var editForm = root.querySelector('[data-scanner-edit-form]');
    var formSummary = root.querySelector('[data-scanner-form-summary]');
    var formSummaryText = root.querySelector('[data-scanner-form-summary-text]');
    var objectTypeSelect = root.querySelector('[data-field-object-type]');
    var optgroupTimber = root.querySelector('[data-optgroup-timber]');
    var optgroupWall = root.querySelector('[data-optgroup-wall]');
    var fieldGroupTimber = root.querySelector('[data-field-group="timber"]');
    var fieldGroupWall = root.querySelector('[data-field-group="wall"]');
    var timberLengthInput = root.querySelector('[data-field-timber-length]');
    var wallLengthInput = root.querySelector('[data-field-wall-length]');
    var wallHeightInput = root.querySelector('[data-field-wall-height]');
    var wallAreaInput = root.querySelector('[data-field-wall-area]');

    var editBtn = root.querySelector('[data-scanner-edit]');
    var confirmBtn = root.querySelector('[data-scanner-confirm]');
    var rejectBtn = root.querySelector('[data-scanner-reject]');
    var rescanBtn = root.querySelector('[data-scanner-rescan]');

    var roadmapList = root.querySelector('[data-scanner-roadmap-list]');

    /* ---------------------------------------------------------------
       State
       --------------------------------------------------------------- */
    var mediaStream = null;
    var lastDetection = null;
    var objectTypesRendered = false;

    function setStatus(text, badgeClass) {
        statusBadge.textContent = text;
        statusBadge.className = 'badge ' + (badgeClass || 'badge-neutral');
    }

    function renderPlannedObjectTypes(objectTypes) {
        if (objectTypesRendered) { return; }
        objectTypesRendered = true;

        var timberTypes = objectTypes.filter(function (t) { return t.category === 'timber'; });
        var wallTypes = objectTypes.filter(function (t) { return t.category === 'wall'; });

        optgroupTimber.innerHTML = timberTypes.map(function (t) {
            return '<option value="' + t.id + '">' + t.label + '</option>';
        }).join('');
        optgroupWall.innerHTML = wallTypes.map(function (t) {
            return '<option value="' + t.id + '">' + t.label + '</option>';
        }).join('');

        roadmapList.innerHTML = objectTypes.map(function (t) {
            return '<li>' + t.label + '</li>';
        }).join('');
    }
    // Render the fallback list immediately so the roadmap card isn't empty
    // before the first scan.
    renderPlannedObjectTypes(visionService.PLANNED_OBJECT_TYPES);

    /* ---------------------------------------------------------------
       Camera control
       --------------------------------------------------------------- */
    async function startCamera() {
        cameraError.hidden = true;
        setStatus('Starting camera…', 'badge-info');

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
        } catch (err) {
            mediaStream = null;
            setStatus('Camera unavailable', 'badge-danger');
            cameraErrorText.textContent = describeCameraError(err);
            cameraError.hidden = false;
            return;
        }

        video.srcObject = mediaStream;
        video.hidden = false;
        placeholder.hidden = true;
        stillImg.hidden = true;

        startBtn.hidden = true;
        captureBtn.hidden = false;
        stopBtn.hidden = false;

        setStatus('Camera ready', 'badge-success');
    }

    function describeCameraError(err) {
        if (err && err.name === 'NotAllowedError') {
            return 'Camera permission was denied. Allow camera access and try again.';
        }
        if (err && err.name === 'NotFoundError') {
            return 'No camera was found on this device.';
        }
        return 'Could not start the camera (' + ((err && err.message) || 'unknown error') + ').';
    }

    function stopCamera() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(function (track) { track.stop(); });
            mediaStream = null;
        }
        video.srcObject = null;
        video.hidden = true;
        stillImg.hidden = true;
        placeholder.hidden = false;

        startBtn.hidden = false;
        captureBtn.hidden = true;
        stopBtn.hidden = true;

        resultCard.hidden = true;
        setStatus('Camera off', 'badge-neutral');
    }

    /* ---------------------------------------------------------------
       Capture + detection
       --------------------------------------------------------------- */
    function capture() {
        var maxWidth = 960;
        var scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

        var dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        stillImg.src = dataUrl;
        stillImg.hidden = false;
        video.hidden = true;

        captureBtn.hidden = true;
        setStatus('Frame captured — analyzing…', 'badge-info');
        analyze(dataUrl);
    }

    async function analyze(dataUrl) {
        var response = await visionService.detect(dataUrl);
        lastDetection = response;

        if (!response.ok) {
            setStatus('Vision service error', 'badge-danger');
            resultCard.hidden = false;
            resultObject.textContent = '—';
            resultMeasurement.textContent = '—';
            resultConfidence.textContent = '—';
            resultMessage.textContent = response.error || 'The vision service could not be reached.';
            openEditForm();
            return;
        }

        renderPlannedObjectTypes(response.plannedObjectTypes);

        resultCard.hidden = false;
        if (response.status === 'not_configured') {
            setStatus('Manual entry required', 'badge-warning');
            resultObject.textContent = 'Not detected — no vision model connected';
            resultMeasurement.textContent = '—';
            resultConfidence.textContent = 'N/A (manual entry)';
        } else {
            // Reserved for when a real VisionServiceInterface implementation
            // is wired in server-side and starts returning real detections.
            setStatus('Object detected', 'badge-success');
            resultObject.textContent = response.label || response.objectType || '—';
            resultMeasurement.textContent = summarizeMeasurements(response.measurements);
            resultConfidence.textContent = response.confidence !== null
                ? Math.round(response.confidence * 100) + '%'
                : '—';
        }
        resultMessage.textContent = response.message || '';

        editForm.hidden = true;
        editBtn.textContent = 'Edit';
    }

    function summarizeMeasurements(measurements) {
        var keys = Object.keys(measurements || {});
        if (!keys.length) { return '—'; }
        return keys.map(function (k) { return k + ': ' + measurements[k]; }).join(', ');
    }

    /* ---------------------------------------------------------------
       Manual edit form
       --------------------------------------------------------------- */
    function openEditForm() {
        editForm.hidden = false;
        editBtn.textContent = 'Hide Form';
        updateFieldVisibility();
    }

    function toggleEditForm() {
        editForm.hidden = !editForm.hidden;
        editBtn.textContent = editForm.hidden ? 'Edit' : 'Hide Form';
    }

    function updateFieldVisibility() {
        var type = objectTypeSelect.value;
        var isTimber = type.indexOf('timber_') === 0;
        var isWall = type === 'exposed_wall';
        fieldGroupTimber.hidden = !isTimber;
        fieldGroupWall.hidden = !isWall;
    }

    function recomputeWallArea() {
        var length = parseFloat(wallLengthInput.value);
        var height = parseFloat(wallHeightInput.value);
        if (isFinite(length) && isFinite(height) && length > 0 && height > 0) {
            wallAreaInput.value = (length * height).toFixed(2) + ' m²';
        } else {
            wallAreaInput.value = '—';
        }
    }

    function clearFieldErrors() {
        editForm.querySelectorAll('.form-error').forEach(function (el) { el.hidden = true; el.textContent = ''; });
        formSummary.hidden = true;
    }

    function setFieldError(field, message) {
        var el = editForm.querySelector('[data-error-for="' + field + '"]');
        if (el) { el.hidden = false; el.textContent = message; }
    }

    /* ---------------------------------------------------------------
       Confirm / Reject / Rescan
       --------------------------------------------------------------- */
    function objectTypeLabel(id) {
        var found = visionService.PLANNED_OBJECT_TYPES.filter(function (t) { return t.id === id; })[0];
        return found ? found.label : id;
    }

    function timberCrossSection(id) {
        return { timber_2x2: '2 x 2', timber_2x3: '2 x 3', timber_2x4: '2 x 4', timber_2x6: '2 x 6', timber_4x4: '4 x 4' }[id] || null;
    }

    async function confirmScan() {
        clearFieldErrors();

        var type = objectTypeSelect.value;
        var errors = {};
        if (!type) { errors.objectType = 'Select the object you captured.'; }

        var payload = null;
        if (type.indexOf('timber_') === 0) {
            var length = parseFloat(timberLengthInput.value);
            if (!timberLengthInput.value.trim()) { errors.timberLength = 'Length is required.'; }
            else if (!isFinite(length) || length <= 0) { errors.timberLength = 'Enter a valid length.'; }

            if (!Object.keys(errors).length) {
                payload = {
                    sectionType: 'timber',
                    label: 'Scanned — ' + objectTypeLabel(type),
                    values: { timberType: timberCrossSection(type), timberLength: String(length), source: 'scanner' },
                    notes: 'Captured via the Camera Scanner. Computer vision detection is not yet connected — this value was entered manually after capture.'
                };
            }
        } else if (type === 'exposed_wall') {
            var wLen = parseFloat(wallLengthInput.value);
            var wHeight = parseFloat(wallHeightInput.value);
            if (!wallLengthInput.value.trim()) { errors.wallLength = 'Length is required.'; }
            else if (!isFinite(wLen) || wLen <= 0) { errors.wallLength = 'Enter a valid length.'; }
            if (!wallHeightInput.value.trim()) { errors.wallHeight = 'Height is required.'; }
            else if (!isFinite(wHeight) || wHeight <= 0) { errors.wallHeight = 'Enter a valid height.'; }

            if (!Object.keys(errors).length) {
                payload = {
                    sectionType: 'walls',
                    label: 'Scanned — Exposed Wall',
                    values: {
                        length: String(wLen),
                        height: String(wHeight),
                        surfaceArea: (wLen * wHeight).toFixed(2),
                        source: 'scanner'
                    },
                    notes: 'Captured via the Camera Scanner. Computer vision detection is not yet connected — this value was entered manually after capture.'
                };
            }
        }

        if (Object.keys(errors).length) {
            Object.keys(errors).forEach(function (field) { setFieldError(field, errors[field]); });
            formSummaryText.textContent = 'Please fix the highlighted field' + (Object.keys(errors).length > 1 ? 's' : '') + ' before confirming.';
            formSummary.hidden = false;
            editForm.hidden = false;
            editBtn.textContent = 'Hide Form';
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Saving…';
        var result = await measurementsStore.add(payload);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm & Save';

        if (!result.ok) {
            formSummaryText.textContent = result.error;
            formSummary.hidden = false;
            return;
        }

        window.PhB.toast('Measurement saved from scanner capture.', 'success');
        setStatus('Saved', 'badge-success');
        resultMessage.textContent = 'Saved as a measurement. Start a new scan whenever you’re ready.';
        editForm.hidden = true;
    }

    function discardCapture() {
        resultCard.hidden = true;
        editForm.hidden = true;
        clearFieldErrors();
        objectTypeSelect.value = '';
        timberLengthInput.value = '';
        wallLengthInput.value = '';
        wallHeightInput.value = '';
        wallAreaInput.value = '—';
        updateFieldVisibility();
        lastDetection = null;

        if (mediaStream) {
            stillImg.hidden = true;
            video.hidden = false;
            captureBtn.hidden = false;
            setStatus('Camera ready', 'badge-success');
        } else {
            placeholder.hidden = false;
            setStatus('Camera off', 'badge-neutral');
        }
    }

    /* ---------------------------------------------------------------
       Events
       --------------------------------------------------------------- */
    startBtn.addEventListener('click', startCamera);
    stopBtn.addEventListener('click', stopCamera);
    captureBtn.addEventListener('click', capture);

    editBtn.addEventListener('click', toggleEditForm);
    confirmBtn.addEventListener('click', confirmScan);
    rejectBtn.addEventListener('click', discardCapture);
    rescanBtn.addEventListener('click', discardCapture);

    objectTypeSelect.addEventListener('change', updateFieldVisibility);
    wallLengthInput.addEventListener('input', recomputeWallArea);
    wallHeightInput.addEventListener('input', recomputeWallArea);

    // Release the camera if the user navigates to another module without
    // explicitly stopping it.
    document.addEventListener('click', function (e) {
        var link = e.target.closest('[data-module]');
        if (link && link.getAttribute('data-module') !== 'scanner' && mediaStream) {
            stopCamera();
        }
    });
})();
