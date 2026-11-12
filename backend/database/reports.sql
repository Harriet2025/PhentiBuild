-- PhentiBuild - Reports Schema
-- No frontend UI exists for Reports yet (the sidebar entry and the
-- Projects module's "Reports" detail tab are both still placeholders —
-- see frontend/pages/app.php and frontend/pages/modules/projects.php).
-- This is the backend foundation only: a record of a generated report
-- (title, type, an optional link to the project it's about, and a JSON
-- snapshot of whatever data it was compiled from). Real report
-- generation — compiling BOQ/measurement data into one of these — is a
-- later stage, not this one.

CREATE TABLE IF NOT EXISTS reports (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'custom',
    project_id INT UNSIGNED NULL,
    content_json JSON NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_reports_project (project_id),
    CONSTRAINT fk_reports_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
