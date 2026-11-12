/**
 * PhentiBuild (PhB) - Project Detail
 *
 * Owns the single-project view at #projects/PHB-XXXX: it decides whether
 * the list or the detail is showing, fetches the project from
 * PhB.projectsStore (a real network request now, not a localStorage
 * read), and handles the tab strip and the Edit / Archive / Delete
 * actions. Archive and Delete share the confirm dialog exposed by
 * projects.js (window.PhB.confirmAction); Edit opens the same modal
 * project-form.js uses for creating a project, in edit mode
 * (window.PhB.openProjectForm).
 *
 * Only the Overview tab has real content — the other seven are
 * placeholders for modules that haven't been built yet.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-projects-module]');
    var store = window.PhB && window.PhB.projectsStore;
    if (!root || !store) { return; }

    var listView = root.querySelector('[data-projects-list-view]');
    var detailView = root.querySelector('[data-project-detail-view]');
    var detailContent = root.querySelector('[data-detail-content]');
    var detailLoading = root.querySelector('[data-detail-loading]');
    var detailError = root.querySelector('[data-detail-error]');
    var detailErrorText = root.querySelector('[data-detail-error-text]');
    var detailRetryBtn = root.querySelector('[data-detail-retry]');
    var tabsNav = root.querySelector('[data-detail-tabs]');

    var els = {
        crumb: root.querySelector('[data-detail-crumb]'),
        ref: root.querySelector('[data-detail-ref]'),
        name: root.querySelector('[data-detail-name]'),
        subtitle: root.querySelector('[data-detail-subtitle]'),
        summary: root.querySelector('[data-detail-summary]'),
        facts: root.querySelector('[data-detail-facts]'),
        description: root.querySelector('[data-detail-description]')
    };

    var STATUS_BADGE = {
        'Planning': 'badge-info',
        'In Progress': 'badge-primary',
        'On Hold': 'badge-warning',
        'Completed': 'badge-success',
        'Archived': 'badge-neutral'
    };

    var currentRef = null;   // from the URL
    var currentProject = null; // last successfully loaded project (has .id)
    var loadToken = 0;

    /* ---------------------------------------------------------------
       Formatting helpers
       --------------------------------------------------------------- */
    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function formatDate(value) {
        if (!value) { return null; }
        var d = new Date(value);
        if (isNaN(d.getTime())) { return null; }
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    /** Values the seed data may not carry are shown as "Not recorded"
     *  rather than invented. */
    function orNotRecorded(value) {
        return value ? escapeHtml(value) : '<span class="text-muted">Not recorded</span>';
    }

    function durationBetween(start, end) {
        if (!start || !end) { return null; }
        var a = new Date(start);
        var b = new Date(end);
        if (isNaN(a.getTime()) || isNaN(b.getTime())) { return null; }
        var months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
        if (months < 1) { return 'Under a month'; }
        if (months === 1) { return '1 month'; }
        if (months < 12) { return months + ' months'; }
        var years = Math.floor(months / 12);
        var rest = months % 12;
        var label = years + (years === 1 ? ' year' : ' years');
        if (rest) { label += ' ' + rest + (rest === 1 ? ' month' : ' months'); }
        return label;
    }

    function summaryTile(label, valueHtml) {
        return '<div class="card detail-tile">' +
                    '<span class="tile-label">' + label + '</span>' +
                    '<span class="tile-value">' + valueHtml + '</span>' +
                '</div>';
    }

    /* ---------------------------------------------------------------
       Rendering
       --------------------------------------------------------------- */
    function renderDetail(project) {
        els.crumb.textContent = project.name;
        els.ref.textContent = project.ref;
        els.name.textContent = project.name;
        els.subtitle.textContent = project.client + ' · ' + project.location;

        var badge = '<span class="badge ' + (STATUS_BADGE[project.status] || 'badge-neutral') + '">' +
                        escapeHtml(project.status) + '</span>';

        var progress = '<div class="progress">' +
                            '<div class="progress-track">' +
                                '<div class="progress-bar' + (project.progress === 100 ? ' is-complete' : '') +
                                     '" style="width:' + project.progress + '%"></div>' +
                            '</div>' +
                            '<span class="progress-value">' + project.progress + '%</span>' +
                        '</div>';

        els.summary.innerHTML =
            summaryTile('Status', badge) +
            summaryTile('Progress', progress) +
            summaryTile('Start Date', orNotRecorded(formatDate(project.startDate))) +
            summaryTile('Expected Completion', orNotRecorded(formatDate(project.endDate)));

        var facts = [
            ['Project Name', escapeHtml(project.name)],
            ['Reference', '<span class="font-mono">' + escapeHtml(project.ref) + '</span>'],
            ['Client', escapeHtml(project.client)],
            ['Client Contact', orNotRecorded(project.contact)],
            ['Location', escapeHtml(project.location)],
            ['Project Type', escapeHtml(project.type)],
            ['Status', badge],
            ['Start Date', orNotRecorded(formatDate(project.startDate))],
            ['Expected Completion', orNotRecorded(formatDate(project.endDate))],
            ['Planned Duration', orNotRecorded(durationBetween(project.startDate, project.endDate))],
            ['Last Updated', escapeHtml(formatDate(project.updatedAt) || '—')]
        ];

        els.facts.innerHTML = facts.map(function (row) {
            return '<dt>' + row[0] + '</dt><dd>' + row[1] + '</dd>';
        }).join('');

        els.description.innerHTML = project.description
            ? escapeHtml(project.description)
            : '<span class="text-muted">No description was recorded for this project.</span>';
    }

    function showTab(tabId) {
        tabsNav.querySelectorAll('[data-tab]').forEach(function (link) {
            link.classList.toggle('is-active', link.getAttribute('data-tab') === tabId);
        });
        root.querySelectorAll('[data-tab-panel]').forEach(function (panel) {
            panel.hidden = panel.getAttribute('data-tab-panel') !== tabId;
        });
    }

    function showOnly(state) {
        // state: 'loading' | 'error' | 'content'
        detailLoading.hidden = state !== 'loading';
        detailError.hidden = state !== 'error';
        detailContent.hidden = state !== 'content';
    }

    /* ---------------------------------------------------------------
       Routing between list and detail
       --------------------------------------------------------------- */
    function refFromHash() {
        var parts = window.location.hash.replace('#', '').split('/');
        return (parts[0] === 'projects' && parts[1]) ? parts[1] : null;
    }

    async function syncFromHash() {
        var ref = refFromHash();

        if (!ref) {
            currentRef = null;
            currentProject = null;
            listView.hidden = false;
            detailView.hidden = true;
            return;
        }

        currentRef = ref;
        listView.hidden = true;
        detailView.hidden = false;
        showOnly('loading');

        var thisLoad = ++loadToken;
        var result = await store.getByRef(ref);
        if (thisLoad !== loadToken || currentRef !== ref) { return; } // superseded by a newer navigation

        if (!result.ok) {
            if (result.notFound) {
                // A deep link to a project that no longer exists (deleted,
                // or a stale bookmark) — fall back to the list rather than
                // a dead-end error screen.
                currentRef = null;
                window.location.hash = '#projects';
                window.PhB.toast('That project could not be found.');
                return;
            }
            detailErrorText.textContent = result.error;
            showOnly('error');
            return;
        }

        currentProject = result.project;
        renderDetail(currentProject);
        showTab('overview');
        showOnly('content');
    }

    window.addEventListener('hashchange', syncFromHash);
    detailRetryBtn.addEventListener('click', syncFromHash);

    // Opening a project from the list.
    root.addEventListener('click', function (e) {
        var opener = e.target.closest('[data-open-project]');
        if (!opener) { return; }
        e.preventDefault();
        window.location.hash = '#projects/' + opener.getAttribute('data-open-project');
    });

    /* ---------------------------------------------------------------
       Tabs
       --------------------------------------------------------------- */
    tabsNav.addEventListener('click', function (e) {
        var link = e.target.closest('[data-tab]');
        if (!link) { return; }
        e.preventDefault();
        showTab(link.getAttribute('data-tab'));
    });

    /* ---------------------------------------------------------------
       Project actions — Edit opens the shared form (project-form.js);
       Archive/Delete use the shared confirm dialog (projects.js).
       --------------------------------------------------------------- */
    detailView.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-detail-action]');
        if (!btn || !currentProject) { return; }

        var action = btn.getAttribute('data-detail-action');

        if (action === 'edit') {
            window.PhB.openProjectForm('edit', currentProject);
            return;
        }

        if (action === 'archive') {
            if (currentProject.status === 'Archived') {
                window.PhB.toast(currentProject.ref + ' is already archived.');
                return;
            }
            window.PhB.confirmAction(
                'Archive project?',
                'Archiving "' + currentProject.name + '" marks it as no longer active. It stays in the project list and its data is kept.',
                'Archive', false,
                async function () {
                    var result = await store.archive(currentProject.id);
                    if (result.ok) {
                        currentProject = result.project;
                        renderDetail(currentProject);
                    }
                    window.PhB.toast(
                        result.ok ? currentProject.ref + ' has been archived.' : result.error,
                        result.ok ? 'success' : 'danger'
                    );
                }
            );
            return;
        }

        if (action === 'delete') {
            window.PhB.confirmAction(
                'Delete project?',
                'This removes "' + currentProject.name + '" and all of its details. This cannot be undone.',
                'Delete', true,
                async function () {
                    var result = await store.remove(currentProject.id);
                    if (!result.ok) {
                        window.PhB.toast(result.error, 'danger');
                        return;
                    }
                    var ref = currentProject.ref;
                    window.location.hash = '#projects';
                    window.PhB.toast(ref + ' has been deleted.', 'success');
                }
            );
        }
    });

    // Re-render the open project whenever the store changes (e.g. edited
    // or archived from the list view while this detail happens to be open
    // in another interaction, or after this view's own edit/archive call).
    store.subscribe(function () {
        if (!currentRef || !currentProject) { return; }
        store.getByRef(currentRef).then(function (result) {
            if (result.ok && currentRef) {
                currentProject = result.project;
                renderDetail(currentProject);
            }
        });
    });

    syncFromHash();
})();
