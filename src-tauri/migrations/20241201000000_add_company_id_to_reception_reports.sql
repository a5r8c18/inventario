-- Add company_id to reception_reports table (safe migration)
-- Add the column first
ALTER TABLE reception_reports ADD COLUMN company_id INTEGER;

-- Update existing records to have company_id = 1 (default company) only if they are NULL
UPDATE reception_reports SET company_id = 1 WHERE company_id IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_reception_reports_company_id ON reception_reports(company_id);
