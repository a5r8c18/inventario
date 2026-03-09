use std::sync::Arc;
use std::collections::HashMap;
use sqlx::SqlitePool;
use crate::error::AppError;

#[derive(Clone)]
pub struct Database {
    pool: Arc<SqlitePool>,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, AppError> {
        let connection_string = format!("{}?mode=rwc", database_url);
        let pool = sqlx::SqlitePool::connect(&connection_string).await?;

        // Step 1: Remove orphaned migration records (files deleted from repo).
        Self::remove_orphaned_migrations(&pool).await?;

        // Step 2: Pre-apply migrations whose schema changes already exist
        //         (happens when upgrading from a DB that had a different migration layout).
        Self::pre_apply_if_already_done(&pool).await?;

        // Step 3: Run any remaining pending migrations.
        log::info!("Starting database migrations...");
        match sqlx::migrate!("./migrations").run(&pool).await {
            Ok(_) => log::info!("Database migrations completed successfully"),
            Err(e) => {
                log::error!("Migration failed: {}", e);
                return Err(AppError::Internal(format!("Migration error: {}", e)));
            }
        };

        // Step 4: Apply schema patches for columns that may be missing in
        //         databases created before the column was added to the migration.
        Self::apply_schema_patches(&pool).await?;

        Ok(Database {
            pool: Arc::new(pool),
        })
    }

    /// Delete `_sqlx_migrations` records for versions that are either:
    /// - No longer present in the binary (orphaned), or
    /// - Present but with a different checksum (migration file was replaced).
    /// Both cases are safe to re-run because the new binary contains the
    /// intended version of each migration.
    async fn remove_orphaned_migrations(pool: &SqlitePool) -> Result<(), AppError> {
        let migrations_table_exists: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='_sqlx_migrations'"
        )
        .fetch_one(pool)
        .await
        .unwrap_or(false);

        if !migrations_table_exists {
            return Ok(());
        }

        // Build version → checksum map from embedded migrations.
        let known: HashMap<i64, Vec<u8>> = sqlx::migrate!("./migrations")
            .migrations
            .iter()
            .map(|m| (m.version, m.checksum.to_vec()))
            .collect();

        // Fetch version + stored checksum from DB.
        let applied: Vec<(i64, Vec<u8>)> =
            sqlx::query_as("SELECT version, checksum FROM _sqlx_migrations")
                .fetch_all(pool)
                .await
                .unwrap_or_default();

        for (version, db_checksum) in applied {
            let should_delete = match known.get(&version) {
                None => {
                    // File was removed from the repo entirely.
                    log::warn!("Removing orphaned migration record v{}", version);
                    true
                }
                Some(bin_checksum) if *bin_checksum != db_checksum => {
                    // File was replaced / placeholder substituted.
                    log::warn!(
                        "Removing modified migration record v{} (checksum mismatch)",
                        version
                    );
                    true
                }
                _ => false,
            };

            if should_delete {
                sqlx::query("DELETE FROM _sqlx_migrations WHERE version = ?")
                    .bind(version)
                    .execute(pool)
                    .await
                    .map_err(|e| AppError::Internal(
                        format!("Failed to remove stale migration {}: {}", version, e)
                    ))?;
            }
        }

