use jsonwebtoken::{encode, EncodingKey, Header};

use bcrypt::{hash, verify, DEFAULT_COST};

use chrono::{Duration, Utc};

use uuid::Uuid;

use crate::error::AppError;

use crate::models::auth::{

    User, LoginDto, SignupDto, AuthResponse, UserInfo, ForgotPasswordDto,

    ResetPasswordDto, ChangePasswordDto, DirectResetPasswordDto, UpdateProfileDto, UpdateAvatarDto, UpdateAvatarFileDto

};

use crate::database::Database;

use sqlx::Row;



pub struct AuthService;



impl AuthService {

    // Determinar rol según el email del usuario

    fn role_for_email(email: &str) -> String {

        let email_lower = email.to_lowercase();

        match email_lower.as_str() {

            "developer@gmail.com" => "developer".to_string(),

            "admin@gmail.com" => "administrador".to_string(),

            "contador@gmail.com" => "contador".to_string(),

            _ => "usuario".to_string(),

        }

    }



    pub async fn login(db: &Database, login_dto: LoginDto) -> Result<AuthResponse, AppError> {

        let user = sqlx::query_as::<_, User>(

            "SELECT * FROM users WHERE email = ? AND is_active = TRUE"

        )

        .bind(&login_dto.email)

        .fetch_one(db.pool())

        .await

        .map_err(|_| AppError::Authentication("Credenciales inválidas".to_string()))?;



        let is_valid = verify(&login_dto.password, &user.password)

            .map_err(|_| AppError::Authentication("Error al verificar contraseña".to_string()))?;



        if !is_valid {

            return Err(AppError::Authentication("Credenciales inválidas".to_string()));

        }



        // Sincronizar rol según email (por si cambió o se registró antes del fix)

        let expected_role = Self::role_for_email(&user.email);

        let mut user = user;

        if user.role != expected_role {

            let _ = sqlx::query("UPDATE users SET role = ? WHERE id = ?")

                .bind(&expected_role)

                .bind(user.id)

                .execute(db.pool())

                .await;

            user.role = expected_role;

        }



        let token = Self::generate_token(&user)?;

        

        Ok(AuthResponse {

            access_token: token,

            user: UserInfo {

                id: user.id,

                first_name: user.first_name,

                last_name: user.last_name,

                email: user.email,

                phone: user.phone,

                company: user.company,

                role: user.role,

                is_active: user.is_active,

                avatar: user.avatar,

                member_since: user.member_since,

            },

        })

    }



    pub async fn signup(db: &Database, signup_dto: SignupDto) -> Result<AuthResponse, AppError> {

        // Check if user already exists

        let existing_user = sqlx::query::<sqlx::Sqlite>(

            "SELECT id FROM users WHERE email = ?"

        )

        .bind(&signup_dto.email)

        .fetch_optional(db.pool())

        .await?;



        if existing_user.is_some() {

            return Err(AppError::Authentication("El usuario ya existe".to_string()));

        }



        // Hash password

        let hashed_password = hash(&signup_dto.password, DEFAULT_COST)

            .map_err(|e| AppError::Authentication(format!("Error al hashear contraseña: {}", e)))?;



        // Asignar rol según el email del usuario

        let role = Self::role_for_email(&signup_dto.email);



        // Create user

        let user_id_row = sqlx::query::<sqlx::Sqlite>(

            "INSERT INTO users (first_name, last_name, company, email, phone, password, role) 

             VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id"

        )

        .bind(&signup_dto.first_name)

        .bind(&signup_dto.last_name)

        .bind(&signup_dto.company)

        .bind(&signup_dto.email)

        .bind(&signup_dto.phone)

        .bind(hashed_password)

        .bind(&role)

        .fetch_one(db.pool())

        .await?;



        let user_id: i64 = user_id_row.get(0);



        let user = sqlx::query_as::<_, User>(

            "SELECT * FROM users WHERE id = ?"

        )

        .bind(user_id as i32)

        .fetch_one(db.pool())

        .await?;



        let token = Self::generate_token(&user)?;

        

        Ok(AuthResponse {

            access_token: token,

            user: UserInfo {

                id: user.id,

                first_name: user.first_name,

                last_name: user.last_name,

                email: user.email,

                phone: user.phone,

                company: user.company,

                role: user.role,

                is_active: user.is_active,

                avatar: user.avatar,

                member_since: user.member_since,

            },

        })

    }



