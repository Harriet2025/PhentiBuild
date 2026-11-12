<?php
/**
 * PhentiBuild - Excel Export Center
 *
 * Triggers backend/api/export/excel.php, which streams a real .xlsx
 * workbook (Project Information, BOQ, Materials, four category
 * schedules, and a Cost Summary — see backend/services/ExcelExportService.php).
 * The project selector is optional: BOQ/Materials/schedules are global
 * collections, not project-scoped, so picking a project only changes
 * what appears on the Project Information sheet.
 */
?>
<div class="reports-module" data-reports-module>

    <div class="module-header">
        <div>
            <span class="eyebrow">Documents</span>
            <h1>Excel Export Center</h1>
            <p class="text-secondary">Generate a real, editable .xlsx workbook from your current BOQ, materials and project data.</p>
        </div>
    </div>

    <div class="reports-export-card card">
        <div class="reports-export-main">
            <div class="form-group reports-project-select">
                <label class="form-label" for="rp-project">Project <span class="text-muted">(optional)</span></label>
                <select id="rp-project" class="form-control" data-export-project>
                    <option value="">No project — general BOQ &amp; Materials export</option>
                </select>
                <span class="form-hint">BOQ, Materials and the category schedules always reflect the current data; a project only fills in the Project Information sheet.</span>
            </div>

            <button type="button" class="btn btn-primary reports-export-btn" data-export-btn>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
                <span data-export-btn-text>Export to Excel</span>
            </button>
        </div>

        <ul class="reports-sheet-list">
            <li>Project Information</li>
            <li>Bill of Quantities</li>
            <li>Materials Catalog</li>
            <li>Cement Schedule</li>
            <li>Rebar Schedule</li>
            <li>Timber Schedule</li>
            <li>Roofing Schedule</li>
            <li>Cost Summary</li>
        </ul>
    </div>

    <div class="alert alert-danger" data-export-error hidden>
        <span class="alert-icon">!</span>
        <div class="alert-body">
            <span class="alert-title">Couldn&rsquo;t generate the export</span>
            <span data-export-error-text></span>
        </div>
    </div>

    <div class="reports-recent">
        <div class="reports-recent-header">
            <h2>Recent Exports</h2>
            <button type="button" class="btn btn-ghost btn-sm" data-reports-refresh>Refresh</button>
        </div>

        <div class="projects-loading" data-reports-loading hidden>
            <span class="spinner spinner-lg"></span>
            <p class="text-secondary">Loading recent exports&hellip;</p>
        </div>

        <div class="card reports-table-wrap" data-reports-content hidden>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Generated</th>
                            <th>Title</th>
                            <th>Project</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody data-reports-tbody></tbody>
                </table>
            </div>
        </div>

        <div class="reports-empty" data-reports-empty hidden>
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
            <h3>No exports yet</h3>
            <p class="text-secondary">Generate your first Excel workbook using the button above.</p>
        </div>
    </div>

</div>
