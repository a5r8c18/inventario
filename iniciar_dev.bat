@echo off
echo 🚀 Iniciando Inventario Desktop
echo ================================
echo.

echo 📱 Iniciando Frontend Angular...
cd e:\ELIU\EliuUCI\Portafolio\INVENTARIO\inventario
start "Frontend Angular" cmd /k "npm run start"

echo 🦀 Iniciando Backend Rust/Tauri...
cd e:\ELIU\EliuUCI\Portafolio\INVENTARIO\inventario_desktop\src-tauri
start "Backend Rust" cmd /k "npm run dev"

echo.
echo ✅ Aplicación iniciada!
echo 📱 Frontend: http://localhost:4200
echo 🦀 Backend: Se iniciará en ventana separada
echo.
echo 📝 Para probar:
echo    1. Espera a que cargue la aplicación
echo    2. Presiona F12 para abrir consola
echo    3. Ejecuta: testComunicacionActualizada()
echo.
pause