        Ok(())
    }

    /// When a database was created with a previous migration layout, some schema
    /// changes (e.g. adding company_id columns) already exist even though the
    /// corresponding migration file has a new version number.  
    /// We pre-insert those migration records with the correct checksum so sqlx
    /// skips re-running them on existing databases.
    async fn pre_apply_if_already_done(pool: &SqlitePool) -> Result<(), AppError> {
        let migrations_table_exists: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='_sqlx_migrations'"
        )
        .fetch_one(pool)
        .await
        .unwrap_or(false);

        if !migrations_table_exists {
            // Fresh database – let migrations run normally.
            return Ok(());
        }

        let migrator = sqlx::migrate!("./migrations");

        // ── 20240201000000_multi_company ──────────────────────────────────────
        // This migration adds company_id to existing tables. If company_id already
        // exists in the inventory table the migration would fail with "duplicate
        // column name".  Mark it as applied so sqlx skips it.
        let company_id_exists: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('inventory') WHERE name='company_id'"
        )
        .fetch_one(pool)
        .await
        .unwrap_or(false);

        if company_id_exists {
            Self::ensure_migration_recorded(pool, &migrator, 20240201000000).await?;
        }

        // ── 20240202000000_fixed_assets ───────────────────────────────────────
        // If the fixed_assets table already exists mark the migration as applied.
        let fixed_assets_exists: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='fixed_assets'"
        )
        .fetch_one(pool)
        .await
        .unwrap_or(false);

        if fixed_assets_exists {
            Self::ensure_migration_recorded(pool, &migrator, 20240202000000).await?;
        }

        Ok(())
    }

    /// Insert a migration record into `_sqlx_migrations` (with the correct
    /// checksum from the embedded migration set) if it is not already there.
    async fn ensure_migration_recorded(
        pool: &SqlitePool,
        migrator: &sqlx::migrate::Migrator,
        version: i64,
    ) -> Result<(), AppError> {
        let already_recorded: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM _sqlx_migrations WHERE version = ?"
        )
        .bind(version)
        .fetch_one(pool)
        .await
        .unwrap_or(false);

        if already_recorded {
            return Ok(());
        }

        if let Some(m) = migrator.migrations.iter().find(|m| m.version == version) {
            log::info!("Pre-applying migration v{} (schema already exists)", version);
            sqlx::query(
                "INSERT OR IGNORE INTO _sqlx_migrations \
                 (version, description, installed_on, success, checksum, execution_time) \
                 VALUES (?, ?, CURRENT_TIMESTAMP, 1, ?, 0)"
            )
            .bind(m.version)
            .bind(m.description.as_ref())
            .bind(m.checksum.as_ref())
            .execute(pool)
            .await
            .map_err(|e| AppError::Internal(
                format!("Failed to pre-record migration {}: {}", version, e)
            ))?;
        }

        Ok(())
    }

    /// Add columns that may be missing in DBs created before the column was
    /// introduced in a migration (SQLite's CREATE TABLE IF NOT EXISTS skips the
    /// CREATE when the table already exists, leaving new columns absent).
    async fn apply_schema_patches(pool: &SqlitePool) -> Result<(), AppError> {
        // Guard: check if companies table exists before patching it
        let companies_exists: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='companies'"
        )
        .fetch_one(pool)
        .await
        .unwrap_or(false);

        if companies_exists {
            // companies.logo_path — added in 20240201 migration but skipped for old DBs
            let logo_path_exists: bool = sqlx::query_scalar(
                "SELECT COUNT(*) > 0 FROM pragma_table_info('companies') WHERE name='logo_path'"
            )
            .fetch_one(pool)
            .await
            .unwrap_or(false);

            if !logo_path_exists {
                log::info!("Schema patch: adding logo_path to companies table");
                sqlx::query(
                    "ALTER TABLE companies ADD COLUMN logo_path VARCHAR(500)"
                )
                .execute(pool)
                .await
                .map_err(|e| AppError::Internal(
                    format!("Schema patch failed (companies.logo_path): {}", e)
                ))?;
            }
        }

        // Guard: check if invoices table exists before patching it
        let invoices_exists: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='invoices'"
        )
        .fetch_one(pool)
        .await
        .unwrap_or(false);

        if invoices_exists {
            // invoices.company_id
            let invoice_company_id_exists: bool = sqlx::query_scalar(
                "SELECT COUNT(*) > 0 FROM pragma_table_info('invoices') WHERE name='company_id'"
            )
            .fetch_one(pool)
            .await
            .unwrap_or(false);

            if !invoice_company_id_exists {
                log::info!("Schema patch: adding company_id to invoices table");
                sqlx::query(
                    "ALTER TABLE invoices ADD COLUMN company_id INTEGER REFERENCES companies(id)"
                )
                .execute(pool)
                .await
                .map_err(|e| AppError::Internal(
                    format!("Schema patch failed (invoices.company_id): {}", e)
                ))?;
            }

            // invoices.company_logo
            let invoice_company_logo_exists: bool = sqlx::query_scalar(
                "SELECT COUNT(*) > 0 FROM pragma_table_info('invoices') WHERE name='company_logo'"
            )
            .fetch_one(pool)
            .await
            .unwrap_or(false);

            if !invoice_company_logo_exists {
                log::info!("Schema patch: adding company_logo to invoices table");
                sqlx::query(
                    "ALTER TABLE invoices ADD COLUMN company_logo VARCHAR(500)"
                )
                .execute(pool)
                .await
                .map_err(|e| AppError::Internal(
                    format!("Schema patch failed (invoices.company_logo): {}", e)
                ))?;
            }
        }

        // Auto-add company_id columns to main tables if missing (backward compatibility)
        log::info!("Applying schema patches for backward compatibility...");
        Self::ensure_company_id_columns(pool).await?;
        
        // Create performance indexes after ensuring columns exist
        log::info!("Creating performance indexes...");
        Self::ensure_indexes(pool).await?;
        
        log::info!("Schema patches completed");

        Ok(())
    }

    /// Ensure all main tables have company_id column for multi-company support
    /// This handles databases created before company_id was added
    async fn ensure_company_id_columns(pool: &SqlitePool) -> Result<(), AppError> {
        let tables = vec![
            ("users", "company_id INTEGER DEFAULT 1"),
            ("users", "role VARCHAR(50) DEFAULT 'admin'"),
            ("users", "is_active BOOLEAN DEFAULT TRUE"),
            ("inventory", "company_id INTEGER DEFAULT 1"),
            ("purchases", "company_id INTEGER DEFAULT 1"),
            ("movements", "company_id INTEGER DEFAULT 1"),
            ("invoices", "company_id INTEGER DEFAULT 1"),
            ("invoices", "company_logo VARCHAR(500)"),
            ("delivery_reports", "company_id INTEGER DEFAULT 1"),
            ("reception_reports", "company_id INTEGER DEFAULT 1"),
        ];

        for (table_name, column_def) in tables {
            // Extract column name from definition (before first space)
            let column_name = column_def.split(' ').next().unwrap_or("");
            
            // Check if table exists (cannot use placeholders for table names)
            let table_exists: bool = sqlx::query_scalar(&format!(
                "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='{}'", table_name
            ))
            .fetch_one(pool)
            .await
            .unwrap_or(false);

            if table_exists {
                // Check if column exists (cannot use placeholders for table/column names)
                let column_check_sql = format!(
                    "SELECT COUNT(*) > 0 FROM pragma_table_info('{}') WHERE name='{}'", table_name, column_name
                );
                
                log::debug!("Checking if column {} exists in table {}", column_name, table_name);
                
                let column_exists: bool = match sqlx::query_scalar(&column_check_sql)
                    .fetch_one(pool)
                    .await
                {
                    Ok(exists) => exists,
                    Err(e) => {
                        log::warn!("Failed to check column {}.{}: {}", table_name, column_name, e);
                        // If we can't check, assume it doesn't exist but be prepared for duplicate error
                        false
                    }
                };

                if !column_exists {
                    log::info!("Schema patch: adding {} to {} table", column_name, table_name);
                    let alter_sql = format!("ALTER TABLE {} ADD COLUMN {}", table_name, column_def);
                    
                    match sqlx::query(&alter_sql).execute(pool).await {
                        Ok(_) => {
                            log::info!("Successfully added column {} to {}", column_name, table_name);
                        }
                        Err(e) => {
                            // Check if it's a duplicate column error
                            let error_msg = e.to_string().to_lowercase();
                            if error_msg.contains("duplicate column name") || error_msg.contains("column") && error_msg.contains("already exists") {
                                log::warn!("Column {} already exists in table {}, skipping", column_name, table_name);
                            } else {
                                log::error!("Schema patch failed ({}.{}): {}", table_name, column_name, e);
                                return Err(AppError::Internal(
                                    format!("Schema patch failed ({}.{}): {}", table_name, column_name, e)
                                ));
                            }
                        }
                    }
                } else {
                    log::debug!("Column {} already exists in table {}", column_name, table_name);
                }
            }
        }

        Ok(())
    }

    /// Create performance indexes for multi-company support
    /// This ensures indexes exist after columns are added
    async fn ensure_indexes(pool: &SqlitePool) -> Result<(), AppError> {
        let indexes = vec![
            ("companies", "idx_companies_name", "name"),
            ("companies", "idx_companies_active", "is_active"),
            ("inventory", "idx_inventory_company", "company_id"),
            ("purchases", "idx_purchases_company", "company_id"),
            ("movements", "idx_movements_company", "company_id"),
            ("invoices", "idx_invoices_company", "company_id"),
            ("delivery_reports", "idx_delivery_reports_company", "company_id"),
            ("reception_reports", "idx_reception_reports_company", "company_id"),
        ];

        for (table_name, index_name, column_name) in indexes {
            // Check if table exists first
            let table_exists: bool = sqlx::query_scalar(&format!(
                "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='{}'", table_name
            ))
            .fetch_one(pool)
            .await
            .unwrap_or(false);

            if table_exists {
                // Check if index exists
                let index_exists: bool = sqlx::query_scalar(&format!(
                    "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='index' AND name='{}'", index_name
                ))
                .fetch_one(pool)
                .await
                .unwrap_or(false);

                if !index_exists {
                    log::info!("Creating index {} on table {}", index_name, table_name);
                    let create_index_sql = format!(
                        "CREATE INDEX IF NOT EXISTS {} ON {}({})", 
                        index_name, table_name, column_name
                    );
                    
                    match sqlx::query(&create_index_sql).execute(pool).await {
                        Ok(_) => {
                            log::info!("Successfully created index {}", index_name);
                        }
                        Err(e) => {
                            log::warn!("Failed to create index {}: {}", index_name, e);
                            // Continue even if index creation fails
                        }
                    }
                } else {
                    log::debug!("Index {} already exists", index_name);
                }
            }
        }

        Ok(())
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}
