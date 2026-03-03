use serde::{Deserialize, Serialize};

use chrono::{DateTime, Utc};

use validator::Validate;



#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]

pub struct User {

    pub id: i32,

    pub first_name: String,

    pub last_name: String,

    pub company: String,

    pub email: String,

    pub phone: String,

    pub password: String,

    pub reset_token: Option<String>,

    pub reset_token_expiry: Option<DateTime<Utc>>,

    pub avatar: Option<String>,

    pub member_since: DateTime<Utc>,

    pub role: String,

    pub is_active: bool,

}



#[derive(Debug, Deserialize, Validate)]

pub struct LoginDto {

    #[validate(email)]

    pub email: String,

    #[validate(length(min = 6))]

    pub password: String,

}



#[derive(Debug, Deserialize, Validate)]

pub struct SignupDto {

    #[validate(length(min = 1))]

    pub first_name: String,

    #[validate(length(min = 1))]

    pub last_name: String,

    #[validate(length(min = 1))]

    pub company: String,

    #[validate(email)]

    pub email: String,

    #[validate(length(min = 6))]

    pub phone: String,

    #[validate(length(min = 6))]

    pub password: String,

}



#[derive(Debug, Deserialize, Validate)]

pub struct ForgotPasswordDto {

    #[validate(email)]

    pub email: String,

}



#[derive(Debug, Deserialize, Validate)]

pub struct ResetPasswordDto {

    pub token: String,

    #[validate(length(min = 6))]

    pub new_password: String,

}



#[derive(Debug, Deserialize, Validate)]

pub struct ChangePasswordDto {

    #[validate(length(min = 6))]

    pub current_password: String,

    #[validate(length(min = 6))]

    pub new_password: String,

}



#[derive(Debug, Deserialize, Validate)]

pub struct DirectResetPasswordDto {

    #[validate(email)]

    pub email: String,

    #[validate(length(min = 6))]

    pub new_password: String,

}



#[derive(Debug, Deserialize, Validate)]

pub struct UpdateProfileDto {

    #[validate(length(min = 1))]

    pub first_name: Option<String>,

    #[validate(length(min = 1))]

    pub last_name: Option<String>,

    #[validate(length(min = 1))]

    pub company: Option<String>,

    #[validate(email)]

    pub email: Option<String>,

    #[validate(length(min = 6))]

    pub phone: Option<String>,

}



#[derive(Debug, Serialize, Deserialize)]

pub struct AuthResponse {

    pub access_token: String,

    pub user: UserInfo,

}



#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]

pub struct UserInfo {

    pub id: i32,

    pub first_name: String,

    pub last_name: String,

    pub email: String,

    pub phone: String,

    pub company: String,

    pub role: String,

    pub is_active: bool,

    pub avatar: Option<String>,

    pub member_since: DateTime<Utc>,

}



#[derive(Debug, Serialize, Deserialize)]

pub struct PasswordResetRequest {

    pub token: String,

    pub expires_at: DateTime<Utc>,

}



#[derive(Debug, Deserialize, Validate)]

pub struct UpdateAvatarDto {

    pub avatar_url: String,

}



#[derive(Debug, Deserialize)]

pub struct UpdateAvatarFileDto {

    pub file_name: String,

    pub file_type: String,

    pub file_data: Vec<u8>,

}

