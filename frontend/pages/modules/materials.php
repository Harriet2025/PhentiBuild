<?php
/**
 * PhentiBuild - Materials Catalog Module
 *
 * A reference catalog of the standard materials used across every project:
 * search, filter, a table/card view toggle, a read-only detail modal, and
 * an add/edit form. Data lives in materials-store.js (seed data plus
 * anything the user saves to localStorage) — there is no PHP/MySQL
 * connection at this stage.
 */
$materialCategories = ['Cement', 'Sand', 'Aggregate', 'Blocks', 'Rebar', 'Timber', 'Roofing', 'Underlay'];
?>
<div class="materials-module" data-materials-module>

    <div class="module-header">
        <div>
            <span class="eyebrow">Tools</span>
            <h1>Materials Catalog</h1>
            <p class="text-secondary">Browse, search and manage the standard materials used across every project.</p>
        </div>
        <button class="btn btn-primary" data-action="new-material">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Material
        </button>
    </div>

    <div class="materials-toolbar">
        <div class="materials-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" class="form-control" placeholder="Search materials by name or description&hellip;" data-materials-search aria-label="Search materials">
        </div>

        <div class="materials-filters">
            <select class="form-control" data-filter-category aria-label="Filter by category">
                <option value="">All categories</option>
                <?php foreach ($materialCategories as $cat): ?>
                    <option value="<?php echo htmlspecialchars($cat); ?>"><?php echo htmlspecialchars($cat); ?></option>
                <?php endforeach; ?>
            </select>

            <select class="form-control" data-sort aria-label="Sort materials">
                <option value="name-asc">Name (A&ndash;Z)</option>
                <option value="name-desc">Name (Z&ndash;A)</option>
                <option value="category-asc">Category (A&ndash;Z)</option>
                <option value="updated-desc">Last updated (newest)</option>
            </select>

            <div class="view-toggle" role="group" aria-label="Change view">
                <button type="button" class="view-toggle-btn is-active" data-view-toggle="cards" aria-label="Card view" title="Card view">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
                </button>
                <button type="button" class="view-toggle-btn" data-view-toggle="table" aria-label="Table view" title="Table view">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
                </button>
            </div>
        </div>
    </div>

    <div class="materials-meta" data-materials-meta>
        <span class="text-sm text-muted" data-materials-count></span>
        <button class="btn btn-ghost btn-sm" data-clear-filters hidden>Clear filters</button>
    </div>

    <!-- Shown while the list request is in flight -->
    <div class="projects-loading" data-materials-loading hidden>
        <span class="spinner spinner-lg"></span>
        <p class="text-secondary">Loading materials&hellip;</p>
    </div>

    <!-- Shown when the list request fails (server error or network failure) -->
    <div class="alert alert-danger" data-materials-error hidden>
        <span class="alert-icon">!</span>
        <div class="alert-body">
            <span class="alert-title">Couldn&rsquo;t load materials</span>
            <span data-materials-error-text></span>
            <div class="mt-3"><button type="button" class="btn btn-outline-secondary btn-sm" data-materials-retry>Retry</button></div>
        </div>
    </div>

    <!-- Table view -->
    <div class="card materials-table-wrap" data-materials-view="table" hidden>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Material</th>
                        <th>Category</th>
                        <th>Unit</th>
                        <th>Key Spec</th>
                        <th>Last Updated</th>
                        <th class="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody data-materials-tbody></tbody>
            </table>
        </div>
    </div>

    <!-- Card view -->
    <div class="materials-card-grid" data-materials-view="cards" data-materials-cards></div>

    <!-- Shown when filters/search match nothing -->
    <div class="materials-empty" data-empty-filtered hidden>
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <h3>No materials match your search</h3>
        <p class="text-secondary">Try a different search term, or clear the filters to see the full catalog.</p>
        <button class="btn btn-outline" data-clear-filters>Clear filters</button>
    </div>

    <!-- Shown when there are no materials at all (should not normally happen — seed data always ships) -->
    <div class="materials-empty" data-empty-none hidden>
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z"/></svg>
        <h3>No materials yet</h3>
        <p class="text-secondary">Add your first material to start building the catalog.</p>
        <button class="btn btn-primary" data-action="new-material">Add your first material</button>
    </div>

    <!-- View Material modal -->
    <div class="modal-overlay" data-material-view-overlay>
        <div class="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="materialViewTitle">
            <div class="modal-header modal-header-view">
                <span class="badge" data-view-category-badge></span>
                <h3 id="materialViewTitle" data-view-name>Material</h3>
                <button class="modal-close" data-view-close aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <dl class="detail-list" data-view-facts></dl>
                <div class="material-view-description">
                    <h4>Description</h4>
                    <p data-view-description></p>
                </div>
                <p class="text-xs text-muted" data-view-updated></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-view-close>Close</button>
                <button type="button" class="btn btn-primary" data-view-edit>Edit Material</button>
            </div>
        </div>
    </div>

    <!-- Add / Edit Material modal (shared form) -->
    <div class="modal-overlay" data-material-form-overlay>
        <div class="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="materialFormTitle">
            <div class="modal-header">
                <h3 id="materialFormTitle" data-form-title>Add Material</h3>
                <button class="modal-close" data-form-close aria-label="Close">&times;</button>
            </div>

            <form novalidate data-material-form>
                <div class="modal-body">
                    <div class="alert alert-danger" data-form-summary hidden>
                        <span class="alert-icon">!</span>
                        <div class="alert-body">
                            <span class="alert-title">Please check the form</span>
                            <span data-form-summary-text></span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="mf-name">Material Name <span class="required">*</span></label>
                        <input type="text" id="mf-name" name="name" class="form-control" placeholder="e.g. Sandcrete Block (450 x 225 x 225mm)" autocomplete="off">
                        <span class="form-error" data-error-for="name" hidden></span>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="mf-category">Category <span class="required">*</span></label>
                            <select id="mf-category" name="category" class="form-control">
                                <option value="">Select a category&hellip;</option>
                                <?php foreach ($materialCategories as $cat): ?>
                                    <option value="<?php echo htmlspecialchars($cat); ?>"><?php echo htmlspecialchars($cat); ?></option>
                                <?php endforeach; ?>
                            </select>
                            <span class="form-error" data-error-for="category" hidden></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="mf-unit">Unit <span class="required">*</span></label>
                            <input type="text" id="mf-unit" name="unit" class="form-control" placeholder="e.g. 50kg bag, piece, Ton, Roll" autocomplete="off">
                            <span class="form-error" data-error-for="unit" hidden></span>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="mf-dimensions">Dimensions</label>
                            <input type="text" id="mf-dimensions" name="dimensions" class="form-control" placeholder="e.g. 450 x 225 x 225 mm" autocomplete="off">
                            <span class="form-hint">Nominal or cut size, if the material has one.</span>
                            <span class="form-error" data-error-for="dimensions" hidden></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="mf-overallDimensions">Overall Dimensions</label>
                            <input type="text" id="mf-overallDimensions" name="overallDimensions" class="form-control" placeholder="e.g. 460 x 235 x 235 mm with joint" autocomplete="off">
                            <span class="form-hint">Full size including packaging, joints or laps.</span>
                            <span class="form-error" data-error-for="overallDimensions" hidden></span>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="mf-effectiveCoverage">Effective Coverage</label>
                            <input type="text" id="mf-effectiveCoverage" name="effectiveCoverage" class="form-control" placeholder="e.g. 9 blocks per m&sup2;" autocomplete="off">
                            <span class="form-error" data-error-for="effectiveCoverage" hidden></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="mf-standardLength">Standard Length</label>
                            <input type="text" id="mf-standardLength" name="standardLength" class="form-control" placeholder="e.g. 3.6 m, 12 m" autocomplete="off">
                            <span class="form-error" data-error-for="standardLength" hidden></span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="mf-spacing">Spacing</label>
                        <input type="text" id="mf-spacing" name="spacing" class="form-control" placeholder="e.g. 600 mm centres" autocomplete="off">
                        <span class="form-hint">Typical fixing or framing spacing, if relevant.</span>
                        <span class="form-error" data-error-for="spacing" hidden></span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="mf-description">Description</label>
                        <textarea id="mf-description" name="description" class="form-control" rows="3" placeholder="Typical use, notes for site staff&hellip;"></textarea>
                        <span class="form-hint">Optional. <span data-char-count>0</span>/500 characters.</span>
                        <span class="form-error" data-error-for="description" hidden></span>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-form-close>Cancel</button>
                    <button type="submit" class="btn btn-primary" data-form-submit>Save Material</button>
                </div>
            </form>
        </div>
    </div>

</div>
