/**
 * PhentiBuild (PhB) - Login / Register / Logout
 *
 * Client-side validation mirrors the server's own rules (see
 * backend/api/auth/register.php and login.php) for immediate feedback;
 * the server is still the authority and its own validation errors are
 * mapped onto the same per-field UI. The password is read from the
 * input only at submit time, sent straight into the fetch() body, and
 * never assigned to any variable that outlives the request — there is
 * nothing to leak because nothing is kept around.
 *
 * fetch() uses credentials: 'same-origin' so the HttpOnly session cookie
 * login.php sets is included on every subsequent request automatically;
 * this file never reads or stores a token itself.
 */
(function () {
    'use strict';

    var API_BASE = '/PhentiBuild/backend/api/auth';

    async function postJson(path, body) {
        var response;
        try {
            response = await fetch(API_BASE + '/' + path, {
                method: 'POST',
                credentials: 'same-origin',
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
                status: response.status,
                error: (payload && payload.error) || 'The server returned an unexpected error (' + response.status + ').',
                errors: (payload && payload.errors) || null
            };
        }

        return { ok: true, data: payload.data };
    }

    function setFieldError(form, field, message) {
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

    function showSummary(card, title, message) {
        var summary = card.querySelector('[data-form-summary]');
        card.querySelector('[data-form-summary-title]').textContent = title;
        card.querySelector('[data-form-summary-text]').textContent = message;
        summary.hidden = false;
    }

    function hideSummary(card) {
        card.querySelector('[data-form-summary]').hidden = true;
    }

    function setSubmitting(form, isSubmitting, busyText, idleText) {
        var btn = form.querySelector('[data-form-submit]');
        btn.disabled = isSubmitting;
        btn.textContent = isSubmitting ? busyText : idleText;
    }

    /* ---------------------------------------------------------------
       Login
       --------------------------------------------------------------- */
    var loginForm = document.querySelector('[data-login-form]');
    if (loginForm) {
        var loginCard = loginForm.closest('.auth-form-float');

        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            hideSummary(loginCard);

            var email = loginForm.querySelector('[name="email"]').value.trim();
            var password = loginForm.querySelector('[name="password"]').value;
            var rememberEl = loginForm.querySelector('[name="remember"]');
            var remember = !!(rememberEl && rememberEl.checked);

            var errors = {};
            if (!email) { errors.email = 'Email is required.'; }
            if (!password) { errors.password = 'Password is required.'; }

            ['email', 'password'].forEach(function (field) {
                setFieldError(loginForm, field, errors[field] || '');
            });
            if (Object.keys(errors).length) { return; }

            setSubmitting(loginForm, true, 'Logging in…', 'Log In');
            var result = await postJson('login.php', { email: email, password: password, remember: remember });
            setSubmitting(loginForm, false, 'Logging in…', 'Log In');

            if (!result.ok) {
                if (result.errors) {
                    Object.keys(result.errors).forEach(function (field) {
                        setFieldError(loginForm, field, result.errors[field]);
                    });
                }
                showSummary(loginCard, result.network ? 'Couldn’t reach the server' : 'Couldn’t log you in', result.error);
                return;
            }

            window.location.href = 'app.php';
        });
    }

    /* ---------------------------------------------------------------
       Register
       --------------------------------------------------------------- */
    var registerForm = document.querySelector('[data-register-form]');
    if (registerForm) {
        var registerCard = registerForm.closest('.auth-card--register');

        var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

        function validateRegister(values) {
            var errors = {};
            if (!values.name) { errors.name = 'Name is required.'; }
            else if (values.name.length < 2) { errors.name = 'Name must be at least 2 characters.'; }

            if (!values.email) { errors.email = 'Email is required.'; }
            else if (!EMAIL_PATTERN.test(values.email)) { errors.email = 'Enter a valid email address.'; }

            if (!values.phone) { errors.phone = 'Phone is required.'; }
            else {
                var digits = values.phone.replace(/[\s\-().]/g, '');
                if (!/^\+?\d{7,15}$/.test(digits)) { errors.phone = 'Enter a valid phone number (7–15 digits).'; }
            }

            if (!values.role) { errors.role = 'Select a role.'; }

            if (!values.password) { errors.password = 'Password is required.'; }
            else if (values.password.length < 8) { errors.password = 'Password must be at least 8 characters.'; }

            if (!values.confirmPassword) { errors.confirmPassword = 'Confirm your password.'; }
            else if (values.confirmPassword !== values.password) { errors.confirmPassword = 'Passwords do not match.'; }

            if (!values.acceptTerms) { errors.acceptTerms = 'You must agree to the Terms & Conditions and Privacy Policy.'; }

            return errors;
        }

        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            hideSummary(registerCard);

            var values = {
                name: registerForm.querySelector('[name="name"]').value.trim(),
                email: registerForm.querySelector('[name="email"]').value.trim(),
                phone: registerForm.querySelector('[name="phone"]').value.trim(),
                role: registerForm.querySelector('[name="role"]').value,
                password: registerForm.querySelector('[name="password"]').value,
                confirmPassword: registerForm.querySelector('[name="confirmPassword"]').value,
                acceptTerms: registerForm.querySelector('[name="acceptTerms"]').checked
            };

            var errors = validateRegister(values);
            ['name', 'email', 'phone', 'role', 'password', 'confirmPassword', 'acceptTerms'].forEach(function (field) {
                setFieldError(registerForm, field, errors[field] || '');
            });
            if (Object.keys(errors).length) {
                showSummary(registerCard, 'Please check the form', 'There ' + (Object.keys(errors).length === 1 ? 'is 1 field' : 'are ' + Object.keys(errors).length + ' fields') + ' that need your attention.');
                return;
            }

            setSubmitting(registerForm, true, 'Creating account…', 'Create Account');
            var result = await postJson('register.php', {
                name: values.name, email: values.email, phone: values.phone,
                role: values.role, password: values.password
            });
            setSubmitting(registerForm, false, 'Creating account…', 'Create Account');

            if (!result.ok) {
                if (result.errors) {
                    Object.keys(result.errors).forEach(function (field) {
                        setFieldError(registerForm, field, result.errors[field]);
                    });
                }
                showSummary(registerCard, result.network ? 'Couldn’t reach the server' : 'Please check the form', result.error);
                return;
            }

            window.location.href = 'login.php?registered=1';
        });
    }

    /* ---------------------------------------------------------------
       Logout — wired on app.php's topbar dropdown link.
       --------------------------------------------------------------- */
    var logoutLink = document.querySelector('[data-logout]');
    if (logoutLink) {
        logoutLink.addEventListener('click', async function (e) {
            e.preventDefault();
            await postJson('logout.php', {});
            window.location.href = 'login.php';
        });
    }
})();
