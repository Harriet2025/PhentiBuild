-- PhentiBuild - Materials Schema
-- Run against the `phentibuild` database (see schema.sql for how the
-- database itself is created). Mirrors the shape the frontend's
-- materials-store.js already used for its localStorage catalog, so the
-- 22 reference materials it shipped with are migrated in unchanged —
-- see materials_seed.sql.
--
-- "Delete" a material is a soft delete (is_active = 0), not a row
-- removal — a reference catalog entry may already be cited by past BOQ
-- line items, so it should stay retrievable by id even once retired from
-- the active list.

CREATE TABLE IF NOT EXISTS materials (
    id VARCHAR(20) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category ENUM('Cement', 'Sand', 'Aggregate', 'Blocks', 'Rebar', 'Timber', 'Roofing', 'Underlay') NOT NULL,
    unit VARCHAR(100) NOT NULL,
    dimensions VARCHAR(255) NULL,
    overall_dimensions VARCHAR(255) NULL,
    effective_coverage VARCHAR(255) NULL,
    standard_length VARCHAR(255) NULL,
    spacing VARCHAR(255) NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_materials_category (category),
    KEY idx_materials_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
