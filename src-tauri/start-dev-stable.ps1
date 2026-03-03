#!/usr/bin/env pwsh

# Script de inicio para desarrollo estable sin reinicios automáticos
# Esto evita que la aplicación se reinicie cuando cambian archivos de la base de datos

Write-Host "🚀 Iniciando aplicación en modo desarrollo estable..." -ForegroundColor Green
Write-Host "📁 Directorio: $PSScriptRoot" -ForegroundColor Blue

# Configurar variables de entorno para evitar reinicios automáticos
$env:RUST_LOG = "info"
$env:TAURI_DEV_WATCH = "false"

Write-Host "⚙️  Variables de entorno configuradas:" -ForegroundColor Yellow
Write-Host "   RUST_LOG = $env:RUST_LOG" -ForegroundColor Gray
Write-Host "   TAURI_DEV_WATCH = $env:TAURI_DEV_WATCH" -ForegroundColor Gray

Write-Host "🔄 Iniciando cargo tauri dev..." -ForegroundColor Cyan

# Iniciar la aplicación
cargo tauri dev
