use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use sqlx::FromRow;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Inventory {
    pub product_code: String,
    pub product_name: String,
    pub entries: f64,
    pub exits: f64,
    pub stock: f64,
    pub stock_limit: Option<f64>,
    pub product_unit: Option<String>,
    pub warehouse: Option<String>,
    pub entity: Option<String>,
    pub product_description: Option<String>,
    pub unit_price: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct FilterInventoryDto {
    pub product_name: Option<String>,
    pub warehouse: Option<String>,
    pub entity: Option<String>,
    pub min_stock: Option<f64>,
    pub max_stock: Option<f64>,
    pub page: Option<i32>,
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateInventoryDto {
    #[validate(length(min = 1, max = 50))]
    pub product_code: String,
    #[validate(length(min = 1, max = 200))]
    pub product_name: String,
    #[validate(length(min = 0, max = 50))]
    pub product_unit: Option<String>,
    #[validate(length(min = 0, max = 100))]
    pub warehouse: Option<String>,
    #[validate(length(min = 0, max = 100))]
    pub entity: Option<String>,
    #[validate(length(min = 0, max = 500))]
    pub product_description: Option<String>,
    #[validate(range(min = 0.0))]
    pub unit_price: Option<f64>,
    #[validate(range(min = 0.0))]
    pub stock_limit: Option<f64>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateInventoryDto {
    #[validate(length(min = 1, max = 200))]
    pub product_name: Option<String>,
    #[validate(length(min = 0, max = 50))]
    pub product_unit: Option<String>,
    #[validate(length(min = 0, max = 100))]
    pub warehouse: Option<String>,
    #[validate(length(min = 0, max = 100))]
    pub entity: Option<String>,
    #[validate(length(min = 0, max = 500))]
    pub product_description: Option<String>,
    #[validate(range(min = 0.0))]
    pub unit_price: Option<f64>,
    #[validate(range(min = 0.0))]
    pub stock_limit: Option<f64>,
}
