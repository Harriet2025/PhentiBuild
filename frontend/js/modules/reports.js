/**
 * PhentiBuild (PhB) - Excel Export Center
 *
 * Triggers backend/api/export/excel.php (a plain browser navigation, not
 * fetch+blob — the endpoint responds with Content-Disposition: attachment,
 * so the browser downloads it natively and the session cookie goes along
 * automatically since it's a same-origin request) and lists past exports
 * from the existing Reports API (backend/api/reports/index.php),
 * filtered client-side to this center's own type ('xlsx').
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-reports-module]');
    var projectsStore = window.PhB && window.PhB.projectsStore;
    if (!root || !projectsStore) { return; }

    var EXPORT_URL = '/PhentiBuild/backend/api/export/excel.php';
    var REPORTS_URL = '/PhentiBuild/backend/api/reports/index.php';

    var projectSelect = root.querySelector('[data-export-project]');
    var exportBtn = root.querySelector('[data-export-btn]');
    var exportBtnText = root.querySelector('[data-export-btn-text]');
    var exportError = root.querySelector('[data-export-error]');
    var exportErrorText = root.querySelector('[data-export-error-text]');
    var loadingEl = root.querySelector('[data-reports-loading]');
    var contentEl = root.querySelector('[data-reports-content]');
    var emptyEl = root.querySelector('[data-reports-empty]');
    var tbody = root.querySelector('[data-reports-tbody]');
    var refreshBtn = root.querySelector('[data-reports-refresh]');

    var projectsById = {};

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function formatDate(value) {
        var d = new Date(String(value).replace(' ', 'T'));
        return isNaN(d.getTime()) ? value : d.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    async function loadProjects() {
        var result = await projectsStore.getAll();
        if (!result.ok) { return; }

        result.projects.forEach(function (p) {
            projectsById[p.id] = p;
            var opt = document.createElement('option');
            opt.value = String(p.id);
            opt.textContent = p.ref + ' — ' + p.name;
            projectSelect.appendChild(opt);
        });
    }

    function triggerExport() {
        var projectId = projectSelect.value;
        var url = EXPORT_URL + (projectId ? '?projectId=' + encodeURIComponent(projectId) : '');

        exportError.hidden = true;
        exportBtn.disabled = true;
        exportBtnText.textContent = 'Generating…';

        window.location.href = url;

        // The download itself doesn't navigate the page away (the response
        // is an attachment), but there's no browser event for "the file
        // finished downloading" — re-enable after a short pause and
        // refresh the recent-exports list to pick up the new row.
        setTimeout(function () {
            exportBtn.disabled = false;
            exportBtnText.textContent = 'Export to Excel';
            loadRecent();
        }, 1500);
    }

    function rowMarkup(report) {
        var project = report.project_id ? projectsById[report.project_id] : null;
        var projectLabel = project ? escapeHtml(project.ref + ' — ' + project.name) : '<span class="text-muted">General</span>';
        var regenerateHref = EXPORT_URL + (report.project_id ? '?projectId=' + encodeURIComponent(report.project_id) : '');

        return '<tr>' +
            '<td class="text-sm">' + escapeHtml(formatDate(report.created_at)) + '</td>' +
            '<td>' + escapeHtml(report.title) + '</td>' +
            '<td>' + projectLabel + '</td>' +
            '<td class="text-right"><a class="btn btn-outline-secondary btn-sm" href="' + regenerateHref + '">Regenerate</a></td>' +
        '</tr>';
    }

    async function loadRecent() {
        loadingEl.hidden = false;
        contentEl.hidden = true;
        emptyEl.hidden = true;

        var response;
        try {
            response = await fetch(REPORTS_URL, { headers: { 'Accept': 'application/json' } });
        } catch (e) {
            loadingEl.hidden = true;
            return;
        }

        var payload = null;
        try { payload = await response.json(); } catch (e) { /* ignore */ }
        loadingEl.hidden = true;

        if (!response.ok || !payload) { return; }

        var xlsxReports = (payload.data || []).filter(function (r) { return r.type === 'xlsx'; });

        if (!xlsxReports.length) {
            emptyEl.hidden = false;
            return;
        }

        tbody.innerHTML = xlsxReports.map(rowMarkup).join('');
        contentEl.hidden = false;
    }

    exportBtn.addEventListener('click', triggerExport);
    refreshBtn.addEventListener('click', loadRecent);

    loadProjects().then(loadRecent);
})();
