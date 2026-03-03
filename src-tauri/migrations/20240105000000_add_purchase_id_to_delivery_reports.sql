-- Add purchase_id column to delivery_reports table
ALTER TABLE delivery_reports ADD COLUMN purchase_id TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_reports_purchase_id ON delivery_reports(purchase_id);

-- Update existing delivery reports to have purchase_id if possible
UPDATE delivery_reports SET purchase_id = 'legacy-' || id WHERE purchase_id IS NULL;