    pub async fn get_user_profile(db: &Database, user_id: i32) -> Result<UserInfo, AppError> {

        let user = sqlx::query_as::<_, User>(

            "SELECT * FROM users WHERE id = ? AND is_active = TRUE"

        )

        .bind(user_id)

        .fetch_optional(db.pool())

        .await?;



        match user {

            Some(user) => Ok(UserInfo {

                id: user.id,

                first_name: user.first_name,

                last_name: user.last_name,

                email: user.email,

                phone: user.phone,

                company: user.company,

                role: user.role,

                is_active: user.is_active,

                avatar: user.avatar,

                member_since: user.member_since,

            }),

            None => Err(AppError::NotFound("Usuario no encontrado".to_string())),

        }

    }



    pub async fn update_profile(db: &Database, user_id: i32, update_dto: UpdateProfileDto) -> Result<UserInfo, AppError> {

        let mut query_parts = Vec::new();

        let mut params = Vec::new();

        

        if let Some(first_name) = update_dto.first_name {

            query_parts.push("first_name = ?");

            params.push(first_name);

        }

        

        if let Some(last_name) = update_dto.last_name {

            query_parts.push("last_name = ?");

            params.push(last_name);

        }

        

        if let Some(company) = update_dto.company {

            query_parts.push("company = ?");

            params.push(company);

        }

        

        if let Some(email) = update_dto.email {

            // Check if email is already taken by another user

            let existing = sqlx::query::<sqlx::Sqlite>(

                "SELECT id FROM users WHERE email = ? AND id != ?"

            )

            .bind(&email)

            .bind(user_id)

            .fetch_optional(db.pool())

            .await?;

            

            if existing.is_some() {

                return Err(AppError::Authentication("El email ya está en uso".to_string()));

            }

            

            query_parts.push("email = ?");

            params.push(email);

        }

        

        if let Some(phone) = update_dto.phone {

            query_parts.push("phone = ?");

            params.push(phone);

        }

        

        if !query_parts.is_empty() {

            let query = format!("UPDATE users SET {} WHERE id = ?", query_parts.join(", "));

            

            let mut builder = sqlx::query::<sqlx::Sqlite>(&query);

            for param in params {

                builder = builder.bind(param);

            }

            builder = builder.bind(user_id);

            

            builder.execute(db.pool()).await?;

        }

        

        Self::get_user_profile(db, user_id).await

    }



    pub async fn change_password(db: &Database, user_id: i32, change_dto: ChangePasswordDto) -> Result<String, AppError> {

        // Get current user

        let user = sqlx::query_as::<_, User>(

            "SELECT * FROM users WHERE id = ? AND is_active = TRUE"

        )

        .bind(user_id)

        .fetch_one(db.pool())

        .await?;

        

        // Verify current password

        let is_valid = verify(&change_dto.current_password, &user.password)

            .map_err(|_| AppError::Authentication("Contraseña actual incorrecta".to_string()))?;

        

        if !is_valid {

            return Err(AppError::Authentication("Contraseña actual incorrecta".to_string()));

        }

        

        // Hash new password

        let hashed_password = hash(&change_dto.new_password, DEFAULT_COST)

            .map_err(|e| AppError::Authentication(format!("Error al hashear contraseña: {}", e)))?;

        

        // Update password

        sqlx::query(

            "UPDATE users SET password = ? WHERE id = ?"

        )

        .bind(hashed_password)

        .bind(user_id)

        .execute(db.pool())

        .await?;

        

        Ok("Contraseña actualizada exitosamente".to_string())

    }



    pub async fn update_avatar(db: &Database, user_id: i32, update_dto: UpdateAvatarDto) -> Result<String, AppError> {

        let result = sqlx::query(

            "UPDATE users SET avatar = ? WHERE id = ?"

        )

        .bind(&update_dto.avatar_url)

        .bind(user_id)

        .execute(db.pool())

        .await?;

        

        if result.rows_affected() == 0 {

            return Err(AppError::NotFound("Usuario no encontrado".to_string()));

        }

        

        Ok("Avatar actualizado exitosamente".to_string())

    }



    pub async fn update_avatar_file(db: &Database, user_id: i32, file_data: UpdateAvatarFileDto) -> Result<String, AppError> {

        // Convert file data to base64 string for storage

        use base64::{Engine as _, engine::general_purpose};

        let base64_data = general_purpose::STANDARD.encode(&file_data.file_data);

        let avatar_url = format!("data:{};base64,{}", file_data.file_type, base64_data);

        

        let result = sqlx::query(

            "UPDATE users SET avatar = ? WHERE id = ?"

        )

        .bind(&avatar_url)

        .bind(user_id)

        .execute(db.pool())

        .await?;

        

        if result.rows_affected() == 0 {

            return Err(AppError::NotFound("Usuario no encontrado".to_string()));

        }

        

        Ok(avatar_url)

    }



