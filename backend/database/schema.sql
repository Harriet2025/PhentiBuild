-- PhentiBuild - Database Schema
-- Run against the `phentibuild` database (created automatically by
-- config/database.php's setup, or manually via `CREATE DATABASE
-- phentibuild CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`).
--
-- Only the `projects` table exists so far — this stage is the backend
-- foundation and the Project API only. Measurements, Calculations,
-- Materials, BOQs, Roof Designs, Users and History each get their own
-- table (and their own file under backend/models/ + backend/api/) in
-- later stages, following the same pattern established here.

CREATE TABLE IF NOT EXISTS projects (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    -- NULL only for the instant between insert and the follow-up update
    -- that sets it from the row's own new id — see Project::create().
    ref VARCHAR(20) NULL,
    name VARCHAR(255) NOT NULL,
    client VARCHAR(255) NOT NULL,
    contact VARCHAR(255) NULL,
    location VARCHAR(255) NOT NULL,
    type ENUM('Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Institutional') NOT NULL,
    description TEXT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('Planning', 'In Progress', 'On Hold', 'Completed', 'Archived') NOT NULL DEFAULT 'Planning',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_projects_ref (ref),
    KEY idx_projects_status (status),
    KEY idx_projects_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
