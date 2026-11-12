-- PhentiBuild - Calculations Schema
-- No calculation result was ever persisted before this stage — each
-- calculator module (masonry/plaster/concrete/rebar/timber/roofing-calcs.js)
-- is a pure function, and manual-input.js only ever held the last run's
-- {input, result} pair in a single transient variable, overwritten on
-- the next run and lost on reload. This table gives calculation runs a
-- permanent record. Like measurements, the input/result shapes differ
-- per calculator type, so both are stored as JSON payloads rather than
-- a fixed column set.
--
-- IMPORTANT: calculation_type is a hard ENUM, not just a PHP-side
-- Validator::in() check — adding a new calculator type (see
-- backend/models/Calculation.php's CALCULATION_TYPES) means altering
-- this column too, or MySQL's non-strict-mode ENUM coercion will
-- silently store an empty string instead of rejecting the insert.

CREATE TABLE IF NOT EXISTS calculations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    calculation_type ENUM('walls', 'plastering', 'concrete', 'rebar', 'timber', 'roofing') NOT NULL,
    label VARCHAR(255) NULL,
    input_json JSON NOT NULL,
    result_json JSON NOT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_calculations_type (calculation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
