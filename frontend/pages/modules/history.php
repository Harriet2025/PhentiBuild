<?php
/**
 * PhentiBuild - Project History & Audit Log Module
 *
 * Read-only by design (see backend/models/History.php) — this page can
 * only ever search and filter what other modules have already recorded.
 * User/Module filter options are populated from the API response itself
 * (backend/api/history/index.php returns them in meta), not hardcoded
 * here, so they always match what the database can actually filter on.
 */
?>
<div class="history-module" data-history-module>

    <div class="module-header">
        <div>
            <span class="eyebrow">Documents</span>
            <h1>History &amp; Audit Log</h1>
            <p class="text-secondary">A complete, read-only trail of every create, update and delete across PhentiBuild.</p>
        </div>
    </div>

    <div class="history-toolbar">
        <div class="history-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" class="form-control" placeholder="Search by summary, user or project&hellip;" data-history-search aria-label="Search history">
        </div>

        <div class="history-filters">
            <input type="date" class="form-control" data-filter-date aria-label="Filter by date">

            <select class="form-control" data-filter-user aria-label="Filter by user">
                <option value="">All users</option>
            </select>

            <select class="form-control" data-filter-module aria-label="Filter by module">
                <option value="">All modules</option>
            </select>
        </div>
    </div>

    <div class="history-meta" data-history-meta>
        <span class="text-sm text-muted" data-history-count></span>
        <button class="btn btn-ghost btn-sm" data-clear-filters hidden>Clear filters</button>
    </div>

    <!-- Shown while the list request is in flight -->
    <div class="projects-loading" data-history-loading hidden>
        <span class="spinner spinner-lg"></span>
        <p class="text-secondary">Loading history&hellip;</p>
    </div>

    <!-- Shown when the list request fails (server error or network failure) -->
    <div class="alert alert-danger" data-history-error hidden>
        <span class="alert-icon">!</span>
        <div class="alert-body">
            <span class="alert-title">Couldn&rsquo;t load history</span>
            <span data-history-error-text></span>
            <div class="mt-3"><button type="button" class="btn btn-outline-secondary btn-sm" data-history-retry>Retry</button></div>
        </div>
    </div>

    <!-- Table view -->
    <div class="card history-table-wrap" data-history-content hidden>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>User</th>
                        <th>Module</th>
                        <th>Project</th>
                        <th>Action</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody data-history-tbody></tbody>
            </table>
        </div>
    </div>

    <!-- Shown when filters/search match nothing -->
    <div class="history-empty" data-empty-filtered hidden>
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <h3>No history entries match</h3>
        <p class="text-secondary">Try a different search term, or clear the filters to see the full trail.</p>
        <button class="btn btn-outline" data-clear-filters>Clear filters</button>
    </div>

    <!-- Shown when nothing has ever been recorded -->
    <div class="history-empty" data-empty-none hidden>
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>
        <h3>No activity recorded yet</h3>
        <p class="text-secondary">Actions across Projects, Materials, BOQ, Measurements, Calculations, Roof Designs and Reports will appear here as they happen.</p>
    </div>

</div>
