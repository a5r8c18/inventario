use chrono::{Datelike, Local};
use crate::database::Database;
use crate::error::AppError;
use crate::models::fixed_assets::{
    FixedAsset, FixedAssetDepreciation, FixedAssetWithDepreciation,
    CreateFixedAssetDto, UpdateFixedAssetDto, DepreciationGroup, get_depreciation_catalog, get_rate_for_subgroup,
};

pub struct FixedAssetsService;

impl FixedAssetsService {
    /// Get all fixed assets for a company
    pub async fn get_all(db: &Database, company_id: i32) -> Result<Vec<FixedAsset>, AppError> {
        let assets = sqlx::query_as::<_, FixedAsset>(
            "SELECT * FROM fixed_assets WHERE company_id = ? ORDER BY group_number, name"
        )
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;
        Ok(assets)
    }

    /// Get a single asset with all its depreciation history
    pub async fn get_with_depreciation(db: &Database, company_id: i32, asset_id: i32) -> Result<FixedAssetWithDepreciation, AppError> {
        let asset = sqlx::query_as::<_, FixedAsset>(
            "SELECT * FROM fixed_assets WHERE id = ? AND company_id = ?"
        )
        .bind(asset_id)
        .bind(company_id)
        .fetch_optional(db.pool())
        .await?
        .ok_or_else(|| AppError::NotFound("Activo fijo no encontrado".to_string()))?;

        let depreciations = sqlx::query_as::<_, FixedAssetDepreciation>(
            "SELECT * FROM fixed_asset_depreciation WHERE asset_id = ? ORDER BY year"
        )
        .bind(asset_id)
        .fetch_all(db.pool())
        .await?;

        let total_accumulated = depreciations.iter().map(|d| d.depreciation_amount).sum::<f64>();
        let current_book_value = asset.acquisition_value - total_accumulated;

        // Calculate remaining useful life years
        let years_remaining = if asset.depreciation_rate > 0.0 && asset.depreciation_rate < 100.0 {
            let total_years = (100.0 / asset.depreciation_rate).ceil() as i32;
            let years_elapsed = depreciations.len() as i32;
            Some((total_years - years_elapsed).max(0))
        } else {
            None
        };

        Ok(FixedAssetWithDepreciation {
            asset,
            depreciations,
            total_accumulated,
            current_book_value: current_book_value.max(0.0),
            years_remaining,
        })
    }

    /// Create a new fixed asset, auto-detect depreciation rate from catalog
    pub async fn create(db: &Database, company_id: i32, dto: CreateFixedAssetDto) -> Result<FixedAsset, AppError> {
        let rate = get_rate_for_subgroup(dto.group_number, &dto.subgroup)
            .ok_or_else(|| AppError::Validation(format!(
                "No se encontró tasa de depreciación para grupo {} subgrupo '{}'",
                dto.group_number, dto.subgroup
            )))?;

        let asset = sqlx::query_as::<_, FixedAsset>(
            "INSERT INTO fixed_assets (
                company_id, asset_code, name, description,
                group_number, subgroup, subgroup_detail, depreciation_rate,
                acquisition_value, current_value, acquisition_date,
                location, responsible_person, status
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
             RETURNING *"
        )
        .bind(company_id)
        .bind(&dto.asset_code)
        .bind(&dto.name)
        .bind(&dto.description)
        .bind(dto.group_number)
        .bind(&dto.subgroup)
        .bind(&dto.subgroup_detail)
        .bind(rate)
        .bind(dto.acquisition_value)
        .bind(dto.acquisition_value) // current_value = acquisition_value at start
        .bind(&dto.acquisition_date)
        .bind(&dto.location)
        .bind(&dto.responsible_person)
        .fetch_one(db.pool())
        .await?;

        Ok(asset)
    }

