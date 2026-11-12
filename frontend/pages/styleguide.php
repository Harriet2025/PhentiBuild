<?php
/**
 * PhentiBuild - Design System Style Guide
 * Visual test/reference page for every reusable CSS component.
 * This is NOT the application dashboard — it exists only to demonstrate
 * and verify the global design system.
 */
require_once __DIR__ . '/../../backend/config/config.php';
require_once __DIR__ . '/../../backend/components/logo.php';
require_once __DIR__ . '/../../backend/components/header.php';
?>

<header class="topbar">
    <div class="topbar-brand">
        <?php echo phb_logo_mark('brand-logo', 44); ?><span>PhentiBuild</span>
    </div>
    <nav class="topbar-nav">
        <a href="#" class="is-active">Dashboard</a>
        <a href="#">Projects</a>
        <a href="#">BOQ</a>
        <a href="#">Reports</a>
    </nav>
    <div class="topbar-actions">
        <button class="btn btn-primary btn-sm">+ New Project</button>
    </div>
</header>

<div class="container" style="padding-top: var(--phb-space-6); padding-bottom: var(--phb-space-8);">

    <span class="eyebrow">Design System</span>
    <h1>PhentiBuild Style Guide</h1>
    <p class="text-secondary mb-6">Reusable CSS components for the PhentiBuild (PhB) platform. Reference only — not a working page.</p>

    <!-- COLORS -->
    <section class="form-section">
        <h2 class="mb-4">Colors</h2>
        <div class="grid grid-cols-4">
            <div>
                <div style="height:64px;background:var(--phb-primary);border-radius:var(--phb-radius-sm);"></div>
                <p class="text-sm font-semibold mt-2">Primary Orange</p>
                <p class="text-xs text-muted font-mono">#FF6600</p>
            </div>
            <div>
                <div style="height:64px;background:var(--phb-charcoal);border-radius:var(--phb-radius-sm);"></div>
                <p class="text-sm font-semibold mt-2">Charcoal</p>
                <p class="text-xs text-muted font-mono">#2B2B2B</p>
            </div>
            <div>
                <div style="height:64px;background:var(--phb-slate);border-radius:var(--phb-radius-sm);"></div>
                <p class="text-sm font-semibold mt-2">Slate Gray</p>
                <p class="text-xs text-muted font-mono">#5A6672</p>
            </div>
            <div>
                <div style="height:64px;background:var(--phb-light-gray);border-radius:var(--phb-radius-sm);border:1px solid var(--phb-border-color);"></div>
                <p class="text-sm font-semibold mt-2">Light Gray</p>
                <p class="text-xs text-muted font-mono">#F2F3F5</p>
            </div>
        </div>
        <div class="grid grid-cols-4 mt-4">
            <div>
                <div style="height:48px;background:var(--phb-success);border-radius:var(--phb-radius-sm);"></div>
                <p class="text-sm mt-2">Success</p>
            </div>
            <div>
                <div style="height:48px;background:var(--phb-warning);border-radius:var(--phb-radius-sm);"></div>
                <p class="text-sm mt-2">Warning</p>
            </div>
            <div>
                <div style="height:48px;background:var(--phb-danger);border-radius:var(--phb-radius-sm);"></div>
                <p class="text-sm mt-2">Danger</p>
            </div>
            <div>
                <div style="height:48px;background:var(--phb-info);border-radius:var(--phb-radius-sm);"></div>
                <p class="text-sm mt-2">Info</p>
            </div>
        </div>
    </section>

    <!-- TYPOGRAPHY -->
    <section class="form-section">
        <h2 class="mb-4">Typography</h2>
        <h1>Heading 1 — Project Overview</h1>
        <h2>Heading 2 — Bill of Quantities</h2>
        <h3>Heading 3 — Material Schedule</h3>
        <h4>Heading 4 — Section Title</h4>
        <h5>Heading 5 — Subsection</h5>
        <h6>Heading 6 — Eyebrow Label</h6>
        <p>Body text. PhentiBuild is a construction technology platform for site managers, quantity surveyors, contractors and draftsmen. <a href="#">This is a link.</a></p>
        <p class="text-secondary">Secondary paragraph text, used for descriptions and supporting detail.</p>
        <p class="font-mono">Quantity: 245.75 m&sup3; &mdash; monospace for numeric/measurement data</p>
    </section>

    <!-- BUTTONS -->
    <section class="form-section">
        <h2 class="mb-4">Buttons</h2>
        <div class="flex flex-wrap gap-3 mb-4">
            <button class="btn btn-primary">Primary</button>
            <button class="btn btn-secondary">Secondary</button>
            <button class="btn btn-outline">Outline</button>
            <button class="btn btn-outline-secondary">Outline Secondary</button>
            <button class="btn btn-ghost">Ghost</button>
            <button class="btn btn-success">Success</button>
            <button class="btn btn-danger">Danger</button>
            <button class="btn btn-primary" disabled>Disabled</button>
        </div>
        <div class="flex flex-wrap items-center gap-3">
            <button class="btn btn-primary btn-sm">Small</button>
            <button class="btn btn-primary">Default</button>
            <button class="btn btn-primary btn-lg">Large</button>
            <div class="btn-group">
                <button class="btn btn-outline-secondary">Left</button>
                <button class="btn btn-outline-secondary">Mid</button>
                <button class="btn btn-outline-secondary">Right</button>
            </div>
        </div>
    </section>

    <!-- CARDS -->
    <section class="form-section">
        <h2 class="mb-4">Cards</h2>
        <div class="grid grid-cols-3">
            <div class="card">
                <div class="card-header"><h4>Standard Card</h4></div>
                <div class="card-body">
                    <p class="text-secondary">Basic card with header and body.</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-outline-secondary btn-sm">Cancel</button>
                    <button class="btn btn-primary btn-sm">Save</button>
                </div>
            </div>
            <div class="card card-accent">
                <div class="card-body stat-card">
                    <span class="stat-label">Total Blocks Required</span>
                    <span class="stat-value">4,820</span>
                    <span class="stat-meta">Updated from latest measurements</span>
                </div>
            </div>
            <div class="card card-accent card-accent-success card-elevated">
                <div class="card-body stat-card">
                    <span class="stat-label">Estimated Cost</span>
                    <span class="stat-value">GH&#8373;2.4M</span>
                    <span class="stat-meta text-success">Within budget</span>
                </div>
            </div>
        </div>
    </section>

    <!-- FORMS -->
    <section class="form-section">
        <h2 class="mb-4">Forms &amp; Inputs</h2>
        <div class="card">
            <div class="card-body">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Project Name <span class="required">*</span></label>
                        <input type="text" class="form-control" placeholder="e.g. Tema Site Development">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Project Type</label>
                        <select class="form-control">
                            <option>Residential</option>
                            <option>Commercial</option>
                            <option>Industrial</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Wall Length</label>
                        <div class="input-group">
                            <input type="text" class="form-control form-control-numeric" value="12.500">
                            <span class="input-group-addon">m</span>
                        </div>
                        <span class="form-hint">Enter measured length in meters.</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Site Contact Number</label>
                        <input type="text" class="form-control is-invalid" value="0241">
                        <span class="form-error">Enter a valid phone number.</span>
                    </div>
                </div>
                <div class="form-check">
                    <input type="checkbox" id="chk1">
                    <label for="chk1">Include wastage allowance (5%)</label>
                </div>
                <div class="form-actions">
                    <button class="btn btn-outline-secondary">Cancel</button>
                    <button class="btn btn-primary">Save Project</button>
                </div>
            </div>
        </div>
    </section>

    <!-- TABLES -->
    <section class="form-section">
        <h2 class="mb-4">Tables</h2>
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Description</th>
                        <th class="cell-numeric">Qty</th>
                        <th class="cell-numeric">Unit Rate</th>
                        <th class="cell-numeric">Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>9-inch Sandcrete Blocks</td>
                        <td class="cell-numeric">4,820</td>
                        <td class="cell-numeric">450.00</td>
                        <td class="cell-numeric">2,169,000.00</td>
                        <td><span class="badge badge-success">Confirmed</span></td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td>Portland Cement (Bags)</td>
                        <td class="cell-numeric">312</td>
                        <td class="cell-numeric">8,500.00</td>
                        <td class="cell-numeric">2,652,000.00</td>
                        <td><span class="badge badge-warning">Pending</span></td>
                    </tr>
                    <tr>
                        <td>3</td>
                        <td>Reinforcement Bar Y12</td>
                        <td class="cell-numeric">1,050</td>
                        <td class="cell-numeric">3,200.00</td>
                        <td class="cell-numeric">3,360,000.00</td>
                        <td><span class="badge badge-danger">Over Budget</span></td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4">Total</td>
                        <td class="cell-numeric">8,181,000.00</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </section>

    <!-- BADGES -->
    <section class="form-section">
        <h2 class="mb-4">Badges</h2>
        <div class="flex flex-wrap gap-3">
            <span class="badge badge-primary">Primary</span>
            <span class="badge badge-neutral">Neutral</span>
            <span class="badge badge-success">Success</span>
            <span class="badge badge-warning">Warning</span>
            <span class="badge badge-danger">Danger</span>
            <span class="badge badge-info">Info</span>
            <span class="badge badge-solid badge-primary">Solid Primary</span>
        </div>
    </section>

    <!-- ALERTS -->
    <section class="form-section">
        <h2 class="mb-4">Alerts</h2>

        <input type="checkbox" id="alert-1" class="alert-dismiss-toggle" hidden>
        <div class="alert alert-success">
            <span class="alert-icon">&#10003;</span>
            <div class="alert-body">
                <span class="alert-title">Project saved</span>
                All measurements were recorded successfully.
            </div>
            <label for="alert-1" class="alert-close">&times;</label>
        </div>

        <input type="checkbox" id="alert-2" class="alert-dismiss-toggle" hidden>
        <div class="alert alert-warning">
            <span class="alert-icon">!</span>
            <div class="alert-body">
                <span class="alert-title">Check quantities</span>
                Cement estimate is close to the budget threshold.
            </div>
            <label for="alert-2" class="alert-close">&times;</label>
        </div>

        <input type="checkbox" id="alert-3" class="alert-dismiss-toggle" hidden>
        <div class="alert alert-danger">
            <span class="alert-icon">&times;</span>
            <div class="alert-body">
                <span class="alert-title">Over budget</span>
                Rebar cost has exceeded the allocated budget.
            </div>
            <label for="alert-3" class="alert-close">&times;</label>
        </div>

        <input type="checkbox" id="alert-4" class="alert-dismiss-toggle" hidden>
        <div class="alert alert-info">
            <span class="alert-icon">i</span>
            <div class="alert-body">
                <span class="alert-title">Tip</span>
                Use the numeric input fields for consistent unit formatting.
            </div>
            <label for="alert-4" class="alert-close">&times;</label>
        </div>
        <p class="text-xs text-muted">Click the &times; on any alert above &mdash; dismiss works via pure CSS, no JavaScript.</p>
    </section>

    <!-- NAVIGATION: BREADCRUMBS + TABS -->
    <section class="form-section">
        <h2 class="mb-4">Breadcrumbs &amp; Tabs</h2>
        <nav class="breadcrumb">
            <a href="#">Projects</a>
            <span class="separator">/</span>
            <a href="#">Tema Site Development</a>
            <span class="separator">/</span>
            <span class="is-current">Bill of Quantities</span>
        </nav>
        <nav class="tabs">
            <a href="#" class="tab-link is-active">Overview</a>
            <a href="#" class="tab-link">Materials</a>
            <a href="#" class="tab-link">Labour</a>
            <a href="#" class="tab-link">Documents</a>
        </nav>
    </section>

    <!-- SIDEBAR SAMPLE -->
    <section class="form-section">
        <h2 class="mb-4">Sidebar Navigation (sample)</h2>
        <div class="card" style="overflow-x:auto;">
            <div style="display:flex;min-height:280px;min-width:520px;">
                <aside class="sidebar" style="width:240px;flex-shrink:0;">
                    <span class="sidebar-section-label">Main</span>
                    <a href="#" class="sidebar-link is-active"><span class="icon"></span> Dashboard</a>
                    <a href="#" class="sidebar-link"><span class="icon"></span> Projects</a>
                    <a href="#" class="sidebar-link"><span class="icon"></span> Bill of Quantities</a>
                    <span class="sidebar-section-label">Tools</span>
                    <a href="#" class="sidebar-link"><span class="icon"></span> Calculators</a>
                    <a href="#" class="sidebar-link"><span class="icon"></span> Roof Designer</a>
                </aside>
                <div style="flex:1;padding:var(--phb-space-5);background:var(--phb-bg-page);">
                    <p class="text-secondary">Main content area sits beside the sidebar on desktop, and stacks above it on mobile.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- MODAL (static, demonstrates markup/visual style only) -->
    <section>
        <h2 class="mb-4">Modal</h2>
        <p class="text-secondary mb-4">Shown open here for visual reference. Real open/close behavior will be wired with JavaScript in a later stage.</p>
        <div class="modal-overlay is-open" style="position:relative;inset:auto;background:var(--phb-bg-subtle);border-radius:var(--phb-radius-md);padding:var(--phb-space-6) var(--phb-space-4);">
            <div class="modal">
                <div class="modal-header">
                    <h3>Confirm Deletion</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete this project? This action cannot be undone.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline-secondary">Cancel</button>
                    <button class="btn btn-danger">Delete Project</button>
                </div>
            </div>
        </div>
    </section>

</div>

<?php require_once __DIR__ . '/../../backend/components/footer.php'; ?>
