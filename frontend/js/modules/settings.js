/**
 * PhentiBuild (PhB) - Settings (page controller)
 *
 * Three tabs: Account (profile + password, backend/api/account/*),
 * Company Profile (backend/api/company-profile/index.php — a
 * single-document record, same shape as Roof Design), and Preferences.
 *
 * Preferences intentionally does not invent new plumbing for the BOQ
 * contingency control — it reads/writes the exact same per-device value
 * window.PhB.boqStore already owns (see boq-store.js), just surfaced
 * here too. The unit-system preference is real and persisted, but
 * nothing else in the app reads it yet — the panel says so rather than
 * implying Manual Input or Calculators already respect it.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-settings-module]');
    if (!root) { return; }

    function toast(message, variant) {
        if (window.PhB && window.PhB.toast) { window.PhB.toast(message, variant); }
    }

    /* ---------------------------------------------------------------
       Tabs
       --------------------------------------------------------------- */
    var tabButtons = Array.prototype.slice.call(root.querySelectorAll('[data-settings-tab]'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('[data-settings-panel]'));

    tabButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var target = btn.getAttribute('data-settings-tab');
            tabButtons.forEach(function (b) {
                var active = b === btn;
                b.classList.toggle('is-active', active);
                b.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            panels.forEach(function (p) {
                p.hidden = p.getAttribute('data-settings-panel') !== target;
            });
        });
    });

    /* ---------------------------------------------------------------
       Generic form helpers — field errors + summary, shared by all
       three forms on this page.
       --------------------------------------------------------------- */
    function clearErrors(form) {
        form.querySelectorAll('.form-error').forEach(function (el) {
            el.textContent = '';
            el.hidden = true;
        });
        form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
        var summary = form.querySelector('[data-form-summary]');
        if (summary) { summary.hidden = true; }
        var success = form.querySelector('[data-form-success]');
        if (success) { success.hidden = true; }
    }

    function showFieldErrors(form, errors) {
        Object.keys(errors).forEach(function (field) {
            var errorEl = form.querySelector('[data-error-for="' + field + '"]');
            var input = form.querySelector('[name="' + field + '"]');
            if (errorEl) {
                errorEl.textContent = errors[field];
                errorEl.hidden = false;
            }
            if (input) { input.classList.add('is-invalid'); }
        });
        var summary = form.querySelector('[data-form-summary]');
        var summaryText = form.querySelector('[data-form-summary-text]');
        if (summary && summaryText) {
            var count = Object.keys(errors).length;
            summaryText.textContent = count === 1 ? 'There is 1 entry that needs your attention.' : 'There are ' + count + ' entries that need your attention.';
            summary.hidden = false;
        }
    }

    function showSuccess(form) {
        var success = form.querySelector('[data-form-success]');
        if (success) { success.hidden = false; }
    }

    function setSubmitting(form, submitting) {
        var btn = form.querySelector('button[type="submit"]');
        if (!btn) { return; }
        btn.disabled = submitting;
        if (submitting) {
            btn.dataset.originalText = btn.textContent;
            btn.textContent = 'Saving…';
        } else if (btn.dataset.originalText) {
            btn.textContent = btn.dataset.originalText;
        }
    }

    async function requestJson(url, method, body) {
        var response;
        try {
            response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(body)
            });
        } catch (networkError) {
            return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
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

    /* ---------------------------------------------------------------
       Account: Profile Information
       --------------------------------------------------------------- */
    var profileForm = root.querySelector('[data-settings-form="profile"]');
    if (profileForm) {
        (async function loadProfile() {
            var result = await requestJson('/PhentiBuild/backend/api/auth/me.php', 'GET');
            if (!result.ok) { return; }
            profileForm.querySelector('[name="name"]').value = result.data.name || '';
            profileForm.querySelector('[name="email"]').value = result.data.email || '';
            profileForm.querySelector('[name="phone"]').value = result.data.phone || '';
            profileForm.querySelector('[name="role"]').value = result.data.role || 'User';
        })();

        profileForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearErrors(profileForm);

            var payload = {
                name: profileForm.querySelector('[name="name"]').value.trim(),
                email: profileForm.querySelector('[name="email"]').value.trim(),
                phone: profileForm.querySelector('[name="phone"]').value.trim(),
                role: profileForm.querySelector('[name="role"]').value
            };

            setSubmitting(profileForm, true);
            var result = await requestJson('/PhentiBuild/backend/api/account/profile.php', 'PUT', payload);
            setSubmitting(profileForm, false);

            if (!result.ok) {
                if (result.errors) { showFieldErrors(profileForm, result.errors); }
                else { toast(result.error, 'danger'); }
                return;
            }

            showSuccess(profileForm);
            toast('Profile updated.', 'success');

            // The app shell's header (frontend/pages/app.php) renders the
            // name/role/avatar from the session on page load, not from a
            // live subscription — patch them directly so a changed name
            // or role shows immediately instead of only after the next
            // navigation.
            var saved = result.data;
            var nameEl = document.querySelector('.shell-user-name');
            var roleEl = document.querySelector('.shell-user-role');
            var avatarEl = document.querySelector('.shell-avatar');
            if (nameEl) { nameEl.textContent = saved.name; }
            if (roleEl) { roleEl.textContent = saved.role; }
            if (avatarEl && saved.name) { avatarEl.textContent = saved.name.charAt(0).toUpperCase(); }
        });
    }

    /* ---------------------------------------------------------------
       Account: Change Password
       --------------------------------------------------------------- */
    var passwordForm = root.querySelector('[data-settings-form="password"]');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearErrors(passwordForm);

            var payload = {
                currentPassword: passwordForm.querySelector('[name="currentPassword"]').value,
                newPassword: passwordForm.querySelector('[name="newPassword"]').value,
                confirmNewPassword: passwordForm.querySelector('[name="confirmNewPassword"]').value
            };

            setSubmitting(passwordForm, true);
            var result = await requestJson('/PhentiBuild/backend/api/account/password.php', 'POST', payload);
            setSubmitting(passwordForm, false);

            if (!result.ok) {
                if (result.errors) { showFieldErrors(passwordForm, result.errors); }
                else { toast(result.error, 'danger'); }
                return;
            }

            passwordForm.reset();
            showSuccess(passwordForm);
            toast('Password changed.', 'success');
        });
    }

    /* ---------------------------------------------------------------
       Company Profile
       --------------------------------------------------------------- */
    var companyForm = root.querySelector('[data-settings-form="company"]');
    if (companyForm) {
        (async function loadCompany() {
            var result = await requestJson('/PhentiBuild/backend/api/company-profile/index.php', 'GET');
            if (!result.ok) { return; }
            companyForm.querySelector('[name="companyName"]').value = result.data.companyName || '';
            companyForm.querySelector('[name="address"]').value = result.data.address || '';
            companyForm.querySelector('[name="phone"]').value = result.data.phone || '';
            companyForm.querySelector('[name="email"]').value = result.data.email || '';
            companyForm.querySelector('[name="registrationNumber"]').value = result.data.registrationNumber || '';
        })();

        companyForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearErrors(companyForm);

            var payload = {
                companyName: companyForm.querySelector('[name="companyName"]').value.trim(),
                address: companyForm.querySelector('[name="address"]').value.trim(),
                phone: companyForm.querySelector('[name="phone"]').value.trim(),
                email: companyForm.querySelector('[name="email"]').value.trim(),
                registrationNumber: companyForm.querySelector('[name="registrationNumber"]').value.trim()
            };

            setSubmitting(companyForm, true);
            var result = await requestJson('/PhentiBuild/backend/api/company-profile/index.php', 'PUT', payload);
            setSubmitting(companyForm, false);

            if (!result.ok) {
                if (result.errors) { showFieldErrors(companyForm, result.errors); }
                else { toast(result.error, 'danger'); }
                return;
            }

            showSuccess(companyForm);
            toast('Company profile updated.', 'success');
        });
    }

    /* ---------------------------------------------------------------
       Preferences
       --------------------------------------------------------------- */
    var contingencyInput = root.querySelector('[data-settings-contingency]');
    if (contingencyInput && window.PhB && window.PhB.boqStore) {
        contingencyInput.value = window.PhB.boqStore.getContingencyPercent();
        contingencyInput.addEventListener('change', function () {
            window.PhB.boqStore.setContingencyPercent(contingencyInput.value);
            contingencyInput.value = window.PhB.boqStore.getContingencyPercent();
            toast('Default contingency percentage saved.', 'success');
        });
    }

    var UNIT_SYSTEM_KEY = 'phb.settings.unitSystem.v1';
    var unitSystemSelect = root.querySelector('[data-settings-unit-system]');
    if (unitSystemSelect) {
        try {
            unitSystemSelect.value = window.localStorage.getItem(UNIT_SYSTEM_KEY) || 'metric';
        } catch (e) { /* storage unavailable — leave the default selected */ }

        unitSystemSelect.addEventListener('change', function () {
            try {
                window.localStorage.setItem(UNIT_SYSTEM_KEY, unitSystemSelect.value);
            } catch (e) { /* ignore — value just won't persist */ }
            toast('Preferred unit system saved.', 'success');
        });
    }
})();
