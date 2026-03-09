use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Depreciation groups as defined by Cuban regulations
/// Group I: Buildings and constructions
/// Group II: Furniture, fixtures, and office equipment
/// Group III: Non-technological equipment (transport)
/// Group IV: General machinery
/// Group V: Animals
/// Group VI: Permanent agricultural plantations
/// Group VII: Other assets
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DepreciationGroup {
    pub group_number: i32,
    pub group_name: String,
    pub subgroups: Vec<DepreciationSubgroup>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DepreciationSubgroup {
    pub name: String,
    pub detail: String,
    pub rate: f64, // Annual percentage (e.g. 10.0 = 10%)
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FixedAsset {
    pub id: i32,
    pub company_id: i32,
    pub asset_code: String,
    pub name: String,
    pub description: Option<String>,
    pub group_number: i32,
    pub subgroup: String,
    pub subgroup_detail: Option<String>,
    pub depreciation_rate: f64,
    pub acquisition_value: f64,
    pub current_value: f64,
    pub acquisition_date: NaiveDate,
    pub location: Option<String>,
    pub responsible_person: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FixedAssetDepreciation {
    pub id: i32,
    pub asset_id: i32,
    pub company_id: i32,
    pub year: i32,
    pub depreciation_amount: f64,
    pub accumulated_depreciation: f64,
    pub book_value: f64,
    pub calculated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixedAssetWithDepreciation {
    pub asset: FixedAsset,
    pub depreciations: Vec<FixedAssetDepreciation>,
    pub total_accumulated: f64,
    pub current_book_value: f64,
    pub years_remaining: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFixedAssetDto {
    pub asset_code: String,
    pub name: String,
    pub description: Option<String>,
    pub group_number: i32,
    pub subgroup: String,
    pub subgroup_detail: Option<String>,
    pub acquisition_value: f64,
    pub acquisition_date: String, // "YYYY-MM-DD"
    pub location: Option<String>,
    pub responsible_person: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFixedAssetDto {
    pub name: Option<String>,
    pub description: Option<String>,
    pub location: Option<String>,
    pub responsible_person: Option<String>,
    pub status: Option<String>,
}

/// Returns all depreciation groups with their rates
pub fn get_depreciation_catalog() -> Vec<DepreciationGroup> {
    vec![
        DepreciationGroup {
            group_number: 1,
            group_name: "Edificaciones y otras construcciones".to_string(),
            subgroups: vec![
                DepreciationSubgroup { name: "Edificaciones de madera o plástico".to_string(), detail: "a) Edificaciones".to_string(), rate: 6.0 },
                DepreciationSubgroup { name: "Edificaciones de panelería".to_string(), detail: "a) Edificaciones".to_string(), rate: 5.0 },
                DepreciationSubgroup { name: "Edificaciones de mampostería y otros materiales".to_string(), detail: "a) Edificaciones".to_string(), rate: 3.0 },
                DepreciationSubgroup { name: "Puentes de acero, hierro u hormigón".to_string(), detail: "b) Otras construcciones".to_string(), rate: 3.0 },
                DepreciationSubgroup { name: "Puentes de madera".to_string(), detail: "b) Otras construcciones".to_string(), rate: 6.0 },
                DepreciationSubgroup { name: "Muelles, espigones o embarcaderos de madera".to_string(), detail: "b) Otras construcciones".to_string(), rate: 6.0 },
                DepreciationSubgroup { name: "Muelles, espigones o embarcaderos de hormigón reforzado".to_string(), detail: "b) Otras construcciones".to_string(), rate: 3.0 },
                DepreciationSubgroup { name: "Diques secos y flotantes, varaderos".to_string(), detail: "b) Otras construcciones".to_string(), rate: 6.0 },
                DepreciationSubgroup { name: "Silos y tanques".to_string(), detail: "b) Otras construcciones".to_string(), rate: 6.0 },
                DepreciationSubgroup { name: "Otras no clasificadas".to_string(), detail: "c) Otras".to_string(), rate: 3.0 },
            ],
        },
        DepreciationGroup {
            group_number: 2,
            group_name: "Muebles, enseres y equipos de oficina".to_string(),
            subgroups: vec![
                DepreciationSubgroup { name: "Muebles y estantes".to_string(), detail: "a)".to_string(), rate: 10.0 },
                DepreciationSubgroup { name: "Enseres y equipos de oficina".to_string(), detail: "b)".to_string(), rate: 15.0 },
                DepreciationSubgroup { name: "Equipos de computación".to_string(), detail: "c)".to_string(), rate: 25.0 },
            ],
        },
        DepreciationGroup {
            group_number: 3,
            group_name: "Equipos no tecnológicos".to_string(),
            subgroups: vec![
                DepreciationSubgroup { name: "Aéreo".to_string(), detail: "a)".to_string(), rate: 20.0 },
                DepreciationSubgroup { name: "Marítimo".to_string(), detail: "b)".to_string(), rate: 6.0 },
                DepreciationSubgroup { name: "Equipos de transporte ferroviario".to_string(), detail: "c) Terrestre I".to_string(), rate: 6.0 },
                DepreciationSubgroup { name: "Otros terrestres".to_string(), detail: "c) Terrestre Otros".to_string(), rate: 20.0 },
            ],
        },
        DepreciationGroup {
            group_number: 4,
            group_name: "Maquinaria en general".to_string(),
            subgroups: vec![
                DepreciationSubgroup { name: "Maquinaria en general".to_string(), detail: "".to_string(), rate: 6.0 },
            ],
        },
        DepreciationGroup {
            group_number: 5,
            group_name: "Animales".to_string(),
            subgroups: vec![
                DepreciationSubgroup { name: "Animales de trabajo".to_string(), detail: "a)".to_string(), rate: 10.0 },
                DepreciationSubgroup { name: "Ganado mayor (recría, leche o carne)".to_string(), detail: "b)".to_string(), rate: 100.0 },
            ],
        },
        DepreciationGroup {
            group_number: 6,
            group_name: "Plantaciones agrícolas permanentes".to_string(),
            subgroups: vec![
                DepreciationSubgroup { name: "Plantaciones agrícolas permanentes".to_string(), detail: "General".to_string(), rate: 15.0 },
                DepreciationSubgroup { name: "Plantaciones de Piña Española Roja, Cayana Lisa, MD2 y otras".to_string(), detail: "a) Piña".to_string(), rate: 50.0 },
            ],
        },
        DepreciationGroup {
            group_number: 7,
            group_name: "Otros activos".to_string(),
            subgroups: vec![
                DepreciationSubgroup { name: "Otros activos".to_string(), detail: "".to_string(), rate: 15.0 },
            ],
        },
    ]
}

/// Get depreciation rate by group_number and subgroup name
pub fn get_rate_for_subgroup(group_number: i32, subgroup: &str) -> Option<f64> {
    let catalog = get_depreciation_catalog();
    catalog.iter()
        .find(|g| g.group_number == group_number)
        .and_then(|g| g.subgroups.iter().find(|s| s.name == subgroup))
        .map(|s| s.rate)
}
