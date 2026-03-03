use uuid::Uuid;
use crate::error::AppError;
use crate::models::settings::{
    StockLimit, CreateStockLimitDto, SystemSettings, UpdateSystemSettingsDto,
    WarehouseSettings, CreateWarehouseDto, BackupInfo, RestoreRequest
};
use crate::models::inventory::Inventory;
use crate::database::Database;

pub struct SettingsService;

impl SettingsService {
    // Stock Limits Management
    pub async fn set_stock_limit(db: &Database, create_dto: CreateStockLimitDto) -> Result<StockLimit, AppError> {
        // Check if product exists
        let product = sqlx::query_as::<_, Inventory>(
            "SELECT product_code, product_name, entries, exits, stock, stock_limit, product_unit, warehouse, entity, product_description, unit_price, created_at, updated_at FROM inventory WHERE product_code = ?"
        )
        .bind(&create_dto.product_code)
        .fetch_optional(db.pool())
        .await?;

        if product.is_none() {
            return Err(AppError::NotFound("Producto no encontrado".to_string()));
        }

        let product = product.unwrap();
        
        // Update or insert stock limit
        sqlx::query(
            "UPDATE inventory SET stock_limit = ? WHERE product_code = ?"
        )
        .bind(create_dto.stock_limit)
        .bind(&create_dto.product_code)
        .execute(db.pool())
        .await?;

        Ok(StockLimit {
            product_code: product.product_code,
            product_name: product.product_name,
            current_stock: product.stock,
            stock_limit: create_dto.stock_limit,
            warehouse: product.warehouse,
        })
    }

    pub async fn remove_stock_limit(db: &Database, product_code: &str) -> Result<(), AppError> {
        let result = sqlx::query(
            "UPDATE inventory SET stock_limit = NULL WHERE product_code = ?"
        )
        .bind(product_code)
        .execute(db.pool())
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Producto no encontrado".to_string()));
        }

