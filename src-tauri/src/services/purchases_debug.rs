use uuid::Uuid;

use crate::error::AppError;

use crate::models::purchases::{Purchase, PurchaseProduct, CreatePurchaseDto, PurchaseWithProducts};

use crate::database::Database;

use log::{info, warn, error, debug};

use serde_json::json;



pub struct PurchaseService;



impl PurchaseService {

    pub async fn create_purchase(db: &Database, create_dto: CreatePurchaseDto, user_name: Option<String>) -> Result<PurchaseWithProducts, AppError> {

        info!("🔄 Iniciando creación de compra");

        debug!("DTO recibido: {:?}", create_dto);

        debug!("Usuario: {:?}", user_name);

        

        let purchase_id = Uuid::new_v4().to_string();

        info!("📝 ID de compra generado: {}", purchase_id);

        

        // Validar que hay productos

        if create_dto.products.is_empty() {

            error!("❌ Error: La compra no tiene productos");

            return Err(AppError::Validation("La compra debe tener al menos un producto".to_string()));

        }

        

        info!("📦 Cantidad de productos: {}", create_dto.products.len());

        

        // Create purchase

        info!("💾 Insertando compra en base de datos...");

        let purchase = match sqlx::query_as::<_, Purchase>(

            "INSERT INTO purchases (id, entity, warehouse, supplier, document) 

             VALUES (?, ?, ?, ?, ?) 

             RETURNING *"

        )

        .bind(&purchase_id)

        .bind(&create_dto.entity)

        .bind(&create_dto.warehouse)

        .bind(&create_dto.supplier)

        .bind(&create_dto.document)

        .fetch_one(db.pool())

        .await {

            Ok(p) => {

                info!("✅ Compra insertada correctamente");

                p

            }

            Err(e) => {

                error!("❌ Error al insertar compra: {}", e);

                return Err(AppError::Database(e));

            }

        };



        let mut products = Vec::new();

        

        // Create purchase products and update inventory

        for (index, product_dto) in create_dto.products.iter().enumerate() {

            info!("🔄 Procesando producto {}/{}", index + 1, create_dto.products.len());

            debug!("Producto DTO: {:?}", product_dto);

            

            let product_id = Uuid::new_v4().to_string();

            

            // Validar que el producto exista en inventario

            info!("🔍 Verificando existencia del producto en inventario...");

            let inventory_check = sqlx::query_as::<_, (i64,)>(

                "SELECT COUNT(*) FROM inventory WHERE product_code = ?"

            )

            .bind(&product_dto.product_code)

            .fetch_one(db.pool())

            .await?;

            

            if inventory_check.0 == 0 {

                warn!("⚠️ Producto {} no existe en inventario, creándolo...", product_dto.product_code);

                

                // Crear producto en inventario si no existe

                sqlx::query::<sqlx::Sqlite>(

                    "INSERT INTO inventory (product_code, product_name, stock, entries, exits, unit_price, created_at, updated_at, product_unit) 

                     VALUES (?, ?, 0, 0, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)"

                )

                .bind(&product_dto.product_code)

                .bind(&product_dto.product_name)

                .bind(product_dto.unit_price)

                .bind(&product_dto.unit)

                .execute(db.pool())

                .await?;

                

                info!("✅ Producto creado en inventario");

            }

            

            info!("💾 Insertando producto de compra...");

            let purchase_product = match sqlx::query_as::<_, PurchaseProduct>(

                "INSERT INTO purchase_products (id, purchase_id, product_code, product_name, quantity, unit_price, total_price, product_unit) 

                 VALUES (?, ?, ?, ?, ?, ?, ?, ?) 

                 RETURNING *"

            )

            .bind(&product_id)

            .bind(&purchase_id)

            .bind(&product_dto.product_code)

            .bind(&product_dto.product_name)

            .bind(product_dto.quantity)

            .bind(product_dto.unit_price)

            .bind(product_dto.quantity * product_dto.unit_price)

            .bind(&product_dto.unit)

            .fetch_one(db.pool())

            .await {

                Ok(p) => {

                    info!("✅ Producto de compra insertado");

                    p

                }

                Err(e) => {

                    error!("❌ Error al insertar producto de compra: {}", e);

                    return Err(AppError::Database(e));

                }

            };

            

            products.push(purchase_product);

            

            // Update inventory stock

            info!("📊 Actualizando stock del producto...");

            match sqlx::query::<sqlx::Sqlite>(

                "UPDATE inventory SET 

                 entries = entries + ?, 

                 stock = stock + ?,

                 unit_price = ?,

                 updated_at = CURRENT_TIMESTAMP

                 WHERE product_code = ?"

            )

            .bind(product_dto.quantity)

            .bind(product_dto.quantity)

            .bind(product_dto.unit_price)

            .bind(&product_dto.product_code)

            .execute(db.pool())

            .await {

                Ok(_) => {

                    info!("✅ Stock actualizado");

                }

                Err(e) => {

                    error!("❌ Error al actualizar stock: {}", e);

                    return Err(AppError::Database(e));

                }

            }

            

            // Create movement entry

            info!("📝 Creando movimiento de entrada...");

            let movement_id = Uuid::new_v4().to_string();

            match sqlx::query::<sqlx::Sqlite>(

                "INSERT INTO movements (id, movement_type, product_code, quantity, purchase_id) 

                 VALUES (?, 'entry', ?, ?, ?)"

            )

            .bind(&movement_id)

            .bind(&product_dto.product_code)

            .bind(product_dto.quantity)

            .bind(&purchase_id)

            .execute(db.pool())

            .await {

                Ok(_) => {

                    info!("✅ Movimiento creado");

                }

                Err(e) => {

                    error!("❌ Error al crear movimiento: {}", e);

                    return Err(AppError::Database(e));

                }

            }

        }



        info!("🎉 Compra creada exitosamente con {} productos", products.len());

        

        // Create reception report

        info!("📋 Creando informe de recepción...");

        let products_json: Vec<serde_json::Value> = create_dto.products.iter().map(|p| {

            json!({

                "code": p.product_code,

                "description": p.product_name,

                "quantity": p.quantity,

                "unitPrice": p.unit_price,

                "unit": p.unit,

                "expirationDate": p.expiration_date,

                "amount": p.quantity * p.unit_price

            })

        }).collect();

        

        match crate::services::reports::ReportsService::create_reception_report(

            db,

            &purchase_id,

            &create_dto.entity,

            &create_dto.warehouse,

            &create_dto.supplier,

            &create_dto.document,

            products_json,

            user_name.clone()

        ).await {

            Ok(_) => {

                info!("✅ Informe de recepción creado correctamente");

                info!("👤 Usuario en informe: {:?}", user_name);

            }

            Err(e) => {

                warn!("⚠️ Error al crear informe de recepción: {}", e);

                // No fallar la compra si el reporte falla

            }

        }

        

        Ok(PurchaseWithProducts {

            purchase,

            products,

        })

    }

}

