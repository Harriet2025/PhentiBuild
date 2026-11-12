<?php
/**
 * PhentiBuild - 2D Roof Studio Module
 *
 * An interactive drawing canvas for laying out a roof plan (Gable, Hip or
 * Hidden/Flat) with line, rectangle and polygon tools, snap-to-grid, zoom
 * and pan, plus a properties panel for the roof's structural parameters.
 * The drawing is kept as structured geometric data (real-world metre
 * coordinates), not an image — see roof-geometry.js and
 * roof-studio-store.js. AI-assisted layout and the 3D model are later
 * stages, not this one.
 */
?>
<div class="roof-studio-module" data-roof-studio-module>

    <div class="module-header">
        <div>
            <span class="eyebrow">Tools</span>
            <h1>Roof Studio</h1>
            <p class="text-secondary">Draw a roof plan and record its structural parameters. AI-assisted layouts and the 3D model come in a later stage.</p>
        </div>
        <div class="rs-header-actions">
            <span class="text-sm text-muted" data-rs-save-status>Saved</span>
            <button type="button" class="btn btn-primary btn-sm" data-rs-action="open-ai">Generate with AI</button>
            <button type="button" class="btn btn-outline-secondary btn-sm" data-rs-action="clear">Clear Drawing</button>
        </div>
    </div>

    <div class="rs-view-tabs" role="tablist" aria-label="Roof view">
        <button type="button" class="rs-view-tab is-active" data-rs-view-tab="2d" role="tab" aria-selected="true">2D Plan</button>
        <button type="button" class="rs-view-tab" data-rs-view-tab="3d" role="tab" aria-selected="false">3D View</button>
    </div>

    <div class="rs-workspace">
    <div class="rs-view-panels">
    <div class="rs-view-panel" data-rs-view-panel="2d">

    <div class="rs-toolbar" role="toolbar" aria-label="Drawing tools">
        <div class="rs-tool-group">
            <button type="button" class="rs-tool-btn is-active" data-rs-tool="select" title="Select (V)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 8-6 1.5L11 19z"/></svg>
                <span>Select</span>
            </button>
            <button type="button" class="rs-tool-btn" data-rs-tool="line" title="Line (L)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="19" x2="19" y2="5"/><circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="5" r="1.6" fill="currentColor" stroke="none"/></svg>
                <span>Line</span>
            </button>
            <button type="button" class="rs-tool-btn" data-rs-tool="rectangle" title="Rectangle (R)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="6" width="16" height="12" rx="1"/></svg>
                <span>Rectangle</span>
            </button>
            <button type="button" class="rs-tool-btn" data-rs-tool="polygon" title="Polygon (P)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l8 6-3 10H7L4 9z"/></svg>
                <span>Polygon</span>
            </button>
            <button type="button" class="rs-tool-btn" data-rs-tool="pan" title="Pan (H, or hold Space)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V6a1.5 1.5 0 0 1 3 0v5"/><path d="M12 10.5V5a1.5 1.5 0 0 1 3 0v6"/><path d="M15 10.5V7a1.5 1.5 0 0 1 3 0v7c0 3.5-2 6-5.5 6h-1C8 20 6 18 6 15v-3a1.4 1.4 0 0 1 2.8-.3"/></svg>
                <span>Pan</span>
            </button>
        </div>

        <div class="rs-tool-divider"></div>

        <div class="rs-tool-group">
            <button type="button" class="rs-tool-btn" data-rs-action="delete" title="Delete selected (Del)" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
                <span>Delete</span>
            </button>
            <button type="button" class="rs-tool-btn" data-rs-action="undo" title="Undo (Ctrl+Z)" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8L3 12l4 4"/><path d="M3 12h11a5 5 0 0 1 0 10h-1"/></svg>
                <span>Undo</span>
            </button>
            <button type="button" class="rs-tool-btn" data-rs-action="redo" title="Redo (Ctrl+Y)" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8l4 4-4 4"/><path d="M21 12H10a5 5 0 0 0 0 10h1"/></svg>
                <span>Redo</span>
            </button>
        </div>

        <div class="rs-tool-divider"></div>

        <div class="rs-tool-group">
            <button type="button" class="rs-tool-btn rs-tool-btn-icon" data-rs-action="zoom-out" title="Zoom out">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <span class="rs-zoom-readout" data-rs-zoom-readout>100%</span>
            <button type="button" class="rs-tool-btn rs-tool-btn-icon" data-rs-action="zoom-in" title="Zoom in">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <button type="button" class="rs-tool-btn" data-rs-action="zoom-fit" title="Fit drawing to view">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"/></svg>
                <span>Fit</span>
            </button>
        </div>

        <div class="rs-tool-divider"></div>

        <label class="rs-snap-toggle">
            <input type="checkbox" data-rs-snap-toggle checked>
            Snap to grid
        </label>
    </div>

    <div class="rs-canvas-wrap" data-rs-canvas-wrap>
        <canvas data-rs-canvas></canvas>
        <div class="rs-hint" data-rs-hint hidden></div>
    </div>

    <div class="rs-statusbar">
        <span data-rs-status-tool>Select</span>
        <span data-rs-status-coords>x: 0.00 m, y: 0.00 m</span>
        <span data-rs-status-selection>No selection</span>
    </div>

    </div><!-- /view-panel 2d -->

    <div class="rs-view-panel" data-rs-view-panel="3d" hidden>

        <div class="rs-toolbar" role="toolbar" aria-label="3D view controls">
            <div class="rs-tool-group">
                <button type="button" class="rs-tool-btn" data-rs-action="reset-view" title="Reset view">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 1 2.6 6.4"/><path d="M3 21v-6h6"/></svg>
                    <span>Reset View</span>
                </button>
            </div>

            <div class="rs-tool-divider"></div>

            <div class="rs-toggle-group" role="group" aria-label="Toggle structural components">
                <label class="rs-toggle-item">
                    <input type="checkbox" data-rs-toggle-component="roofPlanes" checked>
                    Roof Planes
                </label>
                <label class="rs-toggle-item">
                    <input type="checkbox" data-rs-toggle-component="rafters" checked>
                    Rafters
                </label>
                <label class="rs-toggle-item">
                    <input type="checkbox" data-rs-toggle-component="purlins" checked>
                    Purlins
                </label>
                <label class="rs-toggle-item">
                    <input type="checkbox" data-rs-toggle-component="battens" checked>
                    Battens
                </label>
                <label class="rs-toggle-item">
                    <input type="checkbox" data-rs-toggle-component="ridge" checked>
                    Ridge
                </label>
                <label class="rs-toggle-item">
                    <input type="checkbox" data-rs-toggle-component="hipStructures" checked>
                    Hip Structures
                </label>
            </div>
        </div>

        <div class="rs-canvas-wrap" data-rs-3d-canvas-wrap>
            <canvas data-rs-3d-canvas></canvas>
            <div class="rs-hint">Drag to rotate &middot; Scroll to zoom &middot; Right-drag or Shift+drag to pan</div>
            <div class="rs-3d-unsupported" data-rs-3d-unsupported hidden>
                3D preview isn&rsquo;t available right now &mdash; the 3D library failed to load. Check your connection and reload the page.
            </div>
        </div>

    </div><!-- /view-panel 3d -->
    </div><!-- /view-panels -->

    <aside class="rs-properties card">
        <div class="card-header"><h4>Roof Properties</h4></div>
        <div class="card-body">
            <div class="form-group">
                <label class="form-label" for="rs-roofType">Roof Type</label>
                <select id="rs-roofType" class="form-control" data-rs-prop="roofType">
                    <option>Gable Roof</option>
                    <option>Hip Roof</option>
                    <option>Hidden/Flat Roof</option>
                </select>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label" for="rs-length">Length (m)</label>
                    <input type="text" id="rs-length" class="form-control form-control-numeric" inputmode="decimal" placeholder="e.g. 12" data-rs-prop="length" autocomplete="off">
                </div>
                <div class="form-group">
                    <label class="form-label" for="rs-width">Width (m)</label>
                    <input type="text" id="rs-width" class="form-control form-control-numeric" inputmode="decimal" placeholder="e.g. 9" data-rs-prop="width" autocomplete="off">
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" for="rs-pitch">Pitch (&deg;)</label>
                <input type="text" id="rs-pitch" class="form-control form-control-numeric" inputmode="decimal" placeholder="e.g. 30" data-rs-prop="pitch" autocomplete="off">
                <span class="form-hint">Typical: 0&ndash;5&deg; for flat roofs, 15&ndash;45&deg; for pitched roofs.</span>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label" for="rs-rafterSpacing">Rafter Spacing (mm)</label>
                    <input type="text" id="rs-rafterSpacing" class="form-control form-control-numeric" inputmode="decimal" placeholder="e.g. 600" data-rs-prop="rafterSpacing" autocomplete="off">
                </div>
                <div class="form-group">
                    <label class="form-label" for="rs-purlinSpacing">Purlin Spacing (mm)</label>
                    <input type="text" id="rs-purlinSpacing" class="form-control form-control-numeric" inputmode="decimal" placeholder="e.g. 900" data-rs-prop="purlinSpacing" autocomplete="off">
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" for="rs-roofingMaterial">Roofing Material</label>
                <select id="rs-roofingMaterial" class="form-control" data-rs-prop="roofingMaterial" data-rs-material-select>
                    <option value="">Select a roofing material&hellip;</option>
                </select>
                <span class="form-hint">Sourced from the Materials Catalog.</span>
            </div>
        </div>
        <div class="card-footer">
            <span class="text-xs text-muted" data-rs-shape-count>0 shapes</span>
        </div>
    </aside>

    </div><!-- /rs-workspace -->

    <!--
        AI Roof Generation
        Architecture: AI request -> AI response -> validation -> geometry
        -> 3D visualization. See backend/services/RoofAIService.php and
        frontend/js/modules/roof-ai.js. Automatic generation is NOT
        pretended to be live unless a real AI provider has been
        configured server-side (ROOF_AI_API_URL / ROOF_AI_API_KEY) — by
        default this always honestly reports "not connected".
    -->
    <div class="modal-overlay" data-rs-ai-overlay>
        <div class="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="roofAiTitle">
            <div class="modal-header">
                <h3 id="roofAiTitle">AI Roof Generation</h3>
                <button type="button" class="modal-close" data-rs-ai-close aria-label="Close">&times;</button>
            </div>

            <div class="modal-body">
                <div class="alert alert-warning rs-ai-notice" data-rs-ai-notice hidden>
                    <span class="alert-icon">!</span>
                    <div class="alert-body">
                        <span class="alert-title">AI service status</span>
                        <span data-rs-ai-notice-text></span>
                    </div>
                </div>

                <div data-rs-ai-intro>
                    <p class="text-secondary">
                        Send the current roof properties (footprint, roof type, pitch, rafter/purlin
                        spacing, roofing material) to the AI Roof Generation service and get back a
                        structured proposal you can review, edit, and accept into the 2D/3D model
                        below &mdash; or reject and keep your current design.
                    </p>
                </div>

                <div class="rs-ai-loading" data-rs-ai-loading hidden>
                    <span class="badge badge-neutral">Generating&hellip;</span>
                </div>

                <div data-rs-ai-result hidden>
                    <h4>Proposed Roof Design</h4>
                    <dl class="rs-ai-facts" data-rs-ai-facts>
                        <dt>Roof Type</dt><dd data-ai-fact="roofType">&mdash;</dd>
                        <dt>Footprint</dt><dd data-ai-fact="footprint">&mdash;</dd>
                        <dt>Pitch</dt><dd data-ai-fact="pitch">&mdash;</dd>
                        <dt>Rafter Spacing</dt><dd data-ai-fact="rafterSpacing">&mdash;</dd>
                        <dt>Purlin Spacing</dt><dd data-ai-fact="purlinSpacing">&mdash;</dd>
                        <dt>Roofing Material</dt><dd data-ai-fact="roofingMaterial">&mdash;</dd>
                    </dl>
                    <p class="text-sm text-secondary" data-ai-fact="notes"></p>

                    <form novalidate class="rs-ai-edit-form" data-rs-ai-edit-form hidden>
                        <div class="alert alert-danger" data-rs-ai-form-summary hidden>
                            <span class="alert-icon">!</span>
                            <div class="alert-body"><span data-rs-ai-form-summary-text></span></div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="ai-roofType">Roof Type</label>
                            <select id="ai-roofType" class="form-control" data-ai-field="roofType">
                                <option>Gable Roof</option>
                                <option>Hip Roof</option>
                                <option>Hidden/Flat Roof</option>
                            </select>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="ai-length">Length (m)</label>
                                <input type="text" id="ai-length" class="form-control form-control-numeric" inputmode="decimal" data-ai-field="length">
                                <span class="form-error" data-ai-error-for="length" hidden></span>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="ai-width">Width (m)</label>
                                <input type="text" id="ai-width" class="form-control form-control-numeric" inputmode="decimal" data-ai-field="width">
                                <span class="form-error" data-ai-error-for="width" hidden></span>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="ai-pitch">Pitch (&deg;)</label>
                                <input type="text" id="ai-pitch" class="form-control form-control-numeric" inputmode="decimal" data-ai-field="pitch">
                                <span class="form-error" data-ai-error-for="pitch" hidden></span>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="ai-rafterSpacing">Rafter Spacing (mm)</label>
                                <input type="text" id="ai-rafterSpacing" class="form-control form-control-numeric" inputmode="decimal" data-ai-field="rafterSpacing">
                                <span class="form-error" data-ai-error-for="rafterSpacing" hidden></span>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="ai-purlinSpacing">Purlin Spacing (mm)</label>
                                <input type="text" id="ai-purlinSpacing" class="form-control form-control-numeric" inputmode="decimal" data-ai-field="purlinSpacing">
                                <span class="form-error" data-ai-error-for="purlinSpacing" hidden></span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="ai-roofingMaterial">Roofing Material</label>
                            <input type="text" id="ai-roofingMaterial" class="form-control" data-ai-field="roofingMaterial">
                            <span class="form-error" data-ai-error-for="roofingMaterial" hidden></span>
                        </div>
                    </form>
                </div>
            </div>

            <div class="modal-footer" data-rs-ai-footer>
                <button type="button" class="btn btn-primary" data-rs-ai-generate>Generate</button>
                <button type="button" class="btn btn-outline-secondary" data-rs-ai-edit hidden>Edit</button>
                <button type="button" class="btn btn-primary" data-rs-ai-accept hidden>Accept</button>
                <button type="button" class="btn btn-outline-secondary" data-rs-ai-reject hidden>Reject</button>
                <button type="button" class="btn btn-ghost" data-rs-ai-regenerate hidden>Regenerate</button>
            </div>
        </div>
    </div>

</div>
