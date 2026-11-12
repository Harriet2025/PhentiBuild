<?php
/**
 * PhentiBuild - Projects Module
 * Static shell for two views: the project list and a single project's
 * detail page (#projects/PHB-XXXX). Both are populated client-side from
 * PhB.projectsStore — no PHP/MySQL connection at this stage.
 */
?>
<div class="projects-module" data-projects-module>

<div data-projects-list-view>

    <div class="module-header">
        <div>
            <span class="eyebrow">Overview</span>
            <h1>Projects</h1>
            <p class="text-secondary">Browse and manage all construction projects.</p>
        </div>
        <button class="btn btn-primary" data-action="new-project">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
        </button>
    </div>

    <div class="projects-toolbar">
        <div class="projects-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" class="form-control" placeholder="Search by project, client or location&hellip;" data-projects-search aria-label="Search projects">
        </div>

        <div class="projects-filters">
            <select class="form-control" data-filter-status aria-label="Filter by status">
                <option value="">All statuses</option>
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
            </select>

            <select class="form-control" data-filter-type aria-label="Filter by project type">
                <option value="">All types</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Industrial">Industrial</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Institutional">Institutional</option>
            </select>

            <select class="form-control" data-sort aria-label="Sort projects">
                <option value="updated-desc">Last updated (newest)</option>
                <option value="updated-asc">Last updated (oldest)</option>
                <option value="name-asc">Name (A–Z)</option>
                <option value="name-desc">Name (Z–A)</option>
                <option value="progress-desc">Progress (high–low)</option>
                <option value="progress-asc">Progress (low–high)</option>
            </select>
        </div>
    </div>

    <div class="projects-meta" data-projects-meta>
        <span class="text-sm text-muted" data-projects-count></span>
        <button class="btn btn-ghost btn-sm" data-clear-filters hidden>Clear filters</button>
    </div>

    <!-- Shown while the list request is in flight -->
    <div class="projects-loading" data-projects-loading hidden>
        <span class="spinner spinner-lg"></span>
        <p class="text-secondary">Loading projects&hellip;</p>
    </div>

    <!-- Shown when the list request fails (server error or network failure) -->
    <div class="alert alert-danger" data-projects-error hidden>
        <span class="alert-icon">!</span>
        <div class="alert-body">
            <span class="alert-title">Couldn&rsquo;t load projects</span>
            <span data-projects-error-text></span>
            <div class="mt-3"><button type="button" class="btn btn-outline-secondary btn-sm" data-projects-retry>Retry</button></div>
        </div>
    </div>

    <!-- Desktop / tablet: table view -->
    <div class="card projects-table-wrap" data-projects-table-wrap>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Client</th>
                        <th>Location</th>
                        <th>Type</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th class="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody data-projects-tbody></tbody>
            </table>
        </div>
    </div>

    <!-- Mobile: card view -->
    <div class="projects-card-list" data-projects-cards></div>

    <!-- Shown when filters/search match nothing -->
    <div class="projects-empty" data-empty-filtered hidden>
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <h3>No projects match your search</h3>
        <p class="text-secondary">Try a different search term, or clear the filters to see all projects.</p>
        <button class="btn btn-outline" data-clear-filters>Clear filters</button>
    </div>

    <!-- Shown when there are no projects at all -->
    <div class="projects-empty" data-empty-none hidden>
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z"/></svg>
        <h3>No projects yet</h3>
        <p class="text-secondary">Create your first project to start capturing measurements and building quantities.</p>
        <button class="btn btn-primary" data-action="new-project">Create your first project</button>
    </div>

</div><!-- /list view -->

