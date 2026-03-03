const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Rutas relativas al ejecutable
const exePath = process.execPath;
const appDir = path.dirname(exePath);
const backendPath = path.join(appDir, 'inventario_back.exe');
const dbPath = path.join(appDir, 'data', 'inventario.db');
const envPath = path.join(appDir, '.env');

console.log('Iniciando backend...');
console.log('Ruta del ejecutable:', exePath);
console.log('Ruta del backend:', backendPath);
console.log('Ruta de la BD:', dbPath);

// Verificar que exista el backend
if (!fs.existsSync(backendPath)) {
  console.error('ERROR: No se encuentra el backend en:', backendPath);
  process.exit(1);
}

// Verificar que exista la base de datos
if (!fs.existsSync(dbPath)) {
  console.log('Creando directorio para la base de datos...');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

// Variables de entorno
const env = {
  ...process.env,
  DATABASE_URL: `sqlite://${dbPath}`,
  PORT: '3001'
};

// Iniciar el backend
let backendProcess;

function startBackend() {
  console.log('Iniciando servidor backend...');
  
  backendProcess = spawn(backendPath, [], {
    env: env,
    stdio: 'pipe',
    detached: false
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    if (code !== 0) {
      console.error('El backend falló. Reiniciando en 5 segundos...');
      setTimeout(startBackend, 5000);
    }
  });

  backendProcess.on('error', (err) => {
    console.error('Error al iniciar backend:', err);
  });
}

// Iniciar el backend
startBackend();

// Manejar cierre de la aplicación
process.on('SIGINT', () => {
  console.log('Cerrando backend...');
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Cerrando backend...');
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
  }
  process.exit(0);
});

// Mantener el proceso vivo
setInterval(() => {
  if (backendProcess && backendProcess.killed) {
    console.log('Backend se detuvo inesperadamente. Reiniciando...');
    startBackend();
  }
}, 5000);
