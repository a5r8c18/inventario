use serde_json::json;
use crate::error::AppError;
use crate::models::reports::{ReceptionReport, DeliveryReport, DashboardStats};
use crate::database::Database;
use uuid::Uuid;
use log::info;
use sqlx::Row;

pub struct ReportsService;

impl ReportsService {
    pub async fn create_reception_report(
        db: &Database, 
        purchase_id: &str,
        entity: &str,
        warehouse: &str,
        supplier: &str,
        document: &str,
        products: Vec<serde_json::Value>,
        created_by_name: Option<String>,
        company_id: i32
    ) -> Result<ReceptionReport, AppError> {
        let report_id = Uuid::new_v4().to_string();
        
        // Create details JSON
        let details = json!({
            "entity": entity,
            "warehouse": warehouse,
            "supplier": supplier,
            "document": document,
            "documentType": "Factura",
            "complies": true,
            "transportista": {
                "nombre": "",
                "ci": "",
                "chapa": ""
            },
            "products": products
        });

        let report = sqlx::query_as::<_, ReceptionReport>(
            "INSERT INTO reception_reports (id, purchase_id, details, created_by_name, company_id) 
             VALUES (?, ?, ?, ?, ?) 
             RETURNING *"
        )
        .bind(&report_id)
        .bind(purchase_id)
        .bind(details.to_string())
        .bind(created_by_name.as_ref().unwrap_or(&"Usuario".to_string()))
        .bind(company_id)
        .fetch_one(db.pool())
        .await?;

        info!("👤 Usuario guardado en reception_report: {:?}", created_by_name);
        info!("🏢 Empresa guardada en reception_report: {}", company_id);
        Ok(report)
    }

    pub async fn get_reports(db: &Database, company_id: i32) -> Result<serde_json::Value, AppError> {
        let reception_reports = sqlx::query_as::<_, ReceptionReport>(
            "SELECT * FROM reception_reports WHERE company_id = ? ORDER BY created_at DESC"
        )
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;

        let delivery_reports = sqlx::query_as::<_, DeliveryReport>(
            "SELECT * FROM delivery_reports WHERE company_id = ? ORDER BY date DESC"
        )
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;

        Ok(json!({
            "reception_reports": reception_reports,
            "delivery_reports": delivery_reports
        }))
    }

    pub async fn get_dashboard_stats(db: &Database, company_id: i32) -> Result<DashboardStats, AppError> {
        // Obtener estadísticas básicas filtradas por empresa
        let inventory_count = sqlx::query_as::<_, (i64,)>(
            "SELECT COUNT(*) FROM inventory WHERE company_id = ?"
        )
        .bind(company_id)
        .fetch_one(db.pool())
        .await?.0;

        let low_stock_count = sqlx::query_as::<_, (i64,)>(
            "SELECT COUNT(*) FROM inventory WHERE company_id = ? AND stock_limit IS NOT NULL AND stock <= stock_limit"
        )
        .bind(company_id)
        .fetch_one(db.pool())
        .await?.0;

        let purchases_count = sqlx::query_as::<_, (i64,)>(
            "SELECT COUNT(*) FROM purchases WHERE company_id = ? AND created_at >= date('now', '-30 days')"
        )
        .bind(company_id)
        .fetch_one(db.pool())
        .await?.0;

        let movements_count = sqlx::query_as::<_, (i64,)>(
            "SELECT COUNT(*) FROM movements WHERE company_id = ? AND created_at >= date('now', '-30 days')"
        )
        .bind(company_id)
        .fetch_one(db.pool())
        .await?.0;

        // Obtener datos reales para gráficos de inventario
        let inventory_data = sqlx::query(
            "SELECT product_name, stock, stock_limit 
             FROM inventory 
             WHERE company_id = ?
             ORDER BY stock DESC 
             LIMIT 10"
        )
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;

        let mut product_names = Vec::new();
        let mut stock_levels = Vec::new();
        let mut stock_limits = Vec::new();

        for row in inventory_data {
            product_names.push(row.get::<String, _>("product_name"));
            stock_levels.push(row.get::<Option<f64>, _>("stock").unwrap_or(0.0));
            stock_limits.push(row.get::<Option<f64>, _>("stock_limit").unwrap_or(0.0));
        }

        // Obtener datos de entradas y salidas de los últimos 30 días
        let movement_data = sqlx::query(
            "SELECT 
                i.product_name,
                COALESCE(CAST(SUM(CASE WHEN m.movement_type = 'entry' AND m.created_at >= date('now', '-30 days') THEN m.quantity ELSE 0 END) AS REAL), 0.0) as entries,
                COALESCE(CAST(SUM(CASE WHEN m.movement_type = 'exit' AND m.created_at >= date('now', '-30 days') THEN m.quantity ELSE 0 END) AS REAL), 0.0) as exits
             FROM inventory i
             LEFT JOIN movements m ON i.product_code = m.product_code AND m.company_id = ?
             WHERE i.company_id = ? AND i.product_name IN (
                 SELECT product_name FROM inventory WHERE company_id = ? ORDER BY stock DESC LIMIT 10
             )
             GROUP BY i.product_name
             ORDER BY i.stock DESC"
        )
        .bind(company_id)
        .bind(company_id)
        .bind(company_id)
        .fetch_all(db.pool())
        .await?;

        let mut entries_data = Vec::new();
        let mut exits_data = Vec::new();

        for row in movement_data {
            entries_data.push(row.get::<Option<f64>, _>("entries").unwrap_or(0.0));
            exits_data.push(row.get::<Option<f64>, _>("exits").unwrap_or(0.0));
        }

        Ok(DashboardStats {
            total_products: inventory_count,
            total_purchases: purchases_count,
            total_movements: movements_count,
            low_stock_products: low_stock_count,
            recent_purchases: purchases_count,
            recent_movements: movements_count,
            // Datos reales para gráficos
            product_names,
            stock_levels,
            stock_limits,
            entries_data,
            exits_data,
        })
    }

