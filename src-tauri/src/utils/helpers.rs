use chrono::{DateTime, Utc};

#[allow(dead_code)]
pub fn format_datetime(dt: &DateTime<Utc>) -> String {
    dt.format("%Y-%m-%d %H:%M:%S").to_string()
}

#[allow(dead_code)]
pub fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}
