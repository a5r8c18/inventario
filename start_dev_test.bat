@echo off
echo 🚀 Iniciando Inventario Desktop en Modo Desarrollo...
echo.

REM Verificar si estamos en el directorio correcto
if not exist "src-tauri" (
    echo ❌ Error: Ejecuta este script desde la carpeta inventario_desktop
    pause
    exit /b 1
)

REM Iniciar frontend Angular en segundo plano
echo 📱 Iniciando frontend Angular...
cd ../inventario
start cmd /k "npm run start"

REM Esperar un momento para que el frontend inicie
timeout /t 5 /nobreak > nul

REM Volver al directorio del desktop
cd ../inventario_desktop

REM Iniciar backend Tauri
echo 🦀 Iniciando backend Rust/Tauri...
cd src-tauri
npm run dev

echo.
echo ✅ Aplicación iniciada!
echo 📝 Para probar la comunicación:
echo    1. Abre la aplicación que se iniciará
echo    2. Presiona F12 para abrir las herramientas de desarrollador
echo    3. En la consola, ejecuta: testComunicacion()
echo.
pause
