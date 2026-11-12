/**
 * PhentiBuild (PhB) - Add / Edit BOQ Item Form
 *
 * One modal form serves both "Add Item" and "Edit Item". Quantity, Waste %
 * and Unit Price can also be edited inline in the table (boq.js); this
 * modal is where Item, Category, Description, Specification, Unit and
 * Notes are changed, and is also a full alternative way to edit the three
 * inline fields. Validation is hand-rolled (the form uses novalidate).
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-boq-module]');
    var overlay = document.querySelector('[data-boq-form-overlay]');
    var form = document.querySelector('[data-boq-form]');
    var store = window.PhB && window.PhB.boqStore;
    if (!root || !overlay || !form || !store) { return; }

    var formTitle = overlay.querySelector('[data-form-title]');
    var submitBtn = overlay.querySelector('[data-form-submit]');
    var summary = form.querySelector('[data-form-summary]');
    var summaryText = form.querySelector('[data-form-summary-text]');

    var editingId = null; // null while adding; an item id while editing

    /* ---------------------------------------------------------------
       Validation rules — each returns an error string, or '' when valid.
       --------------------------------------------------------------- */
    function numberRule(label, opts) {
        opts = opts || {};
        return function (v) {
            if (!v) { return opts.required ? (label + ' is required.') : ''; }
            var cleaned = v.replace(/,/g, '');
            if (!/^-?\d+(\.\d+)?$/.test(cleaned)) { return label + ' must be a number.'; }
            var value = parseFloat(cleaned);
            if (opts.min !== undefined && value < opts.min) { return label + ' must be ' + opts.min + ' or more.'; }
            return '';
        };
    }

    var rules = {
        item: function (v) {
            if (!v) { return 'Item name is required.'; }
            if (v.length < 2) { return 'Item name must be at least 2 characters.'; }
            return '';
        },
        category: function (v) {
            if (!v) { return 'Select a category.'; }
            return '';
        },
        description: function () { return ''; },
        specification: function () { return ''; },
        unit: function (v) {
            if (!v) { return 'Unit is required.'; }
            return '';
        },
        quantity: numberRule('Quantity', { required: true, min: 0 }),
        wastePercent: numberRule('Waste %', { min: 0 }),
        unitPrice: numberRule('Unit price', { min: 0 }),
        notes: function () { return ''; }
    };

    var FIELD_ORDER = ['item', 'category', 'description', 'specification', 'unit', 'quantity', 'wastePercent', 'unitPrice', 'notes'];
    var touched = {};
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

    function fillForm(item) {
        FIELD_ORDER.forEach(function (field) {
            var input = form.querySelector('[name="' + field + '"]');
            if (!input) { return; }
            if (!item) { input.value = ''; return; }
            input.value = (item[field] !== undefined && item[field] !== null) ? item[field] : '';
        });
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
            formTitle.textContent = 'Edit Item';
            submitBtn.textContent = 'Save Changes';
            fillForm(result.item);
        } else {
            editingId = null;
            formTitle.textContent = 'Add Item';
            submitBtn.textContent = 'Save Item';
            fillForm(null);
        }

        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';

        var first = form.querySelector('[name="item"]');
        if (first) { first.focus(); }
    }

    function closeForm() {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    // Scoped to this module's root — other modules (e.g. Materials) reuse
    // the same generic data-action="edit" attribute on their own rows.
    root.addEventListener('click', function (e) {
        var addTrigger = e.target.closest('[data-action="new-boq-item"]');
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
            editingId ? '"' + saved.item.item + '" has been updated.' : '"' + saved.item.item + '" added to the Bill of Quantities.',
            'success'
        );
    });
})();
