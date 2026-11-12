/**
 * PhentiBuild (PhB) - AI Roof Generation (page controller)
 *
 * Architecture:
 *   AI request (roof-ai-service.js) → AI response → validation (server,
 *   RoofGeometryValidator) → geometry → 3D visualization.
 *
 * "Geometry" and "3D visualization" here mean: an accepted proposal is
 * written into PhB.roofStudioStore using the exact same properties/shapes
 * the 2D Roof Studio already persists, so the existing, already-trusted
 * roof-3d-builder.js / roof-3d-viewer.js render it — this file does not
 * build or touch any 3D geometry itself.
 *
 * Never fabricates a result: if the AI service reports it isn't
 * connected (backend/services/RoofAIService.php — true by default, since
 * no provider is configured in this environment), that is shown as-is
 * and Generate can be retried once one is; nothing here invents numbers
 * to fill the gap.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-roof-studio-module]');
    var store = window.PhB && window.PhB.roofStudioStore;
    var aiService = window.PhB && window.PhB.roofAIService;
    var geo = window.PhB && window.PhB.roofGeometry;
    if (!root || !store || !aiService) { return; }

    var overlay = root.querySelector('[data-rs-ai-overlay]');
    var openBtn = root.querySelector('[data-rs-action="open-ai"]');
    if (!overlay || !openBtn) { return; }

    var closeBtn = overlay.querySelector('[data-rs-ai-close]');
    var introEl = overlay.querySelector('[data-rs-ai-intro]');
    var loadingEl = overlay.querySelector('[data-rs-ai-loading]');
    var noticeEl = overlay.querySelector('[data-rs-ai-notice]');
    var noticeTextEl = overlay.querySelector('[data-rs-ai-notice-text]');
    var resultEl = overlay.querySelector('[data-rs-ai-result]');
    var notesEl = overlay.querySelector('[data-ai-fact="notes"]');
    var editForm = overlay.querySelector('[data-rs-ai-edit-form]');
    var formSummary = overlay.querySelector('[data-rs-ai-form-summary]');
    var formSummaryText = overlay.querySelector('[data-rs-ai-form-summary-text]');

    var factEls = {};
    overlay.querySelectorAll('[data-ai-fact]').forEach(function (el) {
        factEls[el.getAttribute('data-ai-fact')] = el;
    });

    var fieldEls = {};
    overlay.querySelectorAll('[data-ai-field]').forEach(function (el) {
        fieldEls[el.getAttribute('data-ai-field')] = el;
    });

    var errorEls = {};
    overlay.querySelectorAll('[data-ai-error-for]').forEach(function (el) {
        errorEls[el.getAttribute('data-ai-error-for')] = el;
    });

    var footerButtons = {
        generate: overlay.querySelector('[data-rs-ai-generate]'),
        edit: overlay.querySelector('[data-rs-ai-edit]'),
        accept: overlay.querySelector('[data-rs-ai-accept]'),
        reject: overlay.querySelector('[data-rs-ai-reject]'),
        regenerate: overlay.querySelector('[data-rs-ai-regenerate]')
    };

    var currentProposal = null;

    /* ---------------------------------------------------------------
       Request building — mirrors the precedence roof-3d-builder.js uses
       (a drawn area shape's bounding box wins over the declared
       Length/Width fields), but never invents a placeholder footprint:
       an AI request with unknown dimensions honestly sends them blank.
       --------------------------------------------------------------- */
    function deriveFootprint(shapes, properties) {
        var areaShapes = shapes.filter(function (s) { return s.type === 'rectangle' || s.type === 'polygon'; });
        if (areaShapes.length && geo) {
            var box = geo.boundingBoxOfShapes([areaShapes[areaShapes.length - 1]]);
            var length = box.maxX - box.minX;
            var width = box.maxY - box.minY;
            if (length >= 1 && width >= 1) { return { length: length, width: width }; }
        }
        var propLength = parseFloat(properties.length);
        var propWidth = parseFloat(properties.width);
        return {
            length: (isFinite(propLength) && propLength > 0) ? propLength : null,
            width: (isFinite(propWidth) && propWidth > 0) ? propWidth : null
        };
    }

    function buildRequest() {
        var props = store.getProperties();
        var footprint = deriveFootprint(store.getShapes(), props);
        var pitch = parseFloat(props.pitch);
        var rafterSpacing = parseFloat(props.rafterSpacing);
        var purlinSpacing = parseFloat(props.purlinSpacing);

        var req = { footprint: footprint };
        if (props.roofType) { req.roofType = props.roofType; }
        if (isFinite(pitch)) { req.pitch = pitch; }
        if (isFinite(rafterSpacing)) { req.rafterSpacing = rafterSpacing; }
        if (isFinite(purlinSpacing)) { req.purlinSpacing = purlinSpacing; }
        if (props.roofingMaterial) { req.roofingMaterial = props.roofingMaterial; }
        return req;
    }

    /* ---------------------------------------------------------------
       View state
       --------------------------------------------------------------- */
    function setButtons(visibleKeys) {
        Object.keys(footerButtons).forEach(function (key) {
            var el = footerButtons[key];
            if (el) { el.hidden = visibleKeys.indexOf(key) === -1; }
        });
    }

    function showIdle() {
        currentProposal = null;
        introEl.hidden = false;
        loadingEl.hidden = true;
        noticeEl.hidden = true;
        resultEl.hidden = true;
        editForm.hidden = true;
        setButtons(['generate']);
    }

    function showLoading() {
        introEl.hidden = true;
        loadingEl.hidden = false;
        noticeEl.hidden = true;
        resultEl.hidden = true;
        setButtons([]);
    }

    function showNotice(message) {
        introEl.hidden = true;
        loadingEl.hidden = true;
        resultEl.hidden = true;
        noticeEl.hidden = false;
        noticeTextEl.textContent = message;
        setButtons(['generate']);
    }

    function formatFootprint(footprint) {
        if (footprint && footprint.length != null && footprint.width != null) {
            return footprint.length + ' m × ' + footprint.width + ' m';
        }
        return 'Not specified';
    }

    function renderFacts(proposal) {
        factEls.roofType.textContent = proposal.roofType || 'Not specified';
        factEls.footprint.textContent = formatFootprint(proposal.footprint);
        factEls.pitch.textContent = proposal.pitch != null ? proposal.pitch + '°' : 'Not specified';
        factEls.rafterSpacing.textContent = proposal.rafterSpacing != null ? proposal.rafterSpacing + ' mm' : 'Not specified';
        factEls.purlinSpacing.textContent = proposal.purlinSpacing != null ? proposal.purlinSpacing + ' mm' : 'Not specified';
        factEls.roofingMaterial.textContent = proposal.roofingMaterial || 'Not specified';
        if (notesEl) {
            notesEl.textContent = proposal.notes || '';
            notesEl.hidden = !proposal.notes;
        }
    }

    function populateForm(proposal) {
        fieldEls.roofType.value = proposal.roofType || store.getProperties().roofType || 'Gable Roof';
        fieldEls.length.value = proposal.footprint.length != null ? proposal.footprint.length : '';
        fieldEls.width.value = proposal.footprint.width != null ? proposal.footprint.width : '';
        fieldEls.pitch.value = proposal.pitch != null ? proposal.pitch : '';
        fieldEls.rafterSpacing.value = proposal.rafterSpacing != null ? proposal.rafterSpacing : '';
        fieldEls.purlinSpacing.value = proposal.purlinSpacing != null ? proposal.purlinSpacing : '';
        fieldEls.roofingMaterial.value = proposal.roofingMaterial || '';
        Object.keys(errorEls).forEach(function (key) { errorEls[key].hidden = true; });
        formSummary.hidden = true;
    }

    function showResult(proposal, editMode) {
        introEl.hidden = true;
        loadingEl.hidden = true;
        noticeEl.hidden = true;
        resultEl.hidden = false;
        renderFacts(proposal);
        editForm.hidden = !editMode;
        if (editMode) { populateForm(proposal); }
        setButtons(editMode ? ['accept', 'reject', 'regenerate'] : ['edit', 'accept', 'reject', 'regenerate']);
    }

    /* ---------------------------------------------------------------
       Generate / Regenerate
       --------------------------------------------------------------- */
    function runGenerate() {
        showLoading();
        aiService.generate(buildRequest()).then(function (res) {
            if (!res.ok) {
                showNotice(res.error || 'The AI service returned an unexpected error.');
                return;
            }
            if (res.status !== 'ok') {
                showNotice(res.message || 'AI roof generation is not available right now.');
                return;
            }
            currentProposal = res;
            showResult(res, false);
        });
    }

    /* ---------------------------------------------------------------
       Edit form: parse + validate on Accept, same numeric-field style as
       scanner.js's manual-entry form.
       --------------------------------------------------------------- */
    function parseNumberField(key, label, min, max, errors) {
        var raw = (fieldEls[key].value || '').trim();
        if (raw === '') { return null; }
        var num = parseFloat(raw);
        if (!isFinite(num) || num < min || num > max) {
            errors[key] = label + ' must be a number between ' + min + ' and ' + max + '.';
            return null;
        }
        return num;
    }

    function readFormValues() {
        var errors = {};
        var length = parseNumberField('length', 'Length', 1, 200, errors);
        var width = parseNumberField('width', 'Width', 1, 200, errors);
        var pitch = parseNumberField('pitch', 'Pitch', 0, 80, errors);
        var rafterSpacing = parseNumberField('rafterSpacing', 'Rafter spacing', 100, 1200, errors);
        var purlinSpacing = parseNumberField('purlinSpacing', 'Purlin spacing', 100, 1200, errors);
        var roofingMaterial = (fieldEls.roofingMaterial.value || '').trim();

        return {
            ok: Object.keys(errors).length === 0,
            errors: errors,
            values: {
                roofType: fieldEls.roofType.value,
                footprint: { length: length, width: width },
                pitch: pitch,
                rafterSpacing: rafterSpacing,
                purlinSpacing: purlinSpacing,
                roofingMaterial: roofingMaterial || null,
                notes: currentProposal ? currentProposal.notes : null
            }
        };
    }

    function showFormErrors(errors) {
        Object.keys(errorEls).forEach(function (key) {
            var msg = errors[key];
            errorEls[key].textContent = msg || '';
            errorEls[key].hidden = !msg;
        });
        var count = Object.keys(errors).length;
        formSummaryText.textContent = count === 1 ? 'Fix the highlighted field.' : 'Fix the ' + count + ' highlighted fields.';
        formSummary.hidden = false;
    }

    /* ---------------------------------------------------------------
       Accept: writes the final values into the existing Roof Studio
       store — properties always, and a footprint rectangle shape only
       when the drawing has no area shape of its own yet (a hand-drawn
       footprint always keeps precedence, matching roof-3d-builder.js).
       --------------------------------------------------------------- */
    function applyToStore(values) {
        if (values.roofType) { store.setProperty('roofType', values.roofType); }
        if (values.pitch != null) { store.setProperty('pitch', String(values.pitch)); }
        if (values.rafterSpacing != null) { store.setProperty('rafterSpacing', String(values.rafterSpacing)); }
        if (values.purlinSpacing != null) { store.setProperty('purlinSpacing', String(values.purlinSpacing)); }
        if (values.roofingMaterial) { store.setProperty('roofingMaterial', values.roofingMaterial); }

        var length = values.footprint && values.footprint.length;
        var width = values.footprint && values.footprint.width;
        if (length != null && width != null) {
            store.setProperty('length', String(length));
            store.setProperty('width', String(width));

            var shapes = store.getShapes();
            var hasAreaShape = shapes.some(function (s) { return s.type === 'rectangle' || s.type === 'polygon'; });
            if (!hasAreaShape && geo) {
                store.addShape(geo.createShape('rectangle', [{ x: 0, y: 0 }, { x: length, y: width }]));
            } else if (hasAreaShape) {
                window.PhB.toast('AI properties applied. Your drawn footprint still controls the 3D model — clear it to use the AI-proposed ' + length + ' × ' + width + ' m footprint instead.', 'success');
                return;
            }
        }
        window.PhB.toast('AI-generated roof design applied.', 'success');
    }

    function accept() {
        var values;
        if (!editForm.hidden) {
            var parsed = readFormValues();
            if (!parsed.ok) { showFormErrors(parsed.errors); return; }
            values = parsed.values;
        } else if (currentProposal) {
            values = currentProposal;
        } else {
            return;
        }
        applyToStore(values);
        closeModal();
    }

    /* ---------------------------------------------------------------
       Modal open/close + wiring
       --------------------------------------------------------------- */
    function openModal() {
        overlay.classList.add('is-open');
        showIdle();
    }

    function closeModal() {
        overlay.classList.remove('is-open');
    }

    openBtn.addEventListener('click', openModal);
    if (closeBtn) { closeBtn.addEventListener('click', closeModal); }
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) { closeModal(); }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) { closeModal(); }
    });

    if (footerButtons.generate) { footerButtons.generate.addEventListener('click', runGenerate); }
    if (footerButtons.regenerate) { footerButtons.regenerate.addEventListener('click', runGenerate); }
    if (footerButtons.edit) {
        footerButtons.edit.addEventListener('click', function () {
            if (currentProposal) { showResult(currentProposal, true); }
        });
    }
    if (footerButtons.accept) { footerButtons.accept.addEventListener('click', accept); }
    if (footerButtons.reject) { footerButtons.reject.addEventListener('click', showIdle); }
})();
