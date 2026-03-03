use crate::database::Database;
use crate::error::AppError;
use crate::models::license::{License, LicenseStatus, ActivateLicenseDto};
use chrono::{Utc, NaiveDateTime};
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

// ============================================================
// SECRETO DEL PROVEEDOR - Solo tú (desarrollador) conoces esto
// Cámbialo por tu propio secreto antes de distribuir la app
// ============================================================
const LICENSE_SECRET: &str = "TG-INV-2024-S3CR3T-K3Y-PR0V1D3R";

pub struct LicenseService;

impl LicenseService {
    /// Get the current active license status
    pub async fn get_license_status(db: &Database) -> Result<LicenseStatus, AppError> {
        let license = sqlx::query_as::<_, License>(
            "SELECT * FROM license WHERE status = 'active' ORDER BY id DESC LIMIT 1"
        )
        .fetch_optional(db.pool())
        .await?;

        match license {
            Some(lic) => {
                let expires_at = NaiveDateTime::parse_from_str(&lic.expires_at, "%Y-%m-%d %H:%M:%S")
                    .map_err(|e| AppError::Internal(format!("Error parsing license date: {}", e)))?;
                
                let now = Utc::now().naive_utc();
                let days_remaining = (expires_at - now).num_days();
                let is_valid = days_remaining >= 0;

                let warning = if !is_valid {
                    Some("Su licencia ha expirado. Contacte al proveedor para renovar su licencia y recuperar el acceso al sistema.".to_string())
                } else if days_remaining <= 7 {
                    Some(format!(
                        "Su licencia vence en {} día(s). Contacte al proveedor para renovar su licencia antes de perder acceso al sistema.",
                        days_remaining
                    ))
                } else {
                    None
                };

                Ok(LicenseStatus {
                    is_valid,
                    days_remaining,
                    expires_at: lic.expires_at,
                    license_key: Self::mask_key(&lic.license_key),
                    status: if is_valid { "active".to_string() } else { "expired".to_string() },
                    warning,
                })
            }
            None => {
                Ok(LicenseStatus {
                    is_valid: false,
                    days_remaining: 0,
                    expires_at: String::new(),
                    license_key: String::new(),
                    status: "no_license".to_string(),
                    warning: Some("No se encontró una licencia activa. Contacte al proveedor para activar su licencia.".to_string()),
                })
            }
        }
    }

    /// Activate a new license key (provided by the vendor)
    pub async fn activate_license(db: &Database, dto: ActivateLicenseDto) -> Result<LicenseStatus, AppError> {
        let key = dto.license_key.trim().to_string();
        
        // Validate the license key signature
        if !Self::validate_key(&key) {
            return Err(AppError::Validation(
                "Clave de licencia inválida. Verifique el formato proporcionado por el proveedor.".to_string()
            ));
        }

        // Deactivate any existing active licenses
        sqlx::query("UPDATE license SET status = 'replaced' WHERE status = 'active'")
            .execute(db.pool())
            .await?;

        // Insert the new license with 1 year validity
        sqlx::query(
            "INSERT INTO license (license_key, activated_at, expires_at, status, activated_by) VALUES (?, datetime('now'), datetime('now', '+1 year'), 'active', 'user')"
        )
        .bind(&key)
        .execute(db.pool())
        .await?;

        Self::get_license_status(db).await
    }

    // ============================================================
    // KEY GENERATION & VALIDATION
    // Format: INV-{CLIENT_ID}-{SIGNATURE}
    // Example: INV-ACME2025-A1B2C3D4E5F6
    // ============================================================

    /// Generate a license key for a client (used by the developer tool)
    pub fn generate_key(client_id: &str) -> String {
        let payload = client_id.to_uppercase();
        let signature = Self::sign(&payload);
        // Take first 12 chars of hex signature for readability
        let short_sig = &signature[..12];
        format!("INV-{}-{}", payload, short_sig.to_uppercase())
    }

    /// Validate a license key's signature
    fn validate_key(key: &str) -> bool {
        // Format: INV-{PAYLOAD}-{SIGNATURE}
        let parts: Vec<&str> = key.split('-').collect();
        if parts.len() < 3 || parts[0] != "INV" {
            return false;
        }

        // The signature is the last part, payload is everything between INV- and the last -
        let signature = parts.last().unwrap().to_lowercase();
        if signature.len() != 12 {
            return false;
        }

        // Reconstruct the payload (everything between first and last dash-separated parts)
        let payload_parts = &parts[1..parts.len() - 1];
        let payload = payload_parts.join("-");

        // Verify signature
        let expected_sig = Self::sign(&payload);
        let expected_short = &expected_sig[..12];

        expected_short == signature
    }

    /// Create HMAC-SHA256 signature of a payload
    fn sign(payload: &str) -> String {
        let mut mac = HmacSha256::new_from_slice(LICENSE_SECRET.as_bytes())
            .expect("HMAC can take key of any size");
        mac.update(payload.as_bytes());
        let result = mac.finalize();
        hex::encode(result.into_bytes())
    }

    /// Mask a license key for display (show first and last parts, hide middle)
    fn mask_key(key: &str) -> String {
        if key.len() <= 12 {
            return "****".to_string();
        }
        let parts: Vec<&str> = key.split('-').collect();
        if parts.len() >= 3 {
            format!("INV-{}...{}", &parts[1][..std::cmp::min(4, parts[1].len())], &parts.last().unwrap()[..std::cmp::min(4, parts.last().unwrap().len())])
        } else {
            format!("{}...{}", &key[..4], &key[key.len()-4..])
        }
    }
}