    pub async fn update(db: &Database, company_id: i32, asset_id: i32, dto: UpdateFixedAssetDto) -> Result<FixedAsset, AppError> {
        let asset = sqlx::query_as::<_, FixedAsset>(
            "UPDATE fixed_assets SET
             name = COALESCE(?, name),
             description = COALESCE(?, description),
             location = COALESCE(?, location),
             responsible_person = COALESCE(?, responsible_person),
             status = COALESCE(?, status),
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND company_id = ?
             RETURNING *"
        )
        .bind(&dto.name)
        .bind(&dto.description)
        .bind(&dto.location)
        .bind(&dto.responsible_person)
        .bind(&dto.status)
        .bind(asset_id)
        .bind(company_id)
        .fetch_one(db.pool())
        .await?;
        Ok(asset)
    }

    pub async fn delete(db: &Database, company_id: i32, asset_id: i32) -> Result<(), AppError> {
        sqlx::query("DELETE FROM fixed_assets WHERE id = ? AND company_id = ?")
            .bind(asset_id)
            .bind(company_id)
            .execute(db.pool())
            .await?;
        Ok(())
    }

    /// Calculate and store depreciation for all active assets of a company for a given year.
    /// If year is None, uses the current year.
    pub async fn calculate_annual_depreciation(db: &Database, company_id: i32, year: Option<i32>) -> Result<Vec<FixedAssetDepreciation>, AppError> {
        let target_year = year.unwrap_or_else(|| Local::now().year());

        let assets = sqlx::query_as::<_, FixedAsset>(
            "SELECT * FROM fixed_assets WHERE company_id = ? AND status = 'active'"
        )
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;

        let mut results = Vec::new();

        for asset in assets {
            // Skip if 100% depreciation rate (immediate full depreciation)
            // and already has a record
            let existing = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM fixed_asset_depreciation WHERE asset_id = ? AND year = ?"
            )
            .bind(asset.id)
            .bind(target_year)
            .fetch_one(db.pool())
            .await?;

            if existing > 0 {
                continue; // Already calculated for this year
            }

            // Get accumulated depreciation so far
            let accumulated: f64 = sqlx::query_scalar::<_, Option<f64>>(
                "SELECT SUM(depreciation_amount) FROM fixed_asset_depreciation WHERE asset_id = ?"
            )
            .bind(asset.id)
            .fetch_one(db.pool())
            .await?
            .unwrap_or(0.0);

            let remaining_value = asset.acquisition_value - accumulated;

            if remaining_value <= 0.0 {
                continue; // Fully depreciated
            }

            let annual_amount = if asset.depreciation_rate >= 100.0 {
                remaining_value // One-time full depreciation
            } else {
                (asset.acquisition_value * asset.depreciation_rate / 100.0)
                    .min(remaining_value)
            };

            let new_accumulated = accumulated + annual_amount;
            let book_value = (asset.acquisition_value - new_accumulated).max(0.0);

            let record = sqlx::query_as::<_, FixedAssetDepreciation>(
                "INSERT INTO fixed_asset_depreciation
                 (asset_id, company_id, year, depreciation_amount, accumulated_depreciation, book_value)
                 VALUES (?, ?, ?, ?, ?, ?)
                 RETURNING *"
            )
            .bind(asset.id)
            .bind(company_id)
            .bind(target_year)
            .bind(annual_amount)
            .bind(new_accumulated)
            .bind(book_value)
            .fetch_one(db.pool())
            .await?;

            // Update current_value on the asset
            sqlx::query("UPDATE fixed_assets SET current_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(book_value)
                .bind(asset.id)
                .execute(db.pool())
                .await?;

            results.push(record);
        }

        Ok(results)
    }

    /// Get a single fixed asset by id
    pub async fn get_by_id(db: &Database, company_id: i32, asset_id: i32) -> Result<FixedAsset, AppError> {
        let asset = sqlx::query_as::<_, FixedAsset>(
            "SELECT * FROM fixed_assets WHERE id = ? AND company_id = ?"
        )
        .bind(asset_id)
        .bind(company_id)
        .fetch_optional(db.pool())
        .await?
        .ok_or_else(|| AppError::NotFound("Activo fijo no encontrado".to_string()))?;
        Ok(asset)
    }

    /// Returns the full depreciation catalog
    pub fn get_depreciation_catalog() -> Vec<DepreciationGroup> {
        get_depreciation_catalog()
    }
}
