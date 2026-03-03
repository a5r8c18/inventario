use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use sqlx::FromRow;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Movement {
    pub id: String,
    pub movement_type: String, // "entry" or "exit"
    pub product_code: String,
    pub quantity: f64,
    pub reason: Option<String>,
    pub label: Option<String>,
    pub user_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub purchase_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct MovementWithDetails {
    pub id: String,
    pub movement_type: String,
    pub product_code: String,
    pub quantity: f64,
    pub reason: Option<String>,
    pub label: Option<String>,
    pub user_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub purchase_id: Option<String>,
    pub product_name: Option<String>,
    pub product_description: Option<String>,
    pub product_unit: Option<String>,
    pub unit_price: Option<f64>,
    pub entity: Option<String>,
    pub warehouse: Option<String>,
    pub stock: Option<f64>,
    pub entries: Option<f64>,
    pub exits: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
#[allow(dead_code)]
pub struct CreateMovementDto {
    #[validate(length(min = 1))]
    pub product_code: String,
    #[validate(length(min = 1))]
    pub movement_type: String,
    #[validate(range(min = 0.0))]
    pub quantity: f64,
    pub reason: Option<String>,
    pub label: Option<String>,
    pub user_name: Option<String>,
    pub purchase_id: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateExitMovementDto {
    #[validate(length(min = 1))]
    pub product_code: String,
    #[validate(range(min = 0.0))]
    pub quantity: f64,
    pub reason: Option<String>,
    // pub label: Option<String>,
    pub user_name: Option<String>,
    pub unit_price: Option<f64>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateReturnMovementDto {
    #[validate(length(min = 1))]
    pub purchase_id: String,
    #[validate(length(min = 1))]
    pub reason: String,
    pub user_name: Option<String>,
}
