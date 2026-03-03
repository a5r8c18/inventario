@echo off
cd /d "%~dp0"

echo Iniciando Sistema de Gestión de Inventario...
echo.

REM Iniciar el backend en segundo plano
echo Iniciando servidor backend...
start /B "" "inventario_back.exe"

REM Esperar a que el backend inicie
timeout /t 3 /nobreak >nul

REM Iniciar la aplicación principal
echo Iniciando aplicación de escritorio...
start "" "inventario_desktop_app.exe"

echo.
echo Sistema iniciado correctamente.
echo El backend está corriendo en http://localhost:3001
pause
