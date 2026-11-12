/**
 * PhentiBuild (PhB) - History & Audit Log
 *
 * Read-only: search and filters (date/user/module) are all applied
 * server-side (backend/api/history/index.php) rather than client-side,
 * since the audit trail is meant to grow without bound and the visible
 * page is only ever the most recent slice of it. The user/module filter
 * dropdowns are populated from that same response's meta so they always
 * reflect what the database can actually filter on, not a hardcoded list
 * that could drift out of sync.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-history-module]');
    if (!root) { return; }

    var API_URL = '/PhentiBuild/backend/api/history/index.php';

    var searchInput = root.querySelector('[data-history-search]');
    var dateFilter = root.querySelector('[data-filter-date]');
    var userFilter = root.querySelector('[data-filter-user]');
    var moduleFilter = root.querySelector('[data-filter-module]');
    var tbody = root.querySelector('[data-history-tbody]');
    var countEl = root.querySelector('[data-history-count]');
    var metaEl = root.querySelector('[data-history-meta]');
    var contentWrap = root.querySelector('[data-history-content]');
    var emptyFiltered = root.querySelector('[data-empty-filtered]');
    var emptyNone = root.querySelector('[data-empty-none]');
    var clearButtons = root.querySelectorAll('[data-clear-filters]');
    var loadingEl = root.querySelector('[data-history-loading]');
    var errorEl = root.querySelector('[data-history-error]');
    var errorTextEl = root.querySelector('[data-history-error-text]');
    var retryBtn = root.querySelector('[data-history-retry]');

    var optionsPopulated = false;
    var loadToken = 0;
    var searchDebounce = null;

    var ACTION_BADGE = {
        created: 'badge-success',
        updated: 'badge-info',
        deleted: 'badge-danger',
        deactivated: 'badge-warning',
        reactivated: 'badge-success'
    };

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function parseTimestamp(value) {
        return new Date(String(value).replace(' ', 'T'));
    }

    function initials(name) {
        var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) { return '?'; }
        return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    }

    function actionBadge(action) {
        var cls = ACTION_BADGE[action] || 'badge-neutral';
        var label = action.charAt(0).toUpperCase() + action.slice(1);
        return '<span class="badge ' + cls + '">' + escapeHtml(label) + '</span>';
    }

    function userCell(row) {
        if (!row.user_id || !row.user_name) {
            return '<span class="text-muted">System</span>';
        }
        return '<div class="history-user-cell">' +
            '<span class="history-user-avatar">' + escapeHtml(initials(row.user_name)) + '</span>' +
            '<span>' + escapeHtml(row.user_name) + '</span>' +
        '</div>';
    }

    function projectCell(row) {
        if (!row.project_id || !row.project_ref) {
            return '<span class="text-muted">&mdash;</span>';
        }
        return '<div class="history-project-cell">' +
            '<span class="history-project-ref">' + escapeHtml(row.project_ref) + '</span>' +
            '<span class="history-project-name">' + escapeHtml(row.project_name || '') + '</span>' +
        '</div>';
    }

    function rowMarkup(row) {
        var when = parseTimestamp(row.created_at);
        var dateText = isNaN(when.getTime()) ? row.created_at : when.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        var timeText = isNaN(when.getTime()) ? '' : when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

        return '<tr>' +
            '<td class="text-sm">' + escapeHtml(dateText) + '</td>' +
            '<td class="text-sm text-muted">' + escapeHtml(timeText) + '</td>' +
            '<td>' + userCell(row) + '</td>' +
            '<td><span class="badge badge-neutral">' + escapeHtml(row.module || row.entity_type) + '</span></td>' +
            '<td>' + projectCell(row) + '</td>' +
            '<td>' + actionBadge(row.action) + '</td>' +
            '<td class="text-sm">' + escapeHtml(row.summary) + '</td>' +
        '</tr>';
    }

    function hasActiveFilters() {
        return !!(searchInput.value.trim() || dateFilter.value || userFilter.value || moduleFilter.value);
    }

    function showOnly(state) {
        // state: 'loading' | 'error' | 'content'
        loadingEl.hidden = state !== 'loading';
        errorEl.hidden = state !== 'error';
        metaEl.hidden = state !== 'content';
        if (state !== 'content') {
            contentWrap.hidden = true;
            emptyFiltered.hidden = true;
            emptyNone.hidden = true;
        }
    }

    function populateFilterOptions(meta) {
        if (optionsPopulated) { return; }
        optionsPopulated = true;

        (meta.users || []).forEach(function (u) {
            var opt = document.createElement('option');
            opt.value = String(u.id);
            opt.textContent = u.name;
            userFilter.appendChild(opt);
        });

        (meta.modules || []).forEach(function (m) {
            var opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            moduleFilter.appendChild(opt);
        });
    }

    function buildQuery() {
        var params = new URLSearchParams();
        var q = searchInput.value.trim();
        if (q) { params.set('q', q); }
        if (dateFilter.value) { params.set('date', dateFilter.value); }
        if (userFilter.value) { params.set('userId', userFilter.value); }
        if (moduleFilter.value) { params.set('module', moduleFilter.value); }
        return params.toString();
    }

    async function load() {
        var thisLoad = ++loadToken;
        showOnly('loading');

        var query = buildQuery();
        var response;
        try {
            response = await fetch(API_URL + (query ? '?' + query : ''), { headers: { 'Accept': 'application/json' } });
        } catch (networkError) {
            if (thisLoad !== loadToken) { return; }
            errorTextEl.textContent = 'Could not reach the server. Check your connection and try again.';
            showOnly('error');
            return;
        }

        var payload = null;
        try { payload = await response.json(); } catch (e) { /* no/invalid body */ }
        if (thisLoad !== loadToken) { return; }

        if (!response.ok) {
            errorTextEl.textContent = (payload && payload.error) || 'The server returned an unexpected error (' + response.status + ').';
            showOnly('error');
            return;
        }

        populateFilterOptions(payload);

        var rows = payload.data || [];
        showOnly('content');
        render(rows);
    }

    function render(rows) {
        tbody.innerHTML = rows.map(rowMarkup).join('');

        var noMatches = rows.length === 0 && hasActiveFilters();
        var noneAtAll = rows.length === 0 && !hasActiveFilters();

        contentWrap.hidden = rows.length === 0;
        emptyFiltered.hidden = !noMatches;
        emptyNone.hidden = !noneAtAll;

        countEl.textContent = rows.length === 0 ? '' : 'Showing ' + rows.length + ' most recent ' + (rows.length === 1 ? 'entry' : 'entries');

        clearButtons.forEach(function (btn) {
            if (btn.closest('.history-meta')) {
                btn.hidden = !hasActiveFilters();
            }
        });
    }

    searchInput.addEventListener('input', function () {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(load, 300);
    });
    dateFilter.addEventListener('change', load);
    userFilter.addEventListener('change', load);
    moduleFilter.addEventListener('change', load);
    retryBtn.addEventListener('click', load);

    clearButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            searchInput.value = '';
            dateFilter.value = '';
            userFilter.value = '';
            moduleFilter.value = '';
            load();
        });
    });

    load();
})();
