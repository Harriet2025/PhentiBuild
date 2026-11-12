-- PhentiBuild - Roof Designs Schema
-- Unlike the other resources connected so far, the 2D Roof Studio
-- (frontend/js/modules/roof-studio-store.js) has never managed a
-- collection of saved designs — it works on exactly one current drawing
-- (its shapes array + properties object), persisted as a single
-- localStorage document. This table mirrors that faithfully: it is
-- meant to ever hold one row. See backend/models/RoofDesign.php for how
-- the API adapts Create/Get/Update/Delete to a single-document resource
-- rather than inventing multi-design support the frontend doesn't have.

CREATE TABLE IF NOT EXISTS roof_designs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shapes_json JSON NOT NULL,
    properties_json JSON NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
