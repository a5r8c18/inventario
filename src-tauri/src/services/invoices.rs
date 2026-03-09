use uuid::Uuid;
use chrono::{Utc, Datelike};
use crate::error::AppError;
use crate::models::invoices::{
    Invoice, InvoiceItem, InvoiceWithItems, CreateInvoiceDto,
    UpdateInvoiceDto, InvoiceStatistics, FilterInvoicesDto
};
use crate::database::Database;
use serde_json::json;

pub struct InvoiceService;

impl InvoiceService {
    pub async fn get_all_invoices(db: &Database, company_id: i32, filters: FilterInvoicesDto) -> Result<Vec<Invoice>, AppError> {
        let mut query = "SELECT * FROM invoices WHERE company_id = ?".to_string();
        
        if let Some(_customer_name) = &filters.customer_name {
            query.push_str(" AND customer_name LIKE ?");
        }
        
        if let Some(_status) = &filters.status {
            query.push_str(" AND status = ?");
        }
        
        if let Some(_date_from) = &filters.date_from {
            query.push_str(" AND date >= ?");
        }
        
        if let Some(_date_to) = &filters.date_to {
            query.push_str(" AND date <= ?");
        }
        
        if let Some(_min_amount) = filters.min_amount {
            query.push_str(" AND total >= ?");
        }
        
        if let Some(_max_amount) = filters.max_amount {
            query.push_str(" AND total <= ?");
        }
        
        query.push_str(" ORDER BY date DESC");
        
        if let Some(_limit) = filters.limit {
            query.push_str(" LIMIT ?");
        }
        
        if let Some(_page) = filters.page {
            let _offset = (_page - 1) * filters.limit.unwrap_or(10);
            query.push_str(" OFFSET ?");
        }

        let mut builder = sqlx::query_as::<_, Invoice>(&query).bind(company_id);
        
        if let Some(customer_name) = &filters.customer_name {
            builder = builder.bind(format!("%{}%", customer_name));
        }
        
        if let Some(status) = &filters.status {
            builder = builder.bind(status);
        }
        
        if let Some(date_from) = &filters.date_from {
            builder = builder.bind(date_from);
        }
        
        if let Some(date_to) = &filters.date_to {
            builder = builder.bind(date_to);
        }
        
        if let Some(min_amount) = filters.min_amount {
            builder = builder.bind(min_amount);
        }
        
        if let Some(max_amount) = filters.max_amount {
            builder = builder.bind(max_amount);
        }
        
        if let Some(limit) = filters.limit {
            builder = builder.bind(limit);
        }
        
        if let Some(page) = filters.page {
            let offset = (page - 1) * filters.limit.unwrap_or(10);
            builder = builder.bind(offset);
        }

        let invoices = builder.fetch_all(db.pool()).await?;
        Ok(invoices)
    }

    pub async fn get_invoice_by_id(db: &Database, company_id: i32, invoice_id: &str) -> Result<Invoice, AppError> {
        let invoice = sqlx::query_as::<_, Invoice>(
            "SELECT * FROM invoices WHERE id = ? AND company_id = ?"
        )
        .bind(invoice_id)
        .bind(company_id)
        .fetch_optional(db.pool())
        .await?;

        match invoice {
            Some(invoice) => Ok(invoice),
            None => Err(AppError::NotFound("Factura no encontrada".to_string())),
        }
    }

    pub async fn get_invoice_with_items(db: &Database, company_id: i32, invoice_id: &str) -> Result<InvoiceWithItems, AppError> {
        let invoice = sqlx::query_as::<_, Invoice>(
            "SELECT * FROM invoices WHERE id = ? AND company_id = ?"
        )
        .bind(invoice_id)
        .bind(company_id)
        .fetch_optional(db.pool())
        .await?;

        match invoice {
            Some(invoice) => {
                let items = sqlx::query_as::<_, InvoiceItem>(
                    "SELECT * FROM invoice_items WHERE invoice_id = ?"
                )
                .bind(invoice_id)
                .fetch_all(db.pool())
                .await?;

                Ok(InvoiceWithItems { invoice, items })
            }
            None => Err(AppError::NotFound("Factura no encontrada".to_string())),
        }
    }

