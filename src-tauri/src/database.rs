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
        sqlx::migrate!("./migrations").run(&pool).await?;

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

        Ok(())
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}
