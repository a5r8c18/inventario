use crate::database::Database;
use crate::error::AppError;
use crate::models::company::{Company, CreateCompanyDto, UpdateCompanyDto};

pub struct CompanyService;

impl CompanyService {
    pub async fn get_all(db: &Database) -> Result<Vec<Company>, AppError> {
        let companies = sqlx::query_as::<_, Company>(
            "SELECT * FROM companies ORDER BY name"
        )
        .fetch_all(db.pool())
        .await?;
        Ok(companies)
    }

    pub async fn get_active(db: &Database) -> Result<Vec<Company>, AppError> {
        let companies = sqlx::query_as::<_, Company>(
            "SELECT * FROM companies WHERE is_active = TRUE ORDER BY name"
        )
        .fetch_all(db.pool())
        .await?;
        Ok(companies)
    }

    pub async fn get_by_id(db: &Database, id: i32) -> Result<Company, AppError> {
        let company = sqlx::query_as::<_, Company>(
            "SELECT * FROM companies WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(db.pool())
        .await?;
        company.ok_or_else(|| AppError::NotFound("Empresa no encontrada".to_string()))
    }

    pub async fn create(db: &Database, dto: CreateCompanyDto) -> Result<Company, AppError> {
        let id = sqlx::query(
            "INSERT INTO companies (name, tax_id, address, phone, email, logo_path)
             VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(&dto.name)
        .bind(&dto.tax_id)
        .bind(&dto.address)
        .bind(&dto.phone)
        .bind(&dto.email)
        .bind(&dto.logo_path)
        .execute(db.pool())
        .await?
        .last_insert_rowid();

        Self::get_by_id(db, id as i32).await
    }

    pub async fn update(db: &Database, id: i32, dto: UpdateCompanyDto) -> Result<Company, AppError> {
        sqlx::query(
            "UPDATE companies SET
             name = COALESCE(?, name),
             tax_id = COALESCE(?, tax_id),
             address = COALESCE(?, address),
             phone = COALESCE(?, phone),
             email = COALESCE(?, email),
             logo_path = COALESCE(?, logo_path),
             is_active = COALESCE(?, is_active),
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?"
        )
        .bind(&dto.name)
        .bind(&dto.tax_id)
        .bind(&dto.address)
        .bind(&dto.phone)
        .bind(&dto.email)
        .bind(&dto.logo_path)
        .bind(dto.is_active)
        .bind(id)
        .execute(db.pool())
        .await?;

        Self::get_by_id(db, id).await
    }

    pub async fn delete(db: &Database, id: i32) -> Result<(), AppError> {
        if id == 1 {
            return Err(AppError::Validation("No se puede eliminar la empresa principal".to_string()));
        }
        sqlx::query("DELETE FROM companies WHERE id = ?")
            .bind(id)
            .execute(db.pool())
            .await?;
        Ok(())
    }
}
