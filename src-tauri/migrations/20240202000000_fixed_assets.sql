-- Fixed Assets (Activos Fijos) module

CREATE TABLE IF NOT EXISTS fixed_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id),
    asset_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    -- Depreciation group classification
    group_number INTEGER NOT NULL, -- I=1, II=2, III=3, IV=4, V=5, VI=6, VII=7
    subgroup VARCHAR(100) NOT NULL,
    subgroup_detail VARCHAR(200),
    depreciation_rate REAL NOT NULL, -- % annual rate (e.g. 10.0 for 10%)
    -- Asset value tracking
    acquisition_value REAL NOT NULL,
    current_value REAL NOT NULL,
    acquisition_date DATE NOT NULL,
    -- Location/status
    location VARCHAR(200),
    responsible_person VARCHAR(200),
    status VARCHAR(50) DEFAULT 'active', -- active, retired, disposed
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, asset_code)
);

-- Depreciation records per year per asset
CREATE TABLE IF NOT EXISTS fixed_asset_depreciation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id),
    year INTEGER NOT NULL,
    depreciation_amount REAL NOT NULL,
    accumulated_depreciation REAL NOT NULL,
    book_value REAL NOT NULL, -- acquisition_value - accumulated_depreciation
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, year)
);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_company ON fixed_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_group ON fixed_assets(group_number);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_depreciation_asset ON fixed_asset_depreciation(asset_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_year ON fixed_asset_depreciation(year);
