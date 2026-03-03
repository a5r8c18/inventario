use uuid::Uuid;
use crate::error::AppError;
use crate::models::purchases::{Purchase, PurchaseProduct, CreatePurchaseDto, PurchaseWithProducts};
use crate::database::Database;
use serde_json::json;

pub struct PurchaseService;

impl PurchaseService {
    pub async fn create_purchase(db: &Database, company_id: i32, create_dto: CreatePurchaseDto, user_name: Option<String>) -> Result<PurchaseWithProducts, AppError> {
        if create_dto.products.is_empty() {
            return Err(AppError::Validation("La compra debe tener al menos un producto".to_string()));
        }

        let purchase_id = Uuid::new_v4().to_string();

        let purchase = sqlx::query_as::<_, Purchase>(
            "INSERT INTO purchases (id, entity, warehouse, supplier, document, company_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING *"
        )
        .bind(&purchase_id)
        .bind(&create_dto.entity)
        .bind(&create_dto.warehouse)
        .bind(&create_dto.supplier)
        .bind(&create_dto.document)
        .bind(company_id)
        .fetch_one(db.pool())
        .await?;

        let mut products = Vec::new();

        for product_dto in create_dto.products.iter() {
            let product_id = Uuid::new_v4().to_string();

            let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM inventory WHERE product_code = ? AND company_id = ?")
                .bind(&product_dto.product_code)
                .bind(company_id)
                .fetch_one(db.pool())
                .await?;

            if exists == 0 {
                sqlx::query(
                    "INSERT INTO inventory (product_code, product_name, stock, entries, exits, unit_price, created_at, updated_at, product_unit, company_id) VALUES (?, ?, 0, 0, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)"
                )
                .bind(&product_dto.product_code)
                .bind(&product_dto.product_name)
                .bind(product_dto.unit_price)
                .bind(&product_dto.unit)
                .bind(company_id)
                .execute(db.pool())
                .await?;
            }

            let purchase_product = sqlx::query_as::<_, PurchaseProduct>(
                "INSERT INTO purchase_products (id, purchase_id, product_code, product_name, quantity, unit_price, total_price, product_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *"
            )
            .bind(&product_id)
            .bind(&purchase_id)
            .bind(&product_dto.product_code)
            .bind(&product_dto.product_name)
            .bind(product_dto.quantity)
            .bind(product_dto.unit_price)
            .bind(product_dto.quantity * product_dto.unit_price)
            .bind(&product_dto.unit)
            .fetch_one(db.pool())
            .await?;

            products.push(purchase_product);

            sqlx::query(
                "UPDATE inventory SET entries = entries + ?, stock = stock + ?, unit_price = ?, updated_at = CURRENT_TIMESTAMP WHERE product_code = ? AND company_id = ?"
            )
            .bind(product_dto.quantity)
            .bind(product_dto.quantity)
            .bind(product_dto.unit_price)
            .bind(&product_dto.product_code)
            .bind(company_id)
            .execute(db.pool())
            .await?;

            let movement_id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO movements (id, movement_type, product_code, quantity, purchase_id, company_id) VALUES (?, 'entry', ?, ?, ?, ?)"
            )
            .bind(&movement_id)
            .bind(&product_dto.product_code)
            .bind(product_dto.quantity)
            .bind(&purchase_id)
            .bind(company_id)
            .execute(db.pool())
            .await?;
        }

        let products_json: Vec<serde_json::Value> = create_dto.products.iter().map(|p| json!({
            "code": p.product_code,
            "description": p.product_name,
            "quantity": p.quantity,
            "unitPrice": p.unit_price,
            "unit": p.unit,
            "amount": p.quantity * p.unit_price
        })).collect();

        let _ = crate::services::reports::ReportsService::create_reception_report(
            db, &purchase_id, &create_dto.entity, &create_dto.warehouse,
            &create_dto.supplier, &create_dto.document, products_json, user_name,
        ).await;

        Ok(PurchaseWithProducts { purchase, products })
    }

    pub async fn get_purchases(db: &Database, company_id: i32) -> Result<Vec<PurchaseWithProducts>, AppError> {
        let purchases = sqlx::query_as::<_, Purchase>(
            "SELECT * FROM purchases WHERE company_id = ? ORDER BY created_at DESC"
        )
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;

        let mut result = Vec::new();
        for purchase in purchases {
            let products = sqlx::query_as::<_, PurchaseProduct>(
                "SELECT * FROM purchase_products WHERE purchase_id = ?"
            )
            .bind(&purchase.id)
            .fetch_all(db.pool())
            .await?;
            result.push(PurchaseWithProducts { purchase, products });
        }
        Ok(result)
    }

    pub async fn get_purchase_by_id(db: &Database, company_id: i32, purchase_id: &str) -> Result<PurchaseWithProducts, AppError> {
        let purchase = sqlx::query_as::<_, Purchase>(
            "SELECT * FROM purchases WHERE id = ? AND company_id = ?"
        )
        .bind(purchase_id)
        .bind(company_id)
        .fetch_optional(db.pool())
        .await?
        .ok_or_else(|| AppError::NotFound("Compra no encontrada".to_string()))?;

        let products = sqlx::query_as::<_, PurchaseProduct>(
            "SELECT * FROM purchase_products WHERE purchase_id = ?"
        )
        .bind(purchase_id)
        .fetch_all(db.pool())
        .await?;

        Ok(PurchaseWithProducts { purchase, products })
    }

    pub async fn update_purchase(db: &Database, company_id: i32, purchase_id: &str, update_dto: CreatePurchaseDto) -> Result<PurchaseWithProducts, AppError> {
        let _existing = Self::get_purchase_by_id(db, company_id, purchase_id).await?;

        sqlx::query(
            "UPDATE purchases SET entity = ?, warehouse = ?, supplier = ?, document = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?"
        )
        .bind(&update_dto.entity)
        .bind(&update_dto.warehouse)
        .bind(&update_dto.supplier)
        .bind(&update_dto.document)
        .bind(purchase_id)
        .bind(company_id)
        .execute(db.pool())
        .await?;

        sqlx::query("DELETE FROM purchase_products WHERE purchase_id = ?")
            .bind(purchase_id)
            .execute(db.pool())
            .await?;

        for product_dto in update_dto.products {
            let product_id = Uuid::new_v4().to_string();
            let total_price = product_dto.quantity * product_dto.unit_price;
            sqlx::query(
                "INSERT INTO purchase_products (id, purchase_id, product_code, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&product_id)
            .bind(purchase_id)
            .bind(&product_dto.product_code)
            .bind(&product_dto.product_name)
            .bind(product_dto.quantity)
            .bind(product_dto.unit_price)
            .bind(total_price)
            .execute(db.pool())
            .await?;
        }

        Self::get_purchase_by_id(db, company_id, purchase_id).await
    }

    pub async fn delete_purchase(db: &Database, company_id: i32, purchase_id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM purchase_products WHERE purchase_id = ?")
            .bind(purchase_id)
            .execute(db.pool())
            .await?;

        let result = sqlx::query("DELETE FROM purchases WHERE id = ? AND company_id = ?")
            .bind(purchase_id)
            .bind(company_id)
            .execute(db.pool())
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Compra no encontrada".to_string()));
        }
        Ok(())
    }
}
