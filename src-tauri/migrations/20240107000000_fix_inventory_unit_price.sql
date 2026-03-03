-- Fix: Update inventory unit_price from purchase_products for products that have NULL unit_price
-- This takes the most recent purchase price for each product
UPDATE inventory 
SET unit_price = (
    SELECT pp.unit_price 
    FROM purchase_products pp 
    WHERE pp.product_code = inventory.product_code 
    ORDER BY pp.rowid DESC 
    LIMIT 1
)
WHERE inventory.unit_price IS NULL 
AND EXISTS (
    SELECT 1 FROM purchase_products pp WHERE pp.product_code = inventory.product_code
);
