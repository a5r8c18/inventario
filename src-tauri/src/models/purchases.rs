use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use sqlx::FromRow;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Purchase {
    pub id: String,
    pub entity: String,
    pub warehouse: String,
    pub supplier: String,
    pub document: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseProduct {
    pub id: String,
    pub purchase_id: String,
    pub product_code: String,
    pub product_name: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price: f64,
    pub product_unit: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct CreatePurchaseDto {
    #[validate(length(min = 1))]
    pub entity: String,
    #[validate(length(min = 1))]
    pub warehouse: String,
    #[validate(length(min = 1))]
    pub supplier: String,
    #[validate(length(min = 1))]
    pub document: String,
    #[validate(length(min = 1))]
    pub products: Vec<CreatePurchaseProductDto>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct CreatePurchaseProductDto {
    #[validate(length(min = 1))]
    pub product_code: String,
    #[validate(length(min = 1))]
    pub product_name: String,
    #[validate(range(min = 0.0))]
    pub quantity: f64,
    #[validate(range(min = 0.0))]
    pub unit_price: f64,
    pub unit: Option<String>,
    pub expiration_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseWithProducts {
    pub purchase: Purchase,
    pub products: Vec<PurchaseProduct>,
}
