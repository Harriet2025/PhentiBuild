/*M!999999\- enable the sandbox mode */ 
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `boq_items` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(20) DEFAULT NULL,
  `item` varchar(255) NOT NULL,
  `category` enum('Cement','Sand','Aggregate','Blocks','Rebar','Timber','Roofing','Underlay','Other') NOT NULL,
  `description` text DEFAULT NULL,
  `specification` varchar(255) DEFAULT NULL,
  `unit` varchar(100) NOT NULL,
  `quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `waste_percent` decimal(6,2) NOT NULL DEFAULT 0.00,
  `unit_price` decimal(14,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'manual',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`seq`),
  UNIQUE KEY `uq_boq_items_id` (`id`),
  KEY `idx_boq_items_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `calculations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `calculation_type` enum('walls','plastering','concrete','rebar','timber','roofing') NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `input_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`input_json`)),
  `result_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`result_json`)),
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_calculations_type` (`calculation_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_profile` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) NOT NULL DEFAULT '',
  `address` varchar(500) NOT NULL DEFAULT '',
  `phone` varchar(30) NOT NULL DEFAULT '',
  `email` varchar(255) NOT NULL DEFAULT '',
  `registration_number` varchar(100) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_messages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` enum('new','read','replied','archived') NOT NULL DEFAULT 'new',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_contact_messages_status` (`status`),
  KEY `idx_contact_messages_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `history` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(50) NOT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `project_id` int(10) unsigned DEFAULT NULL,
  `module` varchar(50) DEFAULT NULL,
  `action` enum('created','updated','deleted','deactivated','reactivated') NOT NULL,
  `summary` varchar(500) NOT NULL,
  `details_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details_json`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_history_entity` (`entity_type`,`entity_id`),
  KEY `idx_history_created` (`created_at`),
  KEY `idx_history_user` (`user_id`),
  KEY `idx_history_project` (`project_id`),
  KEY `idx_history_module` (`module`),
  CONSTRAINT `fk_history_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `materials` (
  `id` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` enum('Cement','Sand','Aggregate','Blocks','Rebar','Timber','Roofing','Underlay') NOT NULL,
  `unit` varchar(100) NOT NULL,
  `dimensions` varchar(255) DEFAULT NULL,
  `overall_dimensions` varchar(255) DEFAULT NULL,
  `effective_coverage` varchar(255) DEFAULT NULL,
  `standard_length` varchar(255) DEFAULT NULL,
  `spacing` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_materials_category` (`category`),
  KEY `idx_materials_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `measurements` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `section_type` enum('walls','plastering','slab','column','roof','concrete','rebar','timber') NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `values_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`values_json`)),
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_measurements_type` (`section_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ref` varchar(20) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `client` varchar(255) NOT NULL,
  `contact` varchar(255) DEFAULT NULL,
  `location` varchar(255) NOT NULL,
  `type` enum('Residential','Commercial','Industrial','Infrastructure','Institutional') NOT NULL,
  `description` text DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `progress` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `status` enum('Planning','In Progress','On Hold','Completed','Archived') NOT NULL DEFAULT 'Planning',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_projects_ref` (`ref`),
  KEY `idx_projects_status` (`status`),
  KEY `idx_projects_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'custom',
  `project_id` int(10) unsigned DEFAULT NULL,
  `content_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`content_json`)),
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_reports_project` (`project_id`),
  CONSTRAINT `fk_reports_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roof_designs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `shapes_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`shapes_json`)),
  `properties_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`properties_json`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('Admin','Contractor','Site Manager','Quantity Surveyor','Draftsman','User') NOT NULL DEFAULT 'User',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
