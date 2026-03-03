use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ReceptionReport {
    pub id: String,
    pub purchase_id: String,
    pub details: String,
    pub created_by_name: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct DeliveryReport {
    pub id: String,
    pub purchase_id: Option<String>,
    pub code: String,
    pub entity: Option<String>,
    pub warehouse: Option<String>,
    pub document: Option<String>,
    pub products: Option<String>,
    pub date: Option<DateTime<Utc>>,
    pub report_type: String,
    pub reason: Option<String>,
    pub created_by_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub total_products: i64,
    pub total_purchases: i64,
    pub total_movements: i64,
    pub low_stock_products: i64,
    pub recent_purchases: i64,
    pub recent_movements: i64,
    // Datos para gráficos
    pub product_names: Vec<String>,
    pub stock_levels: Vec<f64>,
    pub stock_limits: Vec<f64>,
    pub entries_data: Vec<f64>,
    pub exits_data: Vec<f64>,
}
