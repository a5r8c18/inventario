use uuid::Uuid;
use serde_json::json;
use crate::error::AppError;
use crate::models::movements::{Movement, MovementWithDetails, CreateMovementDto, CreateExitMovementDto, CreateReturnMovementDto};
use crate::database::Database;

pub struct MovementService;

impl MovementService {
    pub async fn get_movements(db: &Database, company_id: i32) -> Result<Vec<MovementWithDetails>, AppError> {
        let movements = sqlx::query_as::<_, MovementWithDetails>(
            "SELECT 
                m.id,
                m.movement_type,
                m.product_code,
                m.quantity,
                m.reason,
                m.label,
                m.user_name,
                m.created_at,
                m.purchase_id,
                i.product_name,
                i.product_description,
                i.product_unit,
                i.unit_price,
                i.entity,
                i.warehouse,
                i.stock,
                i.entries,
                i.exits
             FROM movements m
             LEFT JOIN inventory i ON m.product_code = i.product_code AND i.company_id = m.company_id
             WHERE m.company_id = ?
             ORDER BY m.created_at DESC"
        )
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;

        Ok(movements)
    }

    pub async fn find_by_id(db: &Database, company_id: i32, movement_id: &str) -> Result<Movement, AppError> {
        let movement = sqlx::query_as::<_, Movement>(
            "SELECT * FROM movements WHERE id = ? AND company_id = ?"
        )
        .bind(movement_id)
        .bind(company_id)
        .fetch_optional(db.pool())
        .await?;

        match movement {
            Some(movement) => Ok(movement),
            None => Err(AppError::NotFound("Movimiento no encontrado".to_string())),
        }
    }

    pub async fn get_product_history(db: &Database, company_id: i32, product_code: &str) -> Result<Vec<MovementWithDetails>, AppError> {
        let movements = sqlx::query_as::<_, MovementWithDetails>(
            "SELECT 
                m.id, m.movement_type, m.product_code, m.quantity, m.reason, m.label,
                m.user_name, m.created_at, m.purchase_id,
                i.product_name, i.product_description, i.product_unit, i.unit_price,
                i.entity, i.warehouse, i.stock, i.entries, i.exits
             FROM movements m
             LEFT JOIN inventory i ON m.product_code = i.product_code AND i.company_id = ?
             WHERE m.product_code = ? AND m.company_id = ?
             ORDER BY m.created_at DESC"
        )
        .bind(company_id)
        .bind(product_code)
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;

        Ok(movements)
    }

    pub async fn create_direct_entry(db: &Database, company_id: i32, create_dto: CreateMovementDto) -> Result<Movement, AppError> {
        let movement_id = Uuid::new_v4().to_string();
        let mut tx = db.pool().begin().await?;
        
        let movement = sqlx::query_as::<_, Movement>(
            "INSERT INTO movements (id, movement_type, product_code, quantity, reason, user_name, company_id) 
             VALUES (?, 'entry', ?, ?, ?, ?, ?) 
             RETURNING *"
        )
        .bind(&movement_id)
        .bind(&create_dto.product_code)
        .bind(create_dto.quantity)
        .bind(&create_dto.reason)
        .bind(&create_dto.user_name)
        .bind(company_id)
        .fetch_one(&mut *tx)
        .await?;
        
        sqlx::query::<sqlx::Sqlite>(
            "UPDATE inventory SET entries = entries + ?, stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE product_code = ? AND company_id = ?"
        )
        .bind(create_dto.quantity)
        .bind(create_dto.quantity)
        .bind(&create_dto.product_code)
        .bind(company_id)
        .execute(&mut *tx)
        .await?;
        
        tx.commit().await?;
        Ok(movement)
    }

