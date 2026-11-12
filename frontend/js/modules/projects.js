/**
 * PhentiBuild (PhB) - Projects Module (listing)
 *
 * Renders the project listing and handles search, filtering and sorting
 * client-side, same as before — but the underlying data now comes from
 * PhB.projectsStore's real fetch() calls to the PHP/MySQL backend
 * instead of localStorage, so every load is asynchronous and can fail
 * (a dropped connection, the API being down, a 500). This file owns the
 * loading/error/empty states for that, plus the confirm dialog shared
 * with project-detail.js (exposed as window.PhB.confirmAction) since
 * both files need to confirm a destructive action against the same
 * modal markup.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-projects-module]');
    var store = window.PhB && window.PhB.projectsStore;
    if (!root || !store) { return; }

    var projects = [];
    var loadToken = 0; // guards against a slow, superseded request re-rendering stale data

    /* ---------------------------------------------------------------
       Elements
       --------------------------------------------------------------- */
    var searchInput = root.querySelector('[data-projects-search]');
    var statusFilter = root.querySelector('[data-filter-status]');
    var typeFilter = root.querySelector('[data-filter-type]');
    var sortSelect = root.querySelector('[data-sort]');
    var tbody = root.querySelector('[data-projects-tbody]');
    var cardList = root.querySelector('[data-projects-cards]');
    var countEl = root.querySelector('[data-projects-count]');
    var metaEl = root.querySelector('[data-projects-meta]');
    var tableWrap = root.querySelector('[data-projects-table-wrap]');
    var emptyFiltered = root.querySelector('[data-empty-filtered]');
    var emptyNone = root.querySelector('[data-empty-none]');
    var clearButtons = root.querySelectorAll('[data-clear-filters]');
    var loadingEl = root.querySelector('[data-projects-loading]');
    var errorEl = root.querySelector('[data-projects-error]');
    var errorTextEl = root.querySelector('[data-projects-error-text]');
    var retryBtn = root.querySelector('[data-projects-retry]');

    var STATUS_BADGE = {
        'Planning': 'badge-info',
        'In Progress': 'badge-primary',
        'On Hold': 'badge-warning',
        'Completed': 'badge-success',
        'Archived': 'badge-neutral'
    };

    /* ---------------------------------------------------------------
       Helpers
       --------------------------------------------------------------- */
    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function relativeTime(date) {
        var days = Math.floor((Date.now() - date.getTime()) / 86400000);
        if (days <= 0) { return 'Today'; }
        if (days === 1) { return 'Yesterday'; }
        if (days < 7) { return days + ' days ago'; }
        if (days < 14) { return 'Last week'; }
        if (days < 60) { return Math.floor(days / 7) + ' weeks ago'; }
        return Math.floor(days / 30) + ' months ago';
    }

    function statusSlug(status) {
        return status.toLowerCase().replace(/\s+/g, '-');
    }

    function progressMarkup(progress) {
        return '<div class="progress">' +
                    '<div class="progress-track">' +
                        '<div class="progress-bar' + (progress === 100 ? ' is-complete' : '') + '" style="width:' + progress + '%"></div>' +
                    '</div>' +
                    '<span class="progress-value">' + progress + '%</span>' +
                '</div>';
    }

    function badgeMarkup(status) {
        return '<span class="badge ' + STATUS_BADGE[status] + '">' + escapeHtml(status) + '</span>';
    }

    function actionsMarkup(project) {
        var ref = escapeHtml(project.ref);
        var id = escapeHtml(String(project.id));
        return '<div class="row-actions">' +
                '<button class="icon-action" data-open-project="' + ref + '" aria-label="Open ' + escapeHtml(project.name) + '" title="Open project">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>' +
                '</button>' +
                '<button class="icon-action" data-action="edit" data-id="' + id + '" aria-label="Edit ' + escapeHtml(project.name) + '" title="Edit">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z"/></svg>' +
                '</button>' +
                '<button class="icon-action is-danger" data-action="delete" data-id="' + id + '" data-name="' + escapeHtml(project.name) + '" aria-label="Delete ' + escapeHtml(project.name) + '" title="Delete">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>' +
                '</button>' +
            '</div>';
    }

    /* ---------------------------------------------------------------
       Rendering
       --------------------------------------------------------------- */
    function rowMarkup(p) {
        return '<tr>' +
            '<td><a href="#projects/' + escapeHtml(p.ref) + '" class="project-name" data-open-project="' + escapeHtml(p.ref) + '">' + escapeHtml(p.name) + '</a>' +
                '<span class="project-ref">' + escapeHtml(p.ref) + '</span></td>' +
            '<td>' + escapeHtml(p.client) + '</td>' +
            '<td>' + escapeHtml(p.location) + '</td>' +
            '<td>' + escapeHtml(p.type) + '</td>' +
            '<td>' + progressMarkup(p.progress) + '</td>' +
            '<td>' + badgeMarkup(p.status) + '</td>' +
            '<td class="text-sm text-muted">' + relativeTime(p.updatedAt) + '</td>' +
            '<td>' + actionsMarkup(p) + '</td>' +
        '</tr>';
    }

    function cardMarkup(p) {
        return '<article class="project-card status-' + statusSlug(p.status) + '">' +
            '<div class="project-card-head">' +
                '<div>' +
                    '<a href="#projects/' + escapeHtml(p.ref) + '" class="project-name" data-open-project="' + escapeHtml(p.ref) + '">' + escapeHtml(p.name) + '</a>' +
                    '<span class="project-ref">' + escapeHtml(p.ref) + '</span>' +
                '</div>' +
                badgeMarkup(p.status) +
            '</div>' +
            '<dl class="project-card-meta">' +
                '<dt>Client</dt><dd>' + escapeHtml(p.client) + '</dd>' +
                '<dt>Location</dt><dd>' + escapeHtml(p.location) + '</dd>' +
                '<dt>Type</dt><dd>' + escapeHtml(p.type) + '</dd>' +
            '</dl>' +
            progressMarkup(p.progress) +
            '<div class="project-card-foot">' +
                '<span class="project-card-updated">Updated ' + relativeTime(p.updatedAt).toLowerCase() + '</span>' +
                actionsMarkup(p) +
            '</div>' +
        '</article>';
    }

    function getFiltered() {
        var term = searchInput.value.trim().toLowerCase();
        var status = statusFilter.value;
        var type = typeFilter.value;

        var result = projects.filter(function (p) {
            var matchesTerm = !term ||
                p.name.toLowerCase().indexOf(term) !== -1 ||
                p.client.toLowerCase().indexOf(term) !== -1 ||
                p.location.toLowerCase().indexOf(term) !== -1 ||
                p.ref.toLowerCase().indexOf(term) !== -1;
            return matchesTerm && (!status || p.status === status) && (!type || p.type === type);
        });

        var sort = sortSelect.value;
        result.sort(function (a, b) {
            switch (sort) {
                case 'updated-asc':   return a.updatedAt - b.updatedAt;
                case 'name-asc':      return a.name.localeCompare(b.name);
                case 'name-desc':     return b.name.localeCompare(a.name);
                case 'progress-desc': return b.progress - a.progress;
                case 'progress-asc':  return a.progress - b.progress;
                default:              return b.updatedAt - a.updatedAt;
            }
        });

        return result;
    }

    function hasActiveFilters() {
        return !!(searchInput.value.trim() || statusFilter.value || typeFilter.value);
    }

    function showOnly(state) {
        // state: 'loading' | 'error' | 'content'
        loadingEl.hidden = state !== 'loading';
        errorEl.hidden = state !== 'error';
        metaEl.hidden = state !== 'content';
        if (state !== 'content') {
            tableWrap.hidden = true;
            cardList.hidden = true;
            emptyFiltered.hidden = true;
            emptyNone.hidden = true;
        }
    }

    function render() {
        var visible = projects.length === 0 ? [] : getFiltered();
        var noProjectsAtAll = projects.length === 0;
        var noMatches = !noProjectsAtAll && visible.length === 0;

        tbody.innerHTML = visible.map(rowMarkup).join('');
        cardList.innerHTML = visible.map(cardMarkup).join('');

        tableWrap.hidden = noProjectsAtAll || noMatches;
        cardList.hidden = noProjectsAtAll || noMatches;
        emptyFiltered.hidden = !noMatches;
        emptyNone.hidden = !noProjectsAtAll;

        countEl.textContent = noProjectsAtAll
            ? ''
            : 'Showing ' + visible.length + ' of ' + projects.length + ' projects';

        clearButtons.forEach(function (btn) {
            if (btn.hasAttribute('data-clear-filters') && btn.closest('.projects-meta')) {
                btn.hidden = !hasActiveFilters();
            }
        });
    }

    /* ---------------------------------------------------------------
       Loading the list
       --------------------------------------------------------------- */
    async function load() {
        var thisLoad = ++loadToken;
        showOnly('loading');

        var result = await store.getAll();
        if (thisLoad !== loadToken) { return; } // a newer load (e.g. a retry) superseded this one

        if (!result.ok) {
            errorTextEl.textContent = result.error;
            showOnly('error');
            return;
        }

        projects = result.projects;
        showOnly('content');
        render();
    }

    /* ---------------------------------------------------------------
       Shared confirm dialog — also used by project-detail.js for its
       own Archive/Delete actions (window.PhB.confirmAction).
       --------------------------------------------------------------- */
    var confirmOverlay = document.querySelector('[data-confirm-overlay]');
    var pendingConfirm = null;

    function confirmAction(title, message, acceptLabel, danger, onAccept) {
        confirmOverlay.querySelector('[data-confirm-title]').textContent = title;
        confirmOverlay.querySelector('[data-confirm-message]').textContent = message;
        var accept = confirmOverlay.querySelector('[data-confirm-accept]');
        accept.textContent = acceptLabel;
        accept.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
        pendingConfirm = onAccept;
        confirmOverlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closeConfirm() {
        pendingConfirm = null;
        confirmOverlay.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    confirmOverlay.addEventListener('click', function (e) {
        if (e.target === confirmOverlay || e.target.closest('[data-confirm-cancel]')) {
            closeConfirm();
            return;
        }
        if (e.target.closest('[data-confirm-accept]')) {
            var action = pendingConfirm;
            closeConfirm();
            if (action) { action(); }
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && confirmOverlay.classList.contains('is-open')) {
            closeConfirm();
        }
    });

    window.PhB.confirmAction = confirmAction;

    /* ---------------------------------------------------------------
       Events
       --------------------------------------------------------------- */
    searchInput.addEventListener('input', render);
    statusFilter.addEventListener('change', render);
    typeFilter.addEventListener('change', render);
    sortSelect.addEventListener('change', render);
    retryBtn.addEventListener('click', load);

    clearButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            searchInput.value = '';
            statusFilter.value = '';
            typeFilter.value = '';
            render();
        });
    });

    root.addEventListener('click', function (e) {
        var editBtn = e.target.closest('[data-action="edit"][data-id]');
        if (editBtn) {
            var editId = editBtn.getAttribute('data-id');
            var project = projects.filter(function (p) { return String(p.id) === editId; })[0];
            if (project) { window.PhB.openProjectForm('edit', project); }
            return;
        }

        var deleteBtn = e.target.closest('[data-action="delete"][data-id]');
        if (!deleteBtn) { return; }

        var id = deleteBtn.getAttribute('data-id');
        var name = deleteBtn.getAttribute('data-name');

        confirmAction(
            'Delete project?',
            'This removes "' + name + '" and all of its details. This cannot be undone.',
            'Delete', true,
            async function () {
                var result = await store.remove(id);
                window.PhB.toast(
                    result.ok ? name + ' has been deleted.' : result.error,
                    result.ok ? 'success' : 'danger'
                );
            }
        );
    });

    // Re-fetch whenever a project is created, edited, archived or deleted.
    store.subscribe(load);

    load();
})();
