/**
 * PhentiBuild (PhB) - Add / Edit Material Form
 *
 * One modal form serves both "Add Material" and "Edit Material": editing
 * pre-fills the same fields a new material would use, and submit routes to
 * either PhB.materialsStore.add() or .update() depending on which material
 * (if any) is currently being edited. Validation is hand-rolled (the form
 * uses novalidate) so error messages match the app's own wording.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-materials-module]');
    var overlay = document.querySelector('[data-material-form-overlay]');
    var form = document.querySelector('[data-material-form]');
    var store = window.PhB && window.PhB.materialsStore;
    if (!root || !overlay || !form || !store) { return; }

    var viewOverlay = root.querySelector('[data-material-view-overlay]');
    var formTitle = overlay.querySelector('[data-form-title]');
    var submitBtn = overlay.querySelector('[data-form-submit]');
    var summary = form.querySelector('[data-form-summary]');
    var summaryText = form.querySelector('[data-form-summary-text]');
    var description = form.querySelector('[name="description"]');
    var charCount = form.querySelector('[data-char-count]');
    var MAX_DESCRIPTION = 500;

    var editingId = null; // null while adding; a material id while editing

    /* ---------------------------------------------------------------
       Validation rules — each returns an error string, or '' when valid.
       --------------------------------------------------------------- */
    var rules = {
        name: function (v) {
            if (!v) { return 'Material name is required.'; }
            if (v.length < 2) { return 'Material name must be at least 2 characters.'; }
            return '';
        },
        category: function (v) {
            if (!v) { return 'Select a category.'; }
            return '';
        },
        unit: function (v) {
            if (!v) { return 'Unit is required.'; }
            return '';
        },
        dimensions: function () { return ''; },
        overallDimensions: function () { return ''; },
        effectiveCoverage: function () { return ''; },
        standardLength: function () { return ''; },
        spacing: function () { return ''; },
        description: function (v) {
            if (v.length > MAX_DESCRIPTION) {
                return 'Description must be ' + MAX_DESCRIPTION + ' characters or fewer.';
            }
            return '';
        }
    };

    var FIELD_ORDER = ['name', 'category', 'unit', 'dimensions', 'overallDimensions', 'effectiveCoverage', 'standardLength', 'spacing', 'description'];
    var touched = {};
    // Once Save has been pressed, every error stays visible. Without this,
    // moving focus to the first invalid field fires a blur that re-validates
    // and wipes the messages on fields the user hasn't visited yet.
    var submitAttempted = false;

    function getValues() {
        var values = {};
        FIELD_ORDER.forEach(function (field) {
            var input = form.querySelector('[name="' + field + '"]');
            values[field] = input ? input.value.trim() : '';
        });
        return values;
    }

    function setFieldError(field, message) {
        var input = form.querySelector('[name="' + field + '"]');
        var errorEl = form.querySelector('[data-error-for="' + field + '"]');
        if (!input || !errorEl) { return; }

        if (message) {
            input.classList.add('is-invalid');
            input.setAttribute('aria-invalid', 'true');
            errorEl.textContent = message;
            errorEl.hidden = false;
        } else {
            input.classList.remove('is-invalid');
            input.removeAttribute('aria-invalid');
            errorEl.textContent = '';
            errorEl.hidden = true;
        }
    }

    /** Validates every field; only shows errors for fields already touched
     *  (or all of them, when the user has attempted to submit). */
    function validate(showAll) {
        var values = getValues();
        var errors = {};
        var revealAll = showAll || submitAttempted;

        FIELD_ORDER.forEach(function (field) {
            var message = rules[field](values[field], values);
            if (message) { errors[field] = message; }
            setFieldError(field, (revealAll || touched[field]) ? (message || '') : '');
        });

        return { values: values, errors: errors };
    }

    function showSummary(count) {
        summaryText.textContent = count === 1
            ? 'There is 1 field that needs your attention.'
            : 'There are ' + count + ' fields that need your attention.';
        summary.hidden = false;
    }

    function fillForm(material) {
        FIELD_ORDER.forEach(function (field) {
            var input = form.querySelector('[name="' + field + '"]');
            if (input) { input.value = material && material[field] ? material[field] : ''; }
        });
        if (charCount) { charCount.textContent = String((material && material.description) ? material.description.length : 0); }
    }

    /* ---------------------------------------------------------------
       Open / close
       --------------------------------------------------------------- */
    function resetFormState() {
        touched = {};
        submitAttempted = false;
        summary.hidden = true;
        FIELD_ORDER.forEach(function (field) { setFieldError(field, ''); });
    }

    async function openForm(mode, id) {
        form.reset();
        resetFormState();

        if (mode === 'edit' && id) {
            var result = await store.getById(id);
            if (!result.ok) {
                window.PhB.toast(result.error, 'danger');
                return;
            }
            editingId = id;
            formTitle.textContent = 'Edit Material';
            submitBtn.textContent = 'Save Changes';
            fillForm(result.material);
        } else {
            editingId = null;
            formTitle.textContent = 'Add Material';
            submitBtn.textContent = 'Save Material';
            fillForm(null);
        }

        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';

        var first = form.querySelector('[name="name"]');
        if (first) { first.focus(); }
    }

    function closeForm() {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    // The list module renders "Add Material" (header + empty state) and
    // per-row "Edit" buttons; the view modal renders its own "Edit" button.
    // Scoped to this module's root — other modules (e.g. the BOQ) reuse the
    // same generic data-action="edit" attribute on their own rows.
    root.addEventListener('click', function (e) {
        var addTrigger = e.target.closest('[data-action="new-material"]');
        if (addTrigger) {
            e.preventDefault();
            openForm('add');
            return;
        }

        var editTrigger = e.target.closest('[data-action="edit"][data-id]');
        if (editTrigger) {
            e.preventDefault();
            openForm('edit', editTrigger.getAttribute('data-id'));
            return;
        }

        if (e.target.closest('[data-view-edit]')) {
            var currentId = viewOverlay ? viewOverlay.getAttribute('data-current-id') : null;
            if (currentId) {
                if (viewOverlay.classList.contains('is-open')) {
                    viewOverlay.classList.remove('is-open');
                }
                openForm('edit', currentId);
            }
            return;
        }

        if (e.target.closest('[data-form-close]')) {
            closeForm();
        }
    });

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) { closeForm(); }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
            closeForm();
        }
    });

    /* ---------------------------------------------------------------
       Live feedback
       --------------------------------------------------------------- */
    FIELD_ORDER.forEach(function (field) {
        var input = form.querySelector('[name="' + field + '"]');
        if (!input) { return; }

        input.addEventListener('blur', function () {
            touched[field] = true;
            validate(false);
        });

        input.addEventListener('input', function () {
            if (touched[field] || submitAttempted) { validate(false); }
        });
        input.addEventListener('change', function () {
            touched[field] = true;
            validate(false);
        });
    });

    if (description && charCount) {
        description.addEventListener('input', function () {
            charCount.textContent = description.value.trim().length;
        });
    }

    /* ---------------------------------------------------------------
       Submit
       --------------------------------------------------------------- */
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (submitBtn.disabled) { return; }
        submitAttempted = true;

        var result = validate(true);
        var errorFields = Object.keys(result.errors);

        if (errorFields.length) {
            showSummary(errorFields.length);
            var firstInvalid = form.querySelector('[name="' + errorFields[0] + '"]');
            if (firstInvalid) { firstInvalid.focus(); }
            return;
        }

        summary.hidden = true;
        var originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving…';

        var saved = editingId
            ? await store.update(editingId, result.values)
            : await store.add(result.values);

        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;

        if (!saved.ok) {
            if (saved.errors) {
                Object.keys(saved.errors).forEach(function (field) {
                    touched[field] = true;
                    setFieldError(field, saved.errors[field]);
                });
            }
            summaryText.textContent = saved.error;
            summary.hidden = false;
            return;
        }

        closeForm();
        window.PhB.toast(
            editingId
                ? '"' + saved.material.name + '" has been updated.'
                : '"' + saved.material.name + '" saved as ' + saved.material.id + '.',
            'success'
        );
    });
})();
