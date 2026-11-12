-- PhentiBuild - History (audit trail) Schema
-- Append-only by design: the API only ever exposes reading it (see
-- backend/api/history/index.php) — there is no update or delete
-- endpoint, since a mutable audit log defeats its own purpose. Rows are
-- written internally by other models (Project, Material, BoqItem,
-- Measurement, Calculation, RoofDesign, Report) via History::record()
-- after their own create/update/delete calls succeed — see
-- backend/models/History.php.
--
-- user_id / project_id are both nullable: user_id is only known once a
-- request carries a logged-in session (see core/session.php), and
-- project_id is only meaningful for the entity types that actually have
-- a project association in their own table (projects themselves, and
-- reports) — measurements/calculations/materials/boq_items/roof_designs
-- are standalone collections with no project_id column of their own, so
-- their history rows simply carry a NULL project.

CREATE TABLE IF NOT EXISTS history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    user_id INT UNSIGNED NULL,
    project_id INT UNSIGNED NULL,
    module VARCHAR(50) NULL,
    action ENUM('created', 'updated', 'deleted', 'deactivated', 'reactivated') NOT NULL,
    summary VARCHAR(500) NOT NULL,
    details_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_history_entity (entity_type, entity_id),
    KEY idx_history_created (created_at),
    KEY idx_history_user (user_id),
    KEY idx_history_project (project_id),
    KEY idx_history_module (module),
    CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_history_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
