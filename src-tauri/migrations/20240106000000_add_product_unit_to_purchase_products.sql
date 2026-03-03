-- Add product_unit column to purchase_products table
ALTER TABLE purchase_products ADD COLUMN product_unit VARCHAR(50) DEFAULT 'UN';

-- Update existing records to have default unit
UPDATE purchase_products SET product_unit = 'UN' WHERE product_unit IS NULL;
