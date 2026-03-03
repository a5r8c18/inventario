use std::env;
use dotenv::dotenv;

#[derive(Debug, Clone)]
pub struct Config {
    pub environment: String,
    pub database_url: String,
    pub database_type: String,
    pub jwt_secret: String,
    pub log_level: String,
    pub backup_directory: String,
    pub export_directory: String,
    pub max_file_size_mb: u32,
    pub enable_email: bool,
    pub smtp_host: Option<String>,
    pub smtp_port: Option<u16>,
    pub smtp_username: Option<String>,
    pub smtp_password: Option<String>,
}

impl Config {
    pub fn from_env() -> Self {
        // Cargar variables de entorno desde archivo .env
        dotenv().ok();

        let environment = env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string());
        
        Config {
            environment: environment.clone(),
            database_url: get_env_var("DATABASE_URL", &format!("sqlite:data/inventario_{}.db", environment)),
            database_type: get_env_var("DB_TYPE", "sqlite"),
            jwt_secret: get_env_var("JWT_SECRET", "your-secret-key-change-in-production"),
            log_level: get_env_var("LOG_LEVEL", if environment == "production" { "info" } else { "debug" }),
            backup_directory: get_env_var("BACKUP_DIR", "backups"),
            export_directory: get_env_var("EXPORT_DIR", "exports"),
            max_file_size_mb: get_env_var("MAX_FILE_SIZE_MB", "50").parse().unwrap_or(50),
            enable_email: get_env_var("ENABLE_EMAIL", "false").parse().unwrap_or(false),
            smtp_host: env::var("SMTP_HOST").ok(),
            smtp_port: env::var("SMTP_PORT").ok().and_then(|p| p.parse().ok()),
            smtp_username: env::var("SMTP_USERNAME").ok(),
            smtp_password: env::var("SMTP_PASSWORD").ok(),
        }
    }

    pub fn is_development(&self) -> bool {
        self.environment == "development"
    }

    pub fn is_production(&self) -> bool {
        self.environment == "production"
    }

    pub fn is_test(&self) -> bool {
        self.environment == "test"
    }

    pub fn get_database_path(&self) -> Option<&str> {
        if self.database_type == "sqlite" {
            self.database_url.strip_prefix("sqlite:")
        } else {
            None
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.jwt_secret == "your-secret-key-change-in-production" && self.is_production() {
            return Err("JWT_SECRET debe ser cambiado en producción".to_string());
        }

        if self.database_url.is_empty() {
            return Err("DATABASE_URL es requerido".to_string());
        }

        if self.enable_email {
            if self.smtp_host.is_none() || self.smtp_username.is_none() || self.smtp_password.is_none() {
                return Err("Configuración de email incompleta. Se requiere SMTP_HOST, SMTP_USERNAME y SMTP_PASSWORD".to_string());
            }
        }

        Ok(())
    }
}

fn get_env_var(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}

impl Default for Config {
    fn default() -> Self {
        Self::from_env()
    }
}