    pub async fn create_invoice(db: &Database, company_id: i32, create_dto: CreateInvoiceDto, created_by_name: Option<String>) -> Result<InvoiceWithItems, AppError> {
        let invoice_id = Uuid::new_v4().to_string();
        let invoice_number = Self::generate_invoice_number(db).await?;
        
        // Calculate totals and validate stock
        let mut subtotal = 0.0;
        for item in &create_dto.items {
            // Check if product exists and has enough stock
            let product_info = sqlx::query_as::<_, (f64, String)>(
                "SELECT stock, product_name FROM inventory WHERE product_code = ? AND company_id = ?"
            )
            .bind(&item.product_code)
            .bind(company_id)
            .fetch_optional(db.pool())
            .await?;
            
            // Check if product exists at all
            if product_info.is_none() {
                return Err(AppError::Validation(format!(
                    "El producto con código '{}' no existe en el inventario", 
                    item.product_code.as_deref().unwrap_or("desconocido")
                )));
            }
            
            let (current_stock, product_name) = product_info.unwrap();
            if current_stock < item.quantity {
                return Err(AppError::Validation(format!(
                    "Stock insuficiente para el producto '{}' ({}). Disponible: {}, Solicitado: {}", 
                    product_name, item.product_code.as_deref().unwrap_or("desconocido"), current_stock, item.quantity
                )));
            }
            
            subtotal += item.quantity * item.unit_price;
        }
        
        let tax_amount = subtotal * (create_dto.tax_rate / 100.0);
        let total = subtotal + tax_amount - create_dto.discount;

        // Start transaction for ALL operations (invoice + items + inventory + movements + delivery)
        let mut tx = db.pool().begin().await?;

        // Create invoice inside transaction
        // Fetch company logo for the invoice
        let company_logo: Option<String> = sqlx::query_scalar(
            "SELECT logo_path FROM companies WHERE id = ?"
        )
        .bind(company_id)
        .fetch_optional(db.pool())
        .await
        .unwrap_or(None)
        .flatten();

        sqlx::query(
            "INSERT INTO invoices (id, invoice_number, customer_name, customer_id, customer_address, 
             customer_phone, subtotal, tax_rate, tax_amount, discount, total, status, notes, created_by_name, company_id, company_logo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&invoice_id)
        .bind(&invoice_number)
        .bind(&create_dto.customer_name)
        .bind(&create_dto.customer_id)
        .bind(&create_dto.customer_address)
        .bind(&create_dto.customer_phone)
        .bind(subtotal)
        .bind(create_dto.tax_rate)
        .bind(tax_amount)
        .bind(create_dto.discount)
        .bind(total)
        .bind(create_dto.status.clone().unwrap_or("pending".to_string()))
        .bind(&create_dto.notes)
        .bind(&created_by_name)
        .bind(company_id)
        .bind(&company_logo)
        .execute(&mut *tx)
        .await?;

        let invoice = sqlx::query_as::<_, Invoice>(
            "SELECT * FROM invoices WHERE id = ?"
        )
        .bind(&invoice_id)
        .fetch_one(&mut *tx)
        .await?;

        // Create invoice items and update inventory
        let mut items = Vec::new();
        let items_clone = create_dto.items.clone();
        
        for item_dto in create_dto.items {
            let item_id = Uuid::new_v4().to_string();
            let amount = item_dto.quantity * item_dto.unit_price;
            
            sqlx::query(
                "INSERT INTO invoice_items (id, invoice_id, product_code, description, quantity, unit_price, amount) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&item_id)
            .bind(&invoice_id)
            .bind(&item_dto.product_code)
            .bind(&item_dto.description)
            .bind(item_dto.quantity)
            .bind(item_dto.unit_price)
            .bind(amount)
            .execute(&mut *tx)
            .await?;

            let item = sqlx::query_as::<_, InvoiceItem>(
                "SELECT * FROM invoice_items WHERE id = ?"
            )
            .bind(&item_id)
            .fetch_one(&mut *tx)
            .await?;
            
            items.push(item);
        }

        // Update inventory stock for all items after creating invoice items
        for item_dto in &items_clone {
            // Update inventory stock (decrement)
            sqlx::query::<sqlx::Sqlite>(
                "UPDATE inventory SET exits = exits + ?, stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE product_code = ? AND company_id = ?"
            )
            .bind(item_dto.quantity)
            .bind(item_dto.quantity)
            .bind(&item_dto.product_code)
            .bind(company_id)
            .execute(&mut *tx)
            .await?;
            
            let movement_id = Uuid::new_v4().to_string();
            sqlx::query::<sqlx::Sqlite>(
                "INSERT INTO movements (id, movement_type, product_code, quantity, reason, label, user_name, company_id) 
                 VALUES (?, 'exit', ?, ?, ?, ?, ?, ?)"
            )
            .bind(&movement_id)
            .bind(&item_dto.product_code)
            .bind(item_dto.quantity)
            .bind(&format!("Venta-PV: {}", create_dto.customer_name))
            .bind("Venta") // label field
            .bind(created_by_name.as_deref().unwrap_or("System"))
            .bind(company_id)
            .execute(&mut *tx)
            .await?;
            
            let delivery_id = Uuid::new_v4().to_string();
            let product_details = sqlx::query_as::<_, (String, String, f64, String)>(
                "SELECT product_name, product_description, unit_price, product_unit FROM inventory WHERE product_code = ? AND company_id = ?"
            )
            .bind(&item_dto.product_code)
            .bind(company_id)
            .fetch_one(&mut *tx)
            .await?;
            
            // Create product JSON for delivery voucher (usar precio de entrada al inventario, no el de facturación)
            let inventory_price = product_details.2;
            let product_json = json!([{
                "code": item_dto.product_code,
                "description": item_dto.description,
                "quantity": item_dto.quantity,
                "unit": product_details.3,
                "unitPrice": inventory_price,
                "amount": item_dto.quantity * inventory_price
            }]);
            
            // Insert delivery voucher
            sqlx::query::<sqlx::Sqlite>(
                "INSERT INTO delivery_reports (id, purchase_id, code, entity, warehouse, document, products, date, report_type, created_by_name, company_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'Vale de Entrega', ?, ?)"
            )
            .bind(&delivery_id)
            .bind(&invoice_id) // Use invoice_id as reference
            .bind(&format!("VE-{}", item_dto.product_code.as_deref().unwrap_or("UNKNOWN")))
            .bind(&create_dto.customer_name) // Customer as entity
            .bind("Almacén Principal") // Default warehouse
            .bind(&format!("FAC-{}", invoice_number)) // Use invoice number as document
            .bind(serde_json::to_string(&product_json).unwrap_or_default())
            .bind(created_by_name.as_deref().unwrap_or("System"))
            .bind(company_id)
            .execute(&mut *tx)
            .await?;
        }
        
        // Commit transaction
        tx.commit().await?;

        Ok(InvoiceWithItems { invoice, items })
    }

    pub async fn update_invoice(db: &Database, company_id: i32, invoice_id: &str, update_dto: UpdateInvoiceDto) -> Result<Invoice, AppError> {
        let _existing = Self::get_invoice_by_id(db, company_id, invoice_id).await?;
        
        // Update invoice fields
        let mut query_parts = Vec::new();
        let mut params = Vec::new();
        
        if let Some(customer_name) = update_dto.customer_name {
            query_parts.push("customer_name = ?");
            params.push(customer_name);
        }
        
        if let Some(customer_id) = update_dto.customer_id {
            query_parts.push("customer_id = ?");
            params.push(customer_id);
        }
        
        if let Some(customer_address) = update_dto.customer_address {
            query_parts.push("customer_address = ?");
            params.push(customer_address);
        }
        
        if let Some(customer_phone) = update_dto.customer_phone {
            query_parts.push("customer_phone = ?");
            params.push(customer_phone);
        }
        
        if let Some(tax_rate) = update_dto.tax_rate {
            query_parts.push("tax_rate = ?");
            params.push(tax_rate.to_string());
        }
        
        if let Some(discount) = update_dto.discount {
            query_parts.push("discount = ?");
            params.push(discount.to_string());
        }
        
        if let Some(status) = update_dto.status {
            query_parts.push("status = ?");
            params.push(status);
        }
        
        if let Some(notes) = update_dto.notes {
            query_parts.push("notes = ?");
            params.push(notes);
        }
        
        if !query_parts.is_empty() {
            query_parts.push("updated_at = CURRENT_TIMESTAMP");
            let query = format!("UPDATE invoices SET {} WHERE id = ?", query_parts.join(", "));
            
            let mut builder = sqlx::query::<sqlx::Sqlite>(&query);
            for param in params {
                builder = builder.bind(param);
            }
            builder = builder.bind(invoice_id);
            
            builder.execute(db.pool()).await?;
        }
        
        // Update items if provided
        if let Some(new_items) = update_dto.items {
            let existing_invoice = Self::get_invoice_by_id(db, company_id, invoice_id).await?;
            
            // Get old items to revert inventory
            let old_items = sqlx::query_as::<_, InvoiceItem>(
                "SELECT * FROM invoice_items WHERE invoice_id = ?"
            )
            .bind(invoice_id)
            .fetch_all(db.pool())
            .await?;
            
            let mut tx = db.pool().begin().await?;
            
            let sale_reason = format!("Venta-PV: {}", existing_invoice.customer_name);
            
            // Revert inventory for old items
            for old_item in &old_items {
                let product_code = match &old_item.product_code {
                    Some(code) if !code.is_empty() => code,
                    _ => continue,
                };
                
                // Undo the old exit
                sqlx::query::<sqlx::Sqlite>(
                    "UPDATE inventory SET 
                     exits = exits - ?, 
                     stock = stock + ?,
                     updated_at = CURRENT_TIMESTAMP
                     WHERE product_code = ?"
                )
                .bind(old_item.quantity)
                .bind(old_item.quantity)
                .bind(product_code)
                .execute(&mut *tx)
                .await?;
                
                // Delete old exit movement
                sqlx::query::<sqlx::Sqlite>(
                    "DELETE FROM movements WHERE id IN (
                        SELECT id FROM movements 
                        WHERE product_code = ? AND quantity = ? AND reason = ? AND movement_type = 'exit'
                        LIMIT 1
                    )"
                )
                .bind(product_code)
                .bind(old_item.quantity)
                .bind(&sale_reason)
                .execute(&mut *tx)
                .await?;
            }
            
            // Delete old delivery reports
            sqlx::query::<sqlx::Sqlite>(
                "DELETE FROM delivery_reports WHERE purchase_id = ?"
            )
            .bind(invoice_id)
            .execute(&mut *tx)
            .await?;
            
            // Delete old items
            sqlx::query("DELETE FROM invoice_items WHERE invoice_id = ?")
                .bind(invoice_id)
                .execute(&mut *tx)
                .await?;
            
            // Create new items and apply new inventory changes
            for item_dto in &new_items {
                let item_id = Uuid::new_v4().to_string();
                let amount = item_dto.quantity * item_dto.unit_price;
                
                sqlx::query(
                    "INSERT INTO invoice_items (id, invoice_id, product_code, description, quantity, unit_price, amount) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&item_id)
                .bind(invoice_id)
                .bind(&item_dto.product_code)
                .bind(&item_dto.description)
                .bind(item_dto.quantity)
                .bind(item_dto.unit_price)
                .bind(amount)
                .execute(&mut *tx)
                .await?;
                
                let product_code = match &item_dto.product_code {
                    Some(code) if !code.is_empty() => code,
                    _ => continue,
                };
                
                // Apply new exit to inventory
                sqlx::query::<sqlx::Sqlite>(
                    "UPDATE inventory SET 
                     exits = exits + ?, 
                     stock = stock - ?,
                     updated_at = CURRENT_TIMESTAMP
                     WHERE product_code = ?"
                )
                .bind(item_dto.quantity)
                .bind(item_dto.quantity)
                .bind(product_code)
                .execute(&mut *tx)
                .await?;
                
                // Create new exit movement
                let movement_id = Uuid::new_v4().to_string();
                sqlx::query::<sqlx::Sqlite>(
                    "INSERT INTO movements (id, movement_type, product_code, quantity, reason, label, user_name) 
                     VALUES (?, 'exit', ?, ?, ?, ?, ?)"
                )
                .bind(&movement_id)
                .bind(product_code)
                .bind(item_dto.quantity)
                .bind(&sale_reason)
                .bind("Venta")
                .bind("System")
                .execute(&mut *tx)
                .await?;
            }
            
            tx.commit().await?;
            
            // Recalculate totals
            Self::recalculate_invoice_totals(db, invoice_id).await?;
        }
        
        Self::get_invoice_by_id(db, company_id, invoice_id).await
    }

    pub async fn delete_invoice(db: &Database, company_id: i32, invoice_id: &str) -> Result<(), AppError> {
        let invoice = Self::get_invoice_by_id(db, company_id, invoice_id).await?;
        
        // Get items to revert inventory
        let items = sqlx::query_as::<_, InvoiceItem>(
            "SELECT * FROM invoice_items WHERE invoice_id = ?"
        )
        .bind(invoice_id)
        .fetch_all(db.pool())
        .await?;
        
        let mut tx = db.pool().begin().await?;
        
        let sale_reason = format!("Venta-PV: {}", invoice.customer_name);
        
        // Revert inventory for each item
        for item in &items {
            let product_code = match &item.product_code {
                Some(code) if !code.is_empty() => code,
                _ => continue,
            };
            
            // Revert exits and stock
            sqlx::query::<sqlx::Sqlite>(
                "UPDATE inventory SET 
                 exits = exits - ?, 
                 stock = stock + ?,
                 updated_at = CURRENT_TIMESTAMP
                 WHERE product_code = ?"
            )
            .bind(item.quantity)
            .bind(item.quantity)
            .bind(product_code)
            .execute(&mut *tx)
            .await?;
            
            // Delete the exit movement for this product
            sqlx::query::<sqlx::Sqlite>(
                "DELETE FROM movements WHERE id IN (
                    SELECT id FROM movements 
                    WHERE product_code = ? AND quantity = ? AND reason = ? AND movement_type = 'exit'
                    LIMIT 1
                )"
            )
            .bind(product_code)
            .bind(item.quantity)
            .bind(&sale_reason)
            .execute(&mut *tx)
            .await?;
        }
        
        // Delete delivery reports
        sqlx::query::<sqlx::Sqlite>(
            "DELETE FROM delivery_reports WHERE purchase_id = ?"
        )
        .bind(invoice_id)
        .execute(&mut *tx)
        .await?;
        
        // Delete items
        sqlx::query("DELETE FROM invoice_items WHERE invoice_id = ?")
            .bind(invoice_id)
            .execute(&mut *tx)
            .await?;
        
        // Delete invoice
        let result = sqlx::query("DELETE FROM invoices WHERE id = ?")
            .bind(invoice_id)
            .execute(&mut *tx)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Factura no encontrada".to_string()));
        }

