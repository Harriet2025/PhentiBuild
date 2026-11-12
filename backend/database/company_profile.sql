-- PhentiBuild - Company Profile Schema
-- A single-document resource, exactly like roof_designs (see
-- backend/models/RoofDesign.php for the reasoning): this app has no
-- multi-tenancy, so there is only ever one company using a given
-- install, and this table is meant to ever hold one row. See
-- backend/models/CompanyProfile.php for how the API adapts Get/Update
-- to a single-document resource.

CREATE TABLE IF NOT EXISTS company_profile (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL DEFAULT '',
    address VARCHAR(500) NOT NULL DEFAULT '',
    phone VARCHAR(30) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    registration_number VARCHAR(100) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