    pub async fn delete_movement(db: &Database, company_id: i32, movement_id: &str) -> Result<(), AppError> {
        let movement = Self::find_by_id(db, company_id, movement_id).await?;
        
        // If it's an entry, verify there's enough stock to reverse it
        if movement.movement_type == "entry" {
            let current_stock = sqlx::query_as::<_, (f64,)>(
                "SELECT stock FROM inventory WHERE product_code = ?"
            )
            .bind(&movement.product_code)
            .fetch_optional(db.pool())
            .await?;
            
            let stock = current_stock.map(|(s,)| s).unwrap_or(0.0);
            if stock < movement.quantity {
                return Err(AppError::Validation(format!(
                    "No se puede eliminar: stock insuficiente. Disponible: {}, Requerido: {}",
                    stock, movement.quantity
                )));
            }
        }
        
        let mut tx = db.pool().begin().await?;
        
        // Reverse inventory stock change
        if movement.movement_type == "entry" {
            sqlx::query::<sqlx::Sqlite>(
                "UPDATE inventory SET 
                 entries = entries - ?, 
                 stock = stock - ?,
                 updated_at = CURRENT_TIMESTAMP
                 WHERE product_code = ?"
            )
            .bind(movement.quantity)
            .bind(movement.quantity)
            .bind(&movement.product_code)
            .execute(&mut *tx)
            .await?;
        } else if movement.movement_type == "exit" {
            sqlx::query::<sqlx::Sqlite>(
                "UPDATE inventory SET 
                 exits = exits - ?, 
                 stock = stock + ?,
                 updated_at = CURRENT_TIMESTAMP
                 WHERE product_code = ?"
            )
            .bind(movement.quantity)
            .bind(movement.quantity)
            .bind(&movement.product_code)
            .execute(&mut *tx)
            .await?;
        } else if movement.movement_type == "return" {
            sqlx::query::<sqlx::Sqlite>(
                "UPDATE inventory SET 
                 entries = entries + ?, 
                 stock = stock + ?,
                 updated_at = CURRENT_TIMESTAMP
                 WHERE product_code = ?"
            )
            .bind(movement.quantity)
            .bind(movement.quantity)
            .bind(&movement.product_code)
            .execute(&mut *tx)
            .await?;
        }
        
        // Delete movement
        let result = sqlx::query("DELETE FROM movements WHERE id = ?")
            .bind(movement_id)
            .execute(&mut *tx)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Movimiento no encontrado".to_string()));
        }

        tx.commit().await?;