        tx.commit().await?;

        Ok(())
    }

    pub async fn update_invoice_status(db: &Database, company_id: i32, invoice_id: &str, status: String) -> Result<Invoice, AppError> {
        let current_invoice = Self::get_invoice_by_id(db, company_id, invoice_id).await?;
        
        // If cancelling the invoice, revert inventory
        if status == "cancelled" && current_invoice.status != "cancelled" {
            // Get all items for this invoice
            let items = sqlx::query_as::<_, InvoiceItem>(
                "SELECT * FROM invoice_items WHERE invoice_id = ?"
            )
            .bind(invoice_id)
            .fetch_all(db.pool())
            .await?;
            
            // Start transaction for atomic operations
            let mut tx = db.pool().begin().await?;
            
            let sale_reason = format!("Venta-PV: {}", current_invoice.customer_name);
            
            for item in &items {
                // Skip items without product_code (can't revert inventory)
                let product_code = match &item.product_code {
                    Some(code) if !code.is_empty() => code,
                    _ => continue,
                };
                
                // Revert inventory: undo the original exit (decrease exits, increase stock)
                sqlx::query::<sqlx::Sqlite>(
                    "UPDATE inventory SET 
                     exits = exits - ?, 
                     stock = stock + ?,
                     updated_at = CURRENT_TIMESTAMP
                     WHERE product_code = ?"
                )
                .bind(item.quantity)
                .bind(item.quantity)
                .bind(product_code)
                .execute(&mut *tx)
                .await?;
                
                // Delete the specific exit movement for this product from this invoice
                sqlx::query::<sqlx::Sqlite>(
                    "DELETE FROM movements WHERE id IN (
                        SELECT id FROM movements 
                        WHERE product_code = ? AND quantity = ? AND reason = ? AND movement_type = 'exit'
                        LIMIT 1
                    )"
                )
                .bind(product_code)
                .bind(item.quantity)
                .bind(&sale_reason)
                .execute(&mut *tx)
                .await?;
            }
            
            // Delete delivery reports associated with this invoice
            sqlx::query::<sqlx::Sqlite>(
                "DELETE FROM delivery_reports WHERE purchase_id = ?"
            )
            .bind(invoice_id)
            .execute(&mut *tx)
            .await?;
            
            // Commit transaction
            tx.commit().await?;
        }
        
        // Update invoice status
        let result = sqlx::query(
            "UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(&status)
        .bind(invoice_id)
        .execute(db.pool())
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Factura no encontrada".to_string()));
        }

        Self::get_invoice_by_id(db, company_id, invoice_id).await
    }

    pub async fn get_statistics(db: &Database) -> Result<InvoiceStatistics, AppError> {
        let stats = sqlx::query_as::<_, (i64, f64, f64, f64, f64)>(
            "SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(total), 0) as total_amount,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as paid_amount,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END), 0) as pending_amount,
                COALESCE(SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END), 0) as overdue_amount
             FROM invoices
             WHERE status != 'cancelled'"
        )
        .fetch_one(db.pool())
        .await?;

        let average = if stats.0 > 0 { stats.1 / stats.0 as f64 } else { 0.0 };

        Ok(InvoiceStatistics {
            total_invoices: stats.0,
            total_amount: stats.1,
            paid_amount: stats.2,
            pending_amount: stats.3,
            overdue_amount: stats.4,
            average_invoice_amount: average,
        })
    }

    pub async fn get_invoice_items(db: &Database, invoice_id: &str) -> Result<Vec<InvoiceItem>, AppError> {
        let items = sqlx::query_as::<_, InvoiceItem>(
            "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id"
        )
        .bind(invoice_id)
        .fetch_all(db.pool())
        .await?;

        Ok(items)
    }

    async fn generate_invoice_number(db: &Database) -> Result<String, AppError> {
        let year = Utc::now().year();
        let prefix = format!("INV-{}-", year);
        
        // Get the highest existing sequence number for this year
        let result = sqlx::query_as::<_, (Option<String>,)>(
            "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1"
        )
        .bind(format!("{}%", prefix))
        .fetch_optional(db.pool())
        .await?;
        
        let sequence = match result {
            Some((Some(last_number),)) => {
                // Extract the numeric part after the prefix (e.g., "INV-2026-0005" -> 5)
                last_number.strip_prefix(&prefix)
                    .and_then(|s| s.parse::<i64>().ok())
                    .unwrap_or(0) + 1
            }
            _ => 1,
        };
        
        Ok(format!("INV-{}-{:04}", year, sequence))
    }

    async fn recalculate_invoice_totals(db: &Database, invoice_id: &str) -> Result<(), AppError> {
        let invoice = sqlx::query_as::<_, Invoice>("SELECT * FROM invoices WHERE id = ?")
            .bind(invoice_id)
            .fetch_one(db.pool())
            .await?;
        
        // Calculate new subtotal from items
        let result = sqlx::query_as::<_, (f64,)>(
            "SELECT COALESCE(SUM(amount), 0) FROM invoice_items WHERE invoice_id = ?"
        )
        .bind(invoice_id)
        .fetch_one(db.pool())
        .await?;
        
        let subtotal = result.0;
        let tax_amount = subtotal * (invoice.tax_rate / 100.0);
        let total = subtotal + tax_amount - invoice.discount;
        
        // Update invoice totals
        sqlx::query(
            "UPDATE invoices SET subtotal = ?, tax_amount = ?, total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(subtotal)
        .bind(tax_amount)
        .bind(total)
        .bind(invoice_id)
        .execute(db.pool())
        .await?;
        
        Ok(())
    }
}