<!-- Single project detail view (#projects/PHB-XXXX) -->
<div data-project-detail-view hidden>

    <!-- Shown while the single-project request is in flight -->
    <div class="projects-loading" data-detail-loading hidden>
        <span class="spinner spinner-lg"></span>
        <p class="text-secondary">Loading project&hellip;</p>
    </div>

    <!-- Shown when the single-project request fails -->
    <div class="alert alert-danger" data-detail-error hidden>
        <span class="alert-icon">!</span>
        <div class="alert-body">
            <span class="alert-title">Couldn&rsquo;t load this project</span>
            <span data-detail-error-text></span>
            <div class="mt-3">
                <button type="button" class="btn btn-outline-secondary btn-sm" data-detail-retry>Retry</button>
                <a href="#projects" class="btn btn-outline-secondary btn-sm">Back to Projects</a>
            </div>
        </div>
    </div>

    <div data-detail-content>

    <nav class="breadcrumb">
        <a href="#projects" data-back-to-list>Projects</a>
        <span class="separator">/</span>
        <span class="is-current" data-detail-crumb></span>
    </nav>

    <div class="detail-header">
        <div class="detail-heading">
            <span class="eyebrow" data-detail-ref></span>
            <h1 data-detail-name></h1>
            <p class="text-secondary" data-detail-subtitle></p>
        </div>
        <div class="detail-actions">
            <button class="btn btn-outline-secondary btn-sm" data-detail-action="edit">Edit</button>
            <button class="btn btn-outline-secondary btn-sm" data-detail-action="archive">Archive</button>
            <button class="btn btn-danger btn-sm" data-detail-action="delete">Delete</button>
        </div>
    </div>

    <div class="detail-summary" data-detail-summary></div>

    <nav class="tabs" data-detail-tabs role="tablist">
        <a href="#" class="tab-link is-active" data-tab="overview" role="tab">Overview</a>
        <a href="#" class="tab-link" data-tab="measurements" role="tab">Measurements</a>
        <a href="#" class="tab-link" data-tab="calculations" role="tab">Calculations</a>
        <a href="#" class="tab-link" data-tab="materials" role="tab">Materials</a>
        <a href="#" class="tab-link" data-tab="boq" role="tab">BOQ</a>
        <a href="#" class="tab-link" data-tab="roof" role="tab">Roof Design</a>
        <a href="#" class="tab-link" data-tab="reports" role="tab">Reports</a>
        <a href="#" class="tab-link" data-tab="history" role="tab">History</a>
    </nav>

    <div class="detail-tab-panels">
        <section data-tab-panel="overview" role="tabpanel">
            <div class="detail-overview-grid">
                <div class="card">
                    <div class="card-header"><h4>Project Details</h4></div>
                    <div class="card-body">
                        <dl class="detail-list" data-detail-facts></dl>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h4>Description</h4></div>
                    <div class="card-body">
                        <p data-detail-description></p>
                    </div>
                </div>
            </div>
        </section>

        <?php
        // Placeholder tabs. Each becomes a real module in a later stage.
        $detailTabs = [
            'measurements' => ['Measurements', 'Scanned and manually entered site measurements for this project will be listed here.'],
            'calculations' => ['Calculations', 'Block, concrete, cement, rebar and timber calculations run against this project\'s measurements.'],
            'materials'    => ['Materials', 'Material schedule, unit rates and supplier details for this project.'],
            'boq'          => ['BOQ', 'The Bill of Quantities compiled from this project\'s calculations, ready for Excel export.'],
            'roof'         => ['Roof Design', '2D roof drawings, the 3D model and roofing material take-offs for this project.'],
            'reports'      => ['Reports', 'Generated reports and export history for this project.'],
            'history'      => ['History', 'Revision history and the full audit trail of changes made to this project.'],
        ];
        foreach ($detailTabs as $tabId => $tab):
        ?>
            <section data-tab-panel="<?php echo $tabId; ?>" role="tabpanel" hidden>
                <div class="module-placeholder">
                    <span class="placeholder-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8z"/></svg>
                    </span>
                    <h3><?php echo htmlspecialchars($tab[0]); ?> is not built yet</h3>
                    <p><?php echo htmlspecialchars($tab[1]); ?></p>
                </div>
            </section>
        <?php endforeach; ?>
    </div>

    </div><!-- /detail-content -->

</div><!-- /detail view -->

    <!-- Create project form (modal) -->
    <div class="modal-overlay" data-project-form-overlay>
        <div class="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="projectFormTitle">
            <div class="modal-header">
                <h3 id="projectFormTitle" data-form-title>New Project</h3>
                <button class="modal-close" data-form-close aria-label="Close">&times;</button>
            </div>

            <form novalidate data-project-form>
                <div class="modal-body">
                    <div class="alert alert-danger" data-form-summary hidden>
                        <span class="alert-icon">!</span>
                        <div class="alert-body">
                            <span class="alert-title" data-form-summary-title>Please check the form</span>
                            <span data-form-summary-text></span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="pf-name">Project Name <span class="required">*</span></label>
                        <input type="text" id="pf-name" name="name" class="form-control" placeholder="e.g. East Legon Hills Residential Estate" autocomplete="off">
                        <span class="form-error" data-error-for="name" hidden></span>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="pf-client">Client Name <span class="required">*</span></label>
                            <input type="text" id="pf-client" name="client" class="form-control" placeholder="e.g. Mensah Properties Ltd" autocomplete="off">
                            <span class="form-error" data-error-for="client" hidden></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="pf-contact">Client Phone or Email <span class="required">*</span></label>
                            <input type="text" id="pf-contact" name="contact" class="form-control" placeholder="e.g. 024 123 4567 or name@company.com.gh" autocomplete="off">
                            <span class="form-hint">Enter either a phone number or an email address.</span>
                            <span class="form-error" data-error-for="contact" hidden></span>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="pf-location">Project Location <span class="required">*</span></label>
                            <input type="text" id="pf-location" name="location" class="form-control" placeholder="e.g. East Legon, Accra" autocomplete="off">
                            <span class="form-error" data-error-for="location" hidden></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="pf-type">Project Type <span class="required">*</span></label>
                            <select id="pf-type" name="type" class="form-control">
                                <option value="">Select a project type&hellip;</option>
                                <option value="Residential">Residential</option>
                                <option value="Commercial">Commercial</option>
                                <option value="Industrial">Industrial</option>
                                <option value="Infrastructure">Infrastructure</option>
                                <option value="Institutional">Institutional</option>
                            </select>
                            <span class="form-error" data-error-for="type" hidden></span>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="pf-start">Start Date <span class="required">*</span></label>
                            <input type="date" id="pf-start" name="startDate" class="form-control">
                            <span class="form-error" data-error-for="startDate" hidden></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="pf-end">Expected Completion Date <span class="required">*</span></label>
                            <input type="date" id="pf-end" name="endDate" class="form-control">
                            <span class="form-error" data-error-for="endDate" hidden></span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="pf-description">Project Description</label>
                        <textarea id="pf-description" name="description" class="form-control" rows="3" placeholder="Scope of works, structure type, number of blocks, any site notes&hellip;"></textarea>
                        <span class="form-hint">Optional. <span data-char-count>0</span>/1000 characters.</span>
                        <span class="form-error" data-error-for="description" hidden></span>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-form-close>Cancel</button>
                    <button type="submit" class="btn btn-primary" data-form-submit>Save Project</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Confirm dialog for archive / delete -->
    <div class="modal-overlay" data-confirm-overlay>
        <div class="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
            <div class="modal-header">
                <h3 id="confirmTitle" data-confirm-title>Confirm</h3>
                <button class="modal-close" data-confirm-cancel aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <p data-confirm-message></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-confirm-cancel>Cancel</button>
                <button type="button" class="btn btn-danger" data-confirm-accept>Confirm</button>
            </div>
        </div>
    </div>

</div>
