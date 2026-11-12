-- PhentiBuild - Users Schema
-- Passwords are never stored in plain text — only a bcrypt hash
-- (PHP's password_hash() with PASSWORD_DEFAULT) ever reaches this table.
-- See backend/models/User.php for how it's written and verified.

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Contractor', 'Site Manager', 'Quantity Surveyor', 'Draftsman', 'User') NOT NULL DEFAULT 'User',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
