-- PhentiBuild - Bill of Quantities Schema
-- Mirrors the shape frontend/js/modules/boq-store.js already used for
-- its localStorage line items. `seq` is a plain monotonic counter (never
-- reused, unlike a MAX(id)-style scan) that `id` (BOQ-####) is derived
-- from right after insert — the same approach used for projects.ref,
-- because BOQ items support a real DELETE (not a soft deactivate like
-- materials), so an id must never be handed out twice.

CREATE TABLE IF NOT EXISTS boq_items (
    seq INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id VARCHAR(20) NULL,
    item VARCHAR(255) NOT NULL,
    category ENUM('Cement', 'Sand', 'Aggregate', 'Blocks', 'Rebar', 'Timber', 'Roofing', 'Underlay', 'Other') NOT NULL,
    description TEXT NULL,
    specification VARCHAR(255) NULL,
    unit VARCHAR(100) NOT NULL,
    quantity DECIMAL(14, 3) NOT NULL DEFAULT 0,
    waste_percent DECIMAL(6, 2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(14, 2) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_boq_items_id (id),
    KEY idx_boq_items_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