    pub async fn forgot_password(db: &Database, forgot_dto: ForgotPasswordDto) -> Result<String, AppError> {

        // Check if user exists

        let user = sqlx::query_as::<_, User>(

            "SELECT * FROM users WHERE email = ? AND is_active = TRUE"

        )

        .bind(&forgot_dto.email)

        .fetch_optional(db.pool())

        .await?;

        

        if user.is_none() {

            // Don't reveal if email exists or not

            return Ok("Si el email existe, se enviará un enlace de recuperación".to_string());

        }

        

        // Generate reset token

        let reset_token = Uuid::new_v4().to_string();

        let expiry = Utc::now() + Duration::hours(1); // Token expires in 1 hour

        

        // Update user with reset token

        sqlx::query(

            "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?"

        )

        .bind(&reset_token)

        .bind(expiry)

        .bind(user.unwrap().id)

        .execute(db.pool())

        .await?;

        

        // In a real implementation, you would send an email here

        // For now, just return success message

        Ok("Enlace de recuperación enviado al email".to_string())

    }



    pub async fn reset_password(db: &Database, reset_dto: ResetPasswordDto) -> Result<String, AppError> {

        // Find user by reset token

        let user = sqlx::query_as::<_, User>(

            "SELECT * FROM users WHERE reset_token = ? AND is_active = TRUE"

        )

        .bind(&reset_dto.token)

        .fetch_optional(db.pool())

        .await?;

        

        if user.is_none() {

            return Err(AppError::Authentication("Token de recuperación inválido".to_string()));

        }

        

        let user = user.unwrap();

        

        // Check if token is expired

        if let Some(expiry) = user.reset_token_expiry {

            if expiry < Utc::now() {

                return Err(AppError::Authentication("Token de recuperación expirado".to_string()));

            }

        } else {

            return Err(AppError::Authentication("Token de recuperación inválido".to_string()));

        }

        

        // Hash new password

        let hashed_password = hash(&reset_dto.new_password, DEFAULT_COST)

            .map_err(|e| AppError::Authentication(format!("Error al hashear contraseña: {}", e)))?;

        

        // Update password and clear reset token

        sqlx::query(

            "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?"

        )

        .bind(hashed_password)

        .bind(user.id)

        .execute(db.pool())

        .await?;

        

        Ok("Contraseña restablecida exitosamente".to_string())

    }



    pub async fn reset_password_direct(db: &Database, reset_dto: DirectResetPasswordDto) -> Result<String, AppError> {

        // Find user by email

        let user = sqlx::query_as::<_, User>(

            "SELECT * FROM users WHERE email = ? AND is_active = TRUE"

        )

        .bind(&reset_dto.email)

        .fetch_optional(db.pool())

        .await?;

        

        if user.is_none() {

            return Err(AppError::NotFound("No se encontró un usuario con ese correo electrónico".to_string()));

        }

        

        let user = user.unwrap();

        

        // Hash new password

        let hashed_password = hash(&reset_dto.new_password, DEFAULT_COST)

            .map_err(|e| AppError::Authentication(format!("Error al hashear contraseña: {}", e)))?;

        

        // Update password and clear any existing reset tokens

        sqlx::query(

            "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?"

        )

        .bind(hashed_password)

        .bind(user.id)

        .execute(db.pool())

        .await?;

        

        Ok("Contraseña restablecida exitosamente".to_string())

    }



    pub async fn logout(_db: &Database, _user_id: i32) -> Result<String, AppError> {

        // In a JWT-based system, logout is typically handled client-side

        // But we could implement token blacklisting if needed

        Ok("Sesión cerrada exitosamente".to_string())

    }



    fn get_jwt_secret() -> String {

        std::env::var("JWT_SECRET").unwrap_or_else(|_| "inventario-desktop-secret-key-2024".to_string())

    }



    fn generate_token(user: &User) -> Result<String, AppError> {

        let expiration = Utc::now() + Duration::hours(24);

        

        let claims = serde_json::json!({

            "sub": user.id,

            "email": user.email,

            "role": user.role,

            "first_name": user.first_name,

            "last_name": user.last_name,

            "exp": expiration.timestamp()

        });



        let secret = Self::get_jwt_secret();

        encode(

            &Header::default(),

            &claims,

            &EncodingKey::from_secret(secret.as_ref()),

        ).map_err(|e| AppError::Authentication(format!("Error al generar token: {}", e)))

    }

}

