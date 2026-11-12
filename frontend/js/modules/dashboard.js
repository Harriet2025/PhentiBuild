/**
 * PhentiBuild (PhB) - Dashboard
 *
 * A read-only aggregation of data that already exists elsewhere:
 * PhB.projectsStore, PhB.measurementsStore, PhB.calculationsStore, and
 * a direct read of backend/api/history/index.php (the same one
 * history.js uses). Nothing is computed or stored here — this file only
 * fetches the most recent slice of each and renders it, plus the
 * "recent scans" list, which is just measurements whose values carry
 * source: 'scanner' (set by frontend/js/modules/scanner.js when a
 * capture is confirmed).
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-dashboard-module]');
    if (!root) { return; }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function relativeTime(date) {
        if (!date || isNaN(date.getTime())) { return ''; }
        var days = Math.floor((Date.now() - date.getTime()) / 86400000);
        if (days <= 0) { return 'Today'; }
        if (days === 1) { return 'Yesterday'; }
        if (days < 7) { return days + ' days ago'; }
        if (days < 14) { return 'Last week'; }
        if (days < 60) { return Math.floor(days / 7) + ' weeks ago'; }
        return Math.floor(days / 30) + ' months ago';
    }

    function setStat(key, value) {
        var el = root.querySelector('[data-dash-stat="' + key + '"]');
        if (el) { el.textContent = value; }
    }

    /** Empty-state elements carry an icon + a <span>; on an error we only
     *  want to replace the message text, not wipe out the icon too. */
    function setEmptyMessage(emptyEl, message) {
        var span = emptyEl.querySelector('span');
        if (span) { span.textContent = message; } else { emptyEl.textContent = message; }
    }

    var SCAN_ICON_TIMBER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="5" rx="1"/><rect x="3" y="13" width="18" height="5" rx="1"/></svg>';
    var SCAN_ICON_WALL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="5" x2="9" y2="12"/><line x1="15" y1="12" x2="15" y2="19"/></svg>';

    function scanIcon(sectionType) {
        return sectionType === 'walls' ? SCAN_ICON_WALL : SCAN_ICON_TIMBER;
    }

    function progressMarkup(progress) {
        return '<div class="progress dash-project-progress">' +
                    '<div class="progress-track">' +
                        '<div class="progress-bar' + (progress === 100 ? ' is-complete' : '') + '" style="width:' + progress + '%"></div>' +
                    '</div>' +
                    '<span class="progress-value">' + progress + '%</span>' +
                '</div>';
    }

    /* ---------------------------------------------------------------
       Active Projects
       --------------------------------------------------------------- */
    var STATUS_BADGE = {
        'Planning': 'badge-info',
        'In Progress': 'badge-primary',
        'On Hold': 'badge-warning',
        'Completed': 'badge-success',
        'Archived': 'badge-neutral'
    };

    function loadProjects() {
        var loadingEl = root.querySelector('[data-dash-projects-loading]');
        var emptyEl = root.querySelector('[data-dash-projects-empty]');
        var listEl = root.querySelector('[data-dash-projects-list]');
        if (!window.PhB || !window.PhB.projectsStore) { loadingEl.hidden = true; return; }

        window.PhB.projectsStore.getAll().then(function (result) {
            loadingEl.hidden = true;
            if (!result.ok) { emptyEl.hidden = false; setEmptyMessage(emptyEl, result.error || 'Could not load projects.'); return; }

            setStat('totalProjects', result.projects.length);
            var active = result.projects
                .filter(function (p) { return p.status !== 'Completed' && p.status !== 'Archived'; })
                .sort(function (a, b) { return b.updatedAt - a.updatedAt; });
            setStat('activeProjects', active.length);

            if (!active.length) { emptyEl.hidden = false; return; }

            listEl.innerHTML = active.slice(0, 5).map(function (p) {
                return '<li class="dash-project-item">' +
                    '<a href="#projects/' + escapeHtml(p.ref) + '" class="dash-project-link">' +
                        '<span class="dash-project-name-row">' +
                            '<span class="dash-project-name">' + escapeHtml(p.name) + '</span>' +
                            '<span class="badge ' + (STATUS_BADGE[p.status] || 'badge-neutral') + '">' + escapeHtml(p.status) + '</span>' +
                        '</span>' +
                        '<span class="dash-project-ref">' + escapeHtml(p.ref) + ' &middot; ' + escapeHtml(p.client) + '</span>' +
                        progressMarkup(p.progress) +
                    '</a>' +
                '</li>';
            }).join('');
        });
    }

    /* ---------------------------------------------------------------
       Recent Scans — measurements captured via the Camera Scanner
       (values.source === 'scanner', set in scanner.js on Confirm & Save).
       --------------------------------------------------------------- */
    function loadScans() {
        var loadingEl = root.querySelector('[data-dash-scans-loading]');
        var emptyEl = root.querySelector('[data-dash-scans-empty]');
        var listEl = root.querySelector('[data-dash-scans-list]');
        if (!window.PhB || !window.PhB.measurementsStore) { loadingEl.hidden = true; return; }

        window.PhB.measurementsStore.getAll().then(function (result) {
            loadingEl.hidden = true;
            if (!result.ok) { emptyEl.hidden = false; setEmptyMessage(emptyEl, result.error || 'Could not load measurements.'); return; }

            setStat('totalMeasurements', result.measurements.length);
            var scans = result.measurements.filter(function (m) { return m.values && m.values.source === 'scanner'; });

            if (!scans.length) { emptyEl.hidden = false; return; }

            listEl.innerHTML = scans.slice(0, 5).map(function (m) {
                return '<li class="dash-list-item">' +
                    '<span class="dash-list-icon">' + scanIcon(m.sectionType) + '</span>' +
                    '<span class="dash-list-text">' +
                        '<span class="dash-list-title">' + escapeHtml(m.label || m.sectionType) + '</span>' +
                        '<span class="dash-list-meta">' + escapeHtml(relativeTime(m.createdAt)) + '</span>' +
                    '</span>' +
                '</li>';
            }).join('');
        });
    }

    /* ---------------------------------------------------------------
       Calculations count only — no dedicated list section for these,
       Recent Activity below already surfaces "Calculation saved" entries.
       --------------------------------------------------------------- */
    function loadCalculationsCount() {
        if (!window.PhB || !window.PhB.calculationsStore) { return; }
        window.PhB.calculationsStore.getAll().then(function (result) {
            if (result.ok) { setStat('totalCalculations', result.calculations.length); }
        });
    }

    /* ---------------------------------------------------------------
       Recent Activity — same backend/api/history/index.php history.js
       reads, just capped to 5 and rendered as a plain list here.
       --------------------------------------------------------------- */
    var HISTORY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';

    var ACTION_BADGE = {
        created: 'badge-success',
        updated: 'badge-info',
        deleted: 'badge-danger',
        deactivated: 'badge-warning',
        reactivated: 'badge-success'
    };

    function loadHistory() {
        var loadingEl = root.querySelector('[data-dash-history-loading]');
        var emptyEl = root.querySelector('[data-dash-history-empty]');
        var listEl = root.querySelector('[data-dash-history-list]');

        fetch('/PhentiBuild/backend/api/history/index.php?limit=5', { headers: { 'Accept': 'application/json' } })
            .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
            .then(function (result) {
                loadingEl.hidden = true;
                if (!result.ok || !result.body.success) { emptyEl.hidden = false; setEmptyMessage(emptyEl, (result.body && result.body.error) || 'Could not load recent activity.'); return; }

                var rows = result.body.data || [];
                if (!rows.length) { emptyEl.hidden = false; return; }

                listEl.innerHTML = rows.map(function (row) {
                    var when = new Date(String(row.created_at).replace(' ', 'T'));
                    var action = row.action.charAt(0).toUpperCase() + row.action.slice(1);
                    return '<li class="dash-list-item">' +
                        '<span class="dash-list-icon dash-list-icon-' + escapeHtml(row.action) + '">' + HISTORY_ICON + '</span>' +
                        '<span class="dash-list-text">' +
                            '<span class="dash-list-title">' + escapeHtml(row.summary) + '</span>' +
                            '<span class="dash-list-meta">' +
                                '<span class="badge ' + (ACTION_BADGE[row.action] || 'badge-neutral') + '">' + escapeHtml(action) + '</span>' +
                                escapeHtml(relativeTime(when)) +
                            '</span>' +
                        '</span>' +
                    '</li>';
                }).join('');
            })
            .catch(function () {
                loadingEl.hidden = true;
                emptyEl.hidden = false;
                setEmptyMessage(emptyEl, 'Could not reach the server.');
            });
    }

    loadProjects();
    loadScans();
    loadCalculationsCount();
    loadHistory();
})();
