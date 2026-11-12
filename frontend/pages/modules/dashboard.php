<?php
/**
 * PhentiBuild - Project Dashboard
 *
 * A read-only aggregation view — every number and list here comes from
 * data that already exists (Projects, Measurements, Calculations,
 * History). This file adds no new backend endpoint and no new stored
 * state; dashboard.js just calls the same stores every other module
 * already uses and renders the most recent slice of each.
 */
?>
<div class="dashboard-module" data-dashboard-module>

    <div class="module-header">
        <div>
            <span class="eyebrow">Overview</span>
            <h1>Dashboard</h1>
            <p class="text-secondary">Active projects, recent scans, recent activity and quick access to every tool.</p>
        </div>
    </div>

    <div class="dash-stats-grid">
        <div class="dash-stat-card dash-stat-primary">
            <span class="dash-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z"/></svg></span>
            <span class="dash-stat-body">
                <span class="dash-stat-label">Active Projects</span>
                <span class="dash-stat-value" data-dash-stat="activeProjects">&mdash;</span>
            </span>
        </div>
        <div class="dash-stat-card dash-stat-info">
            <span class="dash-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg></span>
            <span class="dash-stat-body">
                <span class="dash-stat-label">Total Projects</span>
                <span class="dash-stat-value" data-dash-stat="totalProjects">&mdash;</span>
            </span>
        </div>
        <div class="dash-stat-card dash-stat-slate">
            <span class="dash-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z"/></svg></span>
            <span class="dash-stat-body">
                <span class="dash-stat-label">Measurements Recorded</span>
                <span class="dash-stat-value" data-dash-stat="totalMeasurements">&mdash;</span>
            </span>
        </div>
        <div class="dash-stat-card dash-stat-success">
            <span class="dash-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="1.5"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="16" y1="15" x2="16" y2="17.5"/></svg></span>
            <span class="dash-stat-body">
                <span class="dash-stat-label">Calculations Saved</span>
                <span class="dash-stat-value" data-dash-stat="totalCalculations">&mdash;</span>
            </span>
        </div>
    </div>

    <div class="card dash-section">
        <div class="card-header"><h4>Quick Actions</h4></div>
        <div class="card-body">
            <div class="dash-quick-actions">
                <a href="#scanner" class="dash-action-card" data-module="scanner" data-module-label="Scanner">
                    <span class="dash-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a1 1 0 0 1 1-1h2l1.5-2h7L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z"/><circle cx="12" cy="13" r="3.2"/></svg></span>
                    <span class="dash-action-label">Camera Scanner</span>
                </a>
                <a href="#manual-input" class="dash-action-card" data-module="manual-input" data-module-label="Manual Input">
                    <span class="dash-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z"/></svg></span>
                    <span class="dash-action-label">Manual Input</span>
                </a>
                <a href="#calculators" class="dash-action-card" data-module="calculators" data-module-label="Calculators">
                    <span class="dash-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="1.5"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="16" y1="15" x2="16" y2="17.5"/></svg></span>
                    <span class="dash-action-label">Calculators</span>
                </a>
                <a href="#roof-studio" class="dash-action-card" data-module="roof-studio" data-module-label="Roof Studio">
                    <span class="dash-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11L12 4l9 7"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/></svg></span>
                    <span class="dash-action-label">Roof Studio</span>
                </a>
                <a href="#boq" class="dash-action-card" data-module="boq" data-module-label="BOQ">
                    <span class="dash-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg></span>
                    <span class="dash-action-label">Bill of Quantities</span>
                </a>
                <a href="#reports" class="dash-action-card" data-module="reports" data-module-label="Reports">
                    <span class="dash-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="20" x2="5" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="19" y1="20" x2="19" y2="15"/></svg></span>
                    <span class="dash-action-label">Export Center</span>
                </a>
            </div>
        </div>
    </div>

    <div class="dash-columns">

        <div class="card dash-section">
            <div class="card-header">
                <h4><svg class="dash-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z"/></svg>Active Projects</h4>
                <a href="#projects" class="dash-see-all" data-module="projects" data-module-label="Projects">See all</a>
            </div>
            <div class="card-body">
                <p class="dash-loading" data-dash-projects-loading>Loading&hellip;</p>
                <div class="dash-empty" data-dash-projects-empty hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z"/></svg>
                    <span>No active projects yet. <a href="#projects" data-module="projects" data-module-label="Projects">Create your first project</a>.</span>
                </div>
                <ul class="dash-project-list" data-dash-projects-list></ul>
            </div>
        </div>

        <div class="card dash-section">
            <div class="card-header">
                <h4><svg class="dash-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a1 1 0 0 1 1-1h2l1.5-2h7L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z"/><circle cx="12" cy="13" r="3.2"/></svg>Recent Scans</h4>
                <a href="#scanner" class="dash-see-all" data-module="scanner" data-module-label="Scanner">Open Scanner</a>
            </div>
            <div class="card-body">
                <p class="dash-loading" data-dash-scans-loading>Loading&hellip;</p>
                <div class="dash-empty" data-dash-scans-empty hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a1 1 0 0 1 1-1h2l1.5-2h7L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z"/><circle cx="12" cy="13" r="3.2"/></svg>
                    <span>No camera scans saved yet.</span>
                </div>
                <ul class="dash-list" data-dash-scans-list></ul>
            </div>
        </div>

        <div class="card dash-section">
            <div class="card-header">
                <h4><svg class="dash-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>Recent Activity</h4>
                <a href="#history" class="dash-see-all" data-module="history" data-module-label="History">View full history</a>
            </div>
            <div class="card-body">
                <p class="dash-loading" data-dash-history-loading>Loading&hellip;</p>
                <div class="dash-empty" data-dash-history-empty hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>
                    <span>No activity recorded yet.</span>
                </div>
                <ul class="dash-list" data-dash-history-list></ul>
            </div>
        </div>

    </div>

</div>
