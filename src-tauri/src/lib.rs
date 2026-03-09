use tauri::{Manager, State};
use std::sync::Mutex;

// Módulos locales
mod database;
mod error;
mod models;
mod services;
mod utils;

use database::Database;
use error::AppError;
use models::auth::*;
use models::inventory::*;
use models::purchases::*;
use models::movements::*;
use models::reports::*;
use models::invoices::*;
use models::settings::{SystemSettings, UpdateSystemSettingsDto, CreateStockLimitDto};
use models::license::*;
use models::company::{Company, CreateCompanyDto, UpdateCompanyDto};
use models::fixed_assets::{FixedAsset, FixedAssetDepreciation, DepreciationGroup, CreateFixedAssetDto, UpdateFixedAssetDto};
use services::auth::*;
use services::inventory::*;
use services::purchases::*;
use services::movements::*;
use services::reports::*;
use services::invoices::*;
use services::settings::*;
use services::license::*;
use services::companies::*;
use services::fixed_assets::*;

// Estado de la aplicación
pub struct AppState {
    pub database: Database,
    pub auth_token: Mutex<Option<String>>,
    pub db_path: String,
    pub active_company_id: Mutex<i32>, // Empresa activa seleccionada
}



fn get_jwt_secret() -> String {

    std::env::var("JWT_SECRET").unwrap_or_else(|_| "inventario-desktop-secret-key-2024".to_string())

}



impl AppState {

    async fn new() -> Result<Self, AppError> {

        // Obtener el directorio de datos de la aplicación

        let app_data_dir = if cfg!(target_os = "windows") {

            if let Some(home) = dirs::home_dir() {

                home.join("AppData").join("Local").join("inventario_desktop")

            } else {

                std::path::PathBuf::from("data")

            }

        } else {

            std::path::PathBuf::from("data")

        };

        

        // Crear directorio data si no existe

        std::fs::create_dir_all(&app_data_dir).map_err(|e| AppError::Internal(format!("Error al crear directorio {}: {}", app_data_dir.display(), e)))?;

        

        let db_path = app_data_dir.join("inventario.db");

        let db_path_str = db_path.to_str().unwrap().to_string();

        let database = Database::new(&db_path_str).await?;

        

        Ok(Self {
            database,
            auth_token: Mutex::new(None),
            db_path: db_path_str,
            active_company_id: Mutex::new(1), // Default company
        })

    }

}



// Comandos Tauri - Autenticación

#[tauri::command]

