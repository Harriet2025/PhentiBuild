/**
 * PhentiBuild (PhB) - Add / Edit Project Form
 *
 * One modal serves both "New Project" and "Edit" — editing is opened via
 * window.PhB.openProjectForm('edit', project), passing the already-loaded
 * project object from whichever view triggered it (the list row or the
 * detail page's Edit button), so opening the form never needs its own
 * network request.
 *
 * Validation is hand-rolled client-side first (the form uses novalidate)
 * for immediate feedback, exactly as before. Saving now goes through
 * PhB.projectsStore's fetch()-backed methods, which can fail two
 * different ways this form has to show separately: the server rejecting
 * the data (422 field errors — mapped onto the same per-field error UI
 * the client-side rules already use) and the request never completing at
 * all (network failure — shown as a general message, not attributed to
 * any field).
 */
(function () {
    'use strict';

    var overlay = document.querySelector('[data-project-form-overlay]');
    var form = document.querySelector('[data-project-form]');
    var store = window.PhB && window.PhB.projectsStore;
    if (!overlay || !form || !store) { return; }

    var formTitle = overlay.querySelector('[data-form-title]');
    var submitBtn = overlay.querySelector('[data-form-submit]');
    var summary = form.querySelector('[data-form-summary]');
    var summaryTitle = form.querySelector('[data-form-summary-title]');
    var summaryText = form.querySelector('[data-form-summary-text]');
    var description = form.querySelector('[name="description"]');
    var charCount = form.querySelector('[data-char-count]');
    var MAX_DESCRIPTION = 1000;

    var editingProject = null; // null while adding; the full project object while editing
    var submitting = false;

    /* ---------------------------------------------------------------
       Validation rules — each returns an error string, or '' when valid.
       --------------------------------------------------------------- */
    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

    var rules = {
        name: function (v) {
            if (!v) { return 'Project name is required.'; }
            if (v.length < 3) { return 'Project name must be at least 3 characters.'; }
            return '';
        },
        client: function (v) {
            if (!v) { return 'Client name is required.'; }
            if (v.length < 2) { return 'Client name must be at least 2 characters.'; }
            return '';
        },
        contact: function (v) {
            if (!v) { return 'A client phone number or email address is required.'; }
            if (v.indexOf('@') !== -1) {
                return EMAIL_PATTERN.test(v) ? '' : 'Enter a valid email address, e.g. name@company.com';
            }
            var digits = v.replace(/[\s\-().]/g, '');
            if (!/^\+?\d{7,15}$/.test(digits)) {
                return 'Enter a valid phone number (7–15 digits) or an email address.';
            }
            return '';
        },
        location: function (v) {
            if (!v) { return 'Project location is required.'; }
            return '';
        },
        type: function (v) {
            if (!v) { return 'Select a project type.'; }
            return '';
        },
        startDate: function (v) {
            if (!v) { return 'Start date is required.'; }
            if (isNaN(Date.parse(v))) { return 'Enter a valid start date.'; }
            return '';
        },
        endDate: function (v, values) {
            if (!v) { return 'Expected completion date is required.'; }
            if (isNaN(Date.parse(v))) { return 'Enter a valid completion date.'; }
            if (values.startDate && Date.parse(v) < Date.parse(values.startDate)) {
                return 'Completion date cannot be before the start date.';
            }
            return '';
        },
        description: function (v) {
            if (v.length > MAX_DESCRIPTION) {
                return 'Description must be ' + MAX_DESCRIPTION + ' characters or fewer.';
            }
            return '';
        }
    };

    var FIELD_ORDER = ['name', 'client', 'contact', 'location', 'type', 'startDate', 'endDate', 'description'];
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

    function showSummary(title, message) {
        summaryTitle.textContent = title;
        summaryText.textContent = message;
        summary.hidden = false;
    }

    /* ---------------------------------------------------------------
       Open / close
       --------------------------------------------------------------- */
    function fillForm(project) {
        form.querySelector('[name="name"]').value = project.name || '';
        form.querySelector('[name="client"]').value = project.client || '';
        form.querySelector('[name="contact"]').value = project.contact || '';
        form.querySelector('[name="location"]').value = project.location || '';
        form.querySelector('[name="type"]').value = project.type || '';
        form.querySelector('[name="startDate"]').value = project.startDate || '';
        form.querySelector('[name="endDate"]').value = project.endDate || '';
        form.querySelector('[name="description"]').value = project.description || '';
        if (charCount) { charCount.textContent = String((project.description || '').length); }
    }

    function openForm(mode, project) {
        form.reset();
        touched = {};
        submitAttempted = false;
        summary.hidden = true;
        FIELD_ORDER.forEach(function (field) { setFieldError(field, ''); });
        if (charCount) { charCount.textContent = '0'; }

        if (mode === 'edit' && project) {
            editingProject = project;
            formTitle.textContent = 'Edit Project';
            submitBtn.textContent = 'Save Changes';
            fillForm(project);
        } else {
            editingProject = null;
            formTitle.textContent = 'New Project';
            submitBtn.textContent = 'Save Project';
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

    // The list module renders these buttons in the header and empty state.
    document.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-action="new-project"]');
        if (trigger) {
            e.preventDefault();
            openForm('add');
            return;
        }
        if (e.target.closest('[data-form-close]') && !submitting) {
            closeForm();
        }
    });

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay && !submitting) { closeForm(); }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('is-open') && !submitting) {
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

        // Once a field has been flagged — by blurring it or by pressing Save —
        // keep it in step with what the user types so the message clears as
        // soon as the value becomes valid.
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
    function setSubmitting(isSubmitting) {
        submitting = isSubmitting;
        submitBtn.disabled = isSubmitting;
        submitBtn.textContent = isSubmitting
            ? 'Saving…'
            : (editingProject ? 'Save Changes' : 'Save Project');
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (submitting) { return; }
        submitAttempted = true;

        var result = validate(true);
        var errorFields = Object.keys(result.errors);

        if (errorFields.length) {
            showSummary(
                'Please check the form',
                errorFields.length === 1 ? 'There is 1 field that needs your attention.' : 'There are ' + errorFields.length + ' fields that need your attention.'
            );
            var firstInvalid = form.querySelector('[name="' + errorFields[0] + '"]');
            if (firstInvalid) { firstInvalid.focus(); }
            return;
        }

        summary.hidden = true;
        setSubmitting(true);

        var saved = editingProject
            ? await store.update(editingProject.id, result.values)
            : await store.add(result.values);

        setSubmitting(false);

        if (!saved.ok) {
            if (saved.errors) {
                // Server-side validation caught something the client-side
                // rules didn't (or missed a race with another change) —
                // surface it through the same per-field error UI.
                Object.keys(saved.errors).forEach(function (field) {
                    touched[field] = true;
                    setFieldError(field, saved.errors[field]);
                });
                showSummary('Please check the form', 'The server found ' + Object.keys(saved.errors).length + ' problem(s) with this project.');
            } else if (saved.network) {
                showSummary('Couldn’t save this project', saved.error);
            } else {
                showSummary('Something went wrong', saved.error);
            }
            return;
        }

        closeForm();
        window.PhB.toast(
            editingProject
                ? 'Project "' + saved.project.name + '" has been updated.'
                : 'Project "' + saved.project.name + '" saved as ' + saved.project.ref + '.',
            'success'
        );
    });

    window.PhB.openProjectForm = openForm;
})();
