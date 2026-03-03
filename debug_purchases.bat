@echo off
echo 🔍 Iniciando aplicación en modo debug para compras
echo ===============================================
echo.

echo 🦀 Iniciando backend Rust con logs detallados...
cd e:\ELIU\EliuUCI\Portafolio\INVENTARIO\inventario_desktop\src-tauri
set RUST_LOG=debug
set RUST_BACKTRACE=1
cargo tauri dev --no-dev-server

echo.
echo ✅ Si la aplicación se cierra, revisa los logs arriba
echo 📝 Los errores deberían aparecer en la consola
pause
