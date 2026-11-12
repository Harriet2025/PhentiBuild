/**
 * PhentiBuild (PhB) - Contact Form
 *
 * Same pattern as frontend/js/modules/auth.js: client-side validation
 * mirrors the server's own rules (see backend/api/contact/submit.php)
 * for immediate feedback, but the server is still the authority — its
 * validation errors are mapped onto the same per-field UI either way.
 */
(function () {
    'use strict';

    var form = document.querySelector('[data-contact-form]');
    if (!form) { return; } // not on the contact page

    var API_URL = '/PhentiBuild/backend/api/contact/submit.php';
    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
    var card = form.closest('[data-contact-card]') || form;

    function setFieldError(field, message) {
        var input = form.querySelector('[name="' + field + '"]');
        var errorEl = form.querySelector('[data-error-for="' + field + '"]');
        if (!input || !errorEl) { return; }

        if (message) {
            input.classList.add('is-invalid');
            errorEl.textContent = message;
            errorEl.hidden = false;
        } else {
            input.classList.remove('is-invalid');
            errorEl.textContent = '';
            errorEl.hidden = true;
        }
    }

    function showSummary(type, title, message) {
        var summary = card.querySelector('[data-form-summary]');
        summary.classList.remove('alert-danger', 'alert-success');
        summary.classList.add(type === 'success' ? 'alert-success' : 'alert-danger');
        card.querySelector('[data-form-summary-title]').textContent = title;
        card.querySelector('[data-form-summary-text]').textContent = message;
        summary.hidden = false;
    }

    function hideSummary() {
        card.querySelector('[data-form-summary]').hidden = true;
    }

    function setSubmitting(isSubmitting) {
        var btn = form.querySelector('[data-form-submit]');
        btn.disabled = isSubmitting;
        btn.textContent = isSubmitting ? 'Sending…' : 'Send Message';
    }

    function validate(values) {
        var errors = {};

        if (!values.name) { errors.name = 'Full name is required.'; }
        else if (values.name.length < 2) { errors.name = 'Name must be at least 2 characters.'; }

        if (!values.email) { errors.email = 'Email is required.'; }
        else if (!EMAIL_PATTERN.test(values.email)) { errors.email = 'Enter a valid email address.'; }

        if (values.phone) {
            var digits = values.phone.replace(/[\s\-().]/g, '');
            if (!/^\+?\d{7,15}$/.test(digits)) { errors.phone = 'Enter a valid phone number (7–15 digits).'; }
        }

        if (!values.subject) { errors.subject = 'Subject is required.'; }
        else if (values.subject.length < 3) { errors.subject = 'Subject must be at least 3 characters.'; }

        if (!values.message) { errors.message = 'Message is required.'; }
        else if (values.message.length < 10) { errors.message = 'Message must be at least 10 characters.'; }

        return errors;
    }

    async function postJson(body) {
        var response;
        try {
            response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(body)
            });
        } catch (networkError) {
            return { ok: false, network: true, error: 'Could not reach the server. Check your connection and try again.' };
        }

        var payload = null;
        try { payload = await response.json(); } catch (e) { /* no/invalid body */ }

        if (!response.ok) {
            return {
                ok: false,
                error: (payload && payload.error) || 'The server returned an unexpected error (' + response.status + ').',
                errors: (payload && payload.errors) || null
            };
        }

        return { ok: true, data: payload && payload.data };
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideSummary();

        var values = {
            name: form.querySelector('[name="name"]').value.trim(),
            email: form.querySelector('[name="email"]').value.trim(),
            phone: form.querySelector('[name="phone"]').value.trim(),
            subject: form.querySelector('[name="subject"]').value.trim(),
            message: form.querySelector('[name="message"]').value.trim(),
            // Honeypot — real visitors never see this field. A filled
            // value means a bot, so we quietly no-op instead of posting.
            website: form.querySelector('[name="website"]').value.trim()
        };

        var errors = validate(values);
        ['name', 'email', 'phone', 'subject', 'message'].forEach(function (field) {
            setFieldError(field, errors[field] || '');
        });
        if (Object.keys(errors).length) {
            showSummary('error', 'Please check the form', 'There ' + (Object.keys(errors).length === 1 ? 'is 1 field' : 'are ' + Object.keys(errors).length + ' fields') + ' that need your attention.');
            return;
        }

        if (values.website) {
            form.reset();
            showSummary('success', 'Message sent', 'Thanks — we’ve received your message and will get back to you soon.');
            return;
        }

        setSubmitting(true);
        var result = await postJson({
            name: values.name, email: values.email, phone: values.phone,
            subject: values.subject, message: values.message
        });
        setSubmitting(false);

        if (!result.ok) {
            if (result.errors) {
                Object.keys(result.errors).forEach(function (field) {
                    setFieldError(field, result.errors[field]);
                });
            }
            showSummary('error', result.network ? 'Couldn’t reach the server' : 'Please check the form', result.error);
            return;
        }

        form.reset();
        showSummary('success', 'Message sent', 'Thanks — we’ve received your message and will get back to you soon.');
    });
})();
