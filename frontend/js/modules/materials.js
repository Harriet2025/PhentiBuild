/**
 * PhentiBuild (PhB) - Materials Catalog (listing)
 *
 * Renders the materials catalog and handles search, filtering, sorting and
 * the card/table view toggle entirely client-side. Also owns the read-only
 * "View Material" modal, since opening it is triggered from this list.
 * Material data comes from PhB.materialsStore, which owns persistence —
 * this module only reads from it and re-renders when it changes.
 *
 * Adding and editing a material is handled by materials-form.js.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-materials-module]');
    var store = window.PhB && window.PhB.materialsStore;
    if (!root || !store) { return; }

    var materials = [];
    var loadToken = 0;

    /* ---------------------------------------------------------------
       Elements
       --------------------------------------------------------------- */
    var searchInput = root.querySelector('[data-materials-search]');
    var categoryFilter = root.querySelector('[data-filter-category]');
    var sortSelect = root.querySelector('[data-sort]');
    var tbody = root.querySelector('[data-materials-tbody]');
    var cardGrid = root.querySelector('[data-materials-cards]');
    var countEl = root.querySelector('[data-materials-count]');
    var metaEl = root.querySelector('[data-materials-meta]');
    var tableWrap = root.querySelector('[data-materials-view="table"]');
    var cardWrap = root.querySelector('[data-materials-view="cards"]');
    var viewToggleBtns = root.querySelectorAll('[data-view-toggle]');
    var emptyFiltered = root.querySelector('[data-empty-filtered]');
    var emptyNone = root.querySelector('[data-empty-none]');
    var clearButtons = root.querySelectorAll('[data-clear-filters]');
    var loadingEl = root.querySelector('[data-materials-loading]');
    var errorEl = root.querySelector('[data-materials-error]');
    var errorTextEl = root.querySelector('[data-materials-error-text]');
    var retryBtn = root.querySelector('[data-materials-retry]');

    var viewOverlay = root.querySelector('[data-material-view-overlay]');

    var currentView = 'cards';

    var CATEGORY_BADGE = {
        'Cement': 'badge-neutral',
        'Sand': 'badge-warning',
        'Aggregate': 'badge-neutral',
        'Blocks': 'badge-primary',
        'Rebar': 'badge-info',
        'Timber': 'badge-success',
        'Roofing': 'badge-danger',
        'Underlay': 'badge-neutral'
    };

    var CATEGORY_ICON = {
        'Cement': '<path d="M6 4h12v3l2 13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L6 7V4z"/><line x1="6" y1="9" x2="18" y2="9"/>',
        'Sand': '<path d="M4 20l8-14 8 14z"/><line x1="9" y1="14" x2="15" y2="14"/>',
        'Aggregate': '<circle cx="8" cy="15" r="3"/><circle cx="15" cy="10" r="3.5"/><circle cx="17" cy="17" r="2.5"/>',
        'Blocks': '<rect x="3" y="5" width="8" height="6" rx="0.5"/><rect x="13" y="5" width="8" height="6" rx="0.5"/><rect x="3" y="13" width="8" height="6" rx="0.5"/><rect x="13" y="13" width="8" height="6" rx="0.5"/>',
        'Rebar': '<line x1="6" y1="3" x2="6" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="18" y1="3" x2="18" y2="21"/>',
        'Timber': '<rect x="3" y="9" width="18" height="6" rx="1"/><line x1="7" y1="9" x2="7" y2="15"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="17" y1="9" x2="17" y2="15"/>',
        'Roofing': '<path d="M2 12L12 4l10 8"/><path d="M5 12v7h14v-7"/>',
        'Underlay': '<rect x="3" y="6" width="18" height="4" rx="1"/><rect x="3" y="12" width="18" height="4" rx="1"/><rect x="3" y="18" width="18" height="2" rx="1"/>'
    };

    var DEFAULT_ICON = '<circle cx="12" cy="12" r="9"/>';

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

    function categorySlug(category) {
        return category.toLowerCase().replace(/\s+/g, '-');
    }

    function badgeMarkup(category) {
        var cls = CATEGORY_BADGE[category] || 'badge-neutral';
        return '<span class="badge ' + cls + '">' + escapeHtml(category) + '</span>';
    }

    function iconMarkup(category) {
        return '<span class="material-card-icon cat-' + categorySlug(category) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
                (CATEGORY_ICON[category] || DEFAULT_ICON) +
            '</svg></span>';
    }

    /** A single line for the table/card summary: the most identifying spec
     *  a material has, in priority order, falling back to "Not specified"
     *  when none of the specs apply to this kind of material. */
    function keySpec(m) {
        var spec = m.dimensions || m.overallDimensions || m.standardLength || m.effectiveCoverage || m.spacing;
        return spec ? escapeHtml(spec) : '<span class="text-muted">Not specified</span>';
    }

    function actionsMarkup(m) {
        var id = escapeHtml(m.id);
        return '<div class="row-actions">' +
                '<button class="icon-action" data-open-material="' + id + '" aria-label="View ' + escapeHtml(m.name) + '" title="View details">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>' +
                '</button>' +
                '<button class="icon-action" data-action="edit" data-id="' + id + '" aria-label="Edit ' + escapeHtml(m.name) + '" title="Edit">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z"/></svg>' +
                '</button>' +
                '<button class="icon-action is-danger" data-action="deactivate" data-id="' + id + '" data-name="' + escapeHtml(m.name) + '" aria-label="Deactivate ' + escapeHtml(m.name) + '" title="Deactivate">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/></svg>' +
                '</button>' +
            '</div>';
    }

    /* ---------------------------------------------------------------
       Rendering
       --------------------------------------------------------------- */
    function rowMarkup(m) {
        return '<tr>' +
            '<td><a href="#" class="material-name" data-open-material="' + escapeHtml(m.id) + '">' + escapeHtml(m.name) + '</a>' +
                '<span class="material-id">' + escapeHtml(m.id) + '</span></td>' +
            '<td>' + badgeMarkup(m.category) + '</td>' +
            '<td>' + escapeHtml(m.unit) + '</td>' +
            '<td class="text-sm">' + keySpec(m) + '</td>' +
            '<td class="text-sm text-muted">' + relativeTime(m.updatedAt) + '</td>' +
            '<td>' + actionsMarkup(m) + '</td>' +
        '</tr>';
    }

    function cardMarkup(m) {
        return '<article class="material-card">' +
            '<div class="material-card-head">' +
                iconMarkup(m.category) +
                '<div class="material-card-title">' +
                    '<a href="#" class="material-name" data-open-material="' + escapeHtml(m.id) + '">' + escapeHtml(m.name) + '</a>' +
                    '<span class="material-id">' + escapeHtml(m.id) + '</span>' +
                '</div>' +
            '</div>' +
            badgeMarkup(m.category) +
            '<dl class="material-card-meta">' +
                '<dt>Unit</dt><dd>' + escapeHtml(m.unit) + '</dd>' +
                '<dt>Key Spec</dt><dd>' + keySpec(m) + '</dd>' +
            '</dl>' +
            '<div class="material-card-foot">' +
                '<span class="material-card-updated">Updated ' + relativeTime(m.updatedAt).toLowerCase() + '</span>' +
                actionsMarkup(m) +
            '</div>' +
        '</article>';
    }

    function getFiltered() {
        var term = searchInput.value.trim().toLowerCase();
        var category = categoryFilter.value;

        var result = materials.filter(function (m) {
            var matchesTerm = !term ||
                m.name.toLowerCase().indexOf(term) !== -1 ||
                m.category.toLowerCase().indexOf(term) !== -1 ||
                m.unit.toLowerCase().indexOf(term) !== -1 ||
                (m.description || '').toLowerCase().indexOf(term) !== -1;
            return matchesTerm && (!category || m.category === category);
        });

        var sort = sortSelect.value;
        result.sort(function (a, b) {
            switch (sort) {
                case 'name-desc':     return b.name.localeCompare(a.name);
                case 'category-asc':  return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
                case 'updated-desc':  return b.updatedAt - a.updatedAt;
                default:              return a.name.localeCompare(b.name);
            }
        });

        return result;
    }

    function hasActiveFilters() {
        return !!(searchInput.value.trim() || categoryFilter.value);
    }

    function applyViewVisibility() {
        tableWrap.hidden = currentView !== 'table';
        cardWrap.hidden = currentView !== 'cards';
        viewToggleBtns.forEach(function (btn) {
            btn.classList.toggle('is-active', btn.getAttribute('data-view-toggle') === currentView);
        });
    }

    function showOnly(state) {
        // state: 'loading' | 'error' | 'content'
        loadingEl.hidden = state !== 'loading';
        errorEl.hidden = state !== 'error';
        metaEl.hidden = state !== 'content';
        if (state !== 'content') {
            tableWrap.hidden = true;
            cardWrap.hidden = true;
            emptyFiltered.hidden = true;
            emptyNone.hidden = true;
        }
    }

    function render() {
        var visible = materials.length === 0 ? [] : getFiltered();
        var noMaterialsAtAll = materials.length === 0;
        var noMatches = !noMaterialsAtAll && visible.length === 0;

        tbody.innerHTML = visible.map(rowMarkup).join('');
        cardGrid.innerHTML = visible.map(cardMarkup).join('');

        var hideBothViews = noMaterialsAtAll || noMatches;
        applyViewVisibility();
        if (hideBothViews) {
            tableWrap.hidden = true;
            cardWrap.hidden = true;
        }

        emptyFiltered.hidden = !noMatches;
        emptyNone.hidden = !noMaterialsAtAll;

        countEl.textContent = noMaterialsAtAll
            ? ''
            : 'Showing ' + visible.length + ' of ' + materials.length + ' materials';

        clearButtons.forEach(function (btn) {
            if (btn.closest('.materials-meta')) {
                btn.hidden = !hasActiveFilters();
            }
        });
    }

    async function load() {
        var thisLoad = ++loadToken;
        showOnly('loading');

        var result = await store.getAll();
        if (thisLoad !== loadToken) { return; }

        if (!result.ok) {
            errorTextEl.textContent = result.error;
            showOnly('error');
            return;
        }

        materials = result.materials;
        showOnly('content');
        render();
    }

    /* ---------------------------------------------------------------
       View Material modal
       --------------------------------------------------------------- */
    function orNotSpecified(value) {
        return value ? escapeHtml(value) : '<span class="text-muted">Not specified</span>';
    }

    async function openView(id) {
        var result = await store.getById(id);
        if (!result.ok) {
            window.PhB.toast(result.error, 'danger');
            return;
        }
        var material = result.material;

        viewOverlay.setAttribute('data-current-id', id);

        viewOverlay.querySelector('[data-view-name]').textContent = material.name;
        var badgeEl = viewOverlay.querySelector('[data-view-category-badge]');
        badgeEl.className = 'badge ' + (CATEGORY_BADGE[material.category] || 'badge-neutral');
        badgeEl.textContent = material.category;

        var facts = [
            ['Unit', escapeHtml(material.unit)],
            ['Dimensions', orNotSpecified(material.dimensions)],
            ['Overall Dimensions', orNotSpecified(material.overallDimensions)],
            ['Effective Coverage', orNotSpecified(material.effectiveCoverage)],
            ['Standard Length', orNotSpecified(material.standardLength)],
            ['Spacing', orNotSpecified(material.spacing)]
        ];
        viewOverlay.querySelector('[data-view-facts]').innerHTML = facts.map(function (row) {
            return '<dt>' + row[0] + '</dt><dd>' + row[1] + '</dd>';
        }).join('');

        viewOverlay.querySelector('[data-view-description]').innerHTML = material.description
            ? escapeHtml(material.description)
            : '<span class="text-muted">No description was recorded for this material.</span>';

        viewOverlay.querySelector('[data-view-updated]').textContent = 'Last updated ' + relativeTime(material.updatedAt).toLowerCase() + '.';

        viewOverlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closeView() {
        viewOverlay.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    viewOverlay.addEventListener('click', function (e) {
        if (e.target === viewOverlay || e.target.closest('[data-view-close]')) {
            closeView();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && viewOverlay.classList.contains('is-open')) {
            closeView();
        }
    });

    /* ---------------------------------------------------------------
       Events
       --------------------------------------------------------------- */
    searchInput.addEventListener('input', render);
    categoryFilter.addEventListener('change', render);
    sortSelect.addEventListener('change', render);
    retryBtn.addEventListener('click', load);

    viewToggleBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            currentView = btn.getAttribute('data-view-toggle');
            applyViewVisibility();
        });
    });

    clearButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            searchInput.value = '';
            categoryFilter.value = '';
            render();
        });
    });

    root.addEventListener('click', function (e) {
        var opener = e.target.closest('[data-open-material]');
        if (opener) {
            e.preventDefault();
            openView(opener.getAttribute('data-open-material'));
            return;
        }

        var deactivateBtn = e.target.closest('[data-action="deactivate"][data-id]');
        if (deactivateBtn) {
            var id = deactivateBtn.getAttribute('data-id');
            var name = deactivateBtn.getAttribute('data-name');
            if (!window.confirm('Deactivate "' + name + '"? It will be hidden from the active catalog but can be reactivated later.')) {
                return;
            }
            store.remove(id).then(function (result) {
                window.PhB.toast(
                    result.ok ? '"' + name + '" has been deactivated.' : result.error,
                    result.ok ? 'success' : 'danger'
                );
            });
            return;
        }
        // "edit" is handled by materials-form.js — deliberately not caught here.
    });

    // Re-fetch and re-render whenever a material is added, edited or
    // deactivated.
    store.subscribe(function () {
        load();

        // Keep an open View modal in sync with an edit made elsewhere.
        var openId = viewOverlay.getAttribute('data-current-id');
        if (openId && viewOverlay.classList.contains('is-open')) {
            openView(openId);
        }
    });

    load();
})();
