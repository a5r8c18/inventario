use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct License {
    pub id: i64,
    pub license_key: String,
    pub activated_at: String,
    pub expires_at: String,
    pub status: String,
    pub activated_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseStatus {
    pub is_valid: bool,
    pub days_remaining: i64,
    pub expires_at: String,
    pub license_key: String,
    pub status: String,
    pub warning: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ActivateLicenseDto {
    pub license_key: String,
}
