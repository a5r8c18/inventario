/// ============================================================
/// HERRAMIENTA DE GENERACIÓN DE LICENCIAS
/// ============================================================
/// Uso: cargo run --bin generate_license -- <CLIENT_ID>
/// 
/// Ejemplo:
///   cargo run --bin generate_license -- EMPRESA-ABC
///   cargo run --bin generate_license -- CLIENTE001
///   cargo run --bin generate_license -- GARCIA2025
///
/// La clave generada se le entrega al cliente para que la ingrese
/// en la pantalla de activación de licencia del sistema.
/// ============================================================

use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

// DEBE SER EXACTAMENTE IGUAL al secreto en services/license.rs
const LICENSE_SECRET: &str = "TG-INV-2024-S3CR3T-K3Y-PR0V1D3R";

fn sign(payload: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(LICENSE_SECRET.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(payload.as_bytes());
    let result = mac.finalize();
    hex::encode(result.into_bytes())
}

fn generate_key(client_id: &str) -> String {
    let payload = client_id.to_uppercase();
    let signature = sign(&payload);
    let short_sig = &signature[..12];
    format!("INV-{}-{}", payload, short_sig.to_uppercase())
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() < 2 {
        println!("╔══════════════════════════════════════════════════╗");
        println!("║   GENERADOR DE LICENCIAS - Sistema Inventario   ║");
        println!("╠══════════════════════════════════════════════════╣");
        println!("║                                                  ║");
        println!("║  Uso:                                            ║");
        println!("║    cargo run --bin generate_license -- <ID>      ║");
        println!("║                                                  ║");
        println!("║  Ejemplos:                                       ║");
        println!("║    cargo run --bin generate_license -- ACME2025  ║");
        println!("║    cargo run --bin generate_license -- CLIENTE01 ║");
        println!("║    cargo run --bin generate_license -- GARCIA    ║");
        println!("║                                                  ║");
        println!("║  El ID puede ser el nombre de la empresa o      ║");
        println!("║  cualquier identificador único del cliente.      ║");
        println!("║  No usar espacios (usar guiones si es necesario) ║");
        println!("║                                                  ║");
        println!("╚══════════════════════════════════════════════════╝");
        std::process::exit(1);
    }
    
    let client_id = args[1..].join("-");
    let key = generate_key(&client_id);
    
    println!();
    println!("╔══════════════════════════════════════════════════╗");
    println!("║          LICENCIA GENERADA EXITOSAMENTE         ║");
    println!("╠══════════════════════════════════════════════════╣");
    println!("║                                                  ║");
    println!("  Cliente:  {}", client_id.to_uppercase());
    println!("  Clave:    {}", key);
    println!("  Vigencia: 1 año desde la activación");
    println!("║                                                  ║");
    println!("╚══════════════════════════════════════════════════╝");
    println!();
    println!("Entregue esta clave al cliente para que la ingrese");
    println!("en: Sistema > Pantalla de Activación de Licencia");
    println!();
}
