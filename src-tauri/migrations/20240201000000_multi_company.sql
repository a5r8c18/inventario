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

-- Add company_id to users
ALTER TABLE users ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id);
ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'admin';
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add company_id to all data tables
ALTER TABLE inventory ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id);
ALTER TABLE purchases ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id);
ALTER TABLE movements ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id);
ALTER TABLE invoices ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id);
ALTER TABLE invoices ADD COLUMN company_logo VARCHAR(500);
ALTER TABLE delivery_reports ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id);
ALTER TABLE reception_reports ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_company ON inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_purchases_company ON purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_movements_company ON movements(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_reports_company ON delivery_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reception_reports_company ON reception_reports(company_id);
