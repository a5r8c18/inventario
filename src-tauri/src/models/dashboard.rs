use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use validator::Validate;

#[derive(Debug, Deserialize, Serialize, Validate, Clone)]
pub struct DashboardFilterDto {
    pub days: Option<i64>,
    pub warehouse: Option<String>,
    pub entity: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InventoryChartData {
    pub product_names: Vec<String>,
    pub stock_data: Vec<f64>,
    pub stock_limits: Vec<f64>,
    pub entries_data: Vec<f64>,
    pub exits_data: Vec<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MovementTrend {
    pub date: String,
    pub entries: f64,
    pub exits: f64,
    pub net: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TopProduct {
    pub product_name: String,
    pub product_code: String,
    pub total_movements: f64,
    pub total_quantity: f64,
    pub movement_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LowStockAlert {
    pub product_code: String,
    pub product_name: String,
    pub current_stock: f64,
    pub stock_limit: f64,
    pub deficit: f64,
    pub warehouse: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecentActivity {
    pub id: String,
    pub activity_type: String, // "purchase", "movement", "inventory_update"
    pub description: String,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub quantity: Option<f64>,
    pub user_name: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChartDataPoint {
    pub label: String,
    pub value: f64,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PieChartData {
    pub labels: Vec<String>,
    pub data: Vec<f64>,
    pub colors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LineChartData {
    pub labels: Vec<String>,
    pub datasets: Vec<ChartDataset>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChartDataset {
    pub label: String,
    pub data: Vec<f64>,
    pub border_color: String,
    pub background_color: String,
    pub fill: bool,
}
