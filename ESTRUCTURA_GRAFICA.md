# Estructura Gráfica de la Aplicación Desktop

```
inventario_desktop/
├── 📦 package.json                    # Configuración Node.js/Tauri
├── 📄 COMUNICACION_FRONTEND_BACKEND.md # Docs integración
├── 📄 ESTADO_COMUNICACION.md          # Estado comunicación
├── 📄 IMPLEMENTACION_COMPLETA.md      # Docs implementación
├── 🦾 abrir_devtools.bat              # Abrir herramientas dev
├── 🚀 iniciar_dev.bat                 # Iniciar desarrollo
├── 🚀 iniciar_desktop_compilado.bat   # Iniciar versión compilada
├── 🧪 test_*.js                       # Scripts de prueba
│
├── 📁 distribucion_limpia/            # 📦 Versión compilada limpia
│   ├── 📁 data/                       # Base de datos local
│   ├── 🚀 inventario-desktop.exe      # Ejecutable principal
│   ├── 📋 GUIA_RAPIDA.md              # Guía de usuario
│   └── 📋 NOTAS_VERSION.md            # Notas de versión
│
├── 📁 distribucion_corregida/          # 🔧 Versión compilada corregida
│   ├── 📁 data/                       # Base de datos local
│   ├── 🚀 inventario-desktop.exe      # Ejecutable corregido
│   └── 📋 COMUNICACION_CORREGIDA.md   # Docs correcciones
│
├── 📁 node_modules/                    # 📦 Dependencias Node.js
├── 📦 package-lock.json               # Lock de dependencias
│
└── 📁 src-tauri/                      # ⚙️ Backend Rust (Tauri)
    ├── 🦀 Cargo.toml                  # Configuración Rust/dependencias
    ├── 🦀 Cargo.lock                  # Lock dependencias Rust
    ├── ⚙️ tauri.conf.json            # Configuración Tauri
    ├── 🦀 main.rs                     # 🚀 Punto entrada aplicación
    ├── 🦀 lib.rs                      # 📚 Lógica principal Tauri
    ├── 🦀 build.rs                    # 🏗️ Script build
    ├── 🦀 config.rs                   # ⚙️ Configuración app
    ├── 🗄️ database.rs                 # 🗄️ Conexión SQLite
    ├── ❌ error.rs                    # ❌ Manejo errores
    │
    ├── 📁 capabilities/               # 🔐 Capacidades Tauri
    ├── 📁 icons/                      # 🎨 Iconos aplicación
    ├── 📁 migrations/                 # 🗄️ Migraciones DB
    ├── 📁 scripts/                    # 📜 Scripts auxiliares
    ├── 📁 target/                     # 🏗️ Build compilación
    ├── 📁 utils/                      # 🛠️ Utilidades varias
    │
    ├── 📁 models/                     # 📋 Modelos de datos
    │   ├── 🦀 auth.rs                 # 🔐 Modelos autenticación
    │   ├── 📊 dashboard.rs            # 📊 Modelos dashboard
    │   ├── 📦 inventory.rs            # 📦 Modelos inventario
    │   ├── 🧾 invoices.rs             # 🧾 Modelos facturas
    │   ├── 🔄 movements.rs            # 🔄 Modelos movimientos
    │   ├── 🛒 purchases.rs            # 🛒 Modelos compras
    │   ├── 📈 reports.rs              # 📈 Modelos reportes
    │   ├── ⚙️ settings.rs             # ⚙️ Modelos configuración
    │   └── 🦀 mod.rs                  # 📚 Export módulos
    │
    └── 📁 services/                   # 🔧 Lógica de negocio
        ├── 🔐 auth.rs                  # 🔐 Servicios autenticación
        ├── 📊 dashboard.rs             # 📊 Servicios dashboard
        ├── 📦 inventory.rs             # 📦 Servicios inventario
        ├── 🧾 invoices.rs              # 🧾 Servicios facturas
        ├── 🔄 movements.rs             # 🔄 Servicios movimientos
        ├── 🛒 purchases.rs             # 🛒 Servicios compras
        ├── 📈 reports.rs               # 📈 Servicios reportes
        ├── ⚙️ settings.rs              # ⚙️ Servicios configuración
        └── 🦀 mod.rs                  # 📚 Export servicios
```

## 🏗️ Flujo de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    APLICACIÓN DESKTOP                      │
├─────────────────────────────────────────────────────────────┤
│  🖥️  Frontend (Angular - carpeta separada)                 │
│     └── 🌐 Interface de usuario                             │
├─────────────────────────────────────────────────────────────┤
│  ⚙️  Backend Tauri (src-tauri/)                            │
│     ├── 🦀 main.rs → Punto de entrada                       │
│     ├── 🦀 lib.rs → Comandos Tauri                         │
│     └── 📁 services/ → Lógica de negocio                   │
│          └── 🔐 auth.rs → Autenticación JWT                 │
│          └── 📦 inventory.rs → Gestión inventario           │
│          └── 🧾 invoices.rs → Gestión facturas              │
│          └── 📈 reports.rs → Generación reportes           │
├─────────────────────────────────────────────────────────────┤
│  🗄️  Base de Datos Local                                    │
│     └── 📄 SQLite (data/inventario.db)                     │
├─────────────────────────────────────────────────────────────┤
│  🌐  Backend Externo (inventario_back/)                    │
│     └── 🚀 API REST para sincronización                     │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Comunicación

```
🖥️ Frontend Angular
    ↓ (Comandos Tauri)
⚙️ Backend Rust (src-tauri/)
    ├── 🗄️ SQLite local
    └── 🌐 HTTP API → Backend Rust (inventario_back/)
```

## 📦 Componentes Principales

### **Frontend**: Proyecto Angular separado (`inventario/`)
- Interface de usuario web
- Comunicación via comandos Tauri

### **Backend Desktop**: Rust/Tauri (`src-tauri/`)
- **Models**: Estructuras de datos
- **Services**: Lógica de negocio
- **Database**: SQLite local
- **HTTP Client**: Comunicación con backend externo

### **Backend Externo**: Rust API (`inventario_back/`)
- API REST para sincronización
- Base de datos centralizada

## 🚀 Scripts de Ejecución

- **`iniciar_dev.bat`**: Desarrollo con frontend live
- **`iniciar_desktop_compilado.bat`**: Versión compilada
- **`abrir_devtools.bat`**: Herramientas de desarrollo

## 📁 Distribución

- **`distribucion_limpia/`**: Versión estable
- **`distribucion_corregida/`**: Versión con correcciones
