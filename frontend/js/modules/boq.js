/**
 * PhentiBuild (PhB) - Bill of Quantities (listing)
 *
 * Renders the BOQ table grouped by category with a subtotal per group,
 * handles search/filter, inline editing of Quantity/Waste %/Unit Price,
 * delete (with confirm), and the Total/Contingency/Grand Total summary.
 * Adding and editing an item's other fields is handled by boq-form.js.
 *
 * Adjusted Quantity and Total are never stored — they are always derived
 * from Quantity, Waste % and Unit Price so there is exactly one source of
 * truth. Editing a cell recomputes every derived number in the DOM
 * immediately (so it feels live while typing); the store is only written
 * to on blur/change, which is what triggers the full re-render.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-boq-module]');
    var store = window.PhB && window.PhB.boqStore;
    if (!root || !store) { return; }

    var items = [];
    var loadToken = 0;

    /* ---------------------------------------------------------------
       Elements
       --------------------------------------------------------------- */
    var searchInput = root.querySelector('[data-boq-search]');
    var categoryFilter = root.querySelector('[data-filter-category]');
    var tbody = root.querySelector('[data-boq-tbody]');
    var countEl = root.querySelector('[data-boq-count]');
    var metaEl = root.querySelector('[data-boq-meta]');
    var tableWrap = root.querySelector('[data-boq-table-wrap]');
    var emptyFiltered = root.querySelector('[data-empty-filtered]');
    var emptyNone = root.querySelector('[data-empty-none]');
    var clearButtons = root.querySelectorAll('[data-clear-filters]');
    var loadingEl = root.querySelector('[data-boq-loading]');
    var errorEl = root.querySelector('[data-boq-error]');
    var errorTextEl = root.querySelector('[data-boq-error-text]');
    var retryBtn = root.querySelector('[data-boq-retry]');
    var summaryPanel = root.querySelector('[data-boq-summary]');
    var contingencyInput = root.querySelector('[data-contingency-input]');
    var summaryTotalEl = root.querySelector('[data-summary-total]');
    var summaryContingencyEl = root.querySelector('[data-summary-contingency-amount]');
    var summaryGrandEl = root.querySelector('[data-summary-grand-total]');

    var confirmOverlay = root.querySelector('[data-boq-confirm-overlay]');
    var pendingDeleteId = null;

    var CATEGORY_ORDER = ['Cement', 'Sand', 'Aggregate', 'Blocks', 'Rebar', 'Timber', 'Roofing', 'Underlay', 'Other'];

    var CATEGORY_BADGE = {
        'Cement': 'badge-neutral', 'Sand': 'badge-warning', 'Aggregate': 'badge-neutral',
        'Blocks': 'badge-primary', 'Rebar': 'badge-info', 'Timber': 'badge-success',
        'Roofing': 'badge-danger', 'Underlay': 'badge-neutral', 'Other': 'badge-neutral'
    };

    /* ---------------------------------------------------------------
       Helpers
       --------------------------------------------------------------- */
    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function badgeMarkup(category) {
        var cls = CATEGORY_BADGE[category] || 'badge-neutral';
        return '<span class="badge ' + cls + '">' + escapeHtml(category) + '</span>';
    }

    function formatQty(value) {
        if (!isFinite(value)) { return '0'; }
        var rounded = Math.round(value * 100) / 100;
        var parts = String(rounded).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    function formatCurrency(value) {
        if (!isFinite(value)) { value = 0; }
        var fixed = value.toFixed(2);
        var parts = fixed.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return 'GH₵ ' + parts.join('.');
    }

    function truncatedCell(value) {
        if (!value) { return '<span class="text-muted">&mdash;</span>'; }
        return '<span class="boq-cell-wrap" title="' + escapeHtml(value) + '">' + escapeHtml(value) + '</span>';
    }

    function adjustedQuantity(quantity, wastePercent) {
        return quantity * (1 + (wastePercent / 100));
    }

    /* ---------------------------------------------------------------
       Rendering
       --------------------------------------------------------------- */
    function actionsMarkup(item) {
        var id = escapeHtml(item.id);
        return '<div class="row-actions">' +
                '<button class="icon-action" data-action="edit" data-id="' + id + '" aria-label="Edit ' + escapeHtml(item.item) + '" title="Edit">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z"/></svg>' +
                '</button>' +
                '<button class="icon-action is-danger" data-action="delete" data-id="' + id + '" aria-label="Delete ' + escapeHtml(item.item) + '" title="Delete">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>' +
                '</button>' +
            '</div>';
    }

    function rowMarkup(item) {
        var id = escapeHtml(item.id);
        return '<tr data-boq-row="' + id + '" data-category="' + escapeHtml(item.category) + '">' +
            '<td class="font-medium">' + escapeHtml(item.item) + '<span class="boq-item-id">' + id + '</span></td>' +
            '<td>' + badgeMarkup(item.category) + '</td>' +
            '<td>' + truncatedCell(item.description) + '</td>' +
            '<td>' + truncatedCell(item.specification) + '</td>' +
            '<td>' + escapeHtml(item.unit) + '</td>' +
            '<td class="text-right"><input type="text" inputmode="decimal" class="boq-cell-input" data-field="quantity" data-id="' + id + '" value="' + item.quantity + '"></td>' +
            '<td class="text-right"><input type="text" inputmode="decimal" class="boq-cell-input" data-field="wastePercent" data-id="' + id + '" value="' + item.wastePercent + '"></td>' +
            '<td class="text-right cell-numeric" data-cell="adjustedQuantity">' + formatQty(adjustedQuantity(item.quantity, item.wastePercent)) + '</td>' +
            '<td class="text-right">' +
                '<div class="boq-price-input-group">' +
                    '<span class="boq-price-prefix">GH&#8373;</span>' +
                    '<input type="text" inputmode="decimal" class="boq-cell-input" data-field="unitPrice" data-id="' + id + '" value="' + item.unitPrice + '">' +
                '</div>' +
            '</td>' +
            '<td class="text-right cell-numeric font-semibold" data-cell="total">' + formatCurrency(adjustedQuantity(item.quantity, item.wastePercent) * item.unitPrice) + '</td>' +
            '<td>' + truncatedCell(item.notes) + '</td>' +
            '<td>' + actionsMarkup(item) + '</td>' +
        '</tr>';
    }

    function groupHeaderMarkup(category) {
        return '<tr class="boq-group-row"><td colspan="12">' + escapeHtml(category) + '</td></tr>';
    }

    function subtotalRowMarkup(category) {
        return '<tr class="boq-subtotal-row" data-subtotal-for="' + escapeHtml(category) + '">' +
            '<td colspan="9">Subtotal &mdash; ' + escapeHtml(category) + '</td>' +
            '<td class="text-right cell-numeric" data-subtotal-amount>' + formatCurrency(0) + '</td>' +
            '<td colspan="2"></td>' +
        '</tr>';
    }

    function getFiltered() {
        var term = searchInput.value.trim().toLowerCase();
        var category = categoryFilter.value;

        return items.filter(function (m) {
            var matchesTerm = !term ||
                m.item.toLowerCase().indexOf(term) !== -1 ||
                (m.description || '').toLowerCase().indexOf(term) !== -1 ||
                (m.specification || '').toLowerCase().indexOf(term) !== -1 ||
                (m.notes || '').toLowerCase().indexOf(term) !== -1;
            return matchesTerm && (!category || m.category === category);
        });
    }

    function hasActiveFilters() {
        return !!(searchInput.value.trim() || categoryFilter.value);
    }

    function showOnly(state) {
        // state: 'loading' | 'error' | 'content'
        loadingEl.hidden = state !== 'loading';
        errorEl.hidden = state !== 'error';
        metaEl.hidden = state !== 'content';
        if (state !== 'content') {
            tableWrap.hidden = true;
            summaryPanel.hidden = true;
            emptyFiltered.hidden = true;
            emptyNone.hidden = true;
        }
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

        items = result.items;
        showOnly('content');
        render();
    }

    function render() {
        var visible = items.length === 0 ? [] : getFiltered();
        var noItemsAtAll = items.length === 0;
        var noMatches = !noItemsAtAll && visible.length === 0;

        var byCategory = {};
        visible.forEach(function (m) {
            (byCategory[m.category] = byCategory[m.category] || []).push(m);
        });

        var html = '';
        CATEGORY_ORDER.forEach(function (cat) {
            var rows = byCategory[cat];
            if (!rows || !rows.length) { return; }
            html += groupHeaderMarkup(cat);
            html += rows.map(rowMarkup).join('');
            html += subtotalRowMarkup(cat);
        });
        // Any category not in the fixed order (shouldn't happen from this
        // UI, but keeps a stray value from silently disappearing).
        Object.keys(byCategory).forEach(function (cat) {
            if (CATEGORY_ORDER.indexOf(cat) !== -1) { return; }
            html += groupHeaderMarkup(cat);
            html += byCategory[cat].map(rowMarkup).join('');
            html += subtotalRowMarkup(cat);
        });

        tbody.innerHTML = html;

        tableWrap.hidden = noItemsAtAll || noMatches;
        summaryPanel.hidden = noItemsAtAll || noMatches;
        emptyFiltered.hidden = !noMatches;
        emptyNone.hidden = !noItemsAtAll;

        countEl.textContent = noItemsAtAll
            ? ''
            : 'Showing ' + visible.length + ' of ' + items.length + ' items';

        clearButtons.forEach(function (btn) {
            if (btn.closest('.boq-meta')) {
                btn.hidden = !hasActiveFilters();
            }
        });

        recomputeAll();
    }

    /* ---------------------------------------------------------------
       Live recompute — pure DOM pass, no store writes. Reads the three
       editable inputs on every visible row (so a value the user is still
       typing, but hasn't blurred yet, is reflected in the totals too).
       --------------------------------------------------------------- */
    function recomputeAll() {
        var subtotals = {};
        var grandBase = 0;

        tbody.querySelectorAll('tr[data-boq-row]').forEach(function (tr) {
            var qtyInput = tr.querySelector('[data-field="quantity"]');
            var wasteInput = tr.querySelector('[data-field="wastePercent"]');
            var priceInput = tr.querySelector('[data-field="unitPrice"]');

            var qty = parseFloat(qtyInput.value) || 0;
            var waste = parseFloat(wasteInput.value) || 0;
            var price = parseFloat(priceInput.value) || 0;
            var adjQty = adjustedQuantity(qty, waste);
            var total = adjQty * price;

            tr.querySelector('[data-cell="adjustedQuantity"]').textContent = formatQty(adjQty);
            tr.querySelector('[data-cell="total"]').textContent = formatCurrency(total);

            var category = tr.getAttribute('data-category');
            if (category) {
                subtotals[category] = (subtotals[category] || 0) + total;
            }
            grandBase += total;
        });

        tbody.querySelectorAll('.boq-subtotal-row').forEach(function (tr) {
            var cat = tr.getAttribute('data-subtotal-for');
            tr.querySelector('[data-subtotal-amount]').textContent = formatCurrency(subtotals[cat] || 0);
        });

        var contingencyPercent = parseFloat(contingencyInput.value) || 0;
        var contingencyAmount = grandBase * (contingencyPercent / 100);
        var grandTotal = grandBase + contingencyAmount;

        summaryTotalEl.textContent = formatCurrency(grandBase);
        summaryContingencyEl.textContent = formatCurrency(contingencyAmount);
        summaryGrandEl.textContent = formatCurrency(grandTotal);
    }

    /* ---------------------------------------------------------------
       Inline editing — live recompute on input, persist on blur/change.
       --------------------------------------------------------------- */
    tbody.addEventListener('input', function (e) {
        if (e.target.matches('[data-field]')) {
            recomputeAll();
        }
    });

    tbody.addEventListener('change', async function (e) {
        var input = e.target.closest('[data-field]');
        if (!input) { return; }

        var id = input.getAttribute('data-id');
        var field = input.getAttribute('data-field');
        var value = parseFloat(input.value);
        if (!isFinite(value) || value < 0) { value = 0; }

        var patch = {};
        patch[field] = value;
        // Silent: this row's own cells already show the live recomputed
        // value (see the 'input' listener above). Re-rendering the whole
        // table on every request completing would rebuild the row out
        // from under the user while they are still tabbing between its
        // editable cells — awaiting here just lets us report a failure,
        // it doesn't block anything the user is doing.
        var result = await store.update(id, patch, true);
        if (!result.ok) {
            window.PhB.toast(result.error, 'danger');
        }
    });

    contingencyInput.addEventListener('input', recomputeAll);
    contingencyInput.addEventListener('change', function () {
        store.setContingencyPercent(contingencyInput.value);
    });

    /* ---------------------------------------------------------------
       Delete confirm
       --------------------------------------------------------------- */
    async function openDeleteConfirm(id) {
        var result = await store.getById(id);
        if (!result.ok) {
            window.PhB.toast(result.error, 'danger');
            return;
        }
        pendingDeleteId = id;
        confirmOverlay.querySelector('[data-confirm-message]').textContent =
            'This removes "' + result.item.item + '" from the Bill of Quantities. This cannot be undone.';
        confirmOverlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closeDeleteConfirm() {
        pendingDeleteId = null;
        confirmOverlay.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    confirmOverlay.addEventListener('click', async function (e) {
        if (e.target === confirmOverlay || e.target.closest('[data-confirm-cancel]')) {
            closeDeleteConfirm();
            return;
        }
        if (e.target.closest('[data-confirm-accept]')) {
            var id = pendingDeleteId;
            closeDeleteConfirm();
            if (id) {
                var result = await store.remove(id);
                window.PhB.toast(
                    result.ok ? 'Item removed from the Bill of Quantities.' : result.error,
                    result.ok ? 'success' : 'danger'
                );
            }
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && confirmOverlay.classList.contains('is-open')) {
            closeDeleteConfirm();
        }
    });

    /* ---------------------------------------------------------------
       Events
       --------------------------------------------------------------- */
    searchInput.addEventListener('input', render);
    categoryFilter.addEventListener('change', render);
    retryBtn.addEventListener('click', load);

    clearButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            searchInput.value = '';
            categoryFilter.value = '';
            render();
        });
    });

    root.addEventListener('click', function (e) {
        var deleteTrigger = e.target.closest('[data-action="delete"][data-id]');
        if (deleteTrigger) {
            openDeleteConfirm(deleteTrigger.getAttribute('data-id'));
            return;
        }
        // "edit" and "new-boq-item" are handled by boq-form.js.
    });

    store.subscribe(load);

    contingencyInput.value = store.getContingencyPercent();
    load();
})();
