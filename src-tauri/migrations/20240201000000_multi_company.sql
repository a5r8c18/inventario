-- Multi-company support: add companies table and company_id to all tables

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL UNIQUE,
    tax_id VARCHAR(50),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_path VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default company (preserves existing data)
INSERT OR IGNORE INTO companies (id, name, tax_id)
VALUES (1, 'Empresa Principal', 'DEFAULT');

-- NOTE: Column addition moved to application code to avoid duplicate column errors
-- The ensure_company_id_columns() function in database.rs will handle adding
-- missing columns safely with proper error handling
-- This prevents migration failures due to duplicate column names

-- No ALTER TABLE statements here - they're handled in the application startup

-- NOTE: Index creation moved to application code
-- The ensure_company_id_columns() function will create indexes
-- after ensuring columns exist to prevent "no such column" errors

-- No CREATE INDEX statements here - they're handled in the application startup
