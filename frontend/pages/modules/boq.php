<?php
/**
 * PhentiBuild - Bill of Quantities (BOQ) Module
 *
 * A live, editable schedule of materials and costs. Line items can be
 * typed in directly or pushed here from a Manual Input calculator's
 * "Add to BOQ" button. Data lives in boq-store.js (localStorage) — there
 * is no PHP/MySQL connection and no Excel export at this stage.
 */
$boqCategories = ['Cement', 'Sand', 'Aggregate', 'Blocks', 'Rebar', 'Timber', 'Roofing', 'Underlay', 'Other'];
?>
<div class="boq-module" data-boq-module>

    <div class="module-header">
        <div>
            <span class="eyebrow">Documents</span>
            <h1>Bill of Quantities</h1>
            <p class="text-secondary">A live schedule of materials and costs, priced from your own quantities and unit rates.</p>
        </div>
        <button class="btn btn-primary" data-action="new-boq-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Item
        </button>
    </div>

    <div class="boq-toolbar">
        <div class="boq-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" class="form-control" placeholder="Search items, descriptions or notes&hellip;" data-boq-search aria-label="Search BOQ items">
        </div>

        <select class="form-control" data-filter-category aria-label="Filter by category">
            <option value="">All categories</option>
            <?php foreach ($boqCategories as $cat): ?>
                <option value="<?php echo htmlspecialchars($cat); ?>"><?php echo htmlspecialchars($cat); ?></option>
            <?php endforeach; ?>
        </select>
    </div>

    <div class="boq-meta" data-boq-meta>
        <span class="text-sm text-muted" data-boq-count></span>
        <button class="btn btn-ghost btn-sm" data-clear-filters hidden>Clear filters</button>
    </div>

    <!-- Shown while the list request is in flight -->
    <div class="projects-loading" data-boq-loading hidden>
        <span class="spinner spinner-lg"></span>
        <p class="text-secondary">Loading Bill of Quantities&hellip;</p>
    </div>

    <!-- Shown when the list request fails -->
    <div class="alert alert-danger" data-boq-error hidden>
        <span class="alert-icon">!</span>
        <div class="alert-body">
            <span class="alert-title">Couldn&rsquo;t load the Bill of Quantities</span>
            <span data-boq-error-text></span>
            <div class="mt-3"><button type="button" class="btn btn-outline-secondary btn-sm" data-boq-retry>Retry</button></div>
        </div>
    </div>

    <div class="card boq-table-wrap" data-boq-table-wrap hidden>
        <div class="table-responsive">
            <table class="table boq-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Specification</th>
                        <th>Unit</th>
                        <th class="text-right">Quantity</th>
                        <th class="text-right">Waste %</th>
                        <th class="text-right">Adjusted Qty</th>
                        <th class="text-right">Unit Price</th>
                        <th class="text-right">Total</th>
                        <th>Notes</th>
                        <th class="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody data-boq-tbody></tbody>
            </table>
        </div>
    </div>

    <!-- Shown when filters/search match nothing -->
    <div class="boq-empty" data-empty-filtered hidden>
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <h3>No items match your search</h3>
        <p class="text-secondary">Try a different search term, or clear the filters to see the full bill.</p>
        <button class="btn btn-outline" data-clear-filters>Clear filters</button>
    </div>

    <!-- Shown when the BOQ is empty -->
    <div class="boq-empty" data-empty-none hidden>
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>
        <h3>No items in the Bill of Quantities yet</h3>
        <p class="text-secondary">Add an item manually, or run a calculator in Manual Input and use "Add to BOQ" on its results.</p>
        <button class="btn btn-primary" data-action="new-boq-item">Add your first item</button>
    </div>

    <!-- Totals summary -->
    <div class="card boq-summary" data-boq-summary hidden>
        <div class="card-body">
            <div class="boq-summary-row">
                <span class="boq-summary-label">Total <span class="text-muted">(all items, waste-adjusted)</span></span>
                <span class="boq-summary-value" data-summary-total>&mdash;</span>
            </div>
            <div class="boq-summary-row boq-summary-contingency">
                <label class="boq-summary-label" for="boq-contingency">
                    Contingency
                    <span class="boq-contingency-input">
                        <input type="text" id="boq-contingency" class="form-control" inputmode="decimal" data-contingency-input>
                        <span class="boq-contingency-suffix">%</span>
                    </span>
                </label>
                <span class="boq-summary-value" data-summary-contingency-amount>&mdash;</span>
            </div>
            <div class="boq-summary-row boq-summary-grand">
                <span class="boq-summary-label">Grand Total</span>
                <span class="boq-summary-value" data-summary-grand-total>&mdash;</span>
            </div>
        </div>
    </div>

    <!-- Add / Edit item modal (shared form) -->
    <div class="modal-overlay" data-boq-form-overlay>
        <div class="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="boqFormTitle">
            <div class="modal-header">
                <h3 id="boqFormTitle" data-form-title>Add Item</h3>
                <button class="modal-close" data-form-close aria-label="Close">&times;</button>
            </div>

            <form novalidate data-boq-form>
                <div class="modal-body">
                    <div class="alert alert-danger" data-form-summary hidden>
                        <span class="alert-icon">!</span>
                        <div class="alert-body">
                            <span class="alert-title">Please check the form</span>
                            <span data-form-summary-text></span>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="bf-item">Item <span class="required">*</span></label>
                            <input type="text" id="bf-item" name="item" class="form-control" placeholder="e.g. Portland Cement" autocomplete="off">
                            <span class="form-error" data-error-for="item" hidden></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="bf-category">Category <span class="required">*</span></label>
                            <select id="bf-category" name="category" class="form-control">
                                <option value="">Select a category&hellip;</option>
                                <?php foreach ($boqCategories as $cat): ?>
                                    <option value="<?php echo htmlspecialchars($cat); ?>"><?php echo htmlspecialchars($cat); ?></option>
                                <?php endforeach; ?>
                            </select>
                            <span class="form-error" data-error-for="category" hidden></span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="bf-description">Description</label>
                        <textarea id="bf-description" name="description" class="form-control" rows="2" placeholder="What this item is for&hellip;"></textarea>
                        <span class="form-error" data-error-for="description" hidden></span>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="bf-specification">Specification</label>
                            <input type="text" id="bf-specification" name="specification" class="form-control" placeholder="e.g. 16mm diameter, Grade 25" autocomplete="off">
                            <span class="form-error" data-error-for="specification" hidden></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="bf-unit">Unit <span class="required">*</span></label>
                            <input type="text" id="bf-unit" name="unit" class="form-control" placeholder="e.g. piece, m³, kg, bag" autocomplete="off">
                            <span class="form-error" data-error-for="unit" hidden></span>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="bf-quantity">Quantity <span class="required">*</span></label>
                            <input type="text" id="bf-quantity" name="quantity" class="form-control" inputmode="decimal" placeholder="e.g. 120" autocomplete="off">
                            <span class="form-error" data-error-for="quantity" hidden></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="bf-wastePercent">Waste %</label>
                            <input type="text" id="bf-wastePercent" name="wastePercent" class="form-control" inputmode="decimal" placeholder="e.g. 5" autocomplete="off">
                            <span class="form-error" data-error-for="wastePercent" hidden></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="bf-unitPrice">Unit Price (GH&#8373;)</label>
                            <input type="text" id="bf-unitPrice" name="unitPrice" class="form-control" inputmode="decimal" placeholder="e.g. 65.00" autocomplete="off">
                            <span class="form-error" data-error-for="unitPrice" hidden></span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="bf-notes">Notes</label>
                        <textarea id="bf-notes" name="notes" class="form-control" rows="2" placeholder="Supplier, lead time, site notes&hellip;"></textarea>
                        <span class="form-error" data-error-for="notes" hidden></span>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-form-close>Cancel</button>
                    <button type="submit" class="btn btn-primary" data-form-submit>Save Item</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Delete confirm -->
    <div class="modal-overlay" data-boq-confirm-overlay>
        <div class="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="boqConfirmTitle">
            <div class="modal-header">
                <h3 id="boqConfirmTitle">Delete item?</h3>
                <button class="modal-close" data-confirm-cancel aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <p data-confirm-message></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-confirm-cancel>Cancel</button>
                <button type="button" class="btn btn-danger" data-confirm-accept>Delete</button>
            </div>
        </div>
    </div>

</div>
