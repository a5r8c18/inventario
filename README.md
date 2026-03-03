# Sistema de Gestión de Inventario — Desktop (Tauri + Rust)

Aplicación de escritorio construida con **Tauri 2** y **Rust**, que empaqueta el frontend Angular como una app nativa para Windows. Incluye toda la lógica de negocio, acceso a base de datos SQLite y sistema de licencias.

**Versión:** 2.0.0  
**Plataforma:** Windows 10 / 11

---

## Tecnologías

| Tecnología | Versión | Descripción |
|---|---|---|
| Tauri | 2.9.x | Framework desktop (Rust + WebView) |
| Rust | 1.77+ | Lenguaje del backend |
| SQLx | 0.7 | ORM async para SQLite |
| SQLite | 3.x | Base de datos local embebida |
| Tokio | 1.x | Runtime async |
| jsonwebtoken | 9.x | Autenticación JWT |
| bcrypt | 0.15 | Hash de contraseñas |
| chrono | 0.4 | Manejo de fechas |
| serde / serde_json | 1.x | Serialización JSON |
| base64 | 0.22 | Encoding de imágenes para el frontend |
| rust_xlsxwriter | 0.78 | Exportación a Excel |
| printpdf | 0.7 | Generación de PDF en Rust |

---

## Funcionalidades del backend

### Autenticación y seguridad
- Login con hash bcrypt y emisión de JWT
- Verificación de token en comandos protegidos
- Gestión de usuarios con roles

### Multi-empresa
- Soporte para múltiples empresas en la misma base de datos
- Todos los datos (inventario, compras, movimientos, facturas, reportes) filtrados por `company_id`
- Empresa activa almacenada en `AppState` (Tauri state management)
- Logos de empresa leídos del filesystem y enviados como base64 al frontend

### Inventario
- CRUD de productos con control de stock mínimo
- Historial de movimientos por producto

### Compras y Movimientos
- Registro de compras con actualización automática de stock
- Movimientos de entrada/salida con trazabilidad completa

### Reportes
- Vales de recepción y entrega/devolución
- Exportación a Excel (rust_xlsxwriter) y PDF (printpdf)
- Filtrado por empresa activa

### Facturas
- Creación con múltiples líneas y cálculo automático
- PDF con logo de empresa incrustado
- Historial completo por empresa

### Activos Fijos
- Registro de activos con valor, fecha de adquisición y vida útil
- Cálculo de depreciación anual por categoría

### Sistema de Licencias
- Validación de licencia al iniciar la app
- Activación mediante clave de producto
- Guard en el frontend redirige si la licencia expiró

### Configuración
- Ajustes por empresa (nombre, impuestos, datos de contacto)

---

## Estructura del proyecto

```
inventario_desktop/
├── package.json              # Scripts npm (build, dev)
├── src-tauri/
│   ├── tauri.conf.json       # Configuración Tauri (versión, ventana, plugins)
│   ├── capabilities/
│   │   └── default.json      # Permisos (fs, dialog, shell)
│   ├── migrations/           # Migraciones SQLx (SQL)
│   └── src/
│       ├── main.rs           # Punto de entrada
│       ├── lib.rs            # Todos los comandos Tauri (#[tauri::command])
│       ├── database.rs       # Inicialización DB + migraciones + schema patches
│       ├── error.rs          # AppError, manejo de errores
│       ├── models/           # Structs Rust (Invoice, Company, Inventory…)
│       └── services/
│           ├── auth.rs       # Login, JWT, usuarios
│           ├── companies.rs  # CRUD empresas
│           ├── dashboard.rs  # Estadísticas del dashboard
│           ├── fixed_assets.rs # Activos fijos y depreciación
│           ├── inventory.rs  # CRUD inventario
│           ├── invoices.rs   # Facturas y líneas de factura
│           ├── license.rs    # Validación y activación de licencias
│           ├── movements.rs  # Movimientos de stock
│           ├── purchases.rs  # Compras
│           ├── reports.rs    # Reportes y exportaciones
│           └── settings.rs   # Configuración del sistema
```

---

## Instalación y desarrollo

### Prerrequisitos

- [Rust](https://rustup.rs/) 1.77+
- [Node.js](https://nodejs.org/) 18+
- [Tauri CLI](https://tauri.app/start/prerequisites/): instalado como dev dependency
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Windows)
- WebView2 Runtime (incluido en Windows 11, descargable para Windows 10)

### Comandos

```bash
# Instalar dependencias Node
npm install

# Desarrollo (con hot-reload del frontend Angular)
npm run dev

# Build de producción
npm run build
# → genera instalador en src-tauri/target/release/bundle/
```

> El build de producción compila primero el frontend Angular (`cd ../inventario && npm run build`) y luego empaqueta todo con Tauri.

---

## Base de datos

La base de datos SQLite se crea automáticamente en:
```
%APPDATA%\inventario_desktop\inventario.db   (Windows)
```

### Migraciones

El sistema de migraciones tiene 4 pasos al iniciar:

1. **`remove_orphaned_migrations`** — limpia registros de migraciones obsoletas
2. **`pre_apply_if_already_done`** — evita errores "duplicate column" en DBs antiguas
3. **`sqlx::migrate!()`** — aplica migraciones pendientes
4. **`apply_schema_patches`** — agrega columnas faltantes con `ALTER TABLE ADD COLUMN`

> **Compatibilidad con versiones anteriores:** ninguna migración hace `DROP TABLE`. Los datos existentes se preservan siempre.

---

## Comunicación Frontend ↔ Backend

El frontend usa `invoke()` de `@tauri-apps/api` para llamar a comandos Rust:

```typescript
// Frontend (Angular)
const result = await invoke<Company[]>('get_companies');
```

```rust
// Backend (Rust)
#[tauri::command]
async fn get_companies(state: State<'_, AppState>) -> Result<Vec<Company>, String> {
    CompanyService::get_all(&state.database).await.map_err(|e| e.to_string())
}
```

---

## Manejo de logos de empresa

Los logos se guardan como rutas en la base de datos (`logo_path`). El backend los lee del filesystem y los devuelve como base64 al frontend:

```rust
#[tauri::command]
async fn get_image_as_base64(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path)?;
    Ok(format!("data:image/png;base64,{}", base64::encode(&bytes)))
}
```

---

## Build de producción

El instalador generado se encuentra en:
```
src-tauri/target/release/bundle/
├── msi/          → inventario_desktop_2.0.0_x64_en-US.msi
└── nsis/         → inventario_desktop_2.0.0_x64-setup.exe
```

Copiado a la carpeta `version 2.0/` del proyecto.

---

## Permisos Tauri (capabilities)

```json
{
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "shell:allow-open"
  ]
}
```
