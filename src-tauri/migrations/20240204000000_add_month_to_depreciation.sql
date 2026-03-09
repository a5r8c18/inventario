-- Add month column to fixed_asset_depreciation table for monthly depreciation tracking
ALTER TABLE fixed_asset_depreciation ADD COLUMN month INTEGER;

-- Update unique constraint to include month
-- Drop old constraint and create new one
-- Note: SQLite doesn't support ALTER CONSTRAINT, so we need to recreate the table

-- Create new table with month column
CREATE TABLE fixed_asset_depreciation_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id),
    year INTEGER NOT NULL,
    month INTEGER,
    depreciation_amount REAL NOT NULL,
    accumulated_depreciation REAL NOT NULL,
    book_value REAL NOT NULL,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, year, month)
);

-- Copy data from old table
INSERT INTO fixed_asset_depreciation_new 
SELECT id, asset_id, company_id, year, NULL, depreciation_amount, accumulated_depreciation, book_value, calculated_at
FROM fixed_asset_depreciation;

-- Drop old table
DROP TABLE fixed_asset_depreciation;

-- Rename new table
ALTER TABLE fixed_asset_depreciation_new RENAME TO fixed_asset_depreciation;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_depreciation_asset ON fixed_asset_depreciation(asset_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_year ON fixed_asset_depreciation(year);
CREATE INDEX IF NOT EXISTS idx_depreciation_month ON fixed_asset_depreciation(month);