    pub async fn export_to_excel(db: &Database, report_type: &str, company_id: i32) -> Result<Vec<u8>, AppError> {
        use rust_xlsxwriter::{Workbook, Format, FormatAlign};

        let mut workbook = Workbook::new();
        let worksheet = workbook.add_worksheet();

        // Formatos
        let header_format = Format::new()
            .set_bold()
            .set_background_color("#4472C4")
            .set_font_color("#FFFFFF")
            .set_align(FormatAlign::Center);

        let _date_format = Format::new()
            .set_num_format("yyyy-mm-dd hh:mm:ss");

        let currency_format = Format::new()
            .set_num_format("$#,##0.00");

        // Obtener datos según el tipo de reporte
        match report_type {
            "inventory" => {
                // Exportar inventario - código, nombre y existencia
                let inventory = sqlx::query_as::<_, crate::models::inventory::Inventory>(
                    "SELECT * FROM inventory WHERE company_id = ? ORDER BY product_name"
                )
                .bind(company_id)
                .fetch_all(db.pool())
                .await?;

                // Encabezados simplificados - solo código, nombre y existencia
                let headers = ["Código", "Nombre", "Existencia"];
                for (col, header) in headers.iter().enumerate() {
                    worksheet.write_string_with_format(0, col as u16, *header, &header_format)?;
                }

                // Datos - solo los campos solicitados
                for (row, item) in inventory.iter().enumerate() {
                    let row_idx = (row + 1) as u32;
                    worksheet.write_string(row_idx, 0, &item.product_code)?;
                    worksheet.write_string(row_idx, 1, &item.product_name)?;
                    worksheet.write_number(row_idx, 2, item.stock)?;
                }
            }
            "fixed_assets" => {
                // Exportar activos fijos
                let assets = sqlx::query_as::<_, crate::models::fixed_assets::FixedAsset>(
                    "SELECT * FROM fixed_assets WHERE company_id = ? ORDER BY asset_code"
                )
                .bind(company_id)
                .fetch_all(db.pool())
                .await?;

                // Encabezados para activos fijos
                let headers = ["Código", "Nombre", "Grupo", "Subgrupo", "Tasa %", "V. Adquisición", "Dep. Mensual", "V. Actual", "Fecha Adquisición", "Ubicación", "Responsable", "Estado"];
                for (col, header) in headers.iter().enumerate() {
                    worksheet.write_string_with_format(0, col as u16, *header, &header_format)?;
                }

                // Datos de activos fijos
                for (row, asset) in assets.iter().enumerate() {
                    let row_idx = (row + 1) as u32;
                    worksheet.write_string(row_idx, 0, &asset.asset_code)?;
                    worksheet.write_string(row_idx, 1, &asset.name)?;
                    worksheet.write_number(row_idx, 2, asset.group_number as f64)?;
                    worksheet.write_string(row_idx, 3, &asset.subgroup)?;
                    worksheet.write_number(row_idx, 4, asset.depreciation_rate)?;
                    worksheet.write_number_with_format(row_idx, 5, asset.acquisition_value, &currency_format)?;
                    
                    // Calcular depreciación mensual
                    let monthly_depreciation = (asset.acquisition_value * asset.depreciation_rate / 100.0) / 12.0;
                    worksheet.write_number_with_format(row_idx, 6, monthly_depreciation, &currency_format)?;
                    
                    worksheet.write_number_with_format(row_idx, 7, asset.current_value, &currency_format)?;
                    worksheet.write_string(row_idx, 8, &asset.acquisition_date.to_string())?;
                    worksheet.write_string(row_idx, 9, &*asset.location.as_ref().unwrap_or(&String::new()))?;
                    worksheet.write_string(row_idx, 10, &*asset.responsible_person.as_ref().unwrap_or(&String::new()))?;
                    worksheet.write_string(row_idx, 11, &asset.status)?;
                }
            }
            "purchases" => {
                // Exportar compras
                let purchases = sqlx::query_as::<_, crate::models::purchases::Purchase>(
                    "SELECT * FROM purchases WHERE company_id = ? ORDER BY created_at DESC"
                )
                .bind(company_id)
                .fetch_all(db.pool())
                .await?;

                // Encabezados
                let headers = ["ID", "Entidad", "Proveedor", "Total", "Estado", "Creado en"];
                for (col, header) in headers.iter().enumerate() {
                    worksheet.write_string_with_format(0, col as u16, *header, &header_format)?;
                }

                // Datos
                for (row, purchase) in purchases.iter().enumerate() {
                    let row_idx = (row + 1) as u32;
                    worksheet.write_string(row_idx, 0, &purchase.id)?;
                    worksheet.write_string(row_idx, 1, &purchase.entity)?;
                    worksheet.write_string(row_idx, 2, &purchase.supplier)?;
                    // Calcular total sumando los productos
                    let total = sqlx::query_as::<_, (f64,)>(
                        "SELECT COALESCE(SUM(total_price), 0) FROM purchase_products WHERE purchase_id = ?"
                    )
                    .bind(&purchase.id)
                    .fetch_one(db.pool())
                    .await?.0;
                    worksheet.write_number_with_format(row_idx, 3, total, &currency_format)?;
                    worksheet.write_string(row_idx, 4, &purchase.status)?;
                    worksheet.write_string(row_idx, 5, purchase.created_at.format("%Y-%m-%d %H:%M:%S").to_string())?;
                }
            }
            "movements" => {
                // Exportar movimientos
                let movements = sqlx::query_as::<_, crate::models::movements::Movement>(
                    "SELECT * FROM movements WHERE company_id = ? ORDER BY created_at DESC"
                )
                .bind(company_id)
                .fetch_all(db.pool())
                .await?;

                // Encabezados
                let headers = ["ID", "Producto", "Tipo", "Cantidad", "Motivo", "Usuario", "Creado en"];
                for (col, header) in headers.iter().enumerate() {
                    worksheet.write_string_with_format(0, col as u16, *header, &header_format)?;
                }

                // Datos
                for (row, movement) in movements.iter().enumerate() {
                    let row_idx = (row + 1) as u32;
                    worksheet.write_string(row_idx, 0, &movement.id)?;
                    worksheet.write_string(row_idx, 1, &movement.product_code)?;
                    worksheet.write_string(row_idx, 2, &movement.movement_type)?;
                    worksheet.write_number(row_idx, 3, movement.quantity)?;
                    worksheet.write_string(row_idx, 4, movement.reason.as_deref().unwrap_or("").to_string())?;
                    worksheet.write_string(row_idx, 5, movement.user_name.as_deref().unwrap_or("System").to_string())?;
                    worksheet.write_string(row_idx, 6, movement.created_at.format("%Y-%m-%d %H:%M:%S").to_string())?;
                }
            }
            _ => return Err(AppError::Validation("Tipo de reporte no válido".to_string())),
        }

        // Autoajustar columnas
        for col in 0..9 {
            worksheet.set_column_width(col as u16, 15)?;
        }

        // Generar el archivo en memoria
        let buffer = workbook.save_to_buffer()?;

        Ok(buffer)
    }