async fn login(

    state: State<'_, AppState>,

    email: String,

    password: String,

) -> Result<AuthResponse, String> {

    let login_dto = LoginDto { email, password };

    

    match AuthService::login(&state.database, login_dto).await {

        Ok(response) => {

            // Store auth token

            let mut auth_token = state.auth_token.lock().unwrap();

            *auth_token = Some(response.access_token.clone());

            Ok(response)

        }

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn signup(

    state: State<'_, AppState>,

    first_name: String,

    last_name: String,

    company: String,

    email: String,

    phone: String,

    password: String,

) -> Result<AuthResponse, String> {

    let signup_dto = SignupDto {

        first_name: first_name.clone(),

        last_name: last_name.clone(),

        company,

        email,

        phone,

        password,

    };

    

    match AuthService::signup(&state.database, signup_dto).await {

        Ok(response) => {

            // Store auth token

            let mut auth_token = state.auth_token.lock().unwrap();

            *auth_token = Some(response.access_token.clone());

            Ok(response)

        }

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn reset_password_direct(

    state: State<'_, AppState>,

    email: String,

    new_password: String,

) -> Result<String, String> {

    let reset_dto = DirectResetPasswordDto { email, new_password };

    AuthService::reset_password_direct(&state.database, reset_dto)

        .await

        .map_err(|e| e.to_string())

}



#[tauri::command]

async fn logout(state: State<'_, AppState>) -> Result<String, String> {

    let mut auth_token = state.auth_token.lock().unwrap();

    *auth_token = None;

    Ok("Sesión cerrada correctamente".to_string())

}



#[tauri::command]

async fn get_user_profile(

    state: State<'_, AppState>,

) -> Result<UserInfo, String> {

    let auth_token = {

        let token = state.auth_token.lock().unwrap();

        token.clone()

    };

    

    if auth_token.is_none() {

        return Err("No hay usuario autenticado".to_string());

    }

    

    let token = auth_token.unwrap();

    

    // Decodificar el JWT para obtener el user_id

    let token_data = jsonwebtoken::decode::<serde_json::Value>(

        &token,

        &jsonwebtoken::DecodingKey::from_secret(get_jwt_secret().as_ref()),

        &jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::HS256),

    );

    

    match token_data {

        Ok(data) => {

            if let Some(claims) = data.claims.get("sub") {

                if let Some(user_id) = claims.as_i64() {

                    match sqlx::query_as::<_, UserInfo>(

                        "SELECT id, first_name, last_name, email, phone, company, role, is_active, avatar, member_since FROM users WHERE id = ? AND is_active = TRUE"

                    )

                    .bind(user_id as i32)

                    .fetch_one(state.database.pool())

                    .await {

                        Ok(user) => Ok(user),

                        Err(e) => Err(format!("Error obteniendo perfil: {}", e)),

                    }

                } else {

                    Err("No se pudo extraer user_id del token".to_string())

                }

            } else {

                Err("Token no contiene sub (user_id)".to_string())

            }

        }

        Err(e) => Err(format!("Error decodificando token: {}", e)),

    }

}



#[tauri::command]

async fn update_avatar(

    state: State<'_, AppState>,

    file_name: String,

    file_type: String,

    file_data: Vec<u8>,

) -> Result<serde_json::Value, String> {

    // Obtener el token de autenticación almacenado

    let auth_token = {

        let token = state.auth_token.lock().unwrap();

        token.clone()

    };

    

    if auth_token.is_none() {

        return Err("No hay usuario autenticado".to_string());

    }

    

    let token = auth_token.unwrap();

    

    // Decodificar el JWT para obtener el user_id

    let token_data = jsonwebtoken::decode::<serde_json::Value>(

        &token,

        &jsonwebtoken::DecodingKey::from_secret(get_jwt_secret().as_ref()),

        &jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::HS256),

    );

    

    let user_id = match token_data {

        Ok(data) => {

            if let Some(claims) = data.claims.get("sub") {

                if let Some(user_id) = claims.as_i64() {

                    user_id as i32

                } else {

                    return Err("No se pudo extraer user_id del token".to_string());

                }

            } else {

                return Err("Token no contiene sub (user_id)".to_string());

            }

        }

        Err(e) => {

            return Err(format!("Error decodificando token: {}", e));

        }

    };

    

    let avatar_data = UpdateAvatarFileDto {

        file_name,

        file_type,

        file_data,

    };

    

    match AuthService::update_avatar_file(&state.database, user_id, avatar_data).await {

        Ok(avatar_url) => Ok(serde_json::json!({ "avatar": avatar_url })),

        Err(e) => Err(e.to_string()),

    }

}



// Comandos Tauri - Inventario

#[tauri::command]

async fn get_inventory(

    state: State<'_, AppState>,

    filters: Option<FilterInventoryDto>,

) -> Result<Vec<Inventory>, String> {

    let filter_dto = filters.unwrap_or(FilterInventoryDto {

        product_name: None,

        warehouse: None,

        entity: None,

        min_stock: None,

        max_stock: None,

        page: None,

        limit: None,

    });

    

    let company_id = *state.active_company_id.lock().unwrap();
    match InventoryService::get_inventory(&state.database, company_id, filter_dto).await {
        Ok(inventory) => Ok(inventory),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn create_inventory_item(
    state: State<'_, AppState>,
    create_dto: CreateInventoryDto,
) -> Result<Inventory, String> {
    let company_id = *state.active_company_id.lock().unwrap();
    match InventoryService::create_inventory(&state.database, company_id, create_dto).await {

        Ok(item) => Ok(item),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn update_inventory_item(

    state: State<'_, AppState>,

    product_code: String,

    update_dto: UpdateInventoryDto,

) -> Result<Inventory, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match InventoryService::update_inventory(&state.database, company_id, &product_code, update_dto).await {

        Ok(item) => Ok(item),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn delete_inventory_item(

    state: State<'_, AppState>,

    product_code: String,

) -> Result<String, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match InventoryService::delete_inventory(&state.database, company_id, &product_code).await {

        Ok(_) => Ok("Producto eliminado correctamente".to_string()),

        Err(e) => Err(e.to_string()),

    }

}



// Comandos Tauri - Compras

#[tauri::command]

async fn get_purchases(state: State<'_, AppState>) -> Result<Vec<PurchaseWithProducts>, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match PurchaseService::get_purchases(&state.database, company_id).await {

        Ok(purchases) => Ok(purchases),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn create_purchase(

    state: State<'_, AppState>,

    purchase: CreatePurchaseDto,

    user_name: Option<String>,

) -> Result<PurchaseWithProducts, String> {

    println!("🔄 create_purchase command received");

    println!("📦 Purchase data: {:?}", purchase);

    println!("👤 User: {:?}", user_name);

    

    let company_id = *state.active_company_id.lock().unwrap();
    match PurchaseService::create_purchase(&state.database, company_id, purchase, user_name).await {

        Ok(purchase) => {

            println!("✅ Purchase created successfully: {:?}", purchase);

            Ok(purchase)

        },

        Err(e) => {

            println!("❌ Error creating purchase: {:?}", e);

            println!("❌ Error details: {:?}", e);

            Err(e.to_string())

        }

    }

}



// Comandos Tauri - Facturación

#[tauri::command]

async fn get_invoices(

    state: State<'_, AppState>,

    filters: Option<FilterInvoicesDto>,

) -> Result<Vec<Invoice>, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match InvoiceService::get_all_invoices(&state.database, company_id, filters.unwrap_or_default()).await {

        Ok(invoices) => Ok(invoices),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn create_invoice(

    state: State<'_, AppState>,

    invoice: CreateInvoiceDto,

) -> Result<InvoiceWithItems, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    let created_by_name = invoice.created_by_name.clone();
    match InvoiceService::create_invoice(&state.database, company_id, invoice, created_by_name).await {

        Ok(invoice) => Ok(invoice),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn get_invoice_by_id(

    state: State<'_, AppState>,

    invoice_id: String,

) -> Result<InvoiceWithItems, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match InvoiceService::get_invoice_with_items(&state.database, company_id, &invoice_id).await {

        Ok(invoice) => Ok(invoice),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn update_invoice(

    state: State<'_, AppState>,

    invoice_id: String,

    update_dto: UpdateInvoiceDto,

) -> Result<Invoice, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match InvoiceService::update_invoice(&state.database, company_id, &invoice_id, update_dto).await {

        Ok(invoice) => Ok(invoice),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn delete_invoice(

    state: State<'_, AppState>,

    invoice_id: String,

) -> Result<(), String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match InvoiceService::delete_invoice(&state.database, company_id, &invoice_id).await {

        Ok(_) => Ok(()),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn update_invoice_status(

    state: State<'_, AppState>,

    invoice_id: String,

    status: String,

) -> Result<Invoice, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match InvoiceService::update_invoice_status(&state.database, company_id, &invoice_id, status).await {

        Ok(invoice) => Ok(invoice),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn get_invoice_statistics(state: State<'_, AppState>) -> Result<InvoiceStatistics, String> {

    match InvoiceService::get_statistics(&state.database).await {

        Ok(stats) => Ok(stats),

        Err(e) => Err(e.to_string()),

    }

}



// Comandos Tauri - Movimientos

#[tauri::command]

async fn get_movements(state: State<'_, AppState>) -> Result<Vec<MovementWithDetails>, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match MovementService::get_movements(&state.database, company_id).await {

        Ok(movements) => Ok(movements),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn create_movement_exit(

    state: State<'_, AppState>,

    create_dto: CreateExitMovementDto,

) -> Result<Movement, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match MovementService::create_exit_movement(&state.database, company_id, create_dto).await {

        Ok(movement) => Ok(movement),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn create_movement_return(

    state: State<'_, AppState>,

    purchase_id: String,

    reason: String,

    user_name: Option<String>,

) -> Result<Vec<Movement>, String> {

    let create_dto = CreateReturnMovementDto { purchase_id, reason, user_name };

    

    let company_id = *state.active_company_id.lock().unwrap();
    MovementService::create_return_movement(&state.database, company_id, create_dto)

        .await

        .map_err(|e| e.to_string())

}



// Comandos Tauri - Reportes

#[tauri::command]

async fn get_reports(state: State<'_, AppState>) -> Result<serde_json::Value, String> {

    let company_id = *state.active_company_id.lock().unwrap();

    match ReportsService::get_reports(&state.database, company_id).await {

        Ok(reports) => Ok(reports),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn get_dashboard_stats(state: State<'_, AppState>) -> Result<DashboardStats, String> {

    let company_id = *state.active_company_id.lock().unwrap();

    match ReportsService::get_dashboard_stats(&state.database, company_id).await {

        Ok(stats) => Ok(stats),

        Err(e) => Err(e.to_string()),

    }

}



// Comandos legacy para compatibilidad

#[tauri::command]

async fn obtener_productos(state: State<'_, AppState>) -> Result<Vec<Inventory>, String> {

    let filter_dto = FilterInventoryDto {

        product_name: None,

        warehouse: None,

        entity: None,

        min_stock: None,

        max_stock: None,

        page: None,

        limit: None,

    };

    

    let company_id = *state.active_company_id.lock().unwrap();
    match InventoryService::get_inventory(&state.database, company_id, filter_dto).await {

        Ok(inventory) => Ok(inventory),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn agregar_producto(

    state: State<'_, AppState>,

    producto: serde_json::Value,

) -> Result<String, String> {

    // Convertir el formato legacy al nuevo formato

    let create_dto = CreateInventoryDto {

        product_code: producto.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),

        product_name: producto.get("nombre").and_then(|v| v.as_str()).unwrap_or("").to_string(),

        product_unit: producto.get("categoria").and_then(|v| v.as_str()).map(|s| s.to_string()),

        warehouse: None,

        entity: producto.get("proveedor").and_then(|v| v.as_str()).map(|s| s.to_string()),

        product_description: producto.get("descripcion").and_then(|v| v.as_str()).map(|s| s.to_string()),

        unit_price: producto.get("precio").and_then(|v| v.as_f64()),

        stock_limit: None,

    };

    

    let company_id = *state.active_company_id.lock().unwrap();
    match InventoryService::create_inventory(&state.database, company_id, create_dto).await {

        Ok(_) => Ok("Producto agregado correctamente".to_string()),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn exportar_a_csv(productos: Vec<Inventory>) -> Result<String, String> {

    use std::fs::File;

    use std::io::Write;

    

    let mut contenido = "ProductCode,ProductName,Description,Stock,UnitPrice,Warehouse,Entity,CreatedAt\n".to_string();

    

    for producto in productos {

        let descripcion = producto.product_description.unwrap_or_default();

        let warehouse = producto.warehouse.unwrap_or_default();

        let entity = producto.entity.unwrap_or_default();

        let unit_price = producto.unit_price.unwrap_or(0.0);

        

        contenido.push_str(&format!(

            "{},{},{},{},{},{},{},{}\n",

            producto.product_code,

            producto.product_name,

            descripcion,

            producto.stock,

            unit_price,

            warehouse,

            entity,

            producto.created_at.format("%Y-%m-%d %H:%M:%S")

        ));

    }

    

    let nombre_archivo = "inventario_exportado.csv";

    let mut file = File::create(nombre_archivo)

        .map_err(|e| format!("Error al crear archivo: {}", e))?;

    

    file.write_all(contenido.as_bytes())

        .map_err(|e| format!("Error al escribir archivo: {}", e))?;

    

    Ok(format!("Archivo exportado: {}", nombre_archivo))

}



#[tauri::command]

async fn abrir_carpeta_documentos() -> Result<(), String> {

    #[cfg(target_os = "windows")]

    let path = dirs::document_dir().unwrap_or_else(|| std::path::PathBuf::from("C:\\"));

    

    #[cfg(target_os = "macos")]

    let path = dirs::document_dir().unwrap_or_else(|| std::path::PathBuf::from("/"));

    

    #[cfg(target_os = "linux")]

    let path = dirs::document_dir().unwrap_or_else(|| std::path::PathBuf::from("/"));

    

    if let Err(e) = opener::open(path) {

        return Err(format!("Error al abrir carpeta: {}", e));

    }

    

    Ok(())

}



// ─── Utilidades de Archivo ───────────────────────────────────────────────────

#[tauri::command]
async fn get_image_as_base64(path: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};
    let bytes = std::fs::read(&path).map_err(|e| format!("Error leyendo archivo: {}", e))?;
    let mime = if path.to_lowercase().ends_with(".png") { "image/png" }
        else if path.to_lowercase().ends_with(".jpg") || path.to_lowercase().ends_with(".jpeg") { "image/jpeg" }
        else if path.to_lowercase().ends_with(".gif") { "image/gif" }
        else if path.to_lowercase().ends_with(".webp") { "image/webp" }
        else if path.to_lowercase().ends_with(".svg") { "image/svg+xml" }
        else { "image/png" };
    let b64 = general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

// ─── Comandos de Empresas ────────────────────────────────────────────────────

#[tauri::command]
async fn get_companies(state: State<'_, AppState>) -> Result<Vec<Company>, String> {
    CompanyService::get_all(&state.database).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_company(state: State<'_, AppState>, id: i32) -> Result<Company, String> {
    CompanyService::get_by_id(&state.database, id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_company(state: State<'_, AppState>, dto: CreateCompanyDto) -> Result<Company, String> {
    CompanyService::create(&state.database, dto).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_company(state: State<'_, AppState>, id: i32, dto: UpdateCompanyDto) -> Result<Company, String> {
    CompanyService::update(&state.database, id, dto).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_company(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    CompanyService::delete(&state.database, id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_active_company(state: State<'_, AppState>) -> Result<Company, String> {
    let company_id = *state.active_company_id.lock().unwrap();
    CompanyService::get_by_id(&state.database, company_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_active_company(state: State<'_, AppState>, company_id: i32) -> Result<Company, String> {
    let company = CompanyService::get_by_id(&state.database, company_id)
        .await
        .map_err(|e| e.to_string())?;
    *state.active_company_id.lock().unwrap() = company_id;
    Ok(company)
}

// ─── Comandos de Activos Fijos ────────────────────────────────────────────────

#[tauri::command]
async fn get_fixed_assets(state: State<'_, AppState>) -> Result<Vec<FixedAsset>, String> {
    let company_id = *state.active_company_id.lock().unwrap();
    FixedAssetsService::get_all(&state.database, company_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_fixed_asset(state: State<'_, AppState>, id: i32) -> Result<FixedAsset, String> {
    let company_id = *state.active_company_id.lock().unwrap();
    FixedAssetsService::get_by_id(&state.database, company_id, id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_fixed_asset(state: State<'_, AppState>, dto: CreateFixedAssetDto) -> Result<FixedAsset, String> {
    let company_id = *state.active_company_id.lock().unwrap();
    FixedAssetsService::create(&state.database, company_id, dto).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_fixed_asset(state: State<'_, AppState>, id: i32, dto: UpdateFixedAssetDto) -> Result<FixedAsset, String> {
    let company_id = *state.active_company_id.lock().unwrap();
    FixedAssetsService::update(&state.database, company_id, id, dto).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_fixed_asset(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    let company_id = *state.active_company_id.lock().unwrap();
    FixedAssetsService::delete(&state.database, company_id, id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn calculate_monthly_depreciation(state: State<'_, AppState>) -> Result<Vec<FixedAssetDepreciation>, String> {
    let company_id = *state.active_company_id.lock().unwrap();
    FixedAssetsService::calculate_monthly_depreciation_all(&state.database, company_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn calculate_depreciation(state: State<'_, AppState>, year: Option<i32>) -> Result<Vec<FixedAssetDepreciation>, String> {
    let company_id = *state.active_company_id.lock().unwrap();
    FixedAssetsService::calculate_annual_depreciation(&state.database, company_id, year).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_depreciation_catalog() -> Result<Vec<DepreciationGroup>, String> {
    Ok(FixedAssetsService::get_depreciation_catalog())
}

// ─── Comandos de Historial de Movimientos por Producto ───────────────────────

#[tauri::command]
async fn get_product_movement_history(
    state: State<'_, AppState>,
    product_code: String,
) -> Result<Vec<MovementWithDetails>, String> {
    let company_id = *state.active_company_id.lock().unwrap();
    MovementService::get_product_history(&state.database, company_id, &product_code)
        .await
        .map_err(|e| e.to_string())
}

// Comandos de Licencia

#[tauri::command]

async fn get_license_status(

    state: State<'_, AppState>,

) -> Result<LicenseStatus, String> {

    LicenseService::get_license_status(&state.database)

        .await

        .map_err(|e| e.to_string())

}



#[tauri::command]

async fn activate_license(

    state: State<'_, AppState>,

    license_key: String,

) -> Result<LicenseStatus, String> {

    let dto = ActivateLicenseDto { license_key };

    LicenseService::activate_license(&state.database, dto)

        .await

        .map_err(|e| e.to_string())

}



#[tauri::command]

async fn guardar_backup() -> Result<String, String> {

    use std::fs;

    use chrono::Local;

    

    let timestamp = Local::now().format("%Y%m%d_%H%M%S");

    let backup_dir = "backups";

    let backup_file = format!("{}/inventario_backup_{}.json", backup_dir, timestamp);

    

    // Crear directorio de backups si no existe

    if let Err(e) = fs::create_dir_all(backup_dir) {

        return Err(format!("Error al crear directorio: {}", e));

    }

    

    // Aquí guardarías los datos reales

    let datos_backup = serde_json::json!({

        "fecha": timestamp.to_string(),

        "mensaje": "Backup creado correctamente"

    });

    

    fs::write(&backup_file, datos_backup.to_string())

        .map_err(|e| format!("Error al guardar backup: {}", e))?;

    

    Ok(format!("Backup guardado en: {}", backup_file))

}



#[tauri::command]

async fn generar_reporte_inventario(

    state: State<'_, AppState>,

    fecha_inicio: String,

    fecha_fin: String,

) -> Result<serde_json::Value, String> {

    let filter_dto = FilterInventoryDto {

        product_name: None,

        warehouse: None,

        entity: None,

        min_stock: None,

        max_stock: None,

        page: None,

        limit: None,

    };

    

    let company_id = *state.active_company_id.lock().unwrap();
    let productos = match InventoryService::get_inventory(&state.database, company_id, filter_dto).await {

        Ok(p) => p,

        Err(e) => return Err(e.to_string()),

    };

    

    let total_productos = productos.len();

    let total_valor: f64 = productos.iter()

        .map(|p| p.unit_price.unwrap_or(0.0) * p.stock)

        .sum();

    let productos_bajo_stock: Vec<&Inventory> = productos

        .iter()

        .filter(|p| p.stock_limit.is_some() && p.stock <= p.stock_limit.unwrap())

        .collect();

    

    let reporte = serde_json::json!({

        "fecha_generacion": chrono::Local::now().to_rfc3339(),

        "periodo": {

            "inicio": fecha_inicio,

            "fin": fecha_fin

        },

        "estadisticas": {

            "total_productos": total_productos,

            "total_valor_inventario": total_valor,

            "productos_bajo_stock": productos_bajo_stock.len()

        },

        "productos_bajo_stock": productos_bajo_stock

    });

    

    Ok(reporte)

}



// Comandos Tauri - Compras (Nuevos)

#[tauri::command]

async fn update_purchase(

    state: State<'_, AppState>,

    purchase_id: String,

    update_dto: CreatePurchaseDto,

) -> Result<PurchaseWithProducts, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match PurchaseService::update_purchase(&state.database, company_id, &purchase_id, update_dto).await {

        Ok(purchase) => Ok(purchase),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn delete_purchase(

    state: State<'_, AppState>,

    purchase_id: String,

) -> Result<String, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match PurchaseService::delete_purchase(&state.database, company_id, &purchase_id).await {

        Ok(_) => Ok("Compra eliminada correctamente".to_string()),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn get_purchase_by_id(

    state: State<'_, AppState>,

    purchase_id: String,

) -> Result<PurchaseWithProducts, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match PurchaseService::get_purchase_by_id(&state.database, company_id, &purchase_id).await {

        Ok(purchase) => Ok(purchase),

        Err(e) => Err(e.to_string()),

    }

}



// Comandos Tauri - Movimientos (Nuevos)

#[tauri::command]

async fn create_direct_entry(

    state: State<'_, AppState>,

    create_dto: CreateMovementDto,

) -> Result<Movement, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match MovementService::create_direct_entry(&state.database, company_id, create_dto).await {

        Ok(movement) => Ok(movement),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn delete_movement(

    state: State<'_, AppState>,

    movement_id: String,

) -> Result<String, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match MovementService::delete_movement(&state.database, company_id, &movement_id).await {

        Ok(_) => Ok("Movimiento eliminado correctamente".to_string()),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn get_movement_statistics(

    state: State<'_, AppState>,

    days: i64,

) -> Result<serde_json::Value, String> {

    let company_id = *state.active_company_id.lock().unwrap();
    match MovementService::get_movement_statistics(&state.database, company_id, days).await {

        Ok(stats) => Ok(stats),

        Err(e) => Err(e.to_string()),

    }

}



// Comandos Tauri - Reportes (Nuevos)

#[tauri::command]

async fn export_to_excel(

    state: State<'_, AppState>,

    report_type: String,

) -> Result<Vec<u8>, String> {

    let company_id = *state.active_company_id.lock().unwrap();

    match ReportsService::export_to_excel(&state.database, &report_type, company_id).await {

        Ok(data) => Ok(data),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn export_to_pdf(

    state: State<'_, AppState>,

    report_type: String,

) -> Result<Vec<u8>, String> {

    let company_id = *state.active_company_id.lock().unwrap();

    match ReportsService::export_to_pdf(&state.database, report_type, company_id).await {

        Ok(data) => Ok(data),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn set_stock_limit(

    state: State<'_, AppState>,

    product_code: String,

    stock_limit: f64,

) -> Result<serde_json::Value, String> {

    match SettingsService::set_stock_limit(&state.database, CreateStockLimitDto { product_code, stock_limit }).await {

        Ok(limit) => Ok(serde_json::json!(limit)),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn remove_stock_limit(

    state: State<'_, AppState>,

    product_code: String,

) -> Result<String, String> {

    match SettingsService::remove_stock_limit(&state.database, &product_code).await {

        Ok(_) => Ok("Límite de stock eliminado correctamente".to_string()),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn get_stock_limits(state: State<'_, AppState>) -> Result<Vec<serde_json::Value>, String> {

    match SettingsService::get_stock_limits(&state.database).await {

        Ok(limits) => Ok(limits.into_iter().map(|limit| serde_json::json!(limit)).collect()),

        Err(e) => Err(e.to_string()),

    }

}



// Comandos Tauri - Configuración (Nuevos)

#[tauri::command]

async fn get_system_settings(state: State<'_, AppState>) -> Result<SystemSettings, String> {

    match SettingsService::get_system_settings(&state.database).await {

        Ok(settings) => Ok(settings),

        Err(e) => Err(e.to_string()),

    }

}



#[tauri::command]

async fn update_system_settings(

    state: State<'_, AppState>,

    update_dto: UpdateSystemSettingsDto,

) -> Result<SystemSettings, String> {

    match SettingsService::update_system_settings(&state.database, update_dto).await {

        Ok(settings) => Ok(settings),

        Err(e) => Err(e.to_string()),

    }

}



// Comando de prueba para consultas raw

#[tauri::command]

async fn test_raw_query(state: State<'_, AppState>, query: String) -> Result<Vec<serde_json::Value>, String> {

    use sqlx::{Row, Column};

    

    let pool = state.database.pool();

    

    // Ejecutar consulta raw

    let rows = sqlx::query(&query)

        .fetch_all(pool)

        .await

        .map_err(|e| format!("Error en consulta: {}", e))?;

    

    // Convertir filas a JSON

    let mut results = Vec::new();

    for row in rows {

        let mut row_data = serde_json::Map::new();

        

        // Intentar obtener cada columna por nombre

        let columns = row.columns();

        for (i, column) in columns.iter().enumerate() {

            let column_name = column.name();

            

            // Intentar diferentes tipos de datos

            if let Ok(value) = row.try_get::<Option<String>, _>(i) {

                if let Some(val) = value {

                    row_data.insert(column_name.to_string(), serde_json::Value::String(val));

                } else {

                    row_data.insert(column_name.to_string(), serde_json::Value::Null);

                }

            } else if let Ok(value) = row.try_get::<Option<i64>, _>(i) {

                if let Some(val) = value {

                    row_data.insert(column_name.to_string(), serde_json::json!(val));

                } else {

                    row_data.insert(column_name.to_string(), serde_json::Value::Null);

                }

            } else if let Ok(value) = row.try_get::<Option<f64>, _>(i) {

                if let Some(val) = value {

                    row_data.insert(column_name.to_string(), serde_json::json!(val));

                } else {

                    row_data.insert(column_name.to_string(), serde_json::Value::Null);

                }

            }

        }

        

        results.push(serde_json::Value::Object(row_data));

    }

    

    Ok(results)

}



// Comando para limpiar completamente la base de datos

#[tauri::command]

async fn limpiar_base_datos(state: State<'_, AppState>) -> Result<String, String> {

    let pool = state.database.pool();

    

    // Eliminar todos los datos de las tablas principales

    let queries = vec![

        "DELETE FROM movements",

        "DELETE FROM purchase_products", 

        "DELETE FROM purchases",

        "DELETE FROM inventory",

        "DELETE FROM users",

        "DELETE FROM _sqlx_migrations",

    ];

    

    for query in queries {

        if let Err(e) = sqlx::query(query).execute(pool).await {

            return Err(format!("Error al limpiar tabla: {}", e));

        }

    }

    

    // Recrear migraciones desde cero

    if let Err(e) = sqlx::query("INSERT INTO _sqlx_migrations (version, description, success, checksum, execution_time) VALUES ('20240101000000', 'initial', TRUE, 'checksum', -1)").execute(pool).await {

        return Err(format!("Error al recrear migraciones: {}", e));

    }

    

    Ok("Base de datos limpiada correctamente. Reinicia la aplicación.".to_string())

}



pub fn run() {

    // Set up panic hook para capturar errores fatales en un archivo

    std::panic::set_hook(Box::new(|panic_info| {

        let location = panic_info.location().unwrap_or_else(|| {

            std::panic::Location::caller()

        });

        let message = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {

            s.to_string()

        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {

            s.clone()

        } else {

            "Unknown panic message".to_string()

        };

        let content = format!(
            "[PANIC] {}\nUbicación: {}:{}:{}\nFecha: {}\n",
            message,
            location.file(), location.line(), location.column(),
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
        );

        eprintln!("{}", content);

        // Escribir crash al disco para diagnosticar en producción
        if let Some(home) = dirs::home_dir() {
            let crash_path = home.join("AppData").join("Local").join("inventario_desktop").join("crash.log");
            let _ = std::fs::create_dir_all(crash_path.parent().unwrap());
            let _ = std::fs::write(&crash_path, &content);
        }

    }));



    tauri::Builder::default()

        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir { file_name: Some("inventario".to_string()) },
                ))
                .build()
        )

        .plugin(tauri_plugin_shell::init())

        .plugin(tauri_plugin_fs::init())

        .plugin(tauri_plugin_dialog::init())

        .plugin(tauri_plugin_process::init())

        .plugin(tauri_plugin_global_shortcut::Builder::new().build())

        .setup(|app| {

            // Inicializar la base de datos de forma síncrona usando blocking

            let join_result = std::thread::spawn(move || {

                // Usar un runtime bloqueante para la inicialización asíncrona

                let rt = tokio::runtime::Runtime::new().unwrap();

                rt.block_on(async {

                    AppState::new().await

                })

            }).join();

            let state = match join_result {
                Ok(Ok(s)) => s,
                Ok(Err(e)) => {
                    let msg = format!("Error al inicializar la aplicación: {}", e);
                    if let Some(home) = dirs::home_dir() {
                        let p = home.join("AppData").join("Local").join("inventario_desktop").join("crash.log");
                        let _ = std::fs::create_dir_all(p.parent().unwrap());
                        let content = format!("[SETUP ERROR] {}\nFecha: {}\n", msg, chrono::Local::now().format("%Y-%m-%d %H:%M:%S"));
                        let _ = std::fs::write(&p, content);
                    }
                    return Err(msg.into());
                }
                Err(_) => {
                    let msg = "La aplicación entró en pánico durante la inicialización";
                    if let Some(home) = dirs::home_dir() {
                        let p = home.join("AppData").join("Local").join("inventario_desktop").join("crash.log");
                        let _ = std::fs::create_dir_all(p.parent().unwrap());
                        let content = format!("[THREAD PANIC] {}\nFecha: {}\n", msg, chrono::Local::now().format("%Y-%m-%d %H:%M:%S"));
                        let _ = std::fs::write(&p, content);
                    }
                    return Err(msg.into());
                }
            };

            

            // Gestionar el estado de forma síncrona

            app.manage(state);

            

            #[cfg(debug_assertions)]

            {

                if let Some(window) = app.get_webview_window("main") {

                    let _ = window.open_devtools();

                }

            }

            

            Ok(())

        })

        .invoke_handler(tauri::generate_handler![

            // Comandos de autenticación

            login,

            signup,

            logout,

            get_user_profile,

            update_avatar,

            reset_password_direct,

            // Comandos de inventario

            get_inventory,

            create_inventory_item,

            update_inventory_item,

            delete_inventory_item,

            // Comandos de compras

            get_purchases,

            create_purchase,

            update_purchase,

            delete_purchase,

            get_purchase_by_id,

            // Comandos de facturación

            get_invoices,

            get_invoice_by_id,

            create_invoice,

            update_invoice,

            delete_invoice,

            update_invoice_status,

            get_invoice_statistics,

            // Comandos de movimientos

            get_movements,

            create_movement_exit,

            create_movement_return,

            create_direct_entry,

            delete_movement,

            get_movement_statistics,

            // Comandos de reportes

            get_reports,

            get_dashboard_stats,

            export_to_excel,

            export_to_pdf,

            // Comandos de configuración

            get_system_settings,

            update_system_settings,

            // Comandos de límites de stock

            set_stock_limit,

            remove_stock_limit,

            get_stock_limits,

            // Comandos legacy

            obtener_productos,

            agregar_producto,

            exportar_a_csv,

            abrir_carpeta_documentos,

            guardar_backup,

            generar_reporte_inventario,

            // Comando de prueba

            test_raw_query,

            // Comando de limpieza

            limpiar_base_datos,

            // Comandos de licencia

            get_license_status,

            activate_license,

            // Utilidades de archivo

            get_image_as_base64,

            // Comandos de empresas

            get_companies,

            get_company,

            create_company,

            update_company,

            delete_company,

            get_active_company,

            set_active_company,

            // Comandos de activos fijos

            get_fixed_assets,

            get_fixed_asset,

            create_fixed_asset,

            update_fixed_asset,

            delete_fixed_asset,

            calculate_depreciation,

            calculate_monthly_depreciation,

            get_depreciation_catalog,

            // Historial de movimientos por producto

            get_product_movement_history

        ])

        .run(tauri::generate_context!())

        .expect("Error al ejecutar la aplicación Tauri");

}

