<?php
/**
 * PhentiBuild - Settings Module
 *
 * Three tabs: Account (profile info + password), Company Profile (a
 * single-document record, same pattern as the Roof Studio's roof
 * design — see backend/models/CompanyProfile.php), and Preferences.
 *
 * The Bill of Quantities contingency control in Preferences is not a
 * new setting — it re-exposes the same per-device value BOQ already
 * reads/writes via window.PhB.boqStore.get/setContingencyPercent()
 * (frontend/js/modules/boq-store.js), just from a more discoverable
 * place. The Preferred Unit System control is honestly labelled as not
 * yet applied anywhere else — see settings.js and the hint text below —
 * rather than silently pretending Manual Input or Calculators already
 * read it.
 */
$settingsRoles = ['User', 'Contractor', 'Site Manager', 'Quantity Surveyor', 'Draftsman', 'Admin'];
?>
<div class="settings-module" data-settings-module>

    <div class="module-header">
        <div>
            <span class="eyebrow">Account</span>
            <h1>Settings</h1>
            <p class="text-secondary">Manage your account, company profile, units of measurement and preferences.</p>
        </div>
    </div>

    <div class="settings-tabs" role="tablist" aria-label="Settings sections">
        <button type="button" class="settings-tab is-active" data-settings-tab="account" role="tab" aria-selected="true">Account</button>
        <button type="button" class="settings-tab" data-settings-tab="company" role="tab" aria-selected="false">Company Profile</button>
        <button type="button" class="settings-tab" data-settings-tab="preferences" role="tab" aria-selected="false">Preferences</button>
    </div>

    <!-- ============================================================
         ACCOUNT
         ============================================================ -->
    <div class="settings-panel" data-settings-panel="account">

        <form novalidate class="card settings-card" data-settings-form="profile">
            <div class="card-header"><h4>Profile Information</h4></div>
            <div class="card-body">
                <div class="alert alert-danger" data-form-summary hidden>
                    <span class="alert-icon">!</span>
                    <div class="alert-body"><span data-form-summary-text></span></div>
                </div>
                <div class="alert alert-success" data-form-success hidden>
                    <span class="alert-icon">&check;</span>
                    <div class="alert-body">Profile updated.</div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="set-name">Full Name <span class="required">*</span></label>
                        <input type="text" id="set-name" name="name" class="form-control" autocomplete="name">
                        <span class="form-error" data-error-for="name" hidden></span>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="set-email">Email <span class="required">*</span></label>
                        <input type="email" id="set-email" name="email" class="form-control" autocomplete="email">
                        <span class="form-error" data-error-for="email" hidden></span>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="set-phone">Phone <span class="required">*</span></label>
                        <input type="text" id="set-phone" name="phone" class="form-control" autocomplete="tel">
                        <span class="form-error" data-error-for="phone" hidden></span>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="set-role">Role / Account Type <span class="required">*</span></label>
                        <select id="set-role" name="role" class="form-control">
                            <?php foreach ($settingsRoles as $r): ?>
                                <option value="<?php echo htmlspecialchars($r); ?>"><?php echo htmlspecialchars($r); ?></option>
                            <?php endforeach; ?>
                        </select>
                        <span class="form-error" data-error-for="role" hidden></span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>

        <form novalidate class="card settings-card" data-settings-form="password">
            <div class="card-header"><h4>Change Password</h4></div>
            <div class="card-body">
                <div class="alert alert-danger" data-form-summary hidden>
                    <span class="alert-icon">!</span>
                    <div class="alert-body"><span data-form-summary-text></span></div>
                </div>
                <div class="alert alert-success" data-form-success hidden>
                    <span class="alert-icon">&check;</span>
                    <div class="alert-body">Password changed.</div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="set-current-password">Current Password <span class="required">*</span></label>
                    <input type="password" id="set-current-password" name="currentPassword" class="form-control" autocomplete="current-password">
                    <span class="form-error" data-error-for="currentPassword" hidden></span>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="set-new-password">New Password <span class="required">*</span></label>
                        <input type="password" id="set-new-password" name="newPassword" class="form-control" placeholder="At least 8 characters" autocomplete="new-password">
                        <span class="form-error" data-error-for="newPassword" hidden></span>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="set-confirm-password">Confirm New Password <span class="required">*</span></label>
                        <input type="password" id="set-confirm-password" name="confirmNewPassword" class="form-control" autocomplete="new-password">
                        <span class="form-error" data-error-for="confirmNewPassword" hidden></span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button type="submit" class="btn btn-primary">Change Password</button>
            </div>
        </form>

    </div>

    <!-- ============================================================
         COMPANY PROFILE
         ============================================================ -->
    <div class="settings-panel" data-settings-panel="company" hidden>

        <form novalidate class="card settings-card" data-settings-form="company">
            <div class="card-header"><h4>Company Profile</h4></div>
            <div class="card-body">
                <p class="text-secondary text-sm settings-panel-intro">Identifies your business within PhentiBuild. Not yet included on exported reports or Excel workbooks.</p>
                <div class="alert alert-danger" data-form-summary hidden>
                    <span class="alert-icon">!</span>
                    <div class="alert-body"><span data-form-summary-text></span></div>
                </div>
                <div class="alert alert-success" data-form-success hidden>
                    <span class="alert-icon">&check;</span>
                    <div class="alert-body">Company profile updated.</div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="set-company-name">Company Name</label>
                    <input type="text" id="set-company-name" name="companyName" class="form-control">
                    <span class="form-error" data-error-for="companyName" hidden></span>
                </div>
                <div class="form-group">
                    <label class="form-label" for="set-company-address">Address</label>
                    <input type="text" id="set-company-address" name="address" class="form-control">
                    <span class="form-error" data-error-for="address" hidden></span>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="set-company-phone">Phone</label>
                        <input type="text" id="set-company-phone" name="phone" class="form-control">
                        <span class="form-error" data-error-for="phone" hidden></span>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="set-company-email">Email</label>
                        <input type="email" id="set-company-email" name="email" class="form-control">
                        <span class="form-error" data-error-for="email" hidden></span>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="set-company-reg">Registration Number</label>
                    <input type="text" id="set-company-reg" name="registrationNumber" class="form-control">
                    <span class="form-error" data-error-for="registrationNumber" hidden></span>
                </div>
            </div>
            <div class="card-footer">
                <button type="submit" class="btn btn-primary">Save Company Profile</button>
            </div>
        </form>

    </div>

    <!-- ============================================================
         PREFERENCES
         ============================================================ -->
    <div class="settings-panel" data-settings-panel="preferences" hidden>

        <div class="card settings-card">
            <div class="card-header"><h4>Bill of Quantities</h4></div>
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label" for="set-contingency">Default Contingency Percentage</label>
                    <div class="measure-input settings-inline-input">
                        <input type="text" id="set-contingency" class="form-control form-control-numeric" inputmode="decimal" data-settings-contingency>
                        <span class="unit-static">%</span>
                    </div>
                    <span class="form-hint">Applied to the Bill of Quantities grand total. Saved on this device only &mdash; the same value BOQ's own contingency field already uses.</span>
                </div>
            </div>
        </div>

        <div class="card settings-card">
            <div class="card-header"><h4>Units of Measurement</h4></div>
            <div class="card-body">
                <div class="alert alert-warning">
                    <span class="alert-icon">!</span>
                    <div class="alert-body">
                        <span class="alert-title">Not yet connected</span>
                        <span>Manual Input and Calculators currently choose a sensible default unit per field regardless of this setting. Saving your preferred system here does not change their behaviour yet.</span>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="set-unit-system">Preferred Unit System</label>
                    <select id="set-unit-system" class="form-control" data-settings-unit-system>
                        <option value="metric">Metric (m, mm, m&sup2;, m&sup3;)</option>
                        <option value="imperial">Imperial (ft, in)</option>
                    </select>
                    <span class="form-hint">Saved on this device only.</span>
                </div>
            </div>
        </div>

    </div>

</div>