    pub async fn export_to_pdf(db: &Database, report_type: String, company_id: i32) -> Result<Vec<u8>, AppError> {
        let title = match report_type.as_str() {
            "inventory" => "Reporte de Inventario",
            "purchases" => "Reporte de Compras",
            "movements" => "Reporte de Movimientos",
            "fixed_assets" => "Reporte de Activos Fijos",
            _ => "Reporte",
        };

        // Build content lines
        let mut lines: Vec<String> = vec![title.to_string(), String::new()];

        match report_type.as_str() {
            "inventory" => {
                let items = sqlx::query_as::<_, crate::models::inventory::Inventory>(
                    "SELECT * FROM inventory WHERE company_id = ? ORDER BY product_name"
                ).bind(company_id).fetch_all(db.pool()).await?;
                lines.push(format!("Total productos: {}", items.len()));
                lines.push(String::new());
                for item in &items {
                    lines.push(format!(
                        "Código: {} | Nombre: {} | Existencia: {}",
                        item.product_code, item.product_name, item.stock
                    ));
                }
            }
            "fixed_assets" => {
                let assets = sqlx::query_as::<_, crate::models::fixed_assets::FixedAsset>(
                    "SELECT * FROM fixed_assets WHERE company_id = ? ORDER BY asset_code"
                ).bind(company_id).fetch_all(db.pool()).await?;
                
                // Calcular totales
                let total_acquisition: f64 = assets.iter().map(|a| a.acquisition_value).sum();
                let total_current: f64 = assets.iter().map(|a| a.current_value).sum();
                let total_depreciated = total_acquisition - total_current;
                
                // Encabezado y resumen
                lines.push("REPORTE DE ACTIVOS FIJOS".to_string());
                lines.push(String::new());
                lines.push(format!("Total activos: {}", assets.len()));
                lines.push(format!("Valor total adquisicion: ${:.2}", total_acquisition));
                lines.push(format!("Valor actual total: ${:.2}", total_current));
                lines.push(format!("Depreciacion total: ${:.2}", total_depreciated));
                lines.push(String::new());
                
                // Línea superior de la tabla
                lines.push("+----------+--------------------------+-------+------------------------+--------+---------------+-------------+-----------+-------------------+---------------+---------------+".to_string());
                
                // Encabezados
                lines.push("| Código    | Nombre                    | Grupo | Subgrupo               | Tasa % | V. Adquisición | Dep. Mensual | V. Actual | Fecha Adquisición | Ubicación     | Responsable   |".to_string());
                
                // Línea separadora
                lines.push("+----------+--------------------------+-------+------------------------+--------+---------------+-------------+-----------+-------------------+---------------+---------------+".to_string());
                
                // Datos de activos
                for asset in &assets {
                    let monthly_depreciation = (asset.acquisition_value * asset.depreciation_rate / 100.0) / 12.0;
                    let default_string = String::new();
                    let location = asset.location.as_ref().unwrap_or(&default_string);
                    let responsible = asset.responsible_person.as_ref().unwrap_or(&default_string);
                    
                    let line = format!(
                        "| {:<10} | {:<24} | {:>5} | {:<22} | {:>6.1} | ${:>13.2} | ${:>11.2} | ${:>9.2} | {:<16} | {:<13} | {:<13} |",
                        &asset.asset_code[..asset.asset_code.len().min(10)],
                        &asset.name[..asset.name.len().min(24)],
                        asset.group_number,
                        &asset.subgroup[..asset.subgroup.len().min(22)],
                        asset.depreciation_rate,
                        asset.acquisition_value,
                        monthly_depreciation,
                        asset.current_value,
                        &asset.acquisition_date.to_string()[..asset.acquisition_date.to_string().len().min(16)],
                        &location[..location.len().min(13)],
                        &responsible[..responsible.len().min(13)]
                    );
                    lines.push(line);
                    
                    // Línea separadora entre filas
                    lines.push("+----------+--------------------------+-------+------------------------+--------+---------------+-------------+-----------+-------------------+---------------+---------------+".to_string());
                }
            }
            "purchases" => {
                let purchases = sqlx::query_as::<_, crate::models::purchases::Purchase>(
                    "SELECT * FROM purchases WHERE company_id = ? ORDER BY created_at DESC"
                ).bind(company_id).fetch_all(db.pool()).await?;
                lines.push(format!("Total compras: {}", purchases.len()));
                lines.push(String::new());
                for p in &purchases {
                    lines.push(format!(
                        "{} | {} | {} | Estado: {}",
                        p.id.chars().take(8).collect::<String>(), p.entity, p.supplier, p.status
                    ));
                }
            }
            "movements" => {
                let movements = sqlx::query_as::<_, crate::models::movements::Movement>(
                    "SELECT * FROM movements WHERE company_id = ? ORDER BY created_at DESC"
                ).bind(company_id).fetch_all(db.pool()).await?;
                lines.push(format!("Total movimientos: {}", movements.len()));
                lines.push(String::new());
                for m in &movements {
                    lines.push(format!(
                        "{} | {} | Cant: {} | {}",
                        m.movement_type, m.product_code, m.quantity,
                        m.reason.as_deref().unwrap_or("")
                    ));
                }
            }
            _ => {
                lines.push("Tipo de reporte no reconocido".to_string());
            }
        }

        // Build a valid minimal PDF
        let mut stream_content = String::new();
        let mut y = 750.0_f64;
        for (i, line) in lines.iter().enumerate() {
            if y < 50.0 { break; }
            let font_size = if i == 0 { 16 } else { 10 };
            
            // Convert to UTF-8 bytes and then to PDF string with proper encoding
            let line_bytes = line.as_bytes();
            let mut pdf_string = String::new();
            for &byte in line_bytes {
                if byte >= 32 && byte <= 126 || byte == b'\n' || byte == b'\r' || byte == b'\t' {
                    // Printable ASCII characters
                    pdf_string.push(byte as char);
                } else if byte >= 128 {
                    // Extended characters (like tildes) - convert to octal escape
                    pdf_string.push_str(&format!("\\{:03o}", byte));
                } else {
                    // Other control characters - escape them
                    pdf_string.push_str(&format!("\\{:03o}", byte));
                }
            }
            
            // Escape special PDF characters
            let safe_line = pdf_string.replace('\\', "\\\\").replace('(', "\\(").replace(')', "\\)");
            stream_content.push_str(&format!("BT /F1 {} Tf {} {} Td ({}) Tj ET\n", font_size, 50, y, safe_line));
            y -= if i == 0 { 24.0 } else { 14.0 };
        }

        let stream_bytes = stream_content.as_bytes();
        let stream_len = stream_bytes.len();

        let mut pdf = Vec::new();
        let mut offsets: Vec<usize> = Vec::new();

        // Header
        pdf.extend_from_slice(b"%PDF-1.4\n");

        // Object 1: Catalog
        offsets.push(pdf.len());
        pdf.extend_from_slice(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

        // Object 2: Pages
        offsets.push(pdf.len());
        pdf.extend_from_slice(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

        // Object 3: Page
        offsets.push(pdf.len());
        pdf.extend_from_slice(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n");

        // Object 4: Content stream
        offsets.push(pdf.len());
        let obj4 = format!("4 0 obj\n<< /Length {} >>\nstream\n", stream_len);
        pdf.extend_from_slice(obj4.as_bytes());
        pdf.extend_from_slice(stream_bytes);
        pdf.extend_from_slice(b"\nendstream\nendobj\n");

        // Object 5: Font
        offsets.push(pdf.len());
        pdf.extend_from_slice(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

        // Xref
        let xref_offset = pdf.len();
        pdf.extend_from_slice(format!("xref\n0 {}\n", offsets.len() + 1).as_bytes());
        pdf.extend_from_slice(b"0000000000 65535 f \n");
        for offset in &offsets {
            pdf.extend_from_slice(format!("{:010} 00000 n \n", offset).as_bytes());
        }

        // Trailer
        pdf.extend_from_slice(format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
            offsets.len() + 1, xref_offset
        ).as_bytes());

        Ok(pdf)
    }
}
