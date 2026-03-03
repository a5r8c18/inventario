@echo off
echo 🚀 Iniciando Inventario Desktop - Modo Desarrollo Actualizado
echo ===================================================
echo.

REM Verificar si estamos en el directorio correcto
if not exist "src-tauri" (
    echo ❌ Error: Ejecuta este script desde la carpeta inventario_desktop
    pause
    exit /b 1
)

echo 📋 Verificando dependencias...

REM Verificar dependencias de frontend
cd ../inventario
if not exist "node_modules" (
    echo 📦 Instalando dependencias del frontend...
    npm install
) else (
    echo ✅ Dependencias del frontend ya instaladas
)

REM Verificar dependencias de backend
cd ../inventario_desktop/src-tauri
if not exist "Cargo.toml" (
    echo ❌ Error: No se encuentra Cargo.toml del backend
    pause
    exit /b 1
)

echo 🔧 Compilando backend Rust...
cargo check
if %errorlevel% neq 0 (
    echo ❌ Error en compilación del backend
    pause
    exit /b 1
)

echo ✅ Backend compilado exitosamente

REM Volver al directorio del desktop
cd ../inventario_desktop

echo.
echo 📱 Iniciando frontend Angular (http://localhost:4200)...
start cmd /k "cd ../inventario && npm run start"

REM Esperar un momento para que el frontend inicie
timeout /t 8 /nobreak > nul

echo.
echo 🦀 Iniciando backend Rust/Tauri...
cd src-tauri
start cmd /k "npm run dev"

echo.
echo ✅ Aplicación iniciada!
echo ===================================================
echo 📝 Para probar la comunicación:
echo    1. Espera a que ambas terminales inicien
echo    2. Abre la aplicación que aparecerá
echo    3. Presiona F12 para abrir herramientas de desarrollador
echo    4. En la consola, ejecuta: testComunicacionActualizada()
echo    5. Para test específico: testFuncionalidadesEspecificas()
echo.
echo 🌐 Frontend: http://localhost:4200
echo 🦀 Backend: Se iniciará automáticamente
echo ===================================================
echo.

REM Esperar a que el usuario presione una tecla
pause