        Ok(())
    }

    pub async fn get_movement_statistics(db: &Database, company_id: i32, days: i64) -> Result<serde_json::Value, AppError> {
        let start_date = chrono::Utc::now() - chrono::Duration::days(days);
        
        let movements_by_type = sqlx::query_as::<_, (String, i64)>(
            "SELECT movement_type, COUNT(*) as count 
             FROM movements 
             WHERE created_at >= ? AND company_id = ?
             GROUP BY movement_type"
        )
        .bind(start_date)
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;
        
        let top_products = sqlx::query_as::<_, (String, i64)>(
            "SELECT product_code, COUNT(*) as count 
             FROM movements 
             WHERE created_at >= ? AND company_id = ?
             GROUP BY product_code 
             ORDER BY count DESC 
             LIMIT 10"
        )
        .bind(start_date)
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;
        
        let stats = serde_json::json!({
            "period_days": days,
            "movements_by_type": movements_by_type,
            "top_products": top_products
        });
        
        Ok(stats)
    }

    /*
    pub async fn find_by_type(db: &Database, movement_type: &str) -> Result<Vec<Movement>, AppError> {
        let movements = sqlx::query_as::<_, Movement>(
            "SELECT * FROM movements WHERE movement_type = ? ORDER BY created_at DESC"
        )
        .bind(movement_type)
        .fetch_all(db.pool())
        .await?;

        Ok(movements)
    }
    */

    pub async fn create_exit_movement(db: &Database, company_id: i32, create_dto: CreateExitMovementDto) -> Result<Movement, AppError> {
        let movement_id = Uuid::new_v4().to_string();
        
        let current_stock = sqlx::query_as::<_, (f64,)>(
            "SELECT stock FROM inventory WHERE product_code = ? AND company_id = ?"
        )
        .bind(&create_dto.product_code)
        .bind(company_id)
        .fetch_optional(db.pool())
        .await?;
        
        let current_stock = current_stock.map(|(s,)| s).unwrap_or(0.0);
        if current_stock < create_dto.quantity {
            return Err(AppError::Validation("Stock insuficiente".to_string()));
        }

        let mut tx = db.pool().begin().await?;

        sqlx::query::<sqlx::Sqlite>(
            "UPDATE inventory SET exits = exits + ?, stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE product_code = ? AND company_id = ?"
        )
        .bind(create_dto.quantity)
        .bind(create_dto.quantity)
        .bind(&create_dto.product_code)
        .bind(company_id)
        .execute(&mut *tx)
        .await?;

        let movement = sqlx::query_as::<_, Movement>(
            "INSERT INTO movements (id, movement_type, product_code, quantity, reason, user_name, company_id) 
             VALUES (?, 'exit', ?, ?, ?, ?, ?) 
             RETURNING *"
        )
        .bind(&movement_id)
        .bind(&create_dto.product_code)
        .bind(create_dto.quantity)
        .bind(&create_dto.reason)
        .bind(&create_dto.user_name)
        .bind(company_id)
        .fetch_one(&mut *tx)
        .await?;

        // Create delivery voucher (vale de entrega) for exit movements
        let delivery_id = Uuid::new_v4().to_string();
        
        // Get product details for the delivery voucher
        let product_details = sqlx::query_as::<_, (String, Option<String>, Option<f64>, Option<String>)>(
            "SELECT product_name, product_description, unit_price, product_unit FROM inventory WHERE product_code = ? AND company_id = ?"
        )
        .bind(&create_dto.product_code)
        .bind(company_id)
        .fetch_one(&mut *tx)
        .await?;
        
        // Siempre usar el precio de costo del inventario (precio de entrada) para salidas directas
        let unit_price = product_details.2.unwrap_or(0.0);
        
        let _product_description = product_details.1.unwrap_or_default();
        let product_unit = product_details.3.unwrap_or_default();
        
        // Create product JSON for delivery voucher
        let product_json = json!([{
            "code": create_dto.product_code,
            "description": product_details.0,
            "quantity": create_dto.quantity,
            "unit": product_unit,
            "unitPrice": unit_price,
            "amount": create_dto.quantity * unit_price
        }]);
        
        // Insert delivery voucher
        sqlx::query::<sqlx::Sqlite>(
            "INSERT INTO delivery_reports (id, purchase_id, code, entity, warehouse, document, products, date, report_type, created_by_name) 
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'Vale de Entrega', ?)"
        )
        .bind(&delivery_id)
        .bind(&movement_id)
        .bind(&format!("VE-{}", create_dto.product_code))
        .bind("Entrega Directa")
        .bind("Almacén Principal")
        .bind(&format!("SALIDA-{}", movement_id[..8].to_uppercase()))
        .bind(serde_json::to_string(&product_json).unwrap_or_default())
        .bind(create_dto.user_name.as_deref().unwrap_or("System"))
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(movement)
    }

    pub async fn create_return_movement(db: &Database, company_id: i32, create_dto: CreateReturnMovementDto) -> Result<Vec<Movement>, AppError> {
        let user_name = create_dto.user_name.as_deref().unwrap_or("System");
        
        // Get all products from the purchase with complete data including description and unit
        let products = sqlx::query_as::<_, (String, f64, String, f64, f64, String)>(
            "SELECT pp.product_code, pp.quantity, pp.product_unit, pp.unit_price, pp.total_price, i.product_name 
             FROM purchase_products pp 
             LEFT JOIN inventory i ON pp.product_code = i.product_code AND i.company_id = ? 
             WHERE pp.purchase_id = ?"
        )
        .bind(company_id)
        .bind(&create_dto.purchase_id)
        .fetch_all(db.pool())
        .await?;

        if products.is_empty() {
            return Err(AppError::NotFound("No se encontraron productos para esta compra".to_string()));
        }

        // Verify stock is sufficient for all products before proceeding
        for (product_code, quantity, _, _, _, product_name) in &products {
            let current_stock = sqlx::query_as::<_, (f64,)>(
                "SELECT stock FROM inventory WHERE product_code = ?"
            )
            .bind(product_code)
            .fetch_optional(db.pool())
            .await?;
            
            let stock = current_stock.map(|(s,)| s).unwrap_or(0.0);
            if stock < *quantity {
                return Err(AppError::Validation(format!(
                    "Stock insuficiente para devolver '{}' ({}). Disponible: {}, Requerido: {}",
                    product_name, product_code, stock, quantity
                )));
            }
        }

        // Clone products for later use in delivery voucher
        let products_clone = products.clone();

        // Start transaction for atomic operations
        let mut tx = db.pool().begin().await?;

        let mut movements = Vec::new();

        for (product_code, quantity, _product_unit, _unit_price, _total_price, _product_name) in &products {
            let movement_id = Uuid::new_v4().to_string();

            // Revert inventory: undo the original entry (decrease entries and stock)
            sqlx::query::<sqlx::Sqlite>(
                "UPDATE inventory SET entries = entries - ?, stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE product_code = ? AND company_id = ?"
            )
            .bind(quantity)
            .bind(quantity)
            .bind(product_code)
            .bind(company_id)
            .execute(&mut *tx)
            .await?;

            let movement = sqlx::query_as::<_, Movement>(
                "INSERT INTO movements (id, movement_type, product_code, quantity, reason, user_name, purchase_id, company_id) 
                 VALUES (?, 'return', ?, ?, ?, ?, ?, ?) 
                 RETURNING *"
            )
            .bind(&movement_id)
            .bind(product_code)
            .bind(quantity)
            .bind(&create_dto.reason)
            .bind(user_name)
            .bind(&create_dto.purchase_id)
            .bind(company_id)
            .fetch_one(&mut *tx)
            .await?;

            movements.push(movement);
        }

        // Delete the corresponding reception report
        sqlx::query::<sqlx::Sqlite>(
            "DELETE FROM reception_reports WHERE purchase_id = ?"
        )
        .bind(&create_dto.purchase_id)
        .execute(&mut *tx)
        .await?;

        // Update purchase status to 'returned'
        sqlx::query::<sqlx::Sqlite>(
            "UPDATE purchases SET status = 'returned' WHERE id = ?"
        )
        .bind(&create_dto.purchase_id)
        .execute(&mut *tx)
        .await?;

        // Get purchase details for the delivery voucher
        let purchase_details = sqlx::query_as::<_, (String, String, String, String)>(
            "SELECT entity, warehouse, supplier, document FROM purchases WHERE id = ?"
        )
        .bind(&create_dto.purchase_id)
        .fetch_one(&mut *tx)
        .await?;

        // Create products JSON for delivery voucher
        let products_json: Vec<serde_json::Value> = products_clone.iter().map(|(code, qty, unit, price, total, description)| {
            json!({
                "code": code,
                "description": description,
                "quantity": qty,
                "unit": unit,
                "unitPrice": price,
                "amount": total
            })
        }).collect();

        // Create delivery voucher (vale de devolución)
        let delivery_id = Uuid::new_v4().to_string();

        // Insert delivery voucher
        sqlx::query::<sqlx::Sqlite>(
            "INSERT INTO delivery_reports (id, purchase_id, code, entity, warehouse, document, products, date, report_type, created_by_name) 
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'Vale de Devolución', ?)"
        )
        .bind(&delivery_id)
        .bind(&create_dto.purchase_id)
        .bind(&format!("VD-{}", purchase_details.3))
        .bind(&purchase_details.0)
        .bind(&purchase_details.1)
        .bind(&purchase_details.3)
        .bind(serde_json::to_string(&products_json).unwrap_or_default())
        .bind(user_name)
        .execute(&mut *tx)
        .await?;

        // Commit transaction
        tx.commit().await?;

        Ok(movements)
    }
}
