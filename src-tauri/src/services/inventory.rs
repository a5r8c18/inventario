use crate::error::AppError;
use crate::models::inventory::{Inventory, FilterInventoryDto, CreateInventoryDto, UpdateInventoryDto};
use crate::database::Database;

pub struct InventoryService;

impl InventoryService {
    pub async fn get_inventory(db: &Database, company_id: i32, filters: FilterInventoryDto) -> Result<Vec<Inventory>, AppError> {
        let mut query = "SELECT * FROM inventory WHERE company_id = ?".to_string();

        if let Some(_) = &filters.product_name {
            query.push_str(" AND (product_name LIKE ? OR product_description LIKE ?)");
        }
        if let Some(_) = &filters.warehouse {
            query.push_str(" AND warehouse = ?");
        }
        if let Some(_) = &filters.entity {
            query.push_str(" AND entity = ?");
        }
        if let Some(_) = filters.min_stock {
            query.push_str(" AND stock >= ?");
        }
        if let Some(_) = filters.max_stock {
            query.push_str(" AND stock <= ?");
        }

        query.push_str(" ORDER BY product_name");

        if let Some(_) = filters.limit {
            query.push_str(" LIMIT ?");
        }
        if let Some(_) = filters.page {
            query.push_str(" OFFSET ?");
        }

        let mut builder = sqlx::query_as::<_, Inventory>(&query).bind(company_id);

        if let Some(product_name) = &filters.product_name {
            builder = builder.bind(format!("%{}%", product_name));
            builder = builder.bind(format!("%{}%", product_name));
        }
        if let Some(warehouse) = &filters.warehouse {
            builder = builder.bind(warehouse);
        }
        if let Some(entity) = &filters.entity {
            builder = builder.bind(entity);
        }
        if let Some(min_stock) = filters.min_stock {
            builder = builder.bind(min_stock);
        }
        if let Some(max_stock) = filters.max_stock {
            builder = builder.bind(max_stock);
        }
        if let Some(limit) = filters.limit {
            builder = builder.bind(limit);
        }
        if let Some(page) = filters.page {
            let offset = (page - 1) * filters.limit.unwrap_or(10);
            builder = builder.bind(offset);
        }

        let inventory = builder.fetch_all(db.pool()).await?;
        Ok(inventory)
    }

    pub async fn create_inventory(db: &Database, company_id: i32, create_dto: CreateInventoryDto) -> Result<Inventory, AppError> {
        let inventory = sqlx::query_as::<_, Inventory>(
            "INSERT INTO inventory (company_id, product_code, product_name, product_unit, warehouse, entity,
             product_description, unit_price, stock_limit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING *"
        )
        .bind(company_id)
        .bind(&create_dto.product_code)
        .bind(&create_dto.product_name)
        .bind(&create_dto.product_unit)
        .bind(&create_dto.warehouse)
        .bind(&create_dto.entity)
        .bind(&create_dto.product_description)
        .bind(&create_dto.unit_price)
        .bind(&create_dto.stock_limit)
        .fetch_one(db.pool())
        .await?;
        Ok(inventory)
    }

    pub async fn update_inventory(db: &Database, company_id: i32, product_code: &str, update_dto: UpdateInventoryDto) -> Result<Inventory, AppError> {
        let current = sqlx::query_as::<_, Inventory>(
            "SELECT * FROM inventory WHERE product_code = ? AND company_id = ?"
        )
        .bind(product_code)
        .bind(company_id)
        .fetch_optional(db.pool())
        .await?;

        if current.is_none() {
            return Err(AppError::NotFound("Producto no encontrado".to_string()));
        }

        let inventory = sqlx::query_as::<_, Inventory>(
            "UPDATE inventory SET
             product_name = COALESCE(?, product_name),
             product_unit = COALESCE(?, product_unit),
             warehouse = COALESCE(?, warehouse),
             entity = COALESCE(?, entity),
             product_description = COALESCE(?, product_description),
             unit_price = COALESCE(?, unit_price),
             stock_limit = COALESCE(?, stock_limit),
             updated_at = CURRENT_TIMESTAMP
             WHERE product_code = ? AND company_id = ?
             RETURNING *"
        )
        .bind(update_dto.product_name)
        .bind(update_dto.product_unit)
        .bind(update_dto.warehouse)
        .bind(update_dto.entity)
        .bind(update_dto.product_description)
        .bind(update_dto.unit_price)
        .bind(update_dto.stock_limit)
        .bind(product_code)
        .bind(company_id)
        .fetch_one(db.pool())
        .await?;
        Ok(inventory)
    }

    pub async fn delete_inventory(db: &Database, company_id: i32, product_code: &str) -> Result<(), AppError> {
        let result = sqlx::query("DELETE FROM inventory WHERE product_code = ? AND company_id = ?")
            .bind(product_code)
            .bind(company_id)
            .execute(db.pool())
            .await?;
        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Producto no encontrado".to_string()));
        }
        Ok(())
    }

    /// Get movement history for a specific product within a company
    pub async fn get_product_movement_history(
        db: &Database,
        company_id: i32,
        product_code: &str,
    ) -> Result<serde_json::Value, AppError> {
        let product = sqlx::query_as::<_, Inventory>(
            "SELECT * FROM inventory WHERE product_code = ? AND company_id = ?"
        )
        .bind(product_code)
        .bind(company_id)
        .fetch_optional(db.pool())
        .await?
        .ok_or_else(|| AppError::NotFound("Producto no encontrado".to_string()))?;

        let movements = sqlx::query(
            "SELECT m.id, m.movement_type, m.quantity, m.reason, m.label,
                    m.user_name, m.created_at, m.purchase_id
             FROM movements m
             WHERE m.product_code = ? AND m.company_id = ?
             ORDER BY m.created_at DESC"
        )
        .bind(product_code)
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;

        let movements_json: Vec<serde_json::Value> = movements.iter().map(|row| {
            use sqlx::Row;
            serde_json::json!({
                "id": row.try_get::<String, _>("id").unwrap_or_default(),
                "movement_type": row.try_get::<String, _>("movement_type").unwrap_or_default(),
                "quantity": row.try_get::<f64, _>("quantity").unwrap_or_default(),
                "reason": row.try_get::<Option<String>, _>("reason").unwrap_or(None),
                "label": row.try_get::<Option<String>, _>("label").unwrap_or(None),
                "user_name": row.try_get::<Option<String>, _>("user_name").unwrap_or(None),
                "created_at": row.try_get::<String, _>("created_at").unwrap_or_default(),
                "purchase_id": row.try_get::<Option<String>, _>("purchase_id").unwrap_or(None),
            })
        }).collect();

        Ok(serde_json::json!({
            "product_code": product.product_code,
            "product_name": product.product_name,
            "current_stock": product.stock,
            "entries": product.entries,
            "exits": product.exits,
            "movements": movements_json
        }))
    }

    #[allow(dead_code)]
    pub async fn get_low_stock_items(db: &Database, company_id: i32) -> Result<Vec<Inventory>, AppError> {
        let items = sqlx::query_as::<_, Inventory>(
            "SELECT * FROM inventory WHERE company_id = ? AND stock_limit IS NOT NULL AND stock <= stock_limit"
        )
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;
        Ok(items)
    }
}