        Ok(())
    }

    pub async fn get_stock_limits(db: &Database) -> Result<Vec<StockLimit>, AppError> {
        let limits = sqlx::query_as::<_, (String, String, f64, Option<f64>, Option<String>)>(
            "SELECT product_code, product_name, stock, stock_limit, warehouse 
             FROM inventory WHERE stock_limit IS NOT NULL ORDER BY product_name"
        )
        .fetch_all(db.pool())
        .await?;

        let stock_limits = limits.into_iter().map(|(code, name, stock, limit, warehouse)| {
            StockLimit {
                product_code: code,
                product_name: name,
                current_stock: stock,
                stock_limit: limit.unwrap_or(0.0),
                warehouse,
            }
        }).collect();

        Ok(stock_limits)
    }

    // System Settings Management
    async fn get_setting(db: &Database, key: &str) -> Option<String> {
        sqlx::query_as::<_, (String,)>(
            "SELECT value FROM system_settings WHERE key = ?"
        )
        .bind(key)
        .fetch_optional(db.pool())
        .await
        .ok()
        .flatten()
        .map(|(v,)| v)
    }

    async fn set_setting(db: &Database, key: &str, value: &str) -> Result<(), AppError> {
        sqlx::query::<sqlx::Sqlite>(
            "INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?"
        )
        .bind(key)
        .bind(value)
        .bind(value)
        .execute(db.pool())
        .await?;
        Ok(())
    }

    pub async fn get_system_settings(db: &Database) -> Result<SystemSettings, AppError> {
        Ok(SystemSettings {
            company_name: Self::get_setting(db, "company_name").await,
            company_address: Self::get_setting(db, "company_address").await,
            company_phone: Self::get_setting(db, "company_phone").await,
            company_email: Self::get_setting(db, "company_email").await,
            default_warehouse: Self::get_setting(db, "default_warehouse").await,
            default_currency: Self::get_setting(db, "default_currency").await,
            tax_rate: Self::get_setting(db, "tax_rate").await.and_then(|v| v.parse().ok()),
            low_stock_alert_threshold: Self::get_setting(db, "low_stock_alert_threshold").await.and_then(|v| v.parse().ok()),
            backup_frequency_days: Self::get_setting(db, "backup_frequency_days").await.and_then(|v| v.parse().ok()),
            auto_backup_enabled: Self::get_setting(db, "auto_backup_enabled").await.and_then(|v| v.parse().ok()),
        })
    }

    pub async fn update_system_settings(db: &Database, update_dto: UpdateSystemSettingsDto) -> Result<SystemSettings, AppError> {
        if let Some(v) = &update_dto.company_name { Self::set_setting(db, "company_name", v).await?; }
        if let Some(v) = &update_dto.company_address { Self::set_setting(db, "company_address", v).await?; }
        if let Some(v) = &update_dto.company_phone { Self::set_setting(db, "company_phone", v).await?; }
        if let Some(v) = &update_dto.company_email { Self::set_setting(db, "company_email", v).await?; }
        if let Some(v) = &update_dto.default_warehouse { Self::set_setting(db, "default_warehouse", v).await?; }
        if let Some(v) = &update_dto.default_currency { Self::set_setting(db, "default_currency", v).await?; }
        if let Some(v) = update_dto.tax_rate { Self::set_setting(db, "tax_rate", &v.to_string()).await?; }
        if let Some(v) = update_dto.low_stock_alert_threshold { Self::set_setting(db, "low_stock_alert_threshold", &v.to_string()).await?; }
        if let Some(v) = update_dto.backup_frequency_days { Self::set_setting(db, "backup_frequency_days", &v.to_string()).await?; }
        if let Some(v) = update_dto.auto_backup_enabled { Self::set_setting(db, "auto_backup_enabled", &v.to_string()).await?; }
        
        Self::get_system_settings(db).await
    }

    // Warehouse Settings Management
    pub async fn get_warehouse_settings(db: &Database) -> Result<Vec<WarehouseSettings>, AppError> {
        // Get warehouses from the warehouses table
        let warehouses = sqlx::query_as::<_, (String, String, Option<String>, Option<String>, Option<String>, bool)>(
            "SELECT id, name, address, manager, phone, is_active FROM warehouses ORDER BY name"
        )
        .fetch_all(db.pool())
        .await?;

        let mut result: Vec<WarehouseSettings> = warehouses.into_iter().map(|(id, name, address, manager, phone, is_active)| {
            WarehouseSettings {
                id: Some(id),
                name,
                address,
                manager,
                phone,
                is_active,
            }
        }).collect();

        // Also include unique warehouses from inventory that aren't in the warehouses table
        let inventory_warehouses = sqlx::query_as::<_, (Option<String>,)>(
            "SELECT DISTINCT warehouse FROM inventory WHERE warehouse IS NOT NULL AND warehouse NOT IN (SELECT name FROM warehouses) ORDER BY warehouse"
        )
        .fetch_all(db.pool())
        .await?;

        for (i, (name,)) in inventory_warehouses.into_iter().enumerate() {
            if let Some(wh_name) = name {
                result.push(WarehouseSettings {
                    id: Some(format!("inv_wh_{}", i + 1)),
                    name: wh_name,
                    address: None,
                    manager: None,
                    phone: None,
                    is_active: true,
                });
            }
        }

        Ok(result)
    }

    pub async fn create_warehouse(db: &Database, create_dto: CreateWarehouseDto) -> Result<WarehouseSettings, AppError> {
        let warehouse_id = Uuid::new_v4().to_string();
        
        sqlx::query::<sqlx::Sqlite>(
            "INSERT INTO warehouses (id, name, address, manager, phone, is_active) VALUES (?, ?, ?, ?, ?, 1)"
        )
        .bind(&warehouse_id)
        .bind(&create_dto.name)
        .bind(&create_dto.address)
        .bind(&create_dto.manager)
        .bind(&create_dto.phone)
        .execute(db.pool())
        .await?;

        Ok(WarehouseSettings {
            id: Some(warehouse_id),
            name: create_dto.name,
            address: create_dto.address,
            manager: create_dto.manager,
            phone: create_dto.phone,
            is_active: true,
        })
    }

    // Backup and Restore Management
    pub async fn backup_database(_db: &Database, db_path: &str) -> Result<BackupInfo, AppError> {
        use std::fs;
        use chrono::Local;
        
        let backup_dir = "backups";
        fs::create_dir_all(backup_dir).map_err(|e| AppError::Internal(format!("Error creating backup directory: {}", e)))?;
        
        let timestamp = Local::now().format("%Y%m%d_%H%M%S");
        let filename = format!("backup_{}.db", timestamp);
        let backup_path = format!("{}/{}", backup_dir, filename);
        
        // Copy the actual database file
        fs::copy(db_path, &backup_path)
            .map_err(|e| AppError::Internal(format!("Error creating backup: {}", e)))?;
        
        // Get file size
        let metadata = fs::metadata(&backup_path)
            .map_err(|e| AppError::Internal(format!("Error getting backup metadata: {}", e)))?;
        
        Ok(BackupInfo {
            id: Uuid::new_v4().to_string(),
            filename,
            file_size: metadata.len() as i64,
            backup_date: Local::now().to_rfc3339(),
            backup_type: "manual".to_string(),
            created_by: Some("System".to_string()),
        })
    }

    pub async fn restore_database(_db: &Database, db_path: &str, restore_request: RestoreRequest) -> Result<String, AppError> {
        use std::fs;
        
        if !restore_request.confirm_restore {
            return Err(AppError::Validation("Debe confirmar la restauración".to_string()));
        }

        let backup_dir = "backups";
        let backup_path = format!("{}/{}", backup_dir, restore_request.backup_filename.as_deref().unwrap_or(""));
        
        if !std::path::Path::new(&backup_path).exists() {
            return Err(AppError::NotFound("Archivo de backup no encontrado".to_string()));
        }
        
        // Create a safety backup before restoring
        let safety_backup = format!("{}/pre_restore_{}.db", backup_dir, chrono::Local::now().format("%Y%m%d_%H%M%S"));
        fs::copy(db_path, &safety_backup)
            .map_err(|e| AppError::Internal(format!("Error creating safety backup: {}", e)))?;
        
        // Copy backup over current database
        fs::copy(&backup_path, db_path)
            .map_err(|e| AppError::Internal(format!("Error restoring database: {}", e)))?;
        
        Ok("Base de datos restaurada exitosamente. Reinicie la aplicación para aplicar los cambios.".to_string())
    }

    pub async fn get_backup_list(_db: &Database) -> Result<Vec<BackupInfo>, AppError> {
        use std::fs;
        use std::path::Path;
        
        let backup_dir = "backups";
        if !Path::new(backup_dir).exists() {
            return Ok(vec![]);
        }
        
        let mut backups = Vec::new();
        
        for entry in fs::read_dir(backup_dir)
            .map_err(|e| AppError::Internal(format!("Error reading backup directory: {}", e)))? 
        {
            let entry = entry.map_err(|e| AppError::Internal(format!("Error reading backup entry: {}", e)))?;
            let path = entry.path();
            
            if path.extension().and_then(|s| s.to_str()) == Some("db") {
                let filename = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();
                
                let metadata = fs::metadata(&path)
                    .map_err(|e| AppError::Internal(format!("Error getting backup metadata: {}", e)))?;
                
                // Extract timestamp from filename
                let backup_date = filename
                    .strip_prefix("backup_")
                    .and_then(|s| s.strip_suffix(".db"))
                    .map(|s| {
                        // Parse timestamp from filename like "backup_20240118_143022.db"
                        if let (Some(year), Some(month), Some(day)) = (
                            s.get(0..4),
                            s.get(4..6),
                            s.get(6..8)
                        ) {
                            if let (Some(hour), Some(min), Some(sec)) = (
                                s.get(9..11),
                                s.get(11..13),
                                s.get(13..15)
                            ) {
                                format!("{}-{}-{}T{}:{}:{}Z", year, month, day, hour, min, sec)
                            } else {
                                "1970-01-01T00:00:00Z".to_string()
                            }
                        } else {
                            "1970-01-01T00:00:00Z".to_string()
                        }
                    })
                    .unwrap_or_else(|| "1970-01-01T00:00:00Z".to_string());
                
                backups.push(BackupInfo {
                    id: Uuid::new_v4().to_string(),
                    filename,
                    file_size: metadata.len() as i64,
                    backup_date,
                    backup_type: "manual".to_string(),
                    created_by: Some("System".to_string()),
                });
            }
        }
        
        // Sort by date (newest first)
        backups.sort_by(|a, b| b.backup_date.cmp(&a.backup_date));
        
        Ok(backups)
    }
}
