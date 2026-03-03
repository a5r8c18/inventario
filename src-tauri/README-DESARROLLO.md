# Guía de Desarrollo - Inventario Desktop

## 🚀 Inicio Rápido

### Modo Desarrollo Estable (Recomendado)

Para evitar que la aplicación se reinicie automáticamente cuando cambian archivos de la base de datos:

```powershell
# Opción 1: Usar el script preparado
.\start-dev-stable.ps1

# Opción 2: Configurar manualmente
$env:TAURI_DEV_WATCH="false"
cargo tauri dev
```

### Modo Desarrollo Normal (con reinicios automáticos)

```powershell
cargo tauri dev
```

## ⚠️ Problema Común: Reinicios Automáticos

### Síntomas
- La aplicación se reinicia cada pocos segundos
- Se pierde la sesión de autenticación
- Mala experiencia de usuario

### Causa
Tauri en modo desarrollo monitorea cambios en archivos y reinicia la aplicación automáticamente. Esto incluye:
- Archivos de base de datos (`*.db`, `*.sqlite`)
- Archivos de log (`*.log`)
- Archivos temporales

### Soluciones

#### 1. Usar Modo Desarrollo Estable (Recomendado)
```powershell
.\start-dev-stable.ps1
```

#### 2. Configurar Variables de Entorno
```powershell
$env:TAURI_DEV_WATCH="false"
$env:RUST_LOG="info"
cargo tauri dev
```

#### 3. Usar Archivo .env.dev
```powershell
# Cargar configuración desde archivo
Get-Content .env.dev | ForEach-Object { 
    if ($_ -match '^(.+?)=(.*)$') { 
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) 
    } 
}
cargo tauri dev
```

## 📁 Estructura de Archivos Importantes

### Archivos de Configuración
- `tauri.conf.json` - Configuración principal de Tauri
- `.taurignore` - Archivos a ignorar en el watch
- `.env.dev` - Variables de entorno para desarrollo
- `start-dev-stable.ps1` - Script de inicio estable

### Archivos de Base de Datos (Ignorados)
- `data/inventario.db` - Base de datos SQLite
- `data/*.sqlite-*` - Archivos temporales de SQLite

## 🔧 Configuración del Watch

### Archivos Excluidos (.taurignore)
```
data/
**/*.db
**/*.sqlite
*.log
debug_output.log
target/
Cargo.lock
```

## 🐛 Depuración

### Ver Logs en Tiempo Real
```powershell
Get-Content -Path "debug_output.log" -Wait -ErrorAction SilentlyContinue
```

### Niveles de Log
- `debug` - Máximo detalle (incluye queries SQL)
- `info` - Información general
- `warn` - Advertencias
- `error` - Solo errores

## 📝 Notas Importantes

1. **Producción**: En modo producción, el watch automático está desactivado por defecto
2. **Desarrollo**: Usa siempre el modo estable para mejor experiencia
3. **Base de Datos**: Los cambios en la BD no deberían reiniciar la aplicación
4. **Logs**: Los archivos de log se excluyen automáticamente para evitar bucles

## 🚨 Emergencias

Si la aplicación se queda en un bucle de reinicios:

1. **Detener el proceso**:
   ```powershell
   taskkill /F /IM "inventario_desktop_app.exe"
   ```

2. **Limpiar compilación**:
   ```powershell
   cargo clean
   ```

3. **Iniciar en modo estable**:
   ```powershell
   .\start-dev-stable.ps1
   ```
