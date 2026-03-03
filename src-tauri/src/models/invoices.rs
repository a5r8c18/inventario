use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Invoice {
    pub id: String,
    pub invoice_number: String,
    pub customer_name: String,
    pub customer_id: Option<String>,
    pub customer_address: Option<String>,
    pub customer_phone: Option<String>,
    pub date: DateTime<Utc>,
    pub subtotal: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub discount: f64,
    pub total: f64,
    pub status: String,
    pub notes: Option<String>,
    pub created_by_name: Option<String>,
    pub company_id: Option<i32>,
    pub company_logo: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct InvoiceItem {
    pub id: String,
    pub invoice_id: String,
    pub product_code: Option<String>,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub amount: f64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InvoiceWithItems {
    pub invoice: Invoice,
    pub items: Vec<InvoiceItem>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct CreateInvoiceDto {
    #[validate(length(min = 1))]
    pub customer_name: String,
    pub customer_id: Option<String>,
    pub customer_address: Option<String>,
    pub customer_phone: Option<String>,
    #[validate(range(min = 0.0))]
    pub tax_rate: f64,
    #[validate(range(min = 0.0))]
    pub discount: f64,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub created_by_name: Option<String>,
    #[validate(length(min = 1))]
    pub items: Vec<CreateInvoiceItemDto>,
}

#[derive(Debug, Deserialize, Serialize, Validate, Clone)]
pub struct CreateInvoiceItemDto {
    pub product_code: Option<String>,
    #[validate(length(min = 1))]
    pub description: String,
    #[validate(range(min = 0.0))]
    pub quantity: f64,
    #[validate(range(min = 0.0))]
    pub unit_price: f64,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct UpdateInvoiceDto {
    pub customer_name: Option<String>,
    pub customer_id: Option<String>,
    pub customer_address: Option<String>,
    pub customer_phone: Option<String>,
    pub tax_rate: Option<f64>,
    pub discount: Option<f64>,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub items: Option<Vec<CreateInvoiceItemDto>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InvoiceStatistics {
    pub total_invoices: i64,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub pending_amount: f64,
    pub overdue_amount: f64,
    pub average_invoice_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FilterInvoicesDto {
    pub customer_name: Option<String>,
    pub status: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub min_amount: Option<f64>,
    pub max_amount: Option<f64>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}
