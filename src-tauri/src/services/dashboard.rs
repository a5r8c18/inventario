use crate::error::AppError;
use crate::models::dashboard::{
    DashboardFilterDto, InventoryChartData, MovementTrend, TopProduct,
    LowStockAlert, RecentActivity, PieChartData
};
use crate::database::Database;
use chrono::{Utc, Duration, DateTime};
use sqlx::Row;

pub struct DashboardService;

impl DashboardService {
    pub async fn get_inventory_chart_data(db: &Database, filters: DashboardFilterDto) -> Result<InventoryChartData, AppError> {
        let days = filters.days.unwrap_or(30);
        let start_date = Utc::now() - Duration::days(days as i64);

        let mut query = "
            SELECT 
                i.product_name,
                i.stock,
                i.stock_limit,
                COALESCE(SUM(CASE WHEN m.movement_type = 'entry' AND m.created_at >= ? THEN m.quantity ELSE 0 END), 0) as entries,
                COALESCE(SUM(CASE WHEN m.movement_type = 'exit' AND m.created_at >= ? THEN m.quantity ELSE 0 END), 0) as exits
            FROM inventory i
            LEFT JOIN movements m ON i.product_code = m.product_code
        ".to_string();

        let mut where_conditions = Vec::new();
        
        if let Some(warehouse) = &filters.warehouse {
            where_conditions.push(format!("i.warehouse = '{}'", warehouse));
        }
        if let Some(entity) = &filters.entity {
            where_conditions.push(format!("i.entity = '{}'", entity));
        }

        if !where_conditions.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&where_conditions.join(" AND "));
        }

        query.push_str(" GROUP BY i.product_code, i.product_name, i.stock, i.stock_limit ORDER BY i.product_name LIMIT 20");

        let results = sqlx::query(&query)
            .bind(start_date)
            .bind(start_date)
            .fetch_all(db.pool())
            .await?;

        let mut product_names = Vec::new();
        let mut stock_data = Vec::new();
        let mut stock_limits = Vec::new();
        let mut entries_data = Vec::new();
        let mut exits_data = Vec::new();

        for row in results {
            product_names.push(row.get::<String, _>("product_name"));
            stock_data.push(row.get::<Option<f64>, _>("stock").unwrap_or(0.0));
            stock_limits.push(row.get::<Option<f64>, _>("stock_limit").unwrap_or(0.0));
            entries_data.push(row.get::<Option<f64>, _>("entries").unwrap_or(0.0));
            exits_data.push(row.get::<Option<f64>, _>("exits").unwrap_or(0.0));
        }

        Ok(InventoryChartData {
            product_names,
            stock_data,
            stock_limits,
            entries_data,
            exits_data,
        })
    }

    pub async fn get_movement_trends(db: &Database, filters: DashboardFilterDto) -> Result<Vec<MovementTrend>, AppError> {
        let days = filters.days.unwrap_or(30);
        let start_date = Utc::now() - Duration::days(days as i64);

        let query = "
            SELECT 
                DATE(m.created_at) as date,
                COALESCE(SUM(CASE WHEN m.movement_type = 'entry' THEN m.quantity ELSE 0 END), 0) as entries,
                COALESCE(SUM(CASE WHEN m.movement_type = 'exit' THEN m.quantity ELSE 0 END), 0) as exits
            FROM movements m
            WHERE m.created_at >= ?
            GROUP BY DATE(m.created_at)
            ORDER BY date DESC
            LIMIT 30
        ";

        let results = sqlx::query(query)
            .bind(start_date)
            .fetch_all(db.pool())
            .await?;

        let mut trends = Vec::new();
        for row in results {
            let entries = row.get::<Option<f64>, _>("entries").unwrap_or(0.0);
            let exits = row.get::<Option<f64>, _>("exits").unwrap_or(0.0);
            let net = entries - exits;

            trends.push(MovementTrend {
                date: row.get::<String, _>("date"),
                entries,
                exits,
                net,
            });
        }

        Ok(trends)
    }

    pub async fn get_top_products(db: &Database, filters: DashboardFilterDto) -> Result<Vec<TopProduct>, AppError> {
        let days = filters.days.unwrap_or(30);
        let start_date = Utc::now() - Duration::days(days as i64);

        let query = "
            SELECT 
                i.product_name,
                i.product_code,
                m.movement_type,
                COUNT(*) as movement_count,
                SUM(m.quantity) as total_quantity
            FROM movements m
            JOIN inventory i ON m.product_code = i.product_code
            WHERE m.created_at >= ?
            GROUP BY i.product_code, i.product_name, m.movement_type
            ORDER BY total_quantity DESC
            LIMIT 10
        ";

        let results = sqlx::query(query)
            .bind(start_date)
            .fetch_all(db.pool())
            .await?;

        let mut products = Vec::new();
        for row in results {
            products.push(TopProduct {
                product_name: row.get::<String, _>("product_name"),
                product_code: row.get::<String, _>("product_code"),
                total_movements: row.get::<i64, _>("movement_count") as f64,
                total_quantity: row.get::<Option<f64>, _>("total_quantity").unwrap_or(0.0),
                movement_type: row.get::<String, _>("movement_type"),
            });
        }

        Ok(products)
    }

    pub async fn get_low_stock_alerts(db: &Database) -> Result<Vec<LowStockAlert>, AppError> {
        let query = "
            SELECT 
                product_code,
                product_name,
                stock,
                stock_limit,
                warehouse
            FROM inventory 
            WHERE stock_limit IS NOT NULL AND stock <= stock_limit
            ORDER BY (stock_limit - stock) DESC
        ";

        let results = sqlx::query(query)
            .fetch_all(db.pool())
            .await?;

        let mut alerts = Vec::new();
        for row in results {
            let current_stock = row.get::<Option<f64>, _>("stock").unwrap_or(0.0);
            let stock_limit = row.get::<Option<f64>, _>("stock_limit").unwrap_or(0.0);
            let deficit = stock_limit - current_stock;

            alerts.push(LowStockAlert {
                product_code: row.get::<String, _>("product_code"),
                product_name: row.get::<String, _>("product_name"),
                current_stock,
                stock_limit,
                deficit,
                warehouse: row.get::<Option<String>, _>("warehouse"),
            });
        }

        Ok(alerts)
    }

    pub async fn get_recent_activities(db: &Database, filters: DashboardFilterDto) -> Result<Vec<RecentActivity>, AppError> {
        let days = filters.days.unwrap_or(7);
        let start_date = Utc::now() - Duration::days(days as i64);

        // Get recent purchases
        let purchases_query = "
            SELECT 
                'purchase' as activity_type,
                'Compra: ' || p.entity || ' - ' || p.supplier as description,
                NULL as product_code,
                NULL as product_name,
                NULL as quantity,
                'System' as user_name,
                p.created_at
            FROM purchases p
            WHERE p.created_at >= ?
            ORDER BY p.created_at DESC
            LIMIT 5
        ";

        // Get recent movements
        let movements_query = "
            SELECT 
                'movement' as activity_type,
                CASE 
                    WHEN m.movement_type = 'entry' THEN 'Entrada: ' || i.product_name
                    WHEN m.movement_type = 'exit' THEN 'Salida: ' || i.product_name
                    ELSE 'Movimiento: ' || i.product_name
                END as description,
                m.product_code,
                i.product_name,
                m.quantity,
                'System' as user_name,
                m.created_at
            FROM movements m
            JOIN inventory i ON m.product_code = i.product_code
            WHERE m.created_at >= ?
            ORDER BY m.created_at DESC
            LIMIT 5
        ";

        let mut activities = Vec::new();

        // Fetch purchases
        let purchase_results = sqlx::query(purchases_query)
            .bind(start_date)
            .fetch_all(db.pool())
            .await?;

        for row in purchase_results {
            activities.push(RecentActivity {
                id: format!("purchase_{}", row.get::<DateTime<Utc>, _>("created_at").timestamp()),
                activity_type: row.get::<String, _>("activity_type"),
                description: row.get::<String, _>("description"),
                product_code: row.get::<Option<String>, _>("product_code"),
                product_name: row.get::<Option<String>, _>("product_name"),
                quantity: row.get::<Option<f64>, _>("quantity"),
                user_name: row.get::<Option<String>, _>("user_name"),
                created_at: row.get::<DateTime<Utc>, _>("created_at"),
            });
        }

        // Fetch movements
        let movement_results = sqlx::query(movements_query)
            .bind(start_date)
            .fetch_all(db.pool())
            .await?;

        for row in movement_results {
            activities.push(RecentActivity {
                id: format!("movement_{}", row.get::<DateTime<Utc>, _>("created_at").timestamp()),
                activity_type: row.get::<String, _>("activity_type"),
                description: row.get::<String, _>("description"),
                product_code: row.get::<Option<String>, _>("product_code"),
                product_name: row.get::<Option<String>, _>("product_name"),
                quantity: row.get::<Option<f64>, _>("quantity"),
                user_name: row.get::<Option<String>, _>("user_name"),
                created_at: row.get::<DateTime<Utc>, _>("created_at"),
            });
        }

        // Sort by date and limit
        activities.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        activities.truncate(10);

        Ok(activities)
    }

    pub async fn get_pie_chart_data(db: &Database, chart_type: &str) -> Result<PieChartData, AppError> {
        match chart_type {
            "warehouse_distribution" => {
                let query = "
                    SELECT 
                        COALESCE(warehouse, 'Sin Almacén') as label,
                        COUNT(*) as count
                    FROM inventory 
                    GROUP BY warehouse
                    ORDER BY count DESC
                ";

                let results = sqlx::query(query)
                    .fetch_all(db.pool())
                    .await?;

                let mut labels = Vec::new();
                let mut data = Vec::new();
                let colors = vec!["#FF6384".to_string(), "#36A2EB".to_string(), "#FFCE56".to_string(), "#4BC0C0".to_string(), "#9966FF".to_string()];

                for (_i, row) in results.iter().enumerate() {
                    labels.push(row.get::<String, _>("label"));
                    data.push(row.get::<i64, _>("count") as f64);
                }

                Ok(PieChartData {
                    labels: labels.clone(),
                    data,
                    colors: colors.into_iter().take(labels.len()).collect(),
                })
            }
            "movement_types" => {
                let query = "
                    SELECT 
                        movement_type as label,
                        COUNT(*) as count
                    FROM movements 
                    WHERE created_at >= date('now', '-30 days')
                    GROUP BY movement_type
                ";

                let results = sqlx::query(query)
                    .fetch_all(db.pool())
                    .await?;

                let mut labels = Vec::new();
                let mut data = Vec::new();
                let colors = vec!["#4CAF50".to_string(), "#FF9800".to_string(), "#F44336".to_string()];

                for row in results {
                    labels.push(row.get::<String, _>("label"));
                    data.push(row.get::<i64, _>("count") as f64);
                }

                Ok(PieChartData {
                    labels: labels.clone(),
                    data,
                    colors: colors.into_iter().take(labels.len()).collect(),
                })
            }
            _ => Err(AppError::Validation("Tipo de gráfico no válido".to_string())),
        }
    }
}
