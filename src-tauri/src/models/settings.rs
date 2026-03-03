use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Serialize)]
pub struct StockLimit {
    pub product_code: String,
    pub product_name: String,
    pub current_stock: f64,
    pub stock_limit: f64,
    pub warehouse: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct CreateStockLimitDto {
    #[validate(length(min = 1))]
    pub product_code: String,
    #[validate(range(min = 0.0))]
    pub stock_limit: f64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SystemSettings {
    pub company_name: Option<String>,
    pub company_address: Option<String>,
    pub company_phone: Option<String>,
    pub company_email: Option<String>,
    pub default_warehouse: Option<String>,
    pub default_currency: Option<String>,
    pub tax_rate: Option<f64>,
    pub low_stock_alert_threshold: Option<f64>,
    pub backup_frequency_days: Option<i32>,
    pub auto_backup_enabled: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct UpdateSystemSettingsDto {
    pub company_name: Option<String>,
    pub company_address: Option<String>,
    pub company_phone: Option<String>,
    pub company_email: Option<String>,
    pub default_warehouse: Option<String>,
    pub default_currency: Option<String>,
    #[validate(range(min = 0.0, max = 100.0))]
    pub tax_rate: Option<f64>,
    #[validate(range(min = 0.0))]
    pub low_stock_alert_threshold: Option<f64>,
    #[validate(range(min = 1))]
    pub backup_frequency_days: Option<i32>,
    pub auto_backup_enabled: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WarehouseSettings {
    pub id: Option<String>,
    pub name: String,
    pub address: Option<String>,
    pub manager: Option<String>,
    pub phone: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct CreateWarehouseDto {
    #[validate(length(min = 1))]
    pub name: String,
    pub address: Option<String>,
    pub manager: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BackupInfo {
    pub id: String,
    pub filename: String,
    pub file_size: i64,
    pub backup_date: String,
    pub backup_type: String, // "manual" or "auto"
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RestoreRequest {
    pub backup_id: String,
    pub backup_filename: Option<String>,
    pub confirm_restore: bool,
}
