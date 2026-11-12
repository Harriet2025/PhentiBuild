-- PhentiBuild - Measurements Schema
-- No dedicated "Measurements" UI existed before this stage — only Manual
-- Input's validated-but-unsaved forms (frontend/pages/modules/manual-input.php).
-- Each of its 8 section types (walls, plastering, slab, column, roof,
-- concrete, rebar, timber) collects a different set of fields, so rather
-- than a rigid column-per-field schema (or 8 separate tables), the
-- validated field values are stored as one JSON payload per record —
-- exactly the shape manual-input.js already builds in memory before
-- handing it to a calculator.

CREATE TABLE IF NOT EXISTS measurements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    section_type ENUM('walls', 'plastering', 'slab', 'column', 'roof', 'concrete', 'rebar', 'timber') NOT NULL,
    label VARCHAR(255) NULL,
    values_json JSON NOT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_measurements_type (section_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
